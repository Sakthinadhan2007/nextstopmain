import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    homeCity: varchar("home_city", { length: 120 }).default("Chennai"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email)
  })
);

export const routes = pgTable(
  "routes",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    mode: varchar("mode", { length: 24 }).default("bus").notNull(),
    startLocation: text("start_location").notNull(),
    endLocation: text("end_location").notNull(),
    city: varchar("city", { length: 120 }).default("Chennai").notNull(),
    polyline: jsonb("polyline")
      .$type<Array<{ lat: number; lng: number }>>()
      .default([])
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userModeIdx: index("routes_user_mode_idx").on(table.userId, table.mode)
  })
);

export const stops = pgTable(
  "stops",
  {
    id: serial("id").primaryKey(),
    routeId: integer("route_id")
      .notNull()
      .references(() => routes.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 120 }).notNull(),
    shortcut: varchar("shortcut", { length: 24 }).default("custom").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    radiusMeters: integer("radius_meters").default(1000).notNull(),
    sortOrder: integer("sort_order").default(0).notNull()
  },
  (table) => ({
    routeSortIdx: index("stops_route_sort_idx").on(table.routeId, table.sortOrder)
  })
);

export const alerts = pgTable(
  "alerts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stopId: integer("stop_id")
      .notNull()
      .references(() => stops.id, { onDelete: "cascade" }),
    isActive: boolean("is_active").default(true).notNull(),
    vibrationEnabled: boolean("vibration_enabled").default(true).notNull(),
    soundEnabled: boolean("sound_enabled").default(true).notNull(),
    lastTriggeredAt: timestamp("last_triggered_at", { withTimezone: true })
  },
  (table) => ({
    userStopIdx: uniqueIndex("alerts_user_stop_idx").on(table.userId, table.stopId)
  })
);

export const routeHistory = pgTable("route_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  routeId: integer("route_id")
    .notNull()
    .references(() => routes.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  status: varchar("status", { length: 32 }).default("completed").notNull()
});

export const busRoutes = pgTable(
  "bus_routes",
  {
    id: serial("id").primaryKey(),
    routeCode: varchar("route_code", { length: 24 }).notNull(),
    routeName: varchar("route_name", { length: 160 }).notNull(),
    startTerminal: varchar("start_terminal", { length: 160 }).notNull(),
    endTerminal: varchar("end_terminal", { length: 160 }).notNull(),
    city: varchar("city", { length: 120 }).default("Chennai").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    routeCodeIdx: uniqueIndex("bus_routes_code_idx").on(table.routeCode)
  })
);

export const busStops = pgTable(
  "bus_stops",
  {
    id: serial("id").primaryKey(),
    routeId: integer("route_id")
      .notNull()
      .references(() => busRoutes.id, { onDelete: "cascade" }),
    stopName: varchar("stop_name", { length: 160 }).notNull(),
    stopSequence: integer("stop_sequence").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    preAlertMeters: integer("pre_alert_meters").default(500).notNull()
  },
  (table) => ({
    routeStopIdx: uniqueIndex("bus_stops_route_seq_idx").on(table.routeId, table.stopSequence)
  })
);

export const metroRoutes = pgTable(
  "metro_routes",
  {
    id: serial("id").primaryKey(),
    lineCode: varchar("line_code", { length: 24 }).notNull(),
    lineName: varchar("line_name", { length: 160 }).notNull(),
    startTerminal: varchar("start_terminal", { length: 160 }).notNull(),
    endTerminal: varchar("end_terminal", { length: 160 }).notNull(),
    city: varchar("city", { length: 120 }).default("Chennai").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    lineCodeIdx: uniqueIndex("metro_routes_code_idx").on(table.lineCode)
  })
);

export const metroStops = pgTable(
  "metro_stops",
  {
    id: serial("id").primaryKey(),
    routeId: integer("route_id")
      .notNull()
      .references(() => metroRoutes.id, { onDelete: "cascade" }),
    stationName: varchar("station_name", { length: 160 }).notNull(),
    stationSequence: integer("station_sequence").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    preAlertMeters: integer("pre_alert_meters").default(800).notNull()
  },
  (table) => ({
    routeStationIdx: uniqueIndex("metro_stops_route_seq_idx").on(table.routeId, table.stationSequence)
  })
);

export const trainRoutes = pgTable(
  "train_routes",
  {
    id: serial("id").primaryKey(),
    lineCode: varchar("line_code", { length: 24 }).notNull(),
    lineName: varchar("line_name", { length: 160 }).notNull(),
    startTerminal: varchar("start_terminal", { length: 160 }).notNull(),
    endTerminal: varchar("end_terminal", { length: 160 }).notNull(),
    city: varchar("city", { length: 120 }).default("Chennai").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    lineCodeIdx: uniqueIndex("train_routes_code_idx").on(table.lineCode)
  })
);

export const trainStops = pgTable(
  "train_stops",
  {
    id: serial("id").primaryKey(),
    routeId: integer("route_id")
      .notNull()
      .references(() => trainRoutes.id, { onDelete: "cascade" }),
    stationName: varchar("station_name", { length: 160 }).notNull(),
    stationSequence: integer("station_sequence").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    preAlertMeters: integer("pre_alert_meters").default(1200).notNull()
  },
  (table) => ({
    routeStationIdx: uniqueIndex("train_stops_route_seq_idx").on(table.routeId, table.stationSequence)
  })
);

export const customRoutes = pgTable(
  "custom_routes",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    routeName: varchar("route_name", { length: 160 }).notNull(),
    city: varchar("city", { length: 120 }).default("Chennai").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userRouteIdx: index("custom_routes_user_idx").on(table.userId)
  })
);

export const customStops = pgTable(
  "custom_stops",
  {
    id: serial("id").primaryKey(),
    routeId: integer("route_id")
      .notNull()
      .references(() => customRoutes.id, { onDelete: "cascade" }),
    stopName: varchar("stop_name", { length: 160 }).notNull(),
    stopSequence: integer("stop_sequence").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    preAlertMeters: integer("pre_alert_meters").default(600).notNull()
  },
  (table) => ({
    routeStopIdx: uniqueIndex("custom_stops_route_seq_idx").on(table.routeId, table.stopSequence)
  })
);
