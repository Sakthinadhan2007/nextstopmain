import { z } from "zod";

export const shortcutEnum = z.enum(["home", "work", "college", "custom"]);
export type Shortcut = z.infer<typeof shortcutEnum>;

export const transitCategoryEnum = z.enum(["bus", "train", "metro", "custom"]);
export type TransitCategory = z.infer<typeof transitCategoryEnum>;

export const modeEnum = transitCategoryEnum;
export type TransitMode = z.infer<typeof modeEnum>;

export const pointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180)
});

export const createUserSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  homeCity: z.string().max(120).optional().default("Chennai")
});

export const signInSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120).optional(),
  homeCity: z.string().max(120).optional().default("Chennai")
});

export const createRouteSchema = z.object({
  userId: z.number().int().positive(),
  name: z.string().min(1).max(120),
  mode: modeEnum.default("bus"),
  startLocation: z.string().min(1),
  endLocation: z.string().min(1),
  city: z.literal("Chennai").default("Chennai"),
  polyline: z.array(pointSchema).default([])
});

export const createStopSchema = z.object({
  routeId: z.number().int().positive(),
  label: z.string().min(1).max(120),
  shortcut: shortcutEnum.default("custom"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusMeters: z.number().int().min(50).max(3000).default(1000),
  sortOrder: z.number().int().min(0).default(0)
});

export const updateStopSchema = z
  .object({
    label: z.string().min(1).max(120).optional(),
    shortcut: shortcutEnum.optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    radiusMeters: z.number().int().min(50).max(3000).optional(),
    sortOrder: z.number().int().min(0).optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, "At least one field is required");

export const createAlertSchema = z.object({
  userId: z.number().int().positive(),
  stopId: z.number().int().positive(),
  isActive: z.boolean().default(true),
  vibrationEnabled: z.boolean().default(true),
  soundEnabled: z.boolean().default(true)
});

export const toggleAlertSchema = z.object({
  isActive: z.boolean()
});

export const locationPingSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

export const discoverRoutesQuerySchema = z.object({
  userId: z.coerce.number().int().positive(),
  mode: transitCategoryEnum,
  start: z.string().min(2)
});

export const modeAlertBands: Record<
  TransitCategory,
  { minMeters: number; maxMeters: number; defaultMeters: number }
> = {
  bus: { minMeters: 400, maxMeters: 600, defaultMeters: 500 },
  metro: { minMeters: 150, maxMeters: 350, defaultMeters: 250 },
  train: { minMeters: 600, maxMeters: 600, defaultMeters: 600 },
  custom: { minMeters: 150, maxMeters: 1200, defaultMeters: 600 }
};

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type CreateRouteInput = z.infer<typeof createRouteSchema>;
export type CreateStopInput = z.infer<typeof createStopSchema>;
export type UpdateStopInput = z.infer<typeof updateStopSchema>;
export type CreateAlertInput = z.infer<typeof createAlertSchema>;
export type ToggleAlertInput = z.infer<typeof toggleAlertSchema>;
export type LocationPingInput = z.infer<typeof locationPingSchema>;
export type DiscoverRoutesQuery = z.infer<typeof discoverRoutesQuerySchema>;

export type UserRecord = CreateUserInput & { id: number; createdAt: string; updatedAt: string };
export type RouteRecord = CreateRouteInput & { id: number; createdAt: string };
export type StopRecord = CreateStopInput & { id: number };
export type AlertRecord = CreateAlertInput & { id: number; lastTriggeredAt: string | null };
export type ProximityStopRecord = StopRecord & {
  distanceMeters: number;
  mode: TransitCategory;
  routeName: string;
};

export type RouteDiscoveryRecord = {
  route: RouteRecord;
  stops: StopRecord[];
  startMatches: StopRecord[];
};
