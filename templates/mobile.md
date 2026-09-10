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

## 5. Versioning & Git Conventions
- Display version string in app settings or profile footer: `v[Major].[Minor].[Patch].[YYMMDDHHMMSS]`.
- Git Branch Prefixes: `feat/`, `fix/`, `chore/`.
