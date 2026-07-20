---
name: CRM Project State
description: Net Zone CRM Dialer — what's fully implemented; what still needs EAS build
---

## Status as of 2026-07-20 — KOTLIN LAYER COMPLETE

### Kotlin native modules — all 13 files written (2026-07-20)

All `.kt` files live under `artifacts/mobile/modules/*/android/` and are
copied into the Android project tree by `withKotlinSources.js` during `expo prebuild`.

| File | Module |
|------|--------|
| `call-log/android/CallLogModule.kt`          | Reads `CallLog.Calls` ContentProvider |
| `call-log/android/CallLogPackage.kt`         | ReactPackage for above |
| `phone-state/android/PhoneStateModule.kt`    | RN bridge: startCallMonitor, cacheAuthToken, cacheCustomerData, openDialer, makeCall; static `emitEvent()` |
| `phone-state/android/PhoneStatePackage.kt`   | ReactPackage for above |
| `phone-state/android/CallMonitorService.kt`  | Foreground service; call state machine; broadcasts overlays; starts CallSyncService |
| `phone-state/android/PhoneStateReceiver.kt`  | Static BroadcastReceiver (manifest); restarts CallMonitorService if killed |
| `phone-state/android/BootReceiver.kt`        | Starts CallMonitorService on BOOT_COMPLETED |
| `phone-state/android/CallSyncService.kt`     | Background HTTP POST to `/api/calls`; includes `device_id` (ANDROID_ID) |
| `overlay/android/OverlayModule.kt`           | RN bridge: canDrawOverlays, requestOverlayPermission, show/dismiss activities |
| `overlay/android/OverlayPackage.kt`          | ReactPackage for above |
| `overlay/android/IncomingCallActivity.kt`    | Full-screen overlay on lock screen; customer name from SharedPreferences |
| `overlay/android/AfterCallActivity.kt`       | Dialog after call ends; category chips + remark input; POSTs to API |
| `overlay/android/MainApplication.kt`         | SDK 54 entrypoint; registers all 3 custom packages |

### Architecture decisions (stay consistent)

- `MainApplication.kt` package: `com.netzone.crmdialer` (applicationId); other modules: `com.netzone.crm.*`
- SharedPreferences store name: `"NetZoneCRM"` — keys: `auth_token`, `base_url`, `customers_json`
- `PhoneStateModule.emitEvent()` is static so `CallMonitorService` (plain Android Service, no RN context) can emit to JS when app is in foreground
- Multi-device: each phone logs in as a distinct agent; `device_id` = `Settings.Secure.ANDROID_ID` added to every call POST
- SSE (not WebSocket) for dashboard real-time; token via `?token=` query param
- `expo-build-properties`: pinned to `~1.0.10` for SDK 54 — do not bump without SDK upgrade
- Call state machine: RINGING→OFFHOOK→IDLE=Incoming; RINGING→IDLE=Missed; OFFHOOK(no prior RINGING)→IDLE=Outgoing

### Completed JS/TS layer (do not recreate)
- `modules/call-log/index.ts`, `modules/phone-state/index.ts`, `modules/overlay/index.ts` — TS bridges
- `components/AfterCallModal.tsx`, `components/CallPopupModal.tsx` — foreground popups
- `hooks/useAfterCallPopup.ts`, `hooks/useOverlayPermission.ts`
- `services/remoteAdapter.ts`, `services/offlineQueue.ts`, `services/crmService.ts`
- `contexts/AuthContext.tsx`, `contexts/CRMContext.tsx`
- `plugins/withKotlinSources.js`, `plugins/withAndroidPermissions.js`
- `app.json` (permissions + plugins), `eas.json` (preview=APK, production=AAB)
- API: SSE bus (`events.ts`), `/api/calls` with broadcastEvent, `/api/dashboard/events`
- Dashboard: SSE subscription + TanStack Query real-time invalidation

### Call History ↔ Customer linkage fix (2026-07-20)

**Bug:** Calls logged before a customer record existed had `customer_id = NULL`, so they
never appeared linked in Call History even after the customer was created.

**Fix — two-layer:**
1. **API `GET /api/calls`**: Extended LEFT JOIN to also match by normalised phone (last 10
   digits, digits-only) when `customer_id IS NULL`. Returns `matched_customer_id`,
   `customer_category_live`, `customer_notes` from the join.
2. **API `POST/PUT/PATCH /api/customers`**: Runs `backfillCalls()` after every customer
   save — UPDATE calls SET customer_id/customer_name WHERE phone matches and customer_id IS NULL.
3. **Mobile `CRMContext`**: After `addCustomer`/`updateCustomer` re-fetches calls so the
   list reflects the newly linked records immediately.
4. **Mobile `calls.tsx`**: Builds a `phoneMap` (normalised phone → Customer) as a fallback
   for when `customerMap.get(customerId)` misses (customerId still empty in local state).
   Also surfaces `customer.notes` / `call.customerNotes` and `call.reminder_date` in CallItem.

**Key SQL pattern (normalised phone match):**
```sql
RIGHT(regexp_replace(COALESCE(phone_number, customer_mobile, ''), '[^0-9]', '', 'g'), 10)
  = RIGHT(regexp_replace(c.mobile, '[^0-9]', '', 'g'), 10)
```

### Still needs EAS build
- All native features (PhoneState, CallLog, Overlay) only link during `eas build --platform android`
- Use: `bash scripts/build-android.sh` or `eas build --platform android --profile preview`
- Native modules are no-ops in Expo Go / web preview — this is expected
