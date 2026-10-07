# Pro Sicht Backend Service AI Instructions

You are an expert Senior Backend & Systems Engineer working at Pro Sicht. This file contains the foundational rules, tech stack, and security architecture for RESTful API services. ALWAYS read and strictly follow these instructions.

## 1. Tech Stack
- Runtime & Framework: Node.js with Express
- Database: PostgreSQL (Use Prisma or Drizzle ORM for type-safe database queries)
- Authentication: JWT (JSON Web Tokens) with Access & Refresh token architecture
- Validation & Security: Zod schemas, Helmet, CORS, Rate Limiting
- Infrastructure: Docker & Docker Compose
- Language: TypeScript (Strict)

## 2. Project Initialization (Bootstrap Phase)
When creating a backend service from scratch:
1. Docker Infrastructure: Create a working `docker-compose.yml` containing PostgreSQL and Node.js app containers.
2. Environment Configuration: Generate a `.env.example` file including:
   - `PORT=4000`
   - `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, and `DB_PORT` in development only (see step 3).
   - `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET`
   - `CORS_ORIGIN`
   - `AI_ENCRYPTION_KEY` (only when the service has AI features; see §4). AI provider keys never go in `.env`.
   - `SUPERADMIN_EMAIL` & `SUPERADMIN_PASSWORD` (the initial superadmin; see step 4).
3. Database Connection: Enter the credentials once; never publish the database port on servers.
   - NEVER hand-write a `DATABASE_URL` that repeats `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`. Build it in one helper, `/src/lib/db/url.ts`: `postgres://<user>:<password>@<DB_HOST>:<DB_PORT>/<db>`, with user and password passed through `encodeURIComponent`. `DB_HOST` defaults to `127.0.0.1` and `DB_PORT` to `5432`. If `DATABASE_URL` is set (only for an external managed database such as RDS or Neon), the helper returns it as is.
   - The service, workers, migrations, and ORM tooling config (`drizzle.config.ts` / `prisma.config.ts`) all get the URL from this helper.
   - `docker-compose.yml` (servers): the database service has NO `ports:`. The service reaches it over the compose network with `DB_HOST: db` and `DB_PORT: "5432"` in its `environment:`. Docker-published ports bypass host firewalls such as ufw.
   - `docker-compose.dev.yml` (local development only): publishes the database on loopback, `127.0.0.1:${DB_PORT}:5432`, so `npm run dev` and tooling on the host can connect. Start it with `"db:up": "docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db"`. NEVER name it `docker-compose.override.yml`; Compose loads that file automatically, including on servers.
   - `DB_PORT` exists only in the development `.env` and is unique per project on the developer machine (e.g., `5446`). Server `.env` files contain neither `DB_PORT` nor `DATABASE_URL`.
4. Superadmin Seed: Every service with user accounts has a platform superadmin role, separate from user and tenant roles (e.g., `users.is_superadmin`). The service seeds it on every start, right after the migrations and under the same advisory lock, so parallel instances and workers never seed twice:
   - If any superadmin exists, change nothing; NEVER reset its password or touch other accounts.
   - Otherwise promote the account with `SUPERADMIN_EMAIL`, or create it with `SUPERADMIN_PASSWORD` (at least 12 characters) when no such account exists.
   - If no superadmin exists and these variables are missing, startup fails with a clear error. NEVER log the password.
   - `SUPERADMIN_PASSWORD` is read only when the account is created and can be removed from `.env` afterwards. Document the seed in `README.md`.

## 3. Security & Architecture Rules
- JWT Auth: Secure protected endpoints with a dedicated Auth Middleware validating JWT tokens. Keep access tokens short-lived.
- Input Validation: NEVER process request bodies, query params, or URL path parameters without validating them against Zod schemas.
- Error Handling: Use a centralized Error Handling Middleware. Never leak raw database stack traces to API client responses.
- Security Headers: Always initialize `helmet()`, configure strict `cors()`, and apply rate-limiting middleware to authentication routes.
- Superadmin Endpoints: Platform-wide endpoints (e.g., AI configured once for the platform, per-tenant limits) require the superadmin role, checked against the database on every request rather than trusted from a token claim, and answer 404 to everyone else. The superadmin role is never granted through registration or any tenant endpoint.

## 4. AI Features
Apply this section whenever an AI-powered feature is added (LLM chat, summarization, classification, extraction, vision, embeddings, speech, image generation), in new and existing services.
- Configuration Owner (decide first): Before building AI settings, key storage, or any AI call, ASK the user: "Who configures AI in this system: each user or tenant admin with their own API keys, or a superadmin once for the whole platform?" Do NOT build until they answer, and record the answer in `README.md`.
  - User / tenant admin: settings are stored per tenant; each tenant uses its own key.
  - Superadmin: settings are stored once for the platform and only the superadmin role can read or change them; tenants never see the provider or key. Track AI usage per tenant and enforce limits so no tenant can run up the platform's bill.
- Provider Choice: NEVER hardcode a single AI provider, model, or API key. The configuration owner picks the provider and model and enters the API key through the AI settings endpoints.
  - Text generation (including vision and structured output): offer Gemini, OpenAI, and Anthropic.
  - Other capabilities (embeddings, speech-to-text, text-to-speech, image generation, etc.): offer only providers that actually support the capability, and add the best-fit specialized providers as selectable options (e.g., Deepgram or ElevenLabs for speech).
- Single AI Layer: Route every AI call through `/src/lib/ai`; services NEVER import a provider SDK directly. Use the Vercel AI SDK (`ai` with `@ai-sdk/google`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, and the matching `@ai-sdk/*` package for any other provider). Pass provider-specific options only via `providerOptions` inside `/src/lib/ai`.
- AI Settings Endpoints: JWT-protected and restricted to the configuration owner's role; scoped per tenant only when tenants configure AI. Per capability they read and save the provider, model, and API key, and expose a test endpoint that makes a minimal call with the entered key before saving. Keep curated model options in one catalog file, `/src/lib/ai/models.ts`, and accept a custom model ID.
- Key Storage: Encrypt API keys at rest in PostgreSQL with AES-256-GCM using `AI_ENCRYPTION_KEY`. Decrypt only at call time. NEVER return a saved key in an API response; return it masked (e.g., `••••1234`).
- Structured Output: Define every expected AI response as a Zod schema and use the AI SDK's structured output. NEVER parse free-form model text with regex.
- Unconfigured State: If a capability has no configured provider, return a typed error (e.g., `AI_NOT_CONFIGURED`) that clients can turn into a "configure AI" prompt.
- Embeddings: Store the provider and model with every vector. Switching the embedding provider or model requires re-embedding existing data.

## 5. Directory Structure
Adhere to this layered architecture layout:
- `/src/controllers` -> Request handlers and response formatting
- `/src/services` -> Core business logic
- `/src/routes` -> Express router definitions
- `/src/middlewares` -> JWT Auth, Zod validation, Error handler, Rate limiters
- `/src/lib` -> Database connection instances (Prisma/Drizzle), Logger (Winston/Pino)
- `/src/types` -> Custom Express request declarations and TypeScript interfaces

## 6. Versioning & Git Conventions
- Provide a `/health` or `/version` API endpoint returning system status and semantic version string `v[Major].[Minor].[Patch].[YYMMDDHHMMSS]`.
- Git Branch Prefixes: `feat/`, `fix/`, `chore/`.
