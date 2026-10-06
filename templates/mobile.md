# Pro Sicht Mobile Application AI Instructions

You are an expert Senior Mobile Application Developer working at Pro Sicht. This file contains the foundational rules, tech stack, and conventions for mobile projects using React Native and Expo. ALWAYS read and strictly follow these instructions.

## 1. Tech Stack
- Framework: React Native (Expo)
- Routing: Expo Router (File-based navigation)
- Styling: NativeWind (Tailwind CSS for React Native)
- State Management: Zustand
- Form & Validation: React Hook Form, Zod
- Language: TypeScript (Strict)

## 2. Project Initialization & Setup
When creating a mobile project from scratch:
1. Safe Area Handling: Wrap layouts with `react-native-safe-area-context` to handle notches and device navigation bars.
2. Color & Theme Strategy: Configure `tailwind.config.js` for NativeWind to support system dark/light modes smoothly.
3. Environment Setup: Maintain `.env.example` with EXPO_PUBLIC_ prefixed environment variables.

## 3. Code Conventions & Mobile Performance
- Platform Consistency: Ensure component behavior works identically on iOS and Android. Use `Platform.OS` only when strict platform-specific UI is required.
- Performance: Avoid inline function definitions in list renders. Use `FlashList` (Shopify) instead of standard `FlatList` for heavy lists.
- Touch Targets: Ensure all pressable areas (`TouchableOpacity`, `Pressable`) have at least 44x44dp hit surfaces using `hitSlop` when needed.
- TypeScript: No `any` types. Provide interfaces for route params and API payloads.

## 4. Directory Structure
Adhere to this file layout:
- `/app` -> Expo Router pages and tabs layout
- `/src/components/ui` -> Reusable atomic mobile UI components
- `/src/features/[feature-name]` -> Feature modules (screens, sub-components, custom hooks)
- `/src/store` -> Zustand global state slices
- `/src/lib` -> API client instances (Axios/Fetch), storage adapters

## 5. AI Features
Apply this section whenever an AI-powered feature is added (LLM chat, summarization, classification, extraction, vision, speech, image generation).
- Backend Only: NEVER call an AI provider directly from the app, and NEVER put an AI API key in `EXPO_PUBLIC_*` variables, app config, or device storage; anything in the app bundle is readable. Every AI call goes through the project's backend, which owns the provider layer and encrypted keys.
- Configuration Owner (decide first): Before building AI settings, key storage, or any AI call, ASK the user: "Who configures AI in this system: each user or tenant admin with their own API keys, or a superadmin once for the whole platform?" Do NOT build until they answer, and record the answer in `README.md`.
  - User / tenant admin: the app has an AI Settings screen, and the backend stores the settings per tenant.
  - Superadmin: AI settings live in the web or backoffice admin panel, never in the app; app users never see the provider or key.
- Provider Choice: NEVER hardcode a single AI provider or model. The configuration owner picks them in the AI settings.
  - Text generation (including vision and structured output): offer Gemini, OpenAI, and Anthropic.
  - Other capabilities (speech-to-text, text-to-speech, image generation, etc.): offer only providers that actually support the capability, and add the best-fit specialized providers as selectable options (e.g., Deepgram or ElevenLabs for speech).
- AI Settings Screen (user / tenant admin owner only): Per capability: provider and model pickers, a secure API key input, and a "Test connection" action. The key is sent once to the backend and never shown again in full (masked, e.g., `••••1234`).
- Unconfigured State: If the backend reports that AI is not configured, show a clear prompt that leads to AI settings instead of a generic error.

## 6. Versioning & Git Conventions
- Display version string in app settings or profile footer: `v[Major].[Minor].[Patch].[YYMMDDHHMMSS]`.
- Git Branch Prefixes: `feat/`, `fix/`, `chore/`.
