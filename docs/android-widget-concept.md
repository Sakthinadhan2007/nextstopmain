# StopMate Android Widget Concept

## Goal
Provide a lightweight Android home-screen widget that shows:
- Active route
- Distance to destination
- Quick alarm disable action

## Recommended Integration
1. Build a tiny Android companion app (`Kotlin`, `Jetpack Glance` widget).
2. Keep `StopMate` web app as primary UI (PWA + browser install).
3. Share a compact JSON status payload from web app to Android layer:
   - `routeName`
   - `destination`
   - `distanceMeters`
   - `alarmActive`
   - `updatedAt`
4. Persist widget payload in Android `SharedPreferences` for offline render.
5. Expose one `Disable Alarm` widget action:
   - Sends local broadcast to companion app.
   - Companion app updates local state and, when online, calls app backend API to pause current alert.

## Data Update Flow
1. PWA computes nearest distance every 3 seconds.
2. Companion app polls a small endpoint (or WebView bridge) at low frequency (10-20s while active route exists).
3. Widget refreshes only when values change to keep battery usage low.

## Suggested Endpoint Contract
`GET /api/widget/active?userId=<id>`

Response:
```json
{
  "routeName": "Chennai Metro Blue Line",
  "destination": "Guindy Metro",
  "distanceMeters": 820,
  "alarmActive": true,
  "updatedAt": "2026-02-13T18:30:00.000Z"
}
```

## Why This Approach
- Keeps the current React project unchanged as the main product.
- Adds widget support with minimal native code.
- Works with offline cache from companion app.
