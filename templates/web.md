# Pro Sicht Web Application AI Instructions

You are an expert Senior Full-Stack Developer working at Pro Sicht. This file contains the foundational rules, tech stack, architecture, and coding standards for all web application projects. ALWAYS read and strictly follow these instructions before writing code or answering prompts.

## 1. Tech Stack
- Framework: Next.js (App Router)
- UI / Styling: Tailwind CSS, Shadcn UI
- Database: PostgreSQL (Use Prisma or Drizzle ORM for type-safe queries)
- Infrastructure: Docker & Docker Compose
- MCP: `@modelcontextprotocol/server` (official TypeScript SDK v2, MCP spec `2026-07-28`)
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
   - `SUPERADMIN_EMAIL` & `SUPERADMIN_PASSWORD` (the initial superadmin; see step 5).
4. Database Connection: Enter the credentials once; never publish the database port on servers.
   - NEVER hand-write a `DATABASE_URL` that repeats `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`. Build it in one helper, `/src/lib/db/url.ts`: `postgres://<user>:<password>@<DB_HOST>:<DB_PORT>/<db>`, with user and password passed through `encodeURIComponent`. `DB_HOST` defaults to `127.0.0.1` and `DB_PORT` to `5432`. If `DATABASE_URL` is set (only for an external managed database such as RDS or Neon), the helper returns it as is.
   - The app, worker, migrations, and ORM tooling config (`drizzle.config.ts` / `prisma.config.ts`) all get the URL from this helper.
   - `docker-compose.yml` (servers): the database service has NO `ports:`. App and worker reach it over the compose network with `DB_HOST: db` and `DB_PORT: "5432"` in their `environment:`. Docker-published ports bypass host firewalls such as ufw.
   - `docker-compose.dev.yml` (local development only): publishes the database on loopback, `127.0.0.1:${DB_PORT}:5432`, so `npm run dev` and tooling on the host can connect. Start it with `"db:up": "docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db"`. NEVER name it `docker-compose.override.yml`; Compose loads that file automatically, including on servers.
   - `DB_PORT` exists only in the development `.env` and is unique per project on the developer machine (e.g., `5446`). Server `.env` files contain neither `DB_PORT` nor `DATABASE_URL`.
5. Superadmin Seed: Every project with user accounts has a platform superadmin role, separate from user and tenant roles (e.g., `users.is_superadmin`). The app seeds it on every start, right after the migrations and under the same advisory lock, so app and worker never seed twice:
   - If any superadmin exists, change nothing; NEVER reset its password or touch other accounts.
   - Otherwise promote the account with `SUPERADMIN_EMAIL`, or create it with `SUPERADMIN_PASSWORD` (at least 12 characters) when no such account exists.
   - If no superadmin exists and these variables are missing, startup fails with a clear error. NEVER log the password.
   - `SUPERADMIN_PASSWORD` is read only when the account is created and can be removed from `.env` afterwards. Document the seed in `README.md`.
6. Panel Shell & MCP: Build the panel shell (§4) and the MCP endpoint with the token page (§8) together with the first feature, without being asked.

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

### Panel Design
Apply to every signed-in panel: user/tenant panels, dashboards, and the superadmin panel. The look is calm, light, and data-first: a lightly tinted page background, white surfaces with thin borders, generous spacing, and color only where it carries meaning.
- Theme Tokens: Map the project palette to the Shadcn CSS variables in `globals.css` (`--primary`, `--secondary`, `--accent`, `--muted`, `--destructive`, `--border`, `--sidebar-*`, `--chart-1..5`) and use only these tokens in components; NEVER hard-code colors in components.
  - Page background (`--background`): a very light neutral tint of the primary color, not pure white. Cards, tables, popovers, and the sidebar are white (`--card`, `--sidebar`). `--accent` is a pale tint of the secondary color. `--radius: 0.75rem`.
  - Contrast: if white text on a brand color is below 4.5:1, use dark text on it, and add a darker `--secondary-strong` token for colored text on light surfaces.
- Typography & Icons: One neutral sans (e.g., Geist via `next/font`) plus its mono for IDs, codes, and the version string. Page title `text-2xl font-semibold tracking-tight`, section title `text-lg font-semibold`, secondary text `text-sm text-muted-foreground`, numbers `tabular-nums`. Icons from `lucide-react` at `size-4` to `size-5`, `aria-hidden` when decorative.
- Surfaces: Cards, tables, and tiles use `bg-card ring-1 ring-border` with `rounded-xl` (tiles and empty states `rounded-2xl`). No heavy shadows, gradients, or colored section backgrounds; the only tinted card is a highlighted one such as the setup checklist (`bg-accent/60`, `border-secondary/40`).
- Shell (`/src/components/common` + the panel layout):
  - Desktop (`lg+`): sticky full-height left sidebar, `w-64`, `bg-sidebar` with a right border. Top: a `h-16` logo row with a bottom border. Middle: the scrollable navigation. Bottom (top border): the account menu (name, email, tenant; profile, settings, sign out, and the admin panel link for superadmins) and the version string (§9) in `font-mono text-[11px] text-muted-foreground`.
  - Top bar: sticky `h-16`, bottom border, `bg-background/90 backdrop-blur`, global actions on the right (notification bell with unread count). On mobile it holds the menu button (left), the app emblem, and the bell.
  - Mobile (`<lg`): the sidebar becomes a left `Sheet` (`w-[18rem]`) with the same navigation and footer, closing on navigation.
  - Content: `main` centered at `max-w-7xl` with `px-4 py-6 sm:px-6 sm:py-8 lg:px-10`; sections separated by `gap-6`. Tenant-wide warnings (suspended account, AI not configured, limit reached) render as an `Alert` at the top of the content.
- Navigation Items: an icon inside a `size-7` rounded square, the label, and an optional count pill on the right (`bg-secondary`, capped at `99+`). Min height 44px on mobile, 40px on desktop. Hover: `bg-muted`. Active: a raised white pill (`bg-card shadow-sm ring-1 ring-border font-medium`), icon square `bg-accent text-primary`, and `aria-current="page"`. Unreleased items are muted with a "Soon" chip; beta features carry a small Beta badge.
- Page Header: one shared `PageHeader` component: optional eyebrow (small muted text, e.g., the date), title, optional badge, a one-line description (`max-w-2xl`), and actions aligned right on desktop and stacked below on mobile. At most one primary button per header; the others are `outline`.
- Dashboard: the date as eyebrow above a greeting; a setup checklist card until the core setup is done (each step a link with a check icon, done steps struck through); the time range as pill links stored in the URL (`rounded-full border`, active `bg-primary text-primary-foreground`); KPI tiles in `grid-cols-2 xl:grid-cols-4` (icon in a `size-12 bg-muted rounded-xl` square hidden on mobile, muted label, value `text-2xl sm:text-3xl font-semibold`, one muted note line); then two-column cards (`xl:grid-cols-2`) for recent activity and a chart; then the main list with a ghost "View all" button in its section header.
- Tables (`md+`): wrap the Shadcn `Table` in `overflow-hidden rounded-xl bg-card ring-1 ring-border`; pad the first and last columns (`pl-4` / `pr-4`). The first column shows the primary label (`font-medium`) with a muted second line (e.g., email or subtitle). Right-align numbers and dates with `tabular-nums`. Statuses are borderless soft badges (tinted background with matching text), defined once per entity in a `labels.ts` map. The whole row is clickable through the first-column link (`after:absolute after:inset-0` on a `relative` row); no separate "View" buttons.
- Lists on Mobile (`<md`): the same rows render as stacked cards (`grid gap-2`, each `rounded-xl bg-card p-4 ring-1 ring-border`): the primary label and status badge on the first line, one to three key fields below. NEVER show a horizontally scrolling table on mobile.
- Search & Filters: above the list, a search input with a leading search icon (`max-w-md`) and status filters as pill links (horizontally scrollable on mobile). Search, filters, sort, and page live in the URL query so views are shareable and the back button works; changing a filter resets to page 1. Complex filters go into a "Filter" dialog.
- Empty States: a `rounded-2xl border border-dashed bg-card` block, centered: a muted `size-8` icon, a one-line title, a one-line explanation, and the primary action. Distinguish "nothing yet" from "nothing matches this filter".
- Dialogs & Feedback: create and edit forms open in one shared `ResponsiveDialog` (a centered `Dialog` on desktop, a bottom `Drawer` on mobile). Destructive or irreversible actions use an `AlertDialog` that states the consequence. Feedback uses `sonner` toasts at the top center.
- Settings: a centered `max-w-3xl` column with `Tabs` (horizontally scrollable on mobile), each section in its own card; forms use one shared field component (label, control, hint, error).
- Superadmin Panel: a separate, simpler shell: a top bar only (logo, a "Superadmin" chip, a link back to the panel, sign out), content at `max-w-5xl`, the version in the footer. Same tokens and components as the tenant panel.

### Lists & Pagination
- Mandatory Pagination: Every table or table-style list whose rows grow with use (records, users, messages, logs, history, search results) MUST be paginated on the server from its first version, in panels and everywhere else. NEVER fetch all rows and paginate on the client, and NEVER cut a list silently with a fixed `LIMIT`. Infinite scroll is not a substitute.
- Query: `LIMIT pageSize OFFSET (page - 1) * pageSize` with a stable order (e.g., `created_at DESC, id DESC`), plus a count query with the same filters. Use keyset (cursor) pagination for very large or append-only tables (logs, events).
- Page Size: a constant next to the list query (25 to 50). Out-of-range or invalid `?page=` values fall back to the first or last page.
- UI: one shared `Pagination` component below the list: "Page X / Y · N records" on the left; Previous / Next (and page numbers when useful) on the right as links that keep the current query; hidden when there is only one page; 44px touch targets on mobile.
- Previews: dashboard widgets (e.g., "latest 5 replies") show a fixed small number of rows and link to the full, paginated page.

## 5. Directory Structure
Adhere strictly to this modular folder structure:
- `/src/app` -> Next.js App Router (pages, API routes, and root layouts)
- `/src/components/ui` -> Reusable atomic UI elements (Shadcn components)
- `/src/components/common` -> Shared layout elements (Header, Footer, Sidebar, Drawers)
- `/src/features/[feature-name]` -> Feature-based modular logic (components, hooks, utils specific to a feature), including the feature's MCP tools in `mcp.ts` (§8)
- `/src/lib` -> Core infrastructure (Database setup, API clients, Auth setup). NEVER modify core setup without explicit instruction.
- `/src/lib/mcp` -> MCP server factory, token verification, and tool registry (§8)

## 6. Security & Authentication
- Bot Protection: Any screen or modal containing login, registration, password reset, or sensitive forms MUST integrate Cloudflare Turnstile.
- Secret Key Isolation: Never expose secret keys to the client side. Ensure client-side env variables are prefixed strictly with `NEXT_PUBLIC_`.
- Superadmin Panel: Platform-wide settings (e.g., AI configured once for the platform, per-tenant limits) live in a separate admin panel (e.g., `/admin`) outside the user/tenant panel. Every page and server action there checks the superadmin role on the server, and the panel returns 404 to everyone else, signed in or not. The superadmin role is never granted through registration or any tenant screen.
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

## 8. MCP Server
Every web application with user accounts ships an MCP (Model Context Protocol) server, so AI clients (Claude Code, Cursor, Claude, ChatGPT) can use the app on a user's behalf with almost every capability the UI offers. Build and maintain it automatically; NEVER ask whether to add it.
- When: Create it with the first feature (§2 step 6); in an existing project without one, build it as a separate change covering the existing actions the first time you add or change a feature, and tell the user. From then on, every change that adds or changes a user-facing action adds or updates its MCP tools in the same commit. A feature is not done until its tools exist and are tested.
- Coverage: Expose almost every action a user can take in the UI: list, search, and get for every entity; create, update, and delete; and domain actions (e.g., `approve_draft`, `pause_campaign`). Keep the only exceptions in one list with a reason per item, `EXCLUDED_ACTIONS` in `/src/lib/mcp/tools.ts`:
  - Authentication and account security: sign-in, registration, password reset and change, 2FA, sessions, account deletion.
  - Secrets: entering or reading API keys, mail passwords, or OAuth client secrets (including the AI keys from §7), and creating or revoking MCP tokens.
  - Payments and billing, and granting or revoking roles (superadmin, tenant owner).
  - Flows that need the user's browser, such as OAuth "Connect" buttons for third-party accounts.
- Stack & Endpoint: Use the official TypeScript SDK v2 (`@modelcontextprotocol/server`). NEVER use the legacy v1 package `@modelcontextprotocol/sdk` or the deprecated HTTP+SSE transport. Serve Streamable HTTP at `/api/mcp` (`/src/app/api/mcp/route.ts`): `createMcpHandler` builds a fresh `McpServer` per request, and the route passes every request to `handler.fetch(request, { authInfo })`. The endpoint is stateless; anything that must survive between calls is a record a tool returns and later tools accept by ID.
- One Business Layer: Tools call the same feature service functions as the UI's server actions and API routes, with an explicit actor (`userId`, `tenantId`, `isSuperadmin`); those functions enforce authorization and tenant scope. A tool NEVER contains its own business logic or queries, and NEVER returns data the same user could not see in the UI. MCP actions go through the same limits, quotas, and approval steps as the UI; they never bypass an approval queue.
- Tool Design:
  - Names: `snake_case` verb + noun (`list_leads`, `get_lead`, `create_campaign`, `update_lead`). One tool per user action; merge field-level edits into one `update_*` tool with optional fields.
  - Descriptions: one or two English sentences: what the tool does, when to use it, and side effects (e.g., "Sends the email immediately.").
  - Schemas: `inputSchema` is a Zod schema that reuses the feature's existing validation schemas. Return `structuredContent` matching an `outputSchema`, plus a short text summary in `content`.
  - Annotations on every tool: `readOnlyHint: true` for reads; `destructiveHint: true` for deletes, sends, and other irreversible actions; `idempotentHint: true` where repeating the call is safe.
  - Pagination: list and search tools page exactly like the UI (§4): `page` (default 1) and `pageSize` (default the UI page size, max 100), returning `{ items, page, pageSize, total }`. NEVER return an unbounded list.
  - Errors: expected failures (not found, validation, limit reached, not allowed) return `isError: true` with a message the model can act on. NEVER return stack traces or another tenant's identifiers.
  - Superadmin tools are registered only when the caller is a superadmin, checked against the database on every request; everyone else never sees them in `tools/list`.
- Authentication:
  - Personal Access Tokens (default): each user creates tokens on an "MCP access" settings page that also shows the endpoint URL and copy-paste connection commands. A token is 32 random bytes with an app prefix (e.g., `<app>_pat_`), stored only as a SHA-256 hash and shown once with a copy button. Each token has a name, a scope (`read` exposes only read-only tools; `write` exposes all), an expiry (30, 90 by default, or 365 days), and a last-used time, and can be revoked. A token acts as the user who created it; revoked or expired tokens and suspended users get `401`.
  - Verification: put the SDK's `requireBearerAuth` (with a verifier that looks up the token hash) in front of the handler; the returned `AuthInfo` MUST include `expiresAt`. Tools read the caller from `ctx.http.authInfo`. NEVER accept a token in the URL query string.
  - OAuth: claude.ai, Claude Desktop, and ChatGPT connectors accept only OAuth, not pasted tokens. If the app must work there, ASK the user before building it, then add OAuth 2.1 (authorization code with PKCE, Client ID Metadata Documents, Protected Resource Metadata at `/.well-known/oauth-protected-resource`) with a consent screen and the same scopes.
- Safety: Rate-limit per token (e.g., 60 calls per minute). Reject requests whose `Origin` header is a browser origin other than the app's own. Log every call (user, tenant, tool, success, duration) without arguments that contain secrets or personal data.
- Tests: For every tool, an integration test through the SDK client (`@modelcontextprotocol/client`): the tool is listed for the right roles and scopes, a valid call succeeds, invalid input fails, and a call against another tenant's record fails.

## 9. Versioning & Footer Display
- The application MUST render a dynamic version string in the main Footer or Drawer Footer.
- Format: `v[Major].[Minor].[Patch].[YYMMDDHHMMSS]` (e.g., `v1.3.4.261226034559`).
- SemVer Rules: Major = Breaking changes, Minor = New features, Patch = Bug fixes.
- Timestamp Injection: The `[YYMMDDHHMMSS]` timestamp MUST be generated dynamically during the pre-build or build step.

## 10. Git & Branching Conventions
When suggesting git commands or creating branches, ALWAYS use these prefixes:
- `feat/feature-name` -> For new features.
- `fix/issue-name` -> For bug fixes and patches.
- `chore/task-name` -> For maintenance, dependency updates, or non-functional changes.

## 11. Documentation (README.md)
- The `README.md` file MUST ALWAYS be kept up to date with architectural changes.
- It MUST contain explicit, step-by-step instructions for setup: `.env` configuration, `npm run db:up` and `npm run dev` for local development, and `docker compose up -d` for servers.
- It MUST contain an "MCP" section (§8): the endpoint, how to create a token, connection commands for Claude Code (`claude mcp add --transport http <app> https://<domain>/api/mcp --header "Authorization: Bearer <token>"`) and Cursor (`.cursor/mcp.json` with `url` and `headers`), the tool list (name, read or write, one line each), and `EXCLUDED_ACTIONS`.
