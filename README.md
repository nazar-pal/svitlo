# Svitlo

**Svitlo** (Ukrainian: "світло" — *light / electricity*) is an offline-first iOS app for tracking power generator runtime, scheduling maintenance with AI, and coordinating generators across teams — built for people who depend on generators when the grid goes down.

<p align="center">
  <img src="assets/images/app-home-dark.png" width="200" alt="Home screen — dark mode" />
  &nbsp;&nbsp;
  <img src="assets/images/app-home-running-dark.png" width="200" alt="Generator running — dark mode" />
  &nbsp;&nbsp;
  <img src="assets/images/app-members-dark.png" width="200" alt="Team members — dark mode" />
</p>

> Born from real experience during Ukraine's power outages — where knowing your generator's hours, when it needs oil, and whose turn it is to refuel shouldn't require cell service.

**Website:** [svitlo.expo.app](https://svitlo.expo.app) · **Demo Video:** [YouTube](<!-- TODO: paste YouTube link here -->)

---

## Why Svitlo

Generators are lifelines during blackouts, on construction sites, and across farms. Yet most people track runtime with pen and paper, miss oil changes, and have no idea when maintenance is overdue until something breaks.

Svitlo solves this with:

- **One-tap session tracking** — start/stop the generator, automatic hour calculation
- **AI-generated maintenance plans** — enter your generator model and get manufacturer-specific schedules (oil changes, filter replacements, spark plug swaps) powered by Google search + Gemini
- **Smart maintenance alerts** — tracks hours-based, calendar-based, and whichever-comes-first intervals with overdue/due-soon/upcoming urgency levels
- **Generator health modeling** — monitors consecutive run hours, enforces rest periods, warns at configurable thresholds
- **Team coordination** — organizations with role-based access, member invitations, generator assignments
- **100% offline operation** — every feature works without internet; data syncs automatically when connectivity returns

## How PowerSync Powers Svitlo

PowerSync is the backbone of Svitlo's offline-first architecture. It's not a thin persistence layer — it's what makes the app genuinely usable without connectivity.

### Bidirectional Sync with Conflict-Free Writes

All reads and writes hit a **local SQLite database** (OP-SQLite) on the device. PowerSync syncs changes bidirectionally to Neon Postgres in the background. Users never wait for a network round-trip — the app feels instant because it is.

### Sync Streams with Priority Queues

Svitlo uses PowerSync's **Sync Streams** with priority-based upload ordering:

| Priority | Data | Why |
|----------|------|-----|
| 1 | Users & Organizations | Identity must sync first for FK integrity |
| 2 | Generators | Parent records before child data |
| 3 | Sessions & Maintenance | Operational data syncs last |

### Intelligent Error Categorization

The sync connector extracts **PostgreSQL SQLSTATE codes** from upload failures and categorizes them:

- **Recoverable errors** (network timeouts) → automatic retry
- **Unrecoverable errors** (constraint violations) → surfaced to users with actionable messages, bad operations discarded to unblock the queue

### Multi-User Sync

When teams share generators, PowerSync keeps everyone's local database consistent. One person starts a generator, another sees the status update — even if they were offline when it happened. Session history, maintenance records, and member changes all sync through the same pipeline.

## AI-Powered Maintenance Scheduling

Svitlo uses **Mastra** (AI agent framework) with **Google Gemini 2.5 Flash** to auto-generate maintenance plans:

1. User enters their generator's make and model
2. AI agent searches the web for the manufacturer's maintenance manual
3. Agent extracts recommended schedules: oil change intervals, filter replacements, spark plug service, etc.
4. Results are validated with **Zod schemas** and inserted as maintenance templates

The AI also determines safe operating limits — max consecutive run hours and required cooldown periods — based on real manufacturer data.

**Fallback strategy:** When the AI can't find specific data (obscure models, no internet), Svitlo repairs the response with sensible industry-standard defaults so users always get a working maintenance plan.

## Architecture

### Local-First, Sync-Later

```
┌─────────────────────┐       ┌──────────────┐       ┌──────────────┐
│   iOS App (Expo)    │       │  PowerSync   │       │    Neon      │
│                     │◄─────►│    Cloud     │◄─────►│  Postgres    │
│  OP-SQLite (local)  │ sync  │              │ sync  │              │
└─────────────────────┘       └──────────────┘       └──────────────┘
                                                            ▲
                                                            │ API routes
                                                     ┌──────┴───────┐
                                                     │  EAS Hosting │
                                                     │  (Expo API)  │
                                                     │  Better Auth │
                                                     │  Mastra AI   │
                                                     └──────────────┘
```

### 3-Layer Validation

Redundancy is intentional — client validates for UX, server enforces for security:

1. **Client Zod schemas** — field-level constraints, immediate feedback
2. **Client mutations** — authorization checks, FK existence, cross-table business rules
3. **PostgreSQL constraints + triggers** — final safety net, enforced even if client is bypassed

### Generator Status State Machine

Svitlo computes generator status in real-time by walking session history:

- **Available** → ready to start
- **Running** → active session, tracking consecutive hours, warning at threshold
- **Resting** → mandatory cooldown after extended run, countdown to availability

No polling. No server calls. Pure local computation from synced session data.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Expo](https://expo.dev) (SDK 55) + [Expo Router](https://docs.expo.dev/router/introduction/) |
| Language | TypeScript |
| UI | [HeroUI Native](https://herouinative.com) + [Tailwind CSS v4](https://tailwindcss.com) via [Uniwind](https://uniwind.dev) |
| Local DB | [OP-SQLite](https://github.com/nicksrandall/op-sqlite) |
| Sync | [PowerSync](https://www.powersync.com) Cloud |
| Server DB | [Neon](https://neon.tech) Postgres + [Drizzle ORM](https://orm.drizzle.team) |
| Auth | [Better Auth](https://www.better-auth.com) (Apple Sign In) |
| AI | [Mastra](https://mastra.ai) + [Google Gemini 2.5 Flash](https://ai.google.dev) |
| API | [ORPC](https://orpc.dev) (type-safe RPC) |
| Validation | [Zod](https://zod.dev) |
| i18n | English & Ukrainian |

## Data Model

```
Organizations
├── Members (admin / member roles)
├── Invitations
└── Generators
    ├── Sessions (start/stop logs with user attribution)
    ├── Maintenance Templates (AI-generated or manual)
    │   └── Maintenance Records (completed work)
    └── User Assignments (who can operate this generator)
```

Key constraints enforced at the database level:
- One active session per generator (prevents double-starts)
- Maintenance records preserved even if templates are deleted (audit trail)
- Session user attribution preserved even if the user leaves the org

## Getting Started

### Prerequisites

- [Bun](https://bun.sh)
- [Xcode](https://developer.apple.com/xcode/) (iOS builds)
- A [Neon](https://neon.tech) Postgres database
- A [PowerSync](https://www.powersync.com) Cloud instance

### Setup

```bash
bun install
cp .env.example .env.local
# Fill in DATABASE_URL, BETTER_AUTH_SECRET, POWERSYNC_URL, POWERSYNC_PRIVATE_KEY

bun run auth:generate
bun run db:generate
bun run db:migrate
bun run dev
```

### Environment Variables

#### Always Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon pooled Postgres connection string |
| `BETTER_AUTH_SECRET` | Auth token signing secret (`bun run auth:secret`) |
| `POWERSYNC_URL` | PowerSync Cloud instance URL |
| `POWERSYNC_PRIVATE_KEY` | HMAC-SHA256 secret for PowerSync JWTs |

#### Preview & Production

| Variable | Description |
|----------|-------------|
| `BETTER_AUTH_URL` | Public URL for the auth server |
| `EXPO_PUBLIC_API_URL` | Public API origin for native builds |
| `EXPO_PUBLIC_APP_VARIANT` | `preview` or `production` |

## Project Structure

```
src/
├── app/                    # Expo Router file-based routes
│   ├── (auth)/             # Sign-in screens
│   ├── (protected)/(tabs)/ # Authenticated app (home, activity, settings)
│   ├── (web)/              # Web-only (landing page, privacy policy)
│   └── api/                # API routes (auth, ORPC, AI)
├── components/             # Shared UI components
├── data/
│   ├── client/             # PowerSync schema, queries, mutations, validation
│   └── server/             # Drizzle schema, migrations, auth, AI agent, ORPC
├── lib/
│   ├── auth/               # Auth client, Apple Sign In, offline identity
│   ├── generator/          # Status computation engine
│   ├── maintenance/        # Due date calculation
│   └── powersync/          # Connector, database, sync configuration
└── screens/                # Screen components
```

## Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start Expo dev server |
| `bun run ios` | Run on iOS simulator |
| `bun run lint` | ESLint |
| `bun run typecheck` | TypeScript type checking |
| `bun run test` | Run all tests |

## License

MIT
