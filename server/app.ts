import cors from "cors";
import express from "express";
import {
  createAlertSchema,
  createRouteSchema,
  createStopSchema,
  createUserSchema,
  discoverRoutesQuerySchema,
  locationPingSchema,
  modeAlertBands,
  signInSchema,
  toggleAlertSchema,
  updateStopSchema
} from "../shared/routes.js";
import { storage } from "./storage.js";

const app = express();
const ALERT_COOLDOWN_MS = 40_000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "stopmate-api" });
});

app.post("/api/auth/sign-in", (req, res) => {
  const parsed = signInSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  return res.json(storage.signIn(parsed.data));
});

app.post("/api/users", (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  return res.status(201).json(storage.createUser(parsed.data));
});

app.post("/api/routes", (req, res) => {
  const parsed = createRouteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  return res.status(201).json(storage.createRoute(parsed.data));
});

app.get("/api/routes", (req, res) => {
  const userId = Number(req.query.userId);
  if (!Number.isFinite(userId)) {
    return res.status(400).json({ error: "userId query param is required" });
  }
  const allRoutes = storage.listRoutes(userId);
  const modeFilter = typeof req.query.mode === "string" ? req.query.mode : "";
  if (!modeFilter) return res.json(allRoutes);
  return res.json(allRoutes.filter((route) => route.mode === modeFilter));
});

app.get("/api/routes/discover", (req, res) => {
  const parsed = discoverRoutesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { userId, mode, start } = parsed.data;
  return res.json(storage.discoverRoutes(userId, mode, start));
});

app.post("/api/stops", (req, res) => {
  const parsed = createStopSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  return res.status(201).json(storage.createStop(parsed.data));
});

app.patch("/api/stops/:id", (req, res) => {
  const stopId = Number(req.params.id);
  if (!Number.isFinite(stopId)) {
    return res.status(400).json({ error: "Invalid stop id" });
  }
  const parsed = updateStopSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const updated = storage.updateStop(stopId, parsed.data);
  if (!updated) return res.status(404).json({ error: "Stop not found" });
  return res.json(updated);
});

app.delete("/api/stops/:id", (req, res) => {
  const stopId = Number(req.params.id);
  if (!Number.isFinite(stopId)) {
    return res.status(400).json({ error: "Invalid stop id" });
  }
  const deleted = storage.deleteStop(stopId);
  if (!deleted) return res.status(404).json({ error: "Stop not found" });
  return res.json({ deleted: true, stopId });
});

app.delete("/api/routes/:routeId/stops", (req, res) => {
  const routeId = Number(req.params.routeId);
  if (!Number.isFinite(routeId)) {
    return res.status(400).json({ error: "Invalid route id" });
  }
  const count = storage.deleteStopsByRoute(routeId);
  return res.json({ deleted: true, count });
});

app.get("/api/stops", (req, res) => {
  const routeId = Number(req.query.routeId);
  if (!Number.isFinite(routeId)) {
    return res.status(400).json({ error: "routeId query param is required" });
  }
  return res.json(storage.listStops(routeId));
});

app.post("/api/alerts", (req, res) => {
  const parsed = createAlertSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  return res.status(201).json(storage.createAlert(parsed.data));
});

app.get("/api/alerts", (req, res) => {
  const userId = Number(req.query.userId);
  if (!Number.isFinite(userId)) {
    return res.status(400).json({ error: "userId query param is required" });
  }
  return res.json(storage.listAlerts(userId));
});

app.patch("/api/alerts/:id", (req, res) => {
  const alertId = Number(req.params.id);
  const parsed = toggleAlertSchema.safeParse(req.body);
  if (!Number.isFinite(alertId)) {
    return res.status(400).json({ error: "Invalid alert id" });
  }
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const alert = storage.toggleAlert(alertId, parsed.data.isActive);
  if (!alert) return res.status(404).json({ error: "Alert not found" });
  return res.json(alert);
});

app.post("/api/proximity/:userId", (req, res) => {
  const userId = Number(req.params.userId);
  const parsed = locationPingSchema.safeParse(req.body);
  if (!Number.isFinite(userId)) {
    return res.status(400).json({ error: "Invalid user id" });
  }
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const nearby = storage.getNearbyStops(userId, parsed.data.latitude, parsed.data.longitude);
  const allAlerts = storage.listAlerts(userId);
  const byStopId = new Map(allAlerts.map((alert) => [alert.stopId, alert]));
  const now = Date.now();

  const triggered = nearby
    .filter((stop) => {
      const alert = byStopId.get(stop.id);
      if (!alert || !alert.isActive) return false;

      if (alert.lastTriggeredAt) {
        const elapsed = now - new Date(alert.lastTriggeredAt).getTime();
        if (elapsed < ALERT_COOLDOWN_MS) return false;
      }

      const band = modeAlertBands[stop.mode];
      const modeTarget = Math.min(band.maxMeters, Math.max(band.minMeters, band.defaultMeters));
      const triggerDistance = stop.mode === "custom" ? stop.radiusMeters : Math.min(modeTarget, stop.radiusMeters);
      return stop.distanceMeters <= triggerDistance;
    })
    .map((stop) => ({ ...stop, trigger: true as const }));

  for (const stop of triggered) {
    const alert = byStopId.get(stop.id);
    if (alert) storage.updateAlertTriggered(alert.id);
  }

  return res.json({
    nearest: nearby.slice(0, 5),
    triggered
  });
});

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API route not found" });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("API error:", error);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
