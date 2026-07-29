/**
 * SafeStop server module — additive only.
 * Provides in-memory storage for safety profiles and events,
 * plus Twilio SMS dispatch for SOS alerts.
 *
 * Does NOT import from or modify storage.ts or app.ts.
 */

import type {
  CheckInInput,
  SafetyEventRecord,
  SafetyProfile,
  SafetyProfileInput,
  SosInput
} from "../shared/routes.js";

// ── In-memory stores ──────────────────────────────────────────────────────────

const safetyProfiles = new Map<number, SafetyProfile>(); // keyed by userId
const safetyEventsList: SafetyEventRecord[] = [];
let eventIdCounter = 1;

function nowIso(): string {
  return new Date().toISOString();
}

// ── Safety profile storage ─────────────────────────────────────────────────────

export function saveSafetyProfile(input: SafetyProfileInput): SafetyProfile {
  const profile: SafetyProfile = {
    safetyMode: input.safetyMode,
    travelerCategory: input.travelerCategory,
    contact1Name: input.contact1Name ?? "",
    contact1Phone: input.contact1Phone ?? "",
    contact2Name: input.contact2Name ?? "",
    contact2Phone: input.contact2Phone ?? ""
  };
  safetyProfiles.set(input.userId, profile);
  return profile;
}

export function getSafetyProfile(userId: number): SafetyProfile | null {
  return safetyProfiles.get(userId) ?? null;
}

// ── Safety event log ───────────────────────────────────────────────────────────

export function logSafetyEvent(
  data: Omit<SafetyEventRecord, "id" | "createdAt">
): SafetyEventRecord {
  const record: SafetyEventRecord = {
    ...data,
    id: eventIdCounter++,
    createdAt: nowIso()
  };
  safetyEventsList.push(record);
  return record;
}

// ── SMS dispatch via Twilio ────────────────────────────────────────────────────

const TWILIO_SID    = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN  = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM   = process.env.TWILIO_FROM_NUMBER;

function twilioConfigured(): boolean {
  return !!(TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM);
}

export function getUserContacts(userId: number): string[] {
  const profile = getSafetyProfile(userId);
  if (!profile) return [];
  const contacts: string[] = [];
  if (profile.contact1Phone.trim()) contacts.push(profile.contact1Phone.trim());
  if (profile.contact2Phone.trim()) contacts.push(profile.contact2Phone.trim());
  return contacts;
}

async function sendSms(to: string, body: string, attempt = 1): Promise<boolean> {
  if (!twilioConfigured()) {
    console.warn("[SafeStop] Twilio not configured — SMS not sent to", to);
    return false;
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64");
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({ To: to, From: TWILIO_FROM!, Body: body }).toString()
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Twilio error ${res.status}: ${text}`);
    }
    return true;
  } catch (err) {
    if (attempt < 3) {
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise((r) => setTimeout(r, delay));
      return sendSms(to, body, attempt + 1);
    }
    console.error("[SafeStop] SMS failed after 3 attempts:", err);
    return false;
  }
}

// ── Handle check-in ("I'm Safe") ───────────────────────────────────────────────

export async function handleCheckIn(input: CheckInInput): Promise<SafetyEventRecord> {
  return logSafetyEvent({
    userId: input.userId,
    eventType: "safe",
    locationName: input.locationName,
    latitude: input.latitude,
    longitude: input.longitude,
    destinationName: input.destinationName,
    respondedAt: nowIso(),
    sosDelivered: false
  });
}

// ── Handle SOS ("I Need Help" or timeout) ─────────────────────────────────────

export async function handleSos(input: SosInput): Promise<{
  event: SafetyEventRecord;
  smsSent: boolean;
  contacts: string[];
}> {
  const profile = getSafetyProfile(input.userId);
  const mapsLink = `https://maps.google.com/?q=${input.latitude},${input.longitude}`;
  const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  // Build contacts list (skip blanks)
  const contacts = getUserContacts(input.userId);

  // Determine user name (profile doesn't store it; fallback to "A traveler")
  const userName = profile ? "A traveler" : "A traveler";

  const body =
    `[ERANGU SafeStop] ${userName} got off near "${input.locationName}" ` +
    `before reaching "${input.destinationName}" and did not confirm safety. ` +
    `Last known location: ${mapsLink}. Time: ${timestamp}.`;

  // Log the early sos event first
  const event = logSafetyEvent({
    userId: input.userId,
    eventType: "sos",
    locationName: input.locationName,
    latitude: input.latitude,
    longitude: input.longitude,
    destinationName: input.destinationName,
    respondedAt: null,
    sosDelivered: false
  });

  if (contacts.length === 0) {
    console.warn("[SafeStop] SOS triggered but no contacts stored for userId", input.userId);
    return { event, smsSent: false, contacts };
  }

  // Send to each contact
  const results = await Promise.all(contacts.map((phone) => sendSms(phone, body)));
  const allSent = results.every(Boolean);

  // Update event with delivery status
  Object.assign(event, { sosDelivered: allSent, respondedAt: nowIso() });
  logSafetyEvent({
    ...event,
    eventType: allSent ? "sos_sent" : "sos_failed"
  });

  return { event, smsSent: allSent, contacts };
}
