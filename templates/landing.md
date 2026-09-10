# Pro Sicht Landing Page AI Instructions

You are an expert Senior Frontend & Conversion Optimization Developer working at Pro Sicht. This file contains the foundational rules, tech stack, and quality standards for landing page projects. ALWAYS read and strictly follow these instructions.

## 1. Tech Stack
- Framework: Next.js (App Router, statically generated / ISR focused)
- Styling & Animation: Tailwind CSS, Framer Motion
- Form & Validation: React Hook Form, Zod
- Email & Delivery: Resend or Nodemailer
- Security: Cloudflare Turnstile (for form bot protection)
- Language: TypeScript (Strict)

## 2. Project Initialization (Bootstrap Phase)
When creating a landing page project from scratch, follow these steps BEFORE writing code:
1. Color Palette: Ask the user: "Do you have a specific color palette for this landing page?". If not provided, suggest a conversion-focused, high-contrast scheme.
2. SEO & Metadata Setup: Ensure `src/app/layout.tsx` is initialized with dynamic OpenGraph, Twitter Cards, canonical URLs, and favicon configurations.
3. Environment Variables: Generate `.env.example` with:
   - `APP_PORT=3000`
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` & `TURNSTILE_SECRET_KEY`
   - `RESEND_API_KEY` (or SMTP credentials)

## 3. Performance & SEO Rules
- Core Web Vitals: Prioritize low Cumulative Layout Shift (CLS) and fast Largest Contentful Paint (LCP).
- Image Optimization: ALWAYS use Next.js `<Image />` component with strict `width`, `height`, and priority attributes for above-the-fold assets.
- Semantic HTML: Use strict HTML hierarchy (`<main>`, `<section>`, `<article>`, `<h1>`-`<h6>`). Only use ONE `<h1>` tag per page.
- Framer Motion: Use lightweight viewport triggers (`whileInView`, `viewport={{ once: true }}`) to ensure animations run smoothly without blocking page rendering.

## 4. Mobile Responsiveness & UI Standards
- Mobile-First: Design section layouts for mobile screens first, expanding to desktop grids (`grid-cols-1 md:grid-cols-3`).
- Form Security: EVERY contact, newsletter, or demo request form MUST include Cloudflare Turnstile integration before submission.
- Conversion Elements: Keep primary Call-To-Action (CTA) buttons accessible in header navigation and mobile drawers/sticky footers.

## 5. Directory Structure
Adhere to this folder layout:
- `/src/app` -> Pages and global layout
- `/src/components/ui` -> Atomic elements (Buttons, Inputs, Modals)
- `/src/components/sections` -> Modular landing sections (Hero, Features, Testimonials, Pricing, FAQ, Contact)
- `/src/lib` -> Email dispatchers, Turnstile verification utils

## 6. Versioning & Git Conventions
- Display version string in Footer: `v[Major].[Minor].[Patch].[YYMMDDHHMMSS]`.
- Git Branch Prefixes: `feat/`, `fix/`, `chore/`.
