# Net Zone CRM

A full-stack CRM system for lead management and call tracking, built for telecom/sales teams.

## Architecture

This is a pnpm monorepo with three main services:

| Service | Path | Stack |
|---------|------|-------|
| API Server | `artifacts/api-server` | Node.js, Express, PostgreSQL (pg), JWT auth, Pino |
| Dashboard | `artifacts/dashboard` | React, Vite, Tailwind CSS, Radix UI, TanStack Query |
| Mobile Dialer | `artifacts/mobile` | Expo (React Native), Expo Router, TanStack Query |

Shared libraries live under `lib/`:
- `lib/db` — Drizzle ORM schema and DB config
- `lib/api-zod` — Zod-based API type definitions
- `lib/api-client-react` — Shared React hooks for API consumption

## Running the project

All services start automatically via configured workflows. After `pnpm install`, restart each workflow:

- **API Server**: `pnpm --filter @workspace/api-server run dev` — builds with esbuild, then starts on `$PORT`
- **Dashboard**: `pnpm --filter @workspace/dashboard run dev` — Vite dev server on `$PORT` at `/dashboard/`
- **Mobile**: `pnpm --filter @workspace/mobile run dev` — Expo Metro bundler on `$PORT`

## Database

Uses Replit's built-in PostgreSQL. The schema is in `scripts/schema.sql` (idempotent — safe to re-run). The API server calls `initDb()` on startup to seed default users and sample data.

Default login credentials:
- **Admin**: `admin` / `admin123`
- **Agent 1**: `agent1` / `agent123`
- **Agent 2**: `agent2` / `agent123`

## Environment variables

| Key | Notes |
|-----|-------|
| `DATABASE_URL` | Auto-provided by Replit (do not set manually) |
| `SESSION_SECRET` | Configured as a Replit Secret — used for JWT signing |
| `NODE_ENV` | Set to `development` in shared env vars |
| `PORT` | Auto-assigned per workflow by Replit |

## Mobile native modules

The mobile app includes custom Android native modules (`CallLogModule`, `OverlayModule`) for call tracking and an incoming call overlay. These require a native Android build via EAS — they do not run in Expo Go. See `artifacts/mobile/android/` for the native code.

## User preferences
