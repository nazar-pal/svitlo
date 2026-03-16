# Svitlo

Power generator maintenance tracker for iOS. Log run sessions, schedule maintenance by hours or calendar time, and manage generators across organizations with role-based access — all offline-first.

## Tech Stack

- **Framework:** [Expo](https://expo.dev) (SDK 55) with [Expo Router](https://docs.expo.dev/router/introduction/)
- **Language:** TypeScript
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com) via [Uniwind](https://uniwind.dev) + [HeroUI Native](https://herouinative.com)
- **Auth:** [Better Auth](https://www.better-auth.com) (Apple Sign In) hosted in Expo API routes
- **Server Database:** [Neon](https://neon.tech) Postgres with [Drizzle ORM](https://orm.drizzle.team)
- **Local-first Sync:** [PowerSync](https://www.powersync.com) with [OP-SQLite](https://github.com/nicksrandall/op-sqlite)
- **API Layer:** [ORPC](https://orpc.dev)
- **Env Validation:** [@t3-oss/env-core](https://env.t3.gg) + [Zod](https://zod.dev)

## Prerequisites

- [Bun](https://bun.sh) (package manager and script runner)
- [Xcode](https://developer.apple.com/xcode/) (iOS builds)
- A [Neon](https://neon.tech) Postgres database
- A [PowerSync](https://www.powersync.com) Cloud instance
- An Apple Developer account (for Sign in with Apple)

## Getting Started

1. **Install dependencies:**

   ```bash
   bun install
   ```

2. **Set up environment variables:**

   ```bash
   cp .env.example .env.local
   ```

   Fill in the required values (see [Environment Variables](#environment-variables) below).

3. **Generate auth schema and run database migrations:**

   ```bash
   bun run auth:generate
   bun run db:generate
   bun run db:migrate
   ```

4. **Start the dev server:**

   ```bash
   bun run dev
   ```

## Environment Variables

Copy `.env.example` to `.env.local`. In development, only the "always required" variables are needed — API origins are derived automatically from the Expo dev server.

### Always Required

| Variable                | Description                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | Neon pooled Postgres connection string                                                                |
| `BETTER_AUTH_SECRET`    | Auth token signing secret (generate with `bun run auth:secret`)                                       |
| `POWERSYNC_URL`         | PowerSync Cloud instance URL                                                                          |
| `POWERSYNC_PRIVATE_KEY` | HMAC-SHA256 secret for signing PowerSync JWTs (min 32 chars; generate with `openssl rand -base64 32`) |

### Preview & Production Only

| Variable                  | Description                                                        |
| ------------------------- | ------------------------------------------------------------------ |
| `BETTER_AUTH_URL`         | Public URL where the Better Auth server is reachable               |
| `EXPO_PUBLIC_API_URL`     | Public API origin used by native iOS builds                        |
| `EXPO_PUBLIC_APP_VARIANT` | `preview` or `production` — controls app name suffix and bundle ID |

Apple Sign In uses native iOS bundle identifiers, not environment variables.

## Scripts

| Script                  | Description                                 |
| ----------------------- | ------------------------------------------- |
| `bun run dev`           | Start Expo dev server (development variant) |
| `bun run start`         | Start Expo dev server                       |
| `bun run ios`           | Run on iOS simulator                        |
| `bun run auth:generate` | Generate Better Auth Drizzle schema         |
| `bun run auth:secret`   | Generate a new `BETTER_AUTH_SECRET`         |
| `bun run db:generate`   | Generate Drizzle migrations                 |
| `bun run db:migrate`    | Apply Drizzle migrations to Neon            |
| `bun run lint`          | Run ESLint                                  |
| `bun run typecheck`     | Run TypeScript type checking                |
| `bun run format`        | Format code with Prettier                   |
| `bun run flt`           | Format + lint + typecheck (all three)       |

## Project Structure

```
src/
├── app/                          # Expo Router file-based routes
│   ├── (auth)/                   # Auth screens (sign-in)
│   ├── (protected)/(tabs)/       # Authenticated tab navigator
│   ├── (public)/                 # Public screens (privacy policy)
│   └── api/                      # Expo API routes (auth, ORPC)
├── components/                   # Shared UI components
├── data/
│   ├── client/                   # Client-side DB schema & queries (PowerSync)
│   ├── server/                   # Server DB schema, migrations, auth config, ORPC routers
│   └── rpc/                      # ORPC client setup
├── lib/
│   ├── auth/                     # Auth client, Apple sign-in, session management
│   ├── config/                   # API origin helpers
│   ├── hooks/                    # Shared hooks
│   └── powersync/                # PowerSync connector, database, context
└── screens/                      # Screen components extracted from routes
```

## Architecture

### Local-First

All reads and writes go against a local SQLite database (OP-SQLite) on the device. PowerSync handles bidirectional sync to Neon Postgres in the background. Core features — starting/stopping generators, logging maintenance, viewing history — work fully offline. Changes sync when connectivity is available.

### Auth Flow

Better Auth is mounted at `/api/auth/[...auth]` as an Expo API route. Authentication uses Apple Sign In exclusively (native on iOS, web fallback elsewhere). The auth gate in `src/components/auth-gate.tsx` protects the `(protected)` route group. An offline identity snapshot stored locally enables offline bootstrapping without a live session check.

### iOS Build Variants

Three variants can coexist on a single device without callback collisions:

| Variant     | Bundle ID                     | App Name         |
| ----------- | ----------------------------- | ---------------- |
| development | `com.devnazar.svitlo.dev`     | Svitlo (Dev)     |
| preview     | `com.devnazar.svitlo.preview` | Svitlo (Preview) |
| production  | `com.devnazar.svitlo`         | Svitlo           |

Set via `EXPO_PUBLIC_APP_VARIANT` at build time.

## EAS Hosting

Set production environment variables in EAS:

```bash
eas env:create --environment production --name BETTER_AUTH_SECRET --value "..."
eas env:create --environment production --name BETTER_AUTH_URL --value "https://your-domain.example.com"
eas env:create --environment production --name DATABASE_URL --value "postgresql://..."
eas env:create --environment production --name POWERSYNC_URL --value "https://..."
eas env:create --environment production --name POWERSYNC_PRIVATE_KEY --value "..."
eas env:create --environment production --name EXPO_PUBLIC_API_URL --value "https://your-domain.example.com"
```

## Background

Svitlo was built for the [PowerSync Hackathon](https://www.powersync.com) and doubles as a personal-use tool. The repository is public on GitHub.

## License

MIT
