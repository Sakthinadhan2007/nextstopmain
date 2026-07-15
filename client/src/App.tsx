import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  modeAlertBands,
  type AlertRecord,
  type RouteRecord,
  type StopRecord,
  type TransitCategory,
  type UserRecord
} from "../../shared/routes";
import { MapView } from "./components/MapView";
import {
  clearRouteStops,
  createAlert,
  createStop,
  deleteStop,
  listAlerts,
  listRoutes,
  listStops,
  signIn,
  toggleAlert,
  updateStop
} from "./lib/api";

type Point = { lat: number; lng: number };
type View = "home" | "routes" | TransitCategory;
type CacheState = {
  user: UserRecord;
  routes: RouteRecord[];
  stopsByRoute: Record<number, StopRecord[]>;
  alerts: AlertRecord[];
  savedAt: string;
};

const MODES: TransitCategory[] = ["bus", "train", "metro", "custom"];
const HOME_MODE_ORDER: TransitCategory[] = ["train", "metro", "bus", "custom"];
const CACHE_PREFIX = "stopmate-cache-v1";
const LAST_USER_KEY = "stopmate-last-user-v1";
const LOCAL_ID_KEY = "stopmate-local-id-v1";

const MODE_LABEL: Record<TransitCategory, string> = {
  bus: "Bus",
  train: "Train",
  metro: "Metro",
  custom: "Custom"
};

const MODE_DESCRIPTION: Record<TransitCategory, string> = {
  train: "Suburban corridors with a fixed 600m wake-up radius.",
  metro: "Metro corridors with multi-line track overlays on map.",
  bus: "High-coverage city routes for daily office and college commute.",
  custom: "Save private pickup/drop points with your own alert range."
};

const APP_HIGHLIGHTS = [
  {
    title: "Location-driven planning",
    description:
      "Your current location is used to auto-detect the best start stop. No manual start-point input is needed."
  },
  {
    title: "Destination wake-up alert",
    description:
      "Arm alerts by destination and get a loud alarm and vibration before your stop so you can travel stress free."
  },
  {
    title: "Built for Chennai routes",
    description:
      "Train, metro, and bus coverage is preloaded for Chennai, plus a custom mode for personal places."
  },
  {
    title: "Offline-first behavior",
    description:
      "If your network is unstable, cached route data and alerts keep working until sync is restored."
  }
] as const;

const APP_WORKFLOW = [
  "Explore routes and the app first. Sign in only when you enable location or save custom alerts.",
  "Enable location so StopMate can detect the nearest logical start stop.",
  "Choose destination and enable wake-up alert.",
  "Travel with live distance updates and get alarm before your stop."
] as const;

function formatMeters(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(2)} km`;
  return `${Math.round(value)} m`;
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6_371_000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function triggerDistance(mode: TransitCategory, stopRadius: number): number {
  if (mode === "custom") return stopRadius;
  return Math.min(stopRadius, modeAlertBands[mode].defaultMeters);
}

function Logo(): JSX.Element {
  return (
    <svg viewBox="0 0 96 96" aria-hidden="true" className="stopmate-mark">
      <rect className="logo-outline" x="8" y="8" width="80" height="80" rx="20" />
      <path className="logo-rail logo-rail-top" d="M16 36C28 22 48 22 62 34C70 40 75 45 80 50" />
      <path className="logo-rail logo-rail-bottom" d="M16 58C28 44 48 44 62 56C68 61 72 66 76 72" />
      <path className="logo-link" d="M30 66L64 32" />
      <circle className="logo-node logo-node-a" cx="30" cy="66" r="6" />
      <circle className="logo-node logo-node-b" cx="64" cy="32" r="6" />
    </svg>
  );
}

export default function App(): JSX.Element {
  const [view, setView] = useState<View>("home");
  const [showSignIn, setShowSignIn] = useState(false);
  const [authForm, setAuthForm] = useState({ email: "", name: "" });
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [status, setStatus] = useState("Welcome! Explore the app first — sign in only when you enable location or save alerts.");
  const [online, setOnline] = useState(navigator.onLine);

  const [user, setUser] = useState<UserRecord | null>(null);
  const [routes, setRoutes] = useState<RouteRecord[]>([]);
  const [stopsByRoute, setStopsByRoute] = useState<Record<number, StopRecord[]>>({});
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);

  const [selectedRoute, setSelectedRoute] = useState<Record<TransitCategory, number | null>>({
    bus: null,
    train: null,
    metro: null,
    custom: null
  });
  const [selectedDestination, setSelectedDestination] = useState<Record<TransitCategory, number | null>>({
    bus: null,
    train: null,
    metro: null,
    custom: null
  });

  const [location, setLocation] = useState<Point | null>(null);
  const [lastFixTime, setLastFixTime] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [nearest, setNearest] = useState<Array<StopRecord & { distanceMeters: number; mode: TransitCategory; routeName: string }>>([]);
  const [alarmArmed, setAlarmArmed] = useState(false);
  const [alarmOn, setAlarmOn] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState("");
  const [isUsingCache, setIsUsingCache] = useState(false);

  const [pickedLocation, setPickedLocation] = useState<Point | null>(null);
  const [customLabel, setCustomLabel] = useState("");
  const [customRadius, setCustomRadius] = useState("600");
  const [editingStopId, setEditingStopId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editRadius, setEditRadius] = useState("600");
  const [routeSearch, setRouteSearch] = useState("");

  const watchRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cooldownRef = useRef<Record<number, number>>({});
  const localIdRef = useRef<number>(Number(localStorage.getItem(LOCAL_ID_KEY) ?? "-1"));

  const activeMode = view === "home" || view === "routes" ? null : view;

  const routesByMode = useMemo(() => {
    const grouped: Record<TransitCategory, RouteRecord[]> = { bus: [], train: [], metro: [], custom: [] };
    routes.forEach((route) => grouped[route.mode].push(route));
    return grouped;
  }, [routes]);

  const routeById = useMemo(() => new Map(routes.map((route) => [route.id, route])), [routes]);
  const stopById = useMemo(() => new Map(Object.values(stopsByRoute).flat().map((stop) => [stop.id, stop])), [stopsByRoute]);

  const currentRoute = useMemo(() => {
    if (!activeMode) return null;
    const routeId = selectedRoute[activeMode] ?? routesByMode[activeMode][0]?.id ?? null;
    return routeId ? routeById.get(routeId) ?? null : null;
  }, [activeMode, routeById, routesByMode, selectedRoute]);

  const currentStops = useMemo(
    () =>
      currentRoute
        ? (stopsByRoute[currentRoute.id] ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder)
        : [],
    [currentRoute, stopsByRoute]
  );

  const metroOverlayPaths = useMemo(() => {
    if (activeMode !== "metro") return [];
    return routesByMode.metro
      .filter((route) => route.id !== currentRoute?.id)
      .map((route) => ({
        id: route.id,
        points: (stopsByRoute[route.id] ?? [])
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((stop) => [stop.latitude, stop.longitude] as [number, number])
      }))
      .filter((track) => track.points.length > 1);
  }, [activeMode, currentRoute?.id, routesByMode.metro, stopsByRoute]);

  const customRoute = routesByMode.custom[0] ?? null;
  const customStops = useMemo(
    () =>
      customRoute
        ? (stopsByRoute[customRoute.id] ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder)
        : [],
    [customRoute, stopsByRoute]
  );

  const currentDest = useMemo(() => {
    if (!activeMode) return null;
    const id = selectedDestination[activeMode];
    return id ? currentStops.find((stop) => stop.id === id) ?? null : null;
  }, [activeMode, currentStops, selectedDestination]);

  const autoStartStop = useMemo(() => {
    if (!activeMode || activeMode === "custom") return null;
    if (currentStops.length === 0) return null;
    if (!location) return currentStops[0] ?? null;
    let nearestStop = currentStops[0];
    let nearestDistance = haversineMeters(location.lat, location.lng, nearestStop.latitude, nearestStop.longitude);
    for (const stop of currentStops.slice(1)) {
      const distance = haversineMeters(location.lat, location.lng, stop.latitude, stop.longitude);
      if (distance < nearestDistance) {
        nearestStop = stop;
        nearestDistance = distance;
      }
    }
    return nearestStop;
  }, [activeMode, currentStops, location]);

  const destinationDistance = useMemo(() => {
    if (!location || !currentDest) return null;
    return haversineMeters(location.lat, location.lng, currentDest.latitude, currentDest.longitude);
  }, [currentDest, location]);

  function nextLocalId(): number {
    localIdRef.current -= 1;
    localStorage.setItem(LOCAL_ID_KEY, String(localIdRef.current));
    return localIdRef.current;
  }

  function cacheKey(userId: number): string {
    return `${CACHE_PREFIX}-${userId}`;
  }

  function persistWorkspace(
    nextUser: UserRecord,
    nextRoutes: RouteRecord[],
    nextStops: Record<number, StopRecord[]>,
    nextAlerts: AlertRecord[]
  ): void {
    const payload: CacheState = {
      user: nextUser,
      routes: nextRoutes,
      stopsByRoute: nextStops,
      alerts: nextAlerts,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(cacheKey(nextUser.id), JSON.stringify(payload));
    localStorage.setItem(LAST_USER_KEY, JSON.stringify(nextUser));
  }

  async function loadWorkspace(nextUser: UserRecord): Promise<void> {
    try {
      const fetchedRoutes = await listRoutes(nextUser.id);
      const fetchedAlerts = await listAlerts(nextUser.id);
      const stopEntries = await Promise.all(
        fetchedRoutes.map(async (route) => [route.id, await listStops(route.id)] as const)
      );
      const nextStopsByRoute: Record<number, StopRecord[]> = {};
      stopEntries.forEach(([routeId, nextStops]) => (nextStopsByRoute[routeId] = nextStops));
      setRoutes(fetchedRoutes);
      setAlerts(fetchedAlerts);
      setStopsByRoute(nextStopsByRoute);
      persistWorkspace(nextUser, fetchedRoutes, nextStopsByRoute, fetchedAlerts);
      setLastSyncTime(new Date().toLocaleString());
      setIsUsingCache(false);
      setStatus("Workspace loaded.");
    } catch {
      const cached = readJson<CacheState | null>(cacheKey(nextUser.id), null);
      if (!cached) throw new Error("No offline cache found for this user.");
      setRoutes(cached.routes);
      setStopsByRoute(cached.stopsByRoute);
      setAlerts(cached.alerts);
      setLastSyncTime(new Date(cached.savedAt).toLocaleString());
      setIsUsingCache(true);
      setStatus(`Loaded offline data (${new Date(cached.savedAt).toLocaleString()}).`);
    }
  }

  function stopAlarm(): void {
    if ("vibrate" in navigator) navigator.vibrate(0);
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setAlarmOn(false);
  }

  function startAlarm(): void {
    const audio = audioRef.current ?? new Audio("/alarm.mp3");
    audioRef.current = audio;
    audio.loop = true;
    audio.volume = 1;
    void audio.play().catch(() => setStatus("Alarm blocked. Tap Arm Alarm first."));
    if ("vibrate" in navigator) navigator.vibrate([1100, 180, 1100, 180, 1100]);
    setAlarmOn(true);
  }

  async function armAlarm(): Promise<void> {
    const audio = audioRef.current ?? new Audio("/alarm.mp3");
    audioRef.current = audio;
    audio.loop = true;
    audio.volume = 1;
    try {
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      setAlarmArmed(true);
      setStatus("Alarm armed.");
    } catch {
      setStatus("Browser blocked audio. Try again and allow sound.");
    }
  }

  useEffect(() => {
    const goOnline = (): void => {
      setOnline(true);
      setIsUsingCache(false);
    };
    const goOffline = (): void => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    
    // Preload cached data on app startup
    const lastUser = readJson<UserRecord | null>(LAST_USER_KEY, null);
    if (lastUser) {
      const cached = readJson<CacheState | null>(cacheKey(lastUser.id), null);
      if (cached) {
        setUser(cached.user);
        setRoutes(cached.routes);
        setStopsByRoute(cached.stopsByRoute);
        setAlerts(cached.alerts);
        setLastSyncTime(new Date(cached.savedAt).toLocaleString());
        setIsUsingCache(true);
        setShowSignIn(false);
        setView("home");
        setStatus("Auto-signed in using cached credentials.");
      } else {
        setShowSignIn(false);
      }
    } else {
      setShowSignIn(false);
    }
    
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    if (!user || !isUsingCache || !online) return;
    // Auto-sync data when coming back online from offline mode
    setStatus("Syncing with server...");
    loadWorkspace(user).catch((error) => {
      setStatus(`Sync failed: ${(error as Error).message}`);
    });
  }, [online, isUsingCache, user]);

  useEffect(() => {
    if (!user) return;
    persistWorkspace(user, routes, stopsByRoute, alerts);
    setLastSyncTime(new Date().toLocaleString());
    setIsUsingCache(false);
  }, [alerts, routes, stopsByRoute, user]);

  useEffect(() => {
    if (!user || !location) return;
    const tick = (): void => {
      const nextNearest = alerts
        .filter((alert) => alert.isActive)
        .map((alert) => {
          const stop = stopById.get(alert.stopId);
          if (!stop) return null;
          const route = routeById.get(stop.routeId);
          if (!route) return null;
          const distanceMeters = haversineMeters(location.lat, location.lng, stop.latitude, stop.longitude);
          return { ...stop, distanceMeters, mode: route.mode, routeName: route.name };
        })
        .filter(
          (entry): entry is StopRecord & { distanceMeters: number; mode: TransitCategory; routeName: string } =>
            Boolean(entry)
        )
        .sort((a, b) => a.distanceMeters - b.distanceMeters);

      setNearest(nextNearest.slice(0, 5));
      const now = Date.now();
      const hit = nextNearest.find((stop) => {
        if (now < (cooldownRef.current[stop.id] ?? 0)) return false;
        return stop.distanceMeters <= triggerDistance(stop.mode, stop.radiusMeters);
      });
      if (!hit) return;
      cooldownRef.current[hit.id] = now + 45000;
      startAlarm();
      setStatus(`Wake alert: ${hit.label} (${MODE_LABEL[hit.mode]}) ${formatMeters(hit.distanceMeters)} away.`);
    };

    tick();
    const timer = window.setInterval(tick, 3000);
    return () => window.clearInterval(timer);
  }, [alerts, location, routeById, stopById, user]);

  useEffect(() => {
    if (!user) return;
    setSelectedRoute((prev) => {
      const next = { ...prev };
      MODES.forEach((mode) => {
        if (!next[mode] || !routesByMode[mode].some((route) => route.id === next[mode])) {
          next[mode] = routesByMode[mode][0]?.id ?? null;
        }
      });
      return next;
    });
  }, [routesByMode, user]);

  useEffect(() => {
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      stopAlarm();
    };
  }, []);

  async function onSignIn(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSigningIn(true);
    try {
      const nextUser = await signIn({
        email: authForm.email.trim(),
        name: authForm.name.trim() || undefined,
        homeCity: "Chennai"
      });
      setUser(nextUser);
      await loadWorkspace(nextUser);
      setShowSignIn(false);
      setView("home");
      setStatus(`Signed in as ${nextUser.email}.`);
    } catch (error) {
      const cachedUser = readJson<UserRecord | null>(LAST_USER_KEY, null);
      if (cachedUser && cachedUser.email.toLowerCase() === authForm.email.trim().toLowerCase()) {
        const cached = readJson<CacheState | null>(cacheKey(cachedUser.id), null);
        if (cached) {
          setUser(cached.user);
          setRoutes(cached.routes);
          setStopsByRoute(cached.stopsByRoute);
          setAlerts(cached.alerts);
          setShowSignIn(false);
          setView("home");
          setStatus("Signed in using offline cache.");
          setIsSigningIn(false);
          return;
        }
      }
      setStatus(`Sign in failed: ${(error as Error).message}`);
    } finally {
      setIsSigningIn(false);
    }
  }

  function onSignOut(): void {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    stopAlarm();
    setRoutes([]);
    setStopsByRoute({});
    setAlerts([]);
    setView("home");
    setUser(null);
    setLocation(null);
    setLastFixTime("");
    setShowSignIn(false);
    localStorage.removeItem(LAST_USER_KEY);
    setStatus("Signed out. Explore first and sign in only when needed.");
  }

  function startLocation(): void {
    if (!user) {
      setShowSignIn(true);
      setStatus("Sign in required to start tracking.");
      return;
    }
    if (!("geolocation" in navigator)) {
      setStatus("Geolocation not supported.");
      return;
    }
    setIsLocating(true);
    void armAlarm();
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLastFixTime(new Date().toLocaleTimeString());
        setIsLocating(false);
      },
      (error) => {
        setStatus(`Location error: ${error.message}`);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 }
    );
  }

  function selectModeRoute(mode: TransitCategory, routeId: number): void {
    setSelectedRoute((prev) => ({ ...prev, [mode]: routeId }));
    const stops = (stopsByRoute[routeId] ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder);
    setSelectedDestination((prev) => ({ ...prev, [mode]: stops[1]?.id ?? stops[0]?.id ?? null }));
  }

  async function setAlert(stopId: number, isActive: boolean): Promise<void> {
    if (!user) {
      setShowSignIn(true);
      setStatus("Sign in required.");
      return;
    }
    const existing = alerts.find((alert) => alert.stopId === stopId);
    if (existing) {
      setAlerts((prev) => prev.map((alert) => (alert.id === existing.id ? { ...alert, isActive } : alert)));
      try {
        if (existing.id > 0) {
          const updated = await toggleAlert(existing.id, isActive);
          setAlerts((prev) => prev.map((alert) => (alert.id === updated.id ? updated : alert)));
        }
      } catch {
        setStatus("Alert updated locally.");
      }
      return;
    }
    const tempAlert: AlertRecord = {
      id: nextLocalId(),
      userId: user.id,
      stopId,
      isActive,
      vibrationEnabled: true,
      soundEnabled: true,
      lastTriggeredAt: null
    };
    setAlerts((prev) => [...prev, tempAlert]);
    if (!isActive) return;
    try {
      const created = await createAlert({
        userId: user.id,
        stopId,
        isActive: true,
        vibrationEnabled: true,
        soundEnabled: true
      });
      setAlerts((prev) => prev.map((alert) => (alert.id === tempAlert.id ? created : alert)));
    } catch {
      setStatus("Alert saved locally.");
    }
  }

  async function activateDestinationAlarm(): Promise<void> {
    if (!activeMode || !currentDest) return;
    await setAlert(currentDest.id, true);
    setStatus(`Wake alert enabled for ${currentDest.label}.`);
  }

  async function addCustomStop(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!user) {
      setShowSignIn(true);
      setStatus("Sign in required.");
      return;
    }
    if (!customRoute) {
      return;
    }
    if (!pickedLocation) {
      setStatus("Tap map to pick location.");
      return;
    }
    const radius = Number(customRadius);
    if (!Number.isFinite(radius) || radius < 50 || radius > 3000) {
      setStatus("Radius must be between 50 and 3000.");
      return;
    }
    const tempStop: StopRecord = {
      id: nextLocalId(),
      routeId: customRoute.id,
      label: customLabel.trim(),
      shortcut: "custom",
      latitude: pickedLocation.lat,
      longitude: pickedLocation.lng,
      radiusMeters: radius,
      sortOrder: customStops.length + 1
    };
    setStopsByRoute((prev) => ({ ...prev, [customRoute.id]: [...(prev[customRoute.id] ?? []), tempStop] }));
    let savedStop = tempStop;
    try {
      savedStop = await createStop({
        routeId: customRoute.id,
        label: customLabel.trim(),
        shortcut: "custom",
        latitude: pickedLocation.lat,
        longitude: pickedLocation.lng,
        radiusMeters: radius,
        sortOrder: customStops.length + 1
      });
      setStopsByRoute((prev) => ({
        ...prev,
        [customRoute.id]: (prev[customRoute.id] ?? []).map((stop) => (stop.id === tempStop.id ? savedStop : stop))
      }));
    } catch {
      setStatus("Custom stop saved locally.");
    }
    await setAlert(savedStop.id, true);
    setCustomLabel("");
    setCustomRadius("600");
    setPickedLocation(null);
  }

  async function saveCustomEdit(stopId: number): Promise<void> {
    if (!customRoute) return;
    const radius = Number(editRadius);
    if (!Number.isFinite(radius) || radius < 50 || radius > 3000) {
      setStatus("Radius must be between 50 and 3000.");
      return;
    }
    setStopsByRoute((prev) => ({
      ...prev,
      [customRoute.id]: (prev[customRoute.id] ?? []).map((stop) =>
        stop.id === stopId ? { ...stop, label: editLabel.trim(), radiusMeters: radius } : stop
      )
    }));
    try {
      if (stopId > 0) await updateStop(stopId, { label: editLabel.trim(), radiusMeters: radius });
    } catch {
      setStatus("Edit saved locally.");
    }
    setEditingStopId(null);
  }

  async function removeCustom(stopId: number): Promise<void> {
    if (!customRoute) return;
    setStopsByRoute((prev) => ({
      ...prev,
      [customRoute.id]: (prev[customRoute.id] ?? []).filter((stop) => stop.id !== stopId)
    }));
    setAlerts((prev) => prev.filter((alert) => alert.stopId !== stopId));
    try {
      if (stopId > 0) await deleteStop(stopId);
    } catch {
      setStatus("Stop removed locally.");
    }
  }

  async function clearCustom(): Promise<void> {
    if (!customRoute) return;
    const ids = new Set(customStops.map((stop) => stop.id));
    setStopsByRoute((prev) => ({ ...prev, [customRoute.id]: [] }));
    setAlerts((prev) => prev.filter((alert) => !ids.has(alert.stopId)));
    try {
      await clearRouteStops(customRoute.id);
    } catch {
      setStatus("Quick delete applied locally.");
    }
  }

  function openMode(mode: TransitCategory): void {
    setView(mode);
    if (!selectedRoute[mode]) {
      const first = routesByMode[mode][0];
      if (first) selectModeRoute(mode, first.id);
    }
  }

  const destinationOptions =
    activeMode && activeMode !== "custom"
      ? (() => {
          const filtered = currentStops.filter((stop) => (autoStartStop ? stop.sortOrder > autoStartStop.sortOrder : true));
          if (filtered.length > 0) return filtered;
          return currentStops.filter((stop) => stop.id !== autoStartStop?.id);
        })()
      : [];

  const filteredRoutesByMode = useMemo(() => {
    const query = routeSearch.trim().toLowerCase();
    if (!query) return routesByMode;
    const filtered: Record<TransitCategory, RouteRecord[]> = { bus: [], train: [], metro: [], custom: [] };
    (["bus", "train", "metro", "custom"] as const).forEach((mode) => {
      filtered[mode] = routesByMode[mode].filter((route) => {
        const routeText = `${route.name} ${route.startLocation} ${route.endLocation}`.toLowerCase();
        if (routeText.includes(query)) return true;
        const stops = stopsByRoute[route.id] ?? [];
        return stops.some((stop) => stop.label.toLowerCase().includes(query));
      });
    });
    return filtered;
  }, [routeSearch, routesByMode, stopsByRoute]);

  useEffect(() => {
    if (!activeMode || activeMode === "custom") return;
    if (destinationOptions.length === 0) {
      setSelectedDestination((prev) => ({ ...prev, [activeMode]: null }));
      return;
    }
    const currentSelection = selectedDestination[activeMode];
    if (!currentSelection || !destinationOptions.some((stop) => stop.id === currentSelection)) {
      setSelectedDestination((prev) => ({ ...prev, [activeMode]: destinationOptions[0].id }));
    }
  }, [activeMode, destinationOptions, selectedDestination]);

  return (
    <main className="app-shell">
      <header className="top-nav">
        <button type="button" className="brand" onClick={() => setView("home")}>
          <span className="brand-logo">
            <Logo />
          </span>
          <span>Next Stop</span>
        </button>
        <nav className="nav-links">
          <button type="button" onClick={() => openMode("train")}>Train</button>
          <button type="button" onClick={() => openMode("metro")}>Metro</button>
          <button type="button" onClick={() => openMode("bus")}>Bus</button>
          <button type="button" onClick={() => openMode("custom")}>Custom</button>
          <button type="button" onClick={() => setView("routes")}>Routes List</button>
          {user ? (
            <button type="button" onClick={onSignOut}>Sign Out</button>
          ) : (
            <button type="button" onClick={() => setShowSignIn(true)}>Sign In</button>
          )}
        </nav>
      </header>

      <section className="system-bar">
        <p>
          {online ? "Online" : "Offline"} | {isUsingCache ? "[cached data]" : ""} {status}
          {lastFixTime ? ` | Location: ${lastFixTime}` : ""}
          {lastSyncTime && `| Synced: ${lastSyncTime}`}
        </p>
      </section>

      {view === "home" ? (
        <section className="home-grid">
          <article className="home-hero">
            <h1>StopMate Chennai Transit Wake-Up App</h1>
            <p>
              Track your trip in real time, auto-detect your nearest boarding point from your location,
              and get a wake-up alert before your destination.
            </p>
            <p>
              StopMate combines route planning, live stop-distance updates, and alert automation in a
              focused interface made for busy daily travel.
            </p>
          </article>

          <section className="home-columns">
            <article className="home-about">
              <h2>About StopMate</h2>
              <p>
                StopMate is built for practical city commuting. It helps daily travelers across train,
                metro, bus, and custom routes with reliable wake-up alerts.
              </p>
              <p>
                The app solves one specific pain point: missing your stop. Open the app, select route,
                pick destination, and keep the alarm workflow ready in the background.
              </p>
              <p>
                The experience is tuned for mobile use, unstable networks, and repeat daily travel.
              </p>
            </article>

            <article className="home-workflow">
              <h2>How It Works</h2>
              <ol>
                {APP_WORKFLOW.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </article>
          </section>

          <section className="home-highlights" aria-label="App highlights">
            {APP_HIGHLIGHTS.map((item) => (
              <article key={item.title} className="home-highlight-card">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </section>

          <section className="home-transport-grid" aria-label="Transport options">
            {HOME_MODE_ORDER.map((mode) => (
              <article key={mode} className="transport-card">
                <h3>{MODE_LABEL[mode]}</h3>
                <p className="muted">{MODE_DESCRIPTION[mode]}</p>
                <button type="button" className="open-btn" onClick={() => openMode(mode)}>
                  Open {MODE_LABEL[mode]}
                </button>
              </article>
            ))}
          </section>
        </section>
      ) : null}

      {view === "routes" ? (
        <section className="routes-page">
          <div className="routes-header">
            <h1>Routes List</h1>
            <p className="muted">
              Search by route name, terminal, or stop name. Expand any route to view the full stop order.
            </p>
          </div>
          <div className="routes-toolbar">
            <input
              className="routes-search"
              value={routeSearch}
              onChange={(event) => setRouteSearch(event.target.value)}
              placeholder="Search routes or stops (example: Guindy, Central, OMR)"
            />
          </div>
          {!user ? (
            <p className="muted">Sign in to load your saved routes and alerts. You can still browse the app before that.</p>
          ) : null}
          {(["train", "metro", "bus"] as const).map((mode) => {
            const modeRoutes = filteredRoutesByMode[mode];
            const totalStops = modeRoutes.reduce((count, route) => count + (stopsByRoute[route.id]?.length ?? 0), 0);
            return (
            <article key={mode} className="routes-group">
              <div className="routes-group-head">
                <h2>{MODE_LABEL[mode]} Routes</h2>
                <p className="muted">{modeRoutes.length} route(s) | {totalStops} stop(s)</p>
              </div>
              <div className="routes-group-list">
                {modeRoutes.map((route) => {
                  const routeStops = (stopsByRoute[route.id] ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder);
                  const previewStops = routeStops.slice(0, 6).map((stop) => stop.label).join(" • ");
                  return (
                  <div key={route.id} className="route-item">
                    <div className="route-item-head">
                      <h3>{route.name}</h3>
                      <span className="route-pill">{routeStops.length} stops</span>
                    </div>
                    <p className="route-meta">
                      {route.startLocation} {"->"} {route.endLocation}
                    </p>
                    <p className="route-stops-preview muted">
                      {previewStops}
                      {routeStops.length > 6 ? ` • +${routeStops.length - 6} more` : ""}
                    </p>
                    <details className="route-details">
                      <summary>View all stops</summary>
                      <ol>
                        {routeStops.map((stop) => (
                          <li key={stop.id}>{stop.label}</li>
                        ))}
                      </ol>
                    </details>
                  </div>
                  );
                })}
                {modeRoutes.length === 0 ? (
                  <p className="muted">
                    {routeSearch.trim() ? "No matching routes in this mode." : "No routes loaded."}
                  </p>
                ) : null}
              </div>
            </article>
            );
          })}
        </section>
      ) : null}

      {activeMode ? (
        <section className="mode-page">
          <div className="mode-map-panel">
            <MapView
              stops={currentStops}
              currentLocation={location}
              pickedLocation={activeMode === "custom" ? pickedLocation : null}
              highlightedStopId={currentDest?.id ?? null}
              overlayPaths={metroOverlayPaths}
              onPickLocation={activeMode === "custom" ? setPickedLocation : undefined}
            />
          </div>

          <aside className="mode-controls">
            <header>
              <h1>{MODE_LABEL[activeMode]} Planner</h1>
              <p className="muted">Full-page view with live alarm planning.</p>
            </header>

            <div className="control-row">
              <button type="button" onClick={startLocation}>
                {isLocating ? "Locating..." : "Enable Location"}
              </button>
              <button type="button" onClick={() => void armAlarm()}>
                {alarmArmed ? "Alarm Armed" : "Arm Alarm"}
              </button>
              <button type="button" onClick={stopAlarm}>Disable Alarm</button>
            </div>

            {activeMode !== "custom" ? (
              <section className="panel">
                <h2>Route Selection</h2>
                <p className="muted">
                  Start point is automatic from your live location.
                </p>
                <div className="route-selector">
                  {routesByMode[activeMode].map((route) => (
                    <button
                      key={route.id}
                      type="button"
                      className={currentRoute?.id === route.id ? "active" : ""}
                      onClick={() => selectModeRoute(activeMode, route.id)}
                    >
                      {route.name}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {activeMode !== "custom" ? (
              <section className="panel">
                <h2>Destination Setup</h2>
                <p className="muted">
                  {location && autoStartStop
                    ? `Detected start: ${autoStartStop.label}`
                    : "Enable location to auto-detect your nearest start stop."}
                </p>
                <label>
                  Destination stop
                  <select
                    value={selectedDestination[activeMode] ?? ""}
                    disabled={destinationOptions.length === 0}
                    onChange={(event) =>
                      setSelectedDestination((prev) => ({ ...prev, [activeMode]: Number(event.target.value) }))
                    }
                  >
                    {destinationOptions.length === 0 ? (
                      <option value="">No destination stops available</option>
                    ) : null}
                    {destinationOptions.map((stop) => (
                      <option key={stop.id} value={stop.id}>{stop.label}</option>
                    ))}
                  </select>
                </label>
                <button type="button" disabled={!currentDest} onClick={() => void activateDestinationAlarm()}>
                  Enable Wake-Up Alert
                </button>
                {currentDest && destinationDistance !== null ? (
                  <p className="muted">
                    Distance to {currentDest.label}: {formatMeters(destinationDistance)}
                  </p>
                ) : null}
              </section>
            ) : (
              <section className="panel">
                <h2>Custom Stops</h2>
                <form className="custom-form" onSubmit={(event) => void addCustomStop(event)}>
                  <label>
                    Label
                    <input value={customLabel} onChange={(event) => setCustomLabel(event.target.value)} required />
                  </label>
                  <label>
                    Radius (m)
                    <input value={customRadius} onChange={(event) => setCustomRadius(event.target.value)} required />
                  </label>
                  <label>
                    Picked Point
                    <input
                      readOnly
                      value={pickedLocation ? `${pickedLocation.lat.toFixed(6)}, ${pickedLocation.lng.toFixed(6)}` : "Tap map"}
                    />
                  </label>
                  <div className="control-row">
                    <button type="submit">Add Stop</button>
                    <button type="button" onClick={() => void clearCustom()}>Quick Delete All</button>
                  </div>
                </form>
                <div className="custom-list">
                  {customStops.map((stop) => (
                    <article key={stop.id} className="custom-item">
                      {editingStopId === stop.id ? (
                        <div className="edit-box">
                          <input value={editLabel} onChange={(event) => setEditLabel(event.target.value)} />
                          <input value={editRadius} onChange={(event) => setEditRadius(event.target.value)} />
                          <div className="control-row">
                            <button type="button" onClick={() => void saveCustomEdit(stop.id)}>Save</button>
                            <button type="button" onClick={() => setEditingStopId(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div>
                            <strong>{stop.label}</strong>
                            <p className="muted">Radius {stop.radiusMeters}m</p>
                          </div>
                          <div className="control-row">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingStopId(stop.id);
                                setEditLabel(stop.label);
                                setEditRadius(String(stop.radiusMeters));
                              }}
                            >
                              Edit
                            </button>
                            <button type="button" onClick={() => void removeCustom(stop.id)}>Quick Delete</button>
                          </div>
                        </>
                      )}
                    </article>
                  ))}
                  {customStops.length === 0 ? <p className="muted">No custom stops yet.</p> : null}
                </div>
              </section>
            )}

            {activeMode !== "custom" ? (
              <section className="panel">
                <h2>{MODE_LABEL[activeMode]} Stops</h2>
                <div className="stop-list">
                  {currentStops.map((stop) => {
                    const near = nearest.find((item) => item.id === stop.id);
                    const alert = alerts.find((item) => item.stopId === stop.id);
                    return (
                      <article key={stop.id} className="stop-row">
                        <div>
                          <strong>{stop.label}</strong>
                          <p className="muted">
                            Radius {stop.radiusMeters}m
                            {near ? ` | ${formatMeters(near.distanceMeters)} away` : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          className={alert?.isActive ? "active" : ""}
                          onClick={() => void setAlert(stop.id, !(alert?.isActive ?? false))}
                        >
                          {alert?.isActive ? "Pause" : "Enable"}
                        </button>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </aside>
        </section>
      ) : null}

      {alarmOn ? (
        <button type="button" className="alarm-pill" onClick={stopAlarm}>
          DISABLE ALARM
        </button>
      ) : null}

      {showSignIn ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="signin-title">
          <div className="auth-modal">
            <h2 id="signin-title">Sign In</h2>
            <form onSubmit={(event) => void onSignIn(event)}>
              <label>
                Email
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(event) =>
                    setAuthForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Name (optional)
                <input
                  value={authForm.name}
                  onChange={(event) =>
                    setAuthForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
              </label>
              <div className="control-row">
                <button type="submit" disabled={isSigningIn}>
                  {isSigningIn ? "Signing In..." : "Sign In"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSignIn(false)}
                  disabled={isSigningIn}
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <footer className="app-footer">
        <p>Developer: SAKTHINADHAN GT</p>
      </footer>
    </main>
  );
}
