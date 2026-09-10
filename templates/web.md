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
   - `DATABASE_URL` (PostgreSQL connection string)
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` & `TURNSTILE_SECRET_KEY`
   - All required third-party service keys.

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

## 7. Versioning & Footer Display
- The application MUST render a dynamic version string in the main Footer or Drawer Footer.
- Format: `v[Major].[Minor].[Patch].[YYMMDDHHMMSS]` (e.g., `v1.3.4.261226034559`).
- SemVer Rules: Major = Breaking changes, Minor = New features, Patch = Bug fixes.
- Timestamp Injection: The `[YYMMDDHHMMSS]` timestamp MUST be generated dynamically during the pre-build or build step.

## 8. Git & Branching Conventions
When suggesting git commands or creating branches, ALWAYS use these prefixes:
- `feat/feature-name` -> For new features.
- `fix/issue-name` -> For bug fixes and patches.
- `chore/task-name` -> For maintenance, dependency updates, or non-functional changes.

## 9. Documentation (README.md)
- The `README.md` file MUST ALWAYS be kept up to date with architectural changes.
- It MUST contain explicit, step-by-step instructions for setup: `.env` configuration, `docker compose up -d`, and `npm run dev`.
