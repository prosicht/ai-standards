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
   - `DATABASE_URL=postgresql://user:pass@localhost:5432/dbname`
   - `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET`
   - `CORS_ORIGIN`
   - `AI_ENCRYPTION_KEY` (only when the service has AI features; see §4). AI provider keys never go in `.env`.

## 3. Security & Architecture Rules
- JWT Auth: Secure protected endpoints with a dedicated Auth Middleware validating JWT tokens. Keep access tokens short-lived.
- Input Validation: NEVER process request bodies, query params, or URL path parameters without validating them against Zod schemas.
- Error Handling: Use a centralized Error Handling Middleware. Never leak raw database stack traces to API client responses.
- Security Headers: Always initialize `helmet()`, configure strict `cors()`, and apply rate-limiting middleware to authentication routes.

## 4. AI Features
Apply this section whenever an AI-powered feature is added (LLM chat, summarization, classification, extraction, vision, embeddings, speech, image generation), in new and existing services.
- Provider Choice: NEVER hardcode a single AI provider, model, or API key. The user picks the provider and model and enters their own key through the AI settings endpoints.
  - Text generation (including vision and structured output): offer Gemini, OpenAI, and Anthropic.
  - Other capabilities (embeddings, speech-to-text, text-to-speech, image generation, etc.): offer only providers that actually support the capability, and add the best-fit specialized providers as selectable options (e.g., Deepgram or ElevenLabs for speech).
- Single AI Layer: Route every AI call through `/src/lib/ai`; services NEVER import a provider SDK directly. Use the Vercel AI SDK (`ai` with `@ai-sdk/google`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, and the matching `@ai-sdk/*` package for any other provider). Pass provider-specific options only via `providerOptions` inside `/src/lib/ai`.
- AI Settings Endpoints: Admin-only, JWT-protected, and scoped per tenant/workspace in multi-tenant services. Per capability they read and save the provider, model, and API key, and expose a test endpoint that makes a minimal call with the entered key before saving. Keep curated model options in one catalog file, `/src/lib/ai/models.ts`, and accept a custom model ID.
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
