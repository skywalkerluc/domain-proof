# Domain Proof

Domain Proof verifies control of a domain through a public DNS TXT challenge.

[Live demo](https://domain-proof-web.vercel.app/) · [API docs](https://domain-proof-api.vercel.app/api/docs) · [API health](https://domain-proof-api.vercel.app/api/health)

## Features

- Validates and normalizes root domains and subdomains, including IDNs.
- Generates a unique TXT challenge and persists the verification.
- Restores verification pages after refresh or direct navigation.
- Checks the expected record against public DNS.
- Handles missing records, mismatches, lookup failures, and retry cooldowns.

The generated record looks like this:

```text
TXT  _domain-proof.example.com  domain-proof=<token>
```

## Stack

- **Web:** React, Vite, TypeScript, Tailwind CSS, React Router, TanStack Query
- **API:** NestJS, TypeScript, Swagger/OpenAPI, Prisma, Node DNS
- **Infrastructure:** PostgreSQL on Neon, Vercel

## Running locally

Requirements: Node.js 22.13+, pnpm 11.19+, and a PostgreSQL database.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
```

Set the following variables in `apps/api/.env`:

```dotenv
DATABASE_URL="postgresql://..." # pooled runtime connection
DIRECT_URL="postgresql://..."   # direct migration connection
```

Then apply the migrations and start both applications:

```bash
pnpm --filter @domain-proof/api db:migrate:deploy
pnpm dev
```

- Web: `http://localhost:5173`
- API: `http://localhost:3000/api`

## Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Start web and API in watch mode |
| `pnpm test` | Run the API and web test suites |
| `pnpm lint` | Lint both applications |
| `pnpm typecheck` | Type-check both applications |
| `pnpm build` | Build both applications |
| `pnpm --filter @domain-proof/api db:migrate:deploy` | Apply database migrations |

The test suite covers domain validation, API contracts, persistence, DNS outcomes,
concurrency and cooldown behavior, and the main UI states.

## API

All endpoints use the `/api` prefix.

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/health` | Health check |
| `POST` | `/domain-verifications` | Create a verification |
| `GET` | `/domain-verifications/:id` | Retrieve a verification |
| `POST` | `/domain-verifications/:id/checks` | Check the TXT challenge |

Create a verification:

```json
{
  "domain": "example.com"
}
```

## Project structure

```text
apps/
  web/   React application
  api/   NestJS API and Prisma schema
```

## Scope

This project proves generic domain control. Authentication, account ownership,
domain transfers, and email-specific DNS configuration are intentionally out of scope.
