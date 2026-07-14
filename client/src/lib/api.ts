import type {
  AlertRecord,
  CreateAlertInput,
  CreateRouteInput,
  CreateStopInput,
  CreateUserInput,
  ProximityStopRecord,
  RouteDiscoveryRecord,
  RouteRecord,
  SignInInput,
  StopRecord,
  TransitCategory,
  UpdateStopInput,
  UserRecord
} from "../../../shared/routes";

const configuredApiBase = (import.meta.env.VITE_API_URL ?? "").trim();
const API_BASE = configuredApiBase
  ? configuredApiBase.replace(/\/+$/, "")
  : typeof window !== "undefined"
  ? window.location.origin
  : "";

async function parseErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const payload = JSON.parse(text) as { error?: unknown; message?: string };
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }
    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error;
    }
  } catch {
    // Fall through to raw text handling.
  }
  if (text.includes("<!DOCTYPE") || text.includes("Application not found")) {
    return "API server unavailable. Please try again in a moment.";
  }
  return text.trim() || `Request failed (${response.status})`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }
  return response.json() as Promise<T>;
}

export function createUser(input: CreateUserInput): Promise<UserRecord> {
  return request("/api/users", { method: "POST", body: JSON.stringify(input) });
}

export function signIn(input: SignInInput): Promise<UserRecord> {
  return request("/api/auth/sign-in", { method: "POST", body: JSON.stringify(input) });
}

export function createRoute(input: CreateRouteInput): Promise<RouteRecord> {
  return request("/api/routes", { method: "POST", body: JSON.stringify(input) });
}

export function listRoutes(userId: number, mode?: TransitCategory): Promise<RouteRecord[]> {
  const modeQuery = mode ? `&mode=${mode}` : "";
  return request(`/api/routes?userId=${userId}${modeQuery}`);
}

export function discoverRoutes(
  userId: number,
  mode: TransitCategory,
  start: string
): Promise<RouteDiscoveryRecord[]> {
  const params = new URLSearchParams({
    userId: String(userId),
    mode,
    start
  });
  return request(`/api/routes/discover?${params.toString()}`);
}

export function createStop(input: CreateStopInput): Promise<StopRecord> {
  return request("/api/stops", { method: "POST", body: JSON.stringify(input) });
}

export function updateStop(stopId: number, input: UpdateStopInput): Promise<StopRecord> {
  return request(`/api/stops/${stopId}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteStop(stopId: number): Promise<{ deleted: true; stopId: number }> {
  return request(`/api/stops/${stopId}`, { method: "DELETE" });
}

export function clearRouteStops(routeId: number): Promise<{ deleted: true; count: number }> {
  return request(`/api/routes/${routeId}/stops`, { method: "DELETE" });
}

export function listStops(routeId: number): Promise<StopRecord[]> {
  return request(`/api/stops?routeId=${routeId}`);
}

export function createAlert(input: CreateAlertInput): Promise<AlertRecord> {
  return request("/api/alerts", { method: "POST", body: JSON.stringify(input) });
}

export function listAlerts(userId: number): Promise<AlertRecord[]> {
  return request(`/api/alerts?userId=${userId}`);
}

export function toggleAlert(alertId: number, isActive: boolean): Promise<AlertRecord> {
  return request(`/api/alerts/${alertId}`, {
    method: "PATCH",
    body: JSON.stringify({ isActive })
  });
}

export function checkProximity(userId: number, latitude: number, longitude: number): Promise<{
  nearest: ProximityStopRecord[];
  triggered: Array<ProximityStopRecord & { trigger: true }>;
}> {
  return request(`/api/proximity/${userId}`, {
    method: "POST",
    body: JSON.stringify({ latitude, longitude })
  });
}
