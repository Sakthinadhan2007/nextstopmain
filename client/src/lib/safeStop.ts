/**
 * SafeStop early-exit detection engine.
 *
 * Completely isolated — receives GPS pings via feed() and fires
 * onTrigger when the user appears to have left the route.
 *
 * Does NOT import from or modify any existing App.tsx logic.
 * Does NOT play sounds, vibrate, or show UI — only calls onTrigger.
 */

type LatLng = { lat: number; lng: number };

export interface SafeStopTrigger {
  locationName: string;
  latitude: number;
  longitude: number;
}

export interface SafeStopEngineOptions {
  /** Route polyline to check against */
  polyline: LatLng[];
  /** Perpendicular distance threshold in metres (default 45) */
  deviationThresholdM?: number;
  /** Rolling buffer window in seconds (default 30) */
  bufferSeconds?: number;
  /** Minimum sustained deviation before trigger in seconds (default 20) */
  sustainedSeconds?: number;
  /** Called once when early-exit is detected */
  onTrigger: (trigger: SafeStopTrigger) => void;
}

interface GpsPing {
  lat: number;
  lng: number;
  speedMs: number;       // metres per second
  heading: number;       // degrees 0-360
  timestamp: number;     // Date.now()
  distFromRoute: number; // metres
}

// ── Geometry helpers ──────────────────────────────────────────────────────────

const EARTH_R = 6_371_000; // metres

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Haversine distance in metres between two lat/lng points */
function haversine(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sin2 = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(sin2));
}

/**
 * Perpendicular distance from point P to segment AB, in metres.
 * Falls back to min(PA, PB) if projection is outside segment.
 */
function distToSegment(p: LatLng, a: LatLng, b: LatLng): number {
  const ab = haversine(a, b);
  if (ab === 0) return haversine(p, a);

  // Project onto segment [0,1]
  const t = Math.max(
    0,
    Math.min(
      1,
      ((p.lat - a.lat) * (b.lat - a.lat) + (p.lng - a.lng) * (b.lng - a.lng)) /
        ((b.lat - a.lat) ** 2 + (b.lng - a.lng) ** 2)
    )
  );
  const closest: LatLng = { lat: a.lat + t * (b.lat - a.lat), lng: a.lng + t * (b.lng - a.lng) };
  return haversine(p, closest);
}

/** Minimum distance from point to any segment of the polyline */
function distToPolyline(p: LatLng, poly: LatLng[]): number {
  if (poly.length === 0) return 0;
  if (poly.length === 1) return haversine(p, poly[0]);
  let min = Infinity;
  for (let i = 0; i < poly.length - 1; i++) {
    const d = distToSegment(p, poly[i], poly[i + 1]);
    if (d < min) min = d;
  }
  return min;
}

// ── Reverse-geocode using OSM Nominatim ───────────────────────────────────────

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const res = await fetch(url, {
      headers: { "Accept-Language": "en", "User-Agent": "ERANGU-SafeStop/1.0" }
    });
    if (!res.ok) return "your current location";
    const data = (await res.json()) as { address?: { road?: string; suburb?: string; city?: string; town?: string } };
    const addr = data.address ?? {};
    return [addr.road, addr.suburb, addr.city ?? addr.town].filter(Boolean).join(", ") || "your current location";
  } catch {
    return "your current location";
  }
}

// ── Engine class ──────────────────────────────────────────────────────────────

export class SafeStopEngine {
  private polyline: LatLng[];
  private deviationThresholdM: number;
  private bufferMs: number;
  private sustainedMs: number;
  private onTrigger: (t: SafeStopTrigger) => void;
  private buffer: GpsPing[] = [];
  private fired = false;
  private enabled = false;

  constructor(opts: SafeStopEngineOptions) {
    this.polyline = opts.polyline;
    this.deviationThresholdM = opts.deviationThresholdM ?? 45;
    this.bufferMs = (opts.bufferSeconds ?? 30) * 1000;
    this.sustainedMs = (opts.sustainedSeconds ?? 20) * 1000;
    this.onTrigger = opts.onTrigger;
  }

  /** Call this to activate tracking (called when trip starts with safety_mode = true) */
  enable(): void {
    this.enabled = true;
    this.fired = false;
    this.buffer = [];
  }

  /** Call this when the trip ends or alarm fires — resets state */
  disable(): void {
    this.enabled = false;
    this.fired = false;
    this.buffer = [];
  }

  /** Feed a new GPS position from the existing watchPosition callback */
  feed(position: GeolocationPosition): void {
    if (!this.enabled || this.fired) return;
    if (this.polyline.length < 2) return; // no polyline — skip detection

    const { latitude: lat, longitude: lng, speed, heading } = position.coords;
    const speedMs = speed ?? 0; // m/s — null when unavailable
    const head = heading ?? 0;
    const now = Date.now();

    const distFromRoute = distToPolyline({ lat, lng }, this.polyline);

    const ping: GpsPing = { lat, lng, speedMs, heading: head, timestamp: now, distFromRoute };
    this.buffer.push(ping);

    // Trim buffer to rolling 30-second window
    const cutoff = now - this.bufferMs;
    this.buffer = this.buffer.filter((p) => p.timestamp >= cutoff);

    // Need at least 4 pings to reduce noise
    if (this.buffer.length < 4) return;

    // Check: ALL pings in buffer exceed deviation threshold
    const allDeviated = this.buffer.every((p) => p.distFromRoute > this.deviationThresholdM);
    if (!allDeviated) return;

    // Check: buffer spans at least the required sustained duration
    const oldest = this.buffer[0].timestamp;
    const elapsed = now - oldest;
    if (elapsed < this.sustainedMs) return;

    // IMPORTANT: Do NOT trigger on speed == 0 alone (traffic jams, red lights).
    // Only trigger if at least one ping shows movement (speed > 0.5 m/s).
    const anyMovement = this.buffer.some((p) => p.speedMs > 0.5);
    if (!anyMovement) return;

    // Secondary confidence check: walking speed (< 3 m/s) + irregular heading
    // This boosts confidence but is not required to trigger.
    const avgSpeed = this.buffer.reduce((sum, p) => sum + p.speedMs, 0) / this.buffer.length;
    const headings = this.buffer.map((p) => p.heading);
    const headingVariance =
      headings.reduce((sum, h, index) => {
        const prev = headings[index - 1];
        return sum + (prev !== undefined ? Math.abs(h - prev) : 0);
      }, 0) / Math.max(headings.length - 1, 1);

    // Boost: walking-speed + irregular heading = confirmed off-route
    // Either condition alone is sufficient since deviation + duration already met
    const isWalking = avgSpeed < 3.0;
    const isIrregular = headingVariance > 40;
    const highConfidence = isWalking || isIrregular;

    if (!highConfidence && avgSpeed > 10) {
      // Moving fast AND no heading irregularity — might be a GPS-mapped parallel road
      // Extend the threshold slightly and wait
      return;
    }

    // Trigger!
    this.fired = true;
    this.enabled = false;

    const trigLat = lat;
    const trigLng = lng;

    void reverseGeocode(trigLat, trigLng).then((locationName) => {
      this.onTrigger({ locationName, latitude: trigLat, longitude: trigLng });
    });
  }
}
