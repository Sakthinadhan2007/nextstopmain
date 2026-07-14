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
} from "../shared/routes.js";

type SeedStop = { label: string; latitude: number; longitude: number; radiusMeters: number };
type SeedRoute = {
  mode: TransitCategory;
  name: string;
  startLocation: string;
  endLocation: string;
  stops: SeedStop[];
};

const CHENNAI_TRANSIT_SEED: SeedRoute[] = [
  {
    mode: "bus",
    name: "MTC 21G Broadway - Tambaram",
    startLocation: "Parrys Corner",
    endLocation: "Tambaram",
    stops: [
      { label: "Parrys Corner", latitude: 13.09277, longitude: 80.28649, radiusMeters: 500 },
      { label: "Mannadi", latitude: 13.09181, longitude: 80.28324, radiusMeters: 500 },
      { label: "Central Railway Station", latitude: 13.08386, longitude: 80.27562, radiusMeters: 500 },
      { label: "Egmore", latitude: 13.07339, longitude: 80.26054, radiusMeters: 500 },
      { label: "DMS", latitude: 13.04468, longitude: 80.24805, radiusMeters: 500 },
      { label: "Nandanam", latitude: 13.03148, longitude: 80.23965, radiusMeters: 500 },
      { label: "Saidapet", latitude: 13.02311, longitude: 80.22363, radiusMeters: 500 },
      { label: "Little Mount", latitude: 13.01418, longitude: 80.22362, radiusMeters: 500 },
      { label: "Guindy", latitude: 13.00953, longitude: 80.20413, radiusMeters: 500 },
      { label: "Kathipara", latitude: 13.00833, longitude: 80.19392, radiusMeters: 500 },
      { label: "Meenambakkam", latitude: 12.98741, longitude: 80.1765, radiusMeters: 500 },
      { label: "Pallavaram", latitude: 12.96743, longitude: 80.14915, radiusMeters: 500 },
      { label: "Chromepet", latitude: 12.9519, longitude: 80.14629, radiusMeters: 500 },
      { label: "Tambaram Sanatorium", latitude: 12.93961, longitude: 80.14043, radiusMeters: 500 },
      { label: "Tambaram", latitude: 12.92487, longitude: 80.12767, radiusMeters: 500 }
    ]
  },
  {
    mode: "bus",
    name: "MTC OMR IT Corridor",
    startLocation: "High Court",
    endLocation: "Sholinganallur",
    stops: [
      { label: "High Court", latitude: 13.08761, longitude: 80.28543, radiusMeters: 500 },
      { label: "Parrys Corner", latitude: 13.09277, longitude: 80.28649, radiusMeters: 500 },
      { label: "LIC", latitude: 13.06456, longitude: 80.26602, radiusMeters: 500 },
      { label: "Teynampet", latitude: 13.03666, longitude: 80.23909, radiusMeters: 500 },
      { label: "Adyar Depot", latitude: 13.00118, longitude: 80.25649, radiusMeters: 500 },
      { label: "Tidel Park", latitude: 12.99421, longitude: 80.24722, radiusMeters: 500 },
      { label: "SRP Tools", latitude: 12.9899, longitude: 80.2402, radiusMeters: 500 },
      { label: "Thiruvanmiyur", latitude: 12.98436, longitude: 80.25941, radiusMeters: 500 },
      { label: "Perungudi", latitude: 12.96958, longitude: 80.24563, radiusMeters: 500 },
      { label: "Kandanchavadi", latitude: 12.9567, longitude: 80.2416, radiusMeters: 500 },
      { label: "Karapakkam", latitude: 12.93607, longitude: 80.23052, radiusMeters: 500 },
      { label: "Sholinganallur", latitude: 12.90101, longitude: 80.22793, radiusMeters: 500 }
    ]
  },
  {
    mode: "bus",
    name: "MTC Broadway - Red Hills",
    startLocation: "Broadway",
    endLocation: "Red Hills",
    stops: [
      { label: "Broadway", latitude: 13.09277, longitude: 80.28649, radiusMeters: 500 },
      { label: "Mint", latitude: 13.1053, longitude: 80.2854, radiusMeters: 500 },
      { label: "Washermenpet", latitude: 13.1147, longitude: 80.2846, radiusMeters: 500 },
      { label: "Tondiarpet", latitude: 13.1275, longitude: 80.2892, radiusMeters: 500 },
      { label: "Moolakadai", latitude: 13.1341, longitude: 80.2301, radiusMeters: 500 },
      { label: "Madhavaram", latitude: 13.1486, longitude: 80.2308, radiusMeters: 500 },
      { label: "Puzhal Camp", latitude: 13.1582, longitude: 80.2037, radiusMeters: 500 },
      { label: "Red Hills", latitude: 13.1896, longitude: 80.1993, radiusMeters: 500 }
    ]
  },
  {
    mode: "metro",
    name: "Chennai Metro Blue Line",
    startLocation: "Wimco Nagar Depot Metro",
    endLocation: "Airport Metro",
    stops: [
      { label: "Wimco Nagar Depot Metro", latitude: 13.17166, longitude: 80.30446, radiusMeters: 250 },
      { label: "Wimco Nagar Metro", latitude: 13.1672, longitude: 80.3033, radiusMeters: 250 },
      { label: "Tiruvottriyur Metro", latitude: 13.1608, longitude: 80.3015, radiusMeters: 250 },
      { label: "Tiruvottriyur Theradi Metro", latitude: 13.1504, longitude: 80.2993, radiusMeters: 250 },
      { label: "Kaladipet Metro", latitude: 13.1398, longitude: 80.2934, radiusMeters: 250 },
      { label: "Tollgate Metro", latitude: 13.1279, longitude: 80.288, radiusMeters: 250 },
      { label: "New Washermenpet Metro", latitude: 13.1187, longitude: 80.287, radiusMeters: 250 },
      { label: "Tondiarpet Metro", latitude: 13.12454, longitude: 80.28918, radiusMeters: 250 },
      { label: "Sir Theagaraya College Metro", latitude: 13.1154, longitude: 80.2877, radiusMeters: 250 },
      { label: "Washermenpet Metro", latitude: 13.10706, longitude: 80.28053, radiusMeters: 250 },
      { label: "Mannadi Metro", latitude: 13.0918, longitude: 80.2832, radiusMeters: 250 },
      { label: "High Court Metro", latitude: 13.08737, longitude: 80.28502, radiusMeters: 250 },
      { label: "Chennai Central Metro", latitude: 13.08267, longitude: 80.27558, radiusMeters: 250 },
      { label: "Government Estate Metro", latitude: 13.0697, longitude: 80.2727, radiusMeters: 250 },
      { label: "LIC Metro", latitude: 13.06456, longitude: 80.26602, radiusMeters: 250 },
      { label: "Thousand Lights Metro", latitude: 13.0582, longitude: 80.25813, radiusMeters: 250 },
      { label: "AG-DMS Metro", latitude: 13.04468, longitude: 80.24805, radiusMeters: 250 },
      { label: "Teynampet Metro", latitude: 13.03666, longitude: 80.23909, radiusMeters: 250 },
      { label: "Nandanam Metro", latitude: 13.03148, longitude: 80.23965, radiusMeters: 250 },
      { label: "Saidapet Metro", latitude: 13.02358, longitude: 80.22812, radiusMeters: 250 },
      { label: "Little Mount Metro", latitude: 13.01418, longitude: 80.22362, radiusMeters: 250 },
      { label: "Guindy Metro", latitude: 13.0085, longitude: 80.20365, radiusMeters: 250 },
      { label: "Alandur Metro", latitude: 13.00577, longitude: 80.20154, radiusMeters: 250 },
      { label: "Nanganallur Road Metro", latitude: 12.99999, longitude: 80.19399, radiusMeters: 250 },
      { label: "Meenambakkam Metro", latitude: 12.98741, longitude: 80.1765, radiusMeters: 250 },
      { label: "Airport Metro", latitude: 12.98078, longitude: 80.1642, radiusMeters: 250 }
    ]
  },
  {
    mode: "metro",
    name: "Chennai Metro Green Line",
    startLocation: "Chennai Central Metro",
    endLocation: "St. Thomas Mount Metro",
    stops: [
      { label: "Chennai Central Metro", latitude: 13.08267, longitude: 80.27558, radiusMeters: 250 },
      { label: "Egmore Metro", latitude: 13.07491, longitude: 80.26177, radiusMeters: 250 },
      { label: "Nehru Park Metro", latitude: 13.07852, longitude: 80.25085, radiusMeters: 250 },
      { label: "Kilpauk Metro", latitude: 13.07749, longitude: 80.24287, radiusMeters: 250 },
      { label: "Pachaiyappas College Metro", latitude: 13.07557, longitude: 80.23235, radiusMeters: 250 },
      { label: "Shenoy Nagar Metro", latitude: 13.0787, longitude: 80.22553, radiusMeters: 250 },
      { label: "Anna Nagar East Metro", latitude: 13.08468, longitude: 80.21861, radiusMeters: 250 },
      { label: "Anna Nagar Tower Metro", latitude: 13.08533, longitude: 80.20864, radiusMeters: 250 },
      { label: "Thirumangalam Metro", latitude: 13.0851, longitude: 80.2011, radiusMeters: 250 },
      { label: "Koyambedu Metro", latitude: 13.06857, longitude: 80.20388, radiusMeters: 250 },
      { label: "CMBT Metro", latitude: 13.0681, longitude: 80.2056, radiusMeters: 250 },
      { label: "Arumbakkam Metro", latitude: 13.0623, longitude: 80.21131, radiusMeters: 250 },
      { label: "Vadapalani Metro", latitude: 13.05099, longitude: 80.21272, radiusMeters: 250 },
      { label: "Ashok Nagar Metro", latitude: 13.03534, longitude: 80.21252, radiusMeters: 250 },
      { label: "Ekkatuthangal Metro", latitude: 13.01691, longitude: 80.20529, radiusMeters: 250 },
      { label: "Alandur Metro", latitude: 13.00577, longitude: 80.20154, radiusMeters: 250 },
      { label: "St. Thomas Mount Metro", latitude: 13.00586, longitude: 80.20374, radiusMeters: 250 }
    ]
  },
  {
    mode: "train",
    name: "Chennai Beach - Tambaram Suburban",
    startLocation: "Chennai Beach",
    endLocation: "Tambaram",
    stops: [
      { label: "Chennai Beach", latitude: 13.09283, longitude: 80.29205, radiusMeters: 600 },
      { label: "Chennai Fort", latitude: 13.08716, longitude: 80.28703, radiusMeters: 600 },
      { label: "Park Town", latitude: 13.0822, longitude: 80.2757, radiusMeters: 600 },
      { label: "Chennai Park", latitude: 13.0807, longitude: 80.27541, radiusMeters: 600 },
      { label: "Chennai Egmore", latitude: 13.0732, longitude: 80.2609, radiusMeters: 600 },
      { label: "Chetpet", latitude: 13.0701, longitude: 80.2414, radiusMeters: 600 },
      { label: "Nungambakkam", latitude: 13.0606, longitude: 80.2397, radiusMeters: 600 },
      { label: "Kodambakkam", latitude: 13.0521, longitude: 80.2214, radiusMeters: 600 },
      { label: "Mambalam", latitude: 13.0386, longitude: 80.2212, radiusMeters: 600 },
      { label: "Saidapet", latitude: 13.0245, longitude: 80.2283, radiusMeters: 600 },
      { label: "Guindy", latitude: 13.0082, longitude: 80.2125, radiusMeters: 600 },
      { label: "St. Thomas Mount", latitude: 13.0039, longitude: 80.1961, radiusMeters: 600 },
      { label: "Pazhavanthangal", latitude: 12.9952, longitude: 80.1882, radiusMeters: 600 },
      { label: "Meenambakkam", latitude: 12.98741, longitude: 80.1765, radiusMeters: 600 },
      { label: "Trisulam", latitude: 12.9817, longitude: 80.1668, radiusMeters: 600 },
      { label: "Pallavaram", latitude: 12.96753, longitude: 80.1491, radiusMeters: 600 },
      { label: "Chromepet", latitude: 12.95168, longitude: 80.14621, radiusMeters: 600 },
      { label: "Tambaram Sanatorium", latitude: 12.93961, longitude: 80.14043, radiusMeters: 600 },
      { label: "Tambaram", latitude: 12.9249, longitude: 80.1267, radiusMeters: 600 }
    ]
  },
  {
    mode: "train",
    name: "Chennai Central - Avadi Suburban",
    startLocation: "Chennai Central",
    endLocation: "Avadi",
    stops: [
      { label: "Chennai Central", latitude: 13.0829, longitude: 80.2759, radiusMeters: 600 },
      { label: "Moore Market Complex", latitude: 13.0831, longitude: 80.2742, radiusMeters: 600 },
      { label: "Basin Bridge", latitude: 13.09265, longitude: 80.26773, radiusMeters: 600 },
      { label: "Vyasarpadi Jeeva", latitude: 13.11862, longitude: 80.26246, radiusMeters: 600 },
      { label: "Perambur", latitude: 13.11144, longitude: 80.24687, radiusMeters: 600 },
      { label: "Perambur Carriage Works", latitude: 13.1122, longitude: 80.2366, radiusMeters: 600 },
      { label: "Perambur Loco Works", latitude: 13.1129, longitude: 80.2258, radiusMeters: 600 },
      { label: "Villivakkam", latitude: 13.10882, longitude: 80.20781, radiusMeters: 600 },
      { label: "Korattur", latitude: 13.11513, longitude: 80.18484, radiusMeters: 600 },
      { label: "Pattaravakkam", latitude: 13.12385, longitude: 80.1447, radiusMeters: 600 },
      { label: "Ambattur", latitude: 13.11434, longitude: 80.15479, radiusMeters: 600 },
      { label: "Tirumullaivoyal", latitude: 13.13073, longitude: 80.13141, radiusMeters: 600 },
      { label: "Annanur", latitude: 13.1253, longitude: 80.1151, radiusMeters: 600 },
      { label: "Avadi", latitude: 13.11496, longitude: 80.10188, radiusMeters: 600 }
    ]
  },
  {
    mode: "train",
    name: "Chennai Beach - Velachery MRTS",
    startLocation: "Chennai Beach",
    endLocation: "Velachery",
    stops: [
      { label: "Chennai Beach", latitude: 13.09283, longitude: 80.29205, radiusMeters: 600 },
      { label: "Chennai Fort", latitude: 13.08716, longitude: 80.28703, radiusMeters: 600 },
      { label: "Park Town", latitude: 13.0822, longitude: 80.2757, radiusMeters: 600 },
      { label: "Chintadripet", latitude: 13.0731, longitude: 80.2691, radiusMeters: 600 },
      { label: "Chepauk", latitude: 13.0621, longitude: 80.2795, radiusMeters: 600 },
      { label: "Tiruvallikeni", latitude: 13.0551, longitude: 80.2793, radiusMeters: 600 },
      { label: "Light House", latitude: 13.049, longitude: 80.2788, radiusMeters: 600 },
      { label: "Mundakakanni Amman Koil", latitude: 13.0351, longitude: 80.2696, radiusMeters: 600 },
      { label: "Thirumayilai", latitude: 13.0336, longitude: 80.2678, radiusMeters: 600 },
      { label: "Mandaveli", latitude: 13.0266, longitude: 80.2644, radiusMeters: 600 },
      { label: "Greenways Road", latitude: 13.0188, longitude: 80.2584, radiusMeters: 600 },
      { label: "Kotturpuram", latitude: 13.0121, longitude: 80.2414, radiusMeters: 600 },
      { label: "Kasturba Nagar", latitude: 12.9959, longitude: 80.257, radiusMeters: 600 },
      { label: "Indira Nagar", latitude: 12.9963, longitude: 80.2489, radiusMeters: 600 },
      { label: "Thiruvanmiyur", latitude: 12.98436, longitude: 80.25941, radiusMeters: 600 },
      { label: "Taramani", latitude: 12.9851, longitude: 80.2414, radiusMeters: 600 },
      { label: "Perungudi", latitude: 12.9767, longitude: 80.24, radiusMeters: 600 },
      { label: "Velachery", latitude: 12.9793, longitude: 80.2209, radiusMeters: 600 }
    ]
  },
  {
    mode: "custom",
    name: "My Custom Stops",
    startLocation: "Anywhere in Chennai",
    endLocation: "Your saved destination",
    stops: []
  }
];

const modePriority: Record<TransitCategory, number> = {
  bus: 0,
  train: 1,
  metro: 2,
  custom: 3
};

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase();
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

export class InMemoryStorage {
  private userId = 1;
  private routeId = 1;
  private stopId = 1;
  private alertId = 1;

  private users = new Map<number, UserRecord>();
  private routes = new Map<number, RouteRecord>();
  private stops = new Map<number, StopRecord>();
  private alerts = new Map<number, AlertRecord>();

  private findUserByEmail(email: string): UserRecord | undefined {
    const normalized = normalizeEmail(email);
    return [...this.users.values()].find((user) => user.email === normalized);
  }

  signIn(input: SignInInput): UserRecord {
    const derivedName = input.name ?? input.email.split("@")[0];
    const user = this.createUser({
      name: derivedName,
      email: input.email,
      homeCity: input.homeCity ?? "Chennai"
    });
    this.ensureSeedDataForUser(user.id);
    return user;
  }

  private ensureSeedDataForUser(userId: number): void {
    const userRoutes = this.listRoutes(userId);

    for (const seed of CHENNAI_TRANSIT_SEED) {
      let route = userRoutes.find((item) => item.mode === seed.mode && item.name === seed.name);
      if (!route) {
        route = this.createRoute({
          userId,
          name: seed.name,
          mode: seed.mode,
          startLocation: seed.startLocation,
          endLocation: seed.endLocation,
          city: "Chennai",
          polyline: seed.stops.map((stop) => ({ lat: stop.latitude, lng: stop.longitude }))
        });
        userRoutes.push(route);
      }

      if (seed.stops.length === 0) {
        continue;
      }

      const existingStops = this.listStops(route.id);
      const existingByLabel = new Map(existingStops.map((stop) => [normalizeLabel(stop.label), stop]));

      seed.stops.forEach((seedStop, index) => {
        const normalized = normalizeLabel(seedStop.label);
        const current = existingByLabel.get(normalized);
        const nextStop: CreateStopInput = {
          routeId: route.id,
          label: seedStop.label,
          shortcut: current?.shortcut ?? "custom",
          latitude: seedStop.latitude,
          longitude: seedStop.longitude,
          radiusMeters: seedStop.radiusMeters,
          sortOrder: index + 1
        };

        if (!current) {
          this.createStop(nextStop);
          return;
        }

        this.stops.set(current.id, { ...current, ...nextStop });
        existingByLabel.delete(normalized);
      });

      if (existingByLabel.size > 0) {
        let nextSort = seed.stops.length;
        for (const leftover of existingByLabel.values()) {
          nextSort += 1;
          this.stops.set(leftover.id, { ...leftover, sortOrder: nextSort });
        }
      }
    }
  }

  createUser(input: CreateUserInput): UserRecord {
    const normalizedEmail = normalizeEmail(input.email);
    const existing = this.findUserByEmail(normalizedEmail);
    if (existing) {
      const merged: UserRecord = {
        ...existing,
        name: input.name || existing.name,
        homeCity: input.homeCity ?? existing.homeCity,
        updatedAt: nowIso()
      };
      this.users.set(existing.id, merged);
      return merged;
    }

    const record: UserRecord = {
      ...input,
      email: normalizedEmail,
      id: this.userId++,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    this.users.set(record.id, record);
    return record;
  }

  getUser(id: number): UserRecord | undefined {
    return this.users.get(id);
  }

  createRoute(input: CreateRouteInput): RouteRecord {
    const record: RouteRecord = {
      ...input,
      city: "Chennai",
      id: this.routeId++,
      createdAt: nowIso()
    };
    this.routes.set(record.id, record);
    return record;
  }

  listRoutes(userId: number): RouteRecord[] {
    return [...this.routes.values()]
      .filter((route) => route.userId === userId)
      .sort((a, b) => {
        const modeDelta = modePriority[a.mode] - modePriority[b.mode];
        if (modeDelta !== 0) return modeDelta;
        return a.name.localeCompare(b.name);
      });
  }

  discoverRoutes(userId: number, mode: TransitCategory, startQuery: string): RouteDiscoveryRecord[] {
    const query = normalizeLabel(startQuery);
    if (!query) return [];

    return this.listRoutes(userId)
      .filter((route) => route.mode === mode)
      .map((route) => {
        const stops = this.listStops(route.id);
        const startMatches = stops.filter((stop) => normalizeLabel(stop.label).includes(query));
        return { route, stops, startMatches };
      })
      .filter((result) => result.startMatches.length > 0)
      .sort((a, b) => b.startMatches.length - a.startMatches.length);
  }

  createStop(input: CreateStopInput): StopRecord {
    const record: StopRecord = { ...input, id: this.stopId++ };
    this.stops.set(record.id, record);
    return record;
  }

  updateStop(stopId: number, input: UpdateStopInput): StopRecord | undefined {
    const current = this.stops.get(stopId);
    if (!current) return undefined;
    const next: StopRecord = { ...current, ...input };
    this.stops.set(stopId, next);
    return next;
  }

  deleteStop(stopId: number): StopRecord | undefined {
    const current = this.stops.get(stopId);
    if (!current) return undefined;
    this.stops.delete(stopId);
    for (const alert of this.alerts.values()) {
      if (alert.stopId === stopId) this.alerts.delete(alert.id);
    }
    return current;
  }

  deleteStopsByRoute(routeId: number): number {
    const stopIds = this.listStops(routeId).map((stop) => stop.id);
    if (stopIds.length === 0) return 0;
    for (const stopId of stopIds) {
      this.deleteStop(stopId);
    }
    return stopIds.length;
  }

  listStops(routeId: number): StopRecord[] {
    return [...this.stops.values()]
      .filter((stop) => stop.routeId === routeId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  createAlert(input: CreateAlertInput): AlertRecord {
    const existing = [...this.alerts.values()].find(
      (alert) => alert.userId === input.userId && alert.stopId === input.stopId
    );
    if (existing) {
      const merged = { ...existing, ...input };
      this.alerts.set(existing.id, merged);
      return merged;
    }

    const record: AlertRecord = {
      ...input,
      id: this.alertId++,
      lastTriggeredAt: null
    };
    this.alerts.set(record.id, record);
    return record;
  }

  listAlerts(userId: number): AlertRecord[] {
    return [...this.alerts.values()].filter((alert) => alert.userId === userId);
  }

  toggleAlert(alertId: number, isActive: boolean): AlertRecord | undefined {
    const current = this.alerts.get(alertId);
    if (!current) return undefined;
    const next = { ...current, isActive };
    this.alerts.set(alertId, next);
    return next;
  }

  updateAlertTriggered(alertId: number): AlertRecord | undefined {
    const current = this.alerts.get(alertId);
    if (!current) return undefined;
    const next = { ...current, lastTriggeredAt: nowIso() };
    this.alerts.set(alertId, next);
    return next;
  }

  getNearbyStops(userId: number, latitude: number, longitude: number): ProximityStopRecord[] {
    const activeAlerts = this.listAlerts(userId).filter((alert) => alert.isActive);
    const stopIds = new Set(activeAlerts.map((alert) => alert.stopId));

    return [...this.stops.values()]
      .filter((stop) => stopIds.has(stop.id))
      .map((stop) => {
        const route = this.routes.get(stop.routeId);
        return {
          ...stop,
          mode: route?.mode ?? "custom",
          routeName: route?.name ?? "Custom Route",
          distanceMeters: haversineMeters(latitude, longitude, stop.latitude, stop.longitude)
        } satisfies ProximityStopRecord;
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }
}

export const storage = new InMemoryStorage();
