---
name: CRM Project State
description: Net Zone CRM Dialer — key decisions and constraints for consistent future work
---

## Native Android build requirement

The Kotlin native modules (OverlayModule, PhoneStateModule, CallLogModule) only link during an EAS build — they are silent no-ops in Expo Go/Metro. All JS/React Native UI works in Expo Go; the overlay popup, after-call activity, and phone-state monitor require a signed APK.

**Why:** NativeModules.OverlayModule resolves at runtime via the Kotlin bridge, which is absent in the Metro sandbox.

**How to apply:** Do not promise native features work until an EAS APK is installed on a physical Android device.

## expo-build-properties must stay at ~1.0.10

Pin `expo-build-properties` to `~1.0.10` in `artifacts/mobile/package.json`. The installed Expo SDK is 54.

**Why:** Version 57.x is incompatible with Expo SDK 54 and will break EAS builds.

## Package identifiers

- `applicationId` / `MainApplication.kt` package: `com.netzone.crmdialer`
- All other Kotlin source files: `com.netzone.crm.*`

**Why:** Mixing these causes the Android build to fail at link time.

## PATCH for partial customer updates

Mobile uses `PATCH /api/customers/:id` (not `PUT`) when updating only the close-status fields (`status`, `close_date`, `close_remark`, `close_by`).

**Why:** PUT requires all 16+ columns; partial mobile updates only send a subset.

## SSE for dashboard real-time

Use SSE (not WebSocket) for the `/api/dashboard/events` endpoint. Auth token is passed as `?token=` query param.

**Why:** Design decision made early; changing to WebSocket would require updating both the server and all dashboard consumers.

## SharedPreferences as native bridge

Native Android Activities (overlay, after-call) communicate with React Native via SharedPreferences.

**Why:** Avoids complex inter-process IPC; the overlay Activity reads cached auth token + customer data written by the JS side.

## Graceful degradation on overlay denial

If the user denies or skips overlay permission, the app must continue working normally — no crash, no re-prompt.

**Why:** Overlay is an enhancement; CRM functionality must not depend on it.

## Reminder type field naming

`reminder_type` (snake_case) in both the DB column and the API JSON body. Mapped to `reminder_type` in the TypeScript `Reminder` type.

**Why:** Consistency constraint — changing this requires DB migration + API + mobile adapter changes together.
