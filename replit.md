# Net Zone CRM Dialer

A full-stack CRM for managing calls, customers, reminders, and agents. Includes a React/Vite PC dashboard and an Expo React Native mobile app, backed by an Express + PostgreSQL API server.

## Run & Operate

Workflows start automatically on Replit:

| Workflow | What it runs | Preview |
|---|---|---|
| `artifacts/api-server: API Server` | Express API on port 8080 | `/api` |
| `artifacts/dashboard: web` | Vite dev server | `/dashboard/` |
| `artifacts/mobile: expo` | Expo dev server | `/` (mobile pane) |

Manually from workspace root:

```sh
pnpm install                                         # install all dependencies
pnpm --filter @workspace/api-server run dev          # API server
pnpm --filter @workspace/dashboard run dev           # PC dashboard
pnpm --filter @workspace/mobile run dev              # Expo mobile
pnpm run typecheck                                   # full typecheck
```

## Database Setup

Replit provides PostgreSQL automatically (`DATABASE_URL` is pre-set). To initialise the schema:

```sh
psql $DATABASE_URL -f scripts/schema.sql
```

The API server also calls `initDb()` on every startup, which seeds the default users (see Demo Credentials below) using `ON CONFLICT DO NOTHING`.

## Demo Credentials

| Role  | Username | Password  |
|-------|----------|-----------|
| Admin | admin    | admin123  |
| Agent | agent1   | agent123  |
| Agent | agent2   | agent123  |

## Stack

- **Runtime:** Node.js 24, pnpm workspaces, TypeScript 5.9
- **API:** Express 5, PostgreSQL (`pg` pool), JWT auth, bcrypt
- **Dashboard:** React 19, Vite 7, shadcn/ui, Recharts, TanStack Query, wouter
- **Mobile:** Expo SDK 54, Expo Router, React Native 0.81
- **Native modules (Android):** Kotlin — PhoneStateModule, CallLogModule, OverlayModule (require EAS build)

## Where Things Live

```
artifacts/
  api-server/src/
    routes/          auth, customers, calls, remarks, reminders, categories, agents, dashboard, reports
    lib/database.ts  pg Pool + initDb() seeder
    middlewares/     JWT requireAuth / requireAdmin
  dashboard/src/
    pages/           Dashboard, Calls, Customers, Reports, Agents, Categories
    lib/api-client-react/   OpenAPI-generated React Query hooks
  mobile/
    app/(tabs)/      Dashboard, Customers, Calls, Reminders, More
    app/dialer.tsx   Auto Dialer
    contexts/        AuthContext, CRMContext
    modules/*/android/  Kotlin native modules (need EAS build)
scripts/
  schema.sql         PostgreSQL DDL — idempotent, safe to re-run
```

## User Preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always use the Replit workflow tool to start services, not `npx expo start` directly.
- The mobile workflow requires `REPLIT_EXPO_DEV_DOMAIN` and `REPLIT_DEV_DOMAIN` which Replit injects automatically.
- Native Android features (dialer overlay, call log, phone state monitor) require an EAS APK build — they do not work in Expo Go.
- `expo-build-properties` is pinned to `~1.0.10` (SDK 54 compatible). Do not bump it without also upgrading the Expo SDK.

## Pointers

- See the `pnpm-workspace` skill for workspace structure and TypeScript project references.
- See the `expo` skill for Expo-specific guidelines.
