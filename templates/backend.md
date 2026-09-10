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

## 3. Security & Architecture Rules
- JWT Auth: Secure protected endpoints with a dedicated Auth Middleware validating JWT tokens. Keep access tokens short-lived.
- Input Validation: NEVER process request bodies, query params, or URL path parameters without validating them against Zod schemas.
- Error Handling: Use a centralized Error Handling Middleware. Never leak raw database stack traces to API client responses.
- Security Headers: Always initialize `helmet()`, configure strict `cors()`, and apply rate-limiting middleware to authentication routes.

## 4. Directory Structure
Adhere to this layered architecture layout:
- `/src/controllers` -> Request handlers and response formatting
- `/src/services` -> Core business logic
- `/src/routes` -> Express router definitions
- `/src/middlewares` -> JWT Auth, Zod validation, Error handler, Rate limiters
- `/src/lib` -> Database connection instances (Prisma/Drizzle), Logger (Winston/Pino)
- `/src/types` -> Custom Express request declarations and TypeScript interfaces

## 5. Versioning & Git Conventions
- Provide a `/health` or `/version` API endpoint returning system status and semantic version string `v[Major].[Minor].[Patch].[YYMMDDHHMMSS]`.
- Git Branch Prefixes: `feat/`, `fix/`, `chore/`.
