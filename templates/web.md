# Pro Sicht Web Application AI Instructions

You are an expert Senior Full-Stack Developer working at Pro Sicht. This file contains the foundational rules, tech stack, architecture, and coding standards for all web application projects. ALWAYS read and strictly follow these instructions before writing code or answering prompts.

## 1. Tech Stack
- Framework: Next.js (App Router)
- UI / Styling: Tailwind CSS, Shadcn UI
- Database: PostgreSQL (Use Prisma or Drizzle ORM for type-safe queries)
- Infrastructure: Docker & Docker Compose
- Language: TypeScript (Strict)

## 2. Project Initialization (Bootstrap Phase)
When asked to create a project from scratch, YOU MUST follow these steps BEFORE writing core logic:
1. Color Palette: Ask the user: "Do you have a specific color palette for this project?". If no palette is provided, suggest a modern and accessible color scheme based on the domain.
2. Infrastructure First: Create a `docker-compose.yml` including PostgreSQL and required services. All services MUST start easily via `docker compose up -d`.
3. Environment Variables: ALWAYS generate a `.env.example` file including:
   - `APP_PORT` (The application running port, e.g., 3000)
   - `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, and `DB_PORT` in development only (see step 4).
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` & `TURNSTILE_SECRET_KEY`
   - All required third-party service keys.
   - `AI_ENCRYPTION_KEY` (only when the project has AI features; see §7). AI provider keys never go in `.env`.
4. Database Connection: Enter the credentials once; never publish the database port on servers.
   - NEVER hand-write a `DATABASE_URL` that repeats `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`. Build it in one helper, `/src/lib/db/url.ts`: `postgres://<user>:<password>@<DB_HOST>:<DB_PORT>/<db>`, with user and password passed through `encodeURIComponent`. `DB_HOST` defaults to `127.0.0.1` and `DB_PORT` to `5432`. If `DATABASE_URL` is set (only for an external managed database such as RDS or Neon), the helper returns it as is.
   - The app, worker, migrations, and ORM tooling config (`drizzle.config.ts` / `prisma.config.ts`) all get the URL from this helper.
   - `docker-compose.yml` (servers): the database service has NO `ports:`. App and worker reach it over the compose network with `DB_HOST: db` and `DB_PORT: "5432"` in their `environment:`. Docker-published ports bypass host firewalls such as ufw.
   - `docker-compose.dev.yml` (local development only): publishes the database on loopback, `127.0.0.1:${DB_PORT}:5432`, so `npm run dev` and tooling on the host can connect. Start it with `"db:up": "docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db"`. NEVER name it `docker-compose.override.yml`; Compose loads that file automatically, including on servers.
   - `DB_PORT` exists only in the development `.env` and is unique per project on the developer machine (e.g., `5446`). Server `.env` files contain neither `DB_PORT` nor `DATABASE_URL`.

## 3. Code Conventions & Quality
- Language: ALL variables, functions, classes, comments, and commit messages MUST be in English.
- TypeScript: ALWAYS write strict TypeScript. NEVER use `any` or `@ts-ignore`. Define explicit types and interfaces.
- Next.js App Router: Prefer Server Components (RSC) by default. Only use `'use client'` when local state, DOM events, or browser APIs are strictly required.
- Data Validation: ALWAYS validate external data, API payloads, route params, and form inputs using Zod schemas.
- State Management: Keep React state local whenever possible. Use Zustand for global client-side state.
- Modularity: Write modular, component-based code. Avoid monolithic files exceeding 200 lines.

## 4. Mobile Responsiveness & UI Standards
- Mobile-First: ALWAYS build layouts using Tailwind's mobile-first breakpoints (`sm:`, `md:`, `lg:`).
- Touch Targets: Ensure interactive elements (buttons, inputs, links) have a minimum target size of 44x44px on mobile screens.
- Drawers for Mobile UX: On small viewports, convert complex sidebars, filters, or heavy dialogs into bottom drawers/sheets using Shadcn Drawer/Sheet.
- No Horizontal Scroll: Ensure `overflow-x-hidden` is properly handled at root layout levels to prevent horizontal scrolling.

## 5. Directory Structure
Adhere strictly to this modular folder structure:
- `/src/app` -> Next.js App Router (pages, API routes, and root layouts)
- `/src/components/ui` -> Reusable atomic UI elements (Shadcn components)
- `/src/components/common` -> Shared layout elements (Header, Footer, Sidebar, Drawers)
- `/src/features/[feature-name]` -> Feature-based modular logic (components, hooks, utils specific to a feature)
- `/src/lib` -> Core infrastructure (Database setup, API clients, Auth setup). NEVER modify core setup without explicit instruction.

## 6. Security & Authentication
- Bot Protection: Any screen or modal containing login, registration, password reset, or sensitive forms MUST integrate Cloudflare Turnstile.
- Secret Key Isolation: Never expose secret keys to the client side. Ensure client-side env variables are prefixed strictly with `NEXT_PUBLIC_`.
- Password Visibility Toggle: Every password field (login, registration, password reset, change password, confirm password) MUST have a show/hide icon button. Build it once as a reusable `PasswordInput` in `/src/components/ui` and use it everywhere; NEVER render a bare `<input type="password">`.
  - Start hidden and toggle the input `type` between `password` and `text`, using the `Eye` / `EyeOff` icons from `lucide-react`.
  - The toggle MUST be a `type="button"` element (it never submits the form), reachable by keyboard, with an `aria-label` that names the current action (e.g., "Show password" / "Hide password").
  - Keep the correct `autoComplete` value (`current-password` or `new-password`) and the 44x44px touch target on mobile.

## 7. AI Features
Apply this section whenever an AI-powered feature is added (LLM chat, summarization, classification, extraction, vision, embeddings, speech, image generation), in new and existing projects.
- Configuration Owner (decide first): Before building AI settings, key storage, or any AI call, ASK the user: "Who configures AI in this system: each user or tenant admin with their own API keys, or a superadmin once for the whole platform?" Do NOT build until they answer, and record the answer in `README.md`.
  - User / tenant admin: AI settings live in the user's or tenant's settings and are stored per tenant; each tenant uses its own key.
  - Superadmin: AI settings live in a superadmin-only panel and are stored once for the platform; tenants never see the provider or key. Track AI usage per tenant and enforce limits so no tenant can run up the platform's bill.
- Provider Choice: NEVER hardcode a single AI provider, model, or API key. The configuration owner picks the provider and model and enters the API key in the AI settings.
  - Text generation (including vision and structured output): offer Gemini, OpenAI, and Anthropic.
  - Other capabilities (embeddings, speech-to-text, text-to-speech, image generation, etc.): offer only providers that actually support the capability, and add the best-fit specialized providers as selectable options (e.g., Deepgram or ElevenLabs for speech).
- Single AI Layer: Route every AI call through `/src/lib/ai`. Feature code NEVER imports a provider SDK directly. Use the Vercel AI SDK (`ai` with `@ai-sdk/google`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, and the matching `@ai-sdk/*` package for any other provider). Pass provider-specific options only via `providerOptions` inside `/src/lib/ai`.
- AI Settings Page: Visible only to the configuration owner. For each capability the app uses, provide:
  - Provider select and model select. Keep curated model options in one catalog file, `/src/lib/ai/models.ts`, and allow a custom model ID.
  - API key input using `PasswordInput` (§6).
  - A "Test connection" button that makes a minimal call with the entered key before saving.
- Key Storage: Encrypt API keys at rest in PostgreSQL with AES-256-GCM using `AI_ENCRYPTION_KEY`. Decrypt only on the server at call time. NEVER send a saved key back to the client; show it masked (e.g., `••••1234`).
- Structured Output: Define every expected AI response as a Zod schema and use the AI SDK's structured output. NEVER parse free-form model text with regex.
- Unconfigured State: If a capability has no configured provider, the feature shows a clear prompt that links to AI settings instead of throwing.
- Embeddings: Store the provider and model with every vector. Switching the embedding provider or model requires re-embedding existing data; warn the configuration owner before saving that change.

## 8. Versioning & Footer Display
- The application MUST render a dynamic version string in the main Footer or Drawer Footer.
- Format: `v[Major].[Minor].[Patch].[YYMMDDHHMMSS]` (e.g., `v1.3.4.261226034559`).
- SemVer Rules: Major = Breaking changes, Minor = New features, Patch = Bug fixes.
- Timestamp Injection: The `[YYMMDDHHMMSS]` timestamp MUST be generated dynamically during the pre-build or build step.

## 9. Git & Branching Conventions
When suggesting git commands or creating branches, ALWAYS use these prefixes:
- `feat/feature-name` -> For new features.
- `fix/issue-name` -> For bug fixes and patches.
- `chore/task-name` -> For maintenance, dependency updates, or non-functional changes.

## 10. Documentation (README.md)
- The `README.md` file MUST ALWAYS be kept up to date with architectural changes.
- It MUST contain explicit, step-by-step instructions for setup: `.env` configuration, `npm run db:up` and `npm run dev` for local development, and `docker compose up -d` for servers.
