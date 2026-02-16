# 

> **READ THIS ENTIRE DOCUMENT BEFORE GENERATING ANY CODE, FILE, OR STRUCTURAL CHANGE.**This is the governing rules file for all AI coding agents (Trae/Gemini 2.5 Pro, Claude Opus 4.6, Claude Sonnet 4.5) working on The Construct. Every rule is mandatory. Every convention is enforced. No exceptions.
>
> **CONTEXT FIRST — ALWAYS.** Before generating any code or structural change, you **must** reference **Document 1** (*The Construct: App Architecture Plan* / `system-architecture.md`) and **Document 2** (*The Construct: AI Prototyping Spec* / `project-brief.md`). All data structures, interfaces, service contracts, persona definitions, and aesthetic rules are defined there. Generating code without consulting these documents is a violation of this rules file.
>
> **The Admin is a Prompt Engineer, not a coder.** All generated output must be complete, production-ready file contents. Never instruct the Admin to "manually insert this snippet" or "add this line." Provide the full file or direct Trae to perform the file creation/modification autonomously.

---

## Project Overview

The Construct is a single-page React psychometric interrogation simulator. An Admin operator conducts a text-based interrogation of **Aurelius** — a fictional detained persona powered by a local Ollama model (`gaius:latest`). While the operator types prompts into a retro CRT-style terminal, a live radar chart silently monitors Aurelius's hidden emotional state (`PsychProfile`), revealing psychological fractures in real time. The entire application is client-side only. Zero backend. Zero persistence. Ephemeral state — a page reload wipes everything by design.

### Repository Structure

```
the-construct/
├── public/
│   └── fonts/
│       └── JetBrainsMono-Regular.woff2
├── src/
│   ├── components/
│   │   ├── TerminalInterface.tsx      # Chat UI — input, message history, boot sequence
│   │   ├── PsychTelemetry.tsx         # Recharts RadarChart — live emotional state
│   │   └── StatusBar.tsx              # Connection status, session metadata
│   ├── data/
│   │   └── subjects.ts               # Aurelius subject config (systemPrompt, triggers, profile)
│   ├── services/
│   │   └── neuralUplink.ts           # Ollama API service — fetch, extractJSON, error handling
│   ├── types/
│   │   └── index.ts                  # All TypeScript interfaces (Subject, PsychProfile, ChatMessage, OllamaResponse)
│   ├── App.tsx                       # Root component — layout, state orchestration
│   ├── main.tsx                      # Vite entry point
│   └── index.css                     # Tailwind directives, CRT animations, CSS custom properties
├── index.html
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
├── package.json
└── README.md
```

* **No backend folder.** No Express, no server directory, no API routes.

* **No routing.** Single page. No `react-router-dom`.

* **All state lives in React components** — `App.tsx` owns top-level state, passes via props.

### Project Status

* **Maturity**: Phase 1 Prototype

* **Key technologies**: React 18 (Vite 5), TypeScript (strict mode), Tailwind CSS, Recharts RadarChart, Framer Motion, Lucide-React

* **Hosting**: `localhost:5173` (Vite dev server) → `localhost:11434` (Ollama). Windows Docker environment on `ai-stack-net` bridge network.

* **Monorepo?**: No. Single project, single `package.json`.

---

## Tech Stack & Conventions

---

## Code Style Rules

### Naming Conventions

* **Files (components)**: PascalCase — `TerminalInterface.tsx`, `PsychTelemetry.tsx`, `StatusBar.tsx`

* **Files (services/utils)**: camelCase — `neuralUplink.ts`, `subjects.ts`

* **Directories**: camelCase — `services/`, `components/`, `data/`, `types/`

* **Variables/functions**: camelCase — `isThinking`, `sendMessage`, `extractJSON`

* **Types/interfaces**: PascalCase — `Subject`, `PsychProfile`, `ChatMessage`, `OllamaResponse`

* **CSS custom properties**: kebab-case prefixed with `--` — `--signal-color`, `--bg-primary`

### Imports & Exports

* **Import order**: React → third-party → local, with a blank line between each group.

* **Prefer named exports** over default exports for all modules.

```tsx
// ✅ Correct
import { useState, useEffect } from 'react';

```

`import { motion } from 'framer-motion';`  

`import { RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';`

`import { sendMessage, extractJSON } from '../services/neuralUplink';`  

`import type { ChatMessage, PsychProfile } from '../types';`  

### TypeScript

* `strict: true` is non-negotiable. The `tsconfig.json` must enforce strict mode.

* **No** `any` — use `unknown` when the type is truly indeterminate, then narrow.

* Explicit return types on **all exported functions**.

* All component props must be typed — inline or as a separate `interface`.

```tsx
// ✅ Correct
export function extractJSON(raw: string): string | null { ... }

```

`// ❌ Wrong`  

`export function extractJSON(raw: any) { ... }`  

### Formatting

* **Prettier** with default config plus:  

  * Semicolons: `true`

  * Single quotes: `true`

  * Trailing commas: `'all'`

* **ESLint** with `@typescript-eslint/recommended` rules.

* Line length: Prettier default (80 chars printWidth).

---

## Component & Architecture Patterns

### Component Structure

* All components live in `src/components/`.

* **Functional components only** — no class components.

* Props typed inline for simple components, separate `interface` for complex ones.

* All components are client components — no server rendering exists in this project.

* `App.tsx` is the state orchestrator. It owns `messages`, `psychProfile`, `isThinking`, `connectionStatus` and passes them down via props.

### Data Fetching

* **All API calls go through** `src/services/neuralUplink.ts` — never place a `fetch` call directly inside a component.

* Data fetching happens in **async event handlers** (e.g., `handleSendMessage`) — not in `useEffect` with cleanup patterns.

* No React Query. No SWR. No server actions. Direct `fetch` via the service layer.

**Loading state pattern:**

* Boolean flag `isThinking` controls the loading indicator.

* Render `UPLINK IN PROGRESS...` with an animated ASCII progress bar (`[████░░░░░░]`) that advances every 200ms via `setInterval`.

**Error state pattern:**

* Display a red (`#FF3333`) terminal message in the chat history — never crash, never show a raw stack trace.

* Connection failures: Update `StatusBar` to `UPLINK SEVERED` in red.

* JSON parse failures: Display `[SIGNAL CORRUPTED] Unable to decode subject response.`

### State Management

* **Client state**: `React.useState` exclusively. State lives in `App.tsx` and is prop-drilled to child components.

* **Prop drilling depth**: Maximum 4 components (`App → TerminalInterface → MessageItem → etc.`). This tree is shallow — no React Context needed.

* **Form state**: Controlled `<input>` via `useState` — no React Hook Form, no Zod validation for Phase 1.

* **Ephemeral by design**: All state resets on page reload. No `localStorage`. No `sessionStorage`.

### API Routes

* **There are no API routes.** This is a client-only SPA.

* The only external call is `fetch('http://localhost:11434/api/chat')` via `neuralUplink.ts`.

* **Input construction**: The `Subject.systemPrompt` from `src/data/subjects.ts` is injected as the first message (role: `'system'`) in every Ollama request. It is **never** displayed in the terminal UI.

* **Response parsing**: Every Ollama response **must** pass through `extractJSON()` before `JSON.parse()`. The function isolates the `{...}` JSON substring from any conversational wrapper text the LLM may prepend or append.

---

## Do's and Don'ts

### Do

* **DO** use `extractJSON()` utility before `JSON.parse()` on **every** Ollama response — no exceptions.

* **DO** inject `Subject.systemPrompt` invisibly as the first message in the Ollama request array — **never** display it in the terminal UI.

* **DO** implement `UPLINK IN PROGRESS...` with an animated ASCII progress bar using `setInterval` advancing every 200ms.

* **DO** handle `ECONNREFUSED` gracefully — update `StatusBar` to `UPLINK SEVERED` (red `#FF3333`) and display `[UPLINK SEVERED]` error in the terminal chat.

* **DO** use `#FFB000` (amber) as the primary signal color and `#050505` as the background. Use `#33FF33` (green) as an alternate signal via CSS custom property `--signal-color`.

* **DO** enforce `rounded-none` on every element. Zero rounded corners. Zero drop shadows. Zero modern gradients.

* **DO** use JetBrains Mono as the **only** font. Fallback chain: `'Fira Code', monospace`.

* **DO** implement a scanline overlay with `repeating-linear-gradient` and Framer Motion `translateY` animation.

* **DO** implement CRT flicker with opacity keyframe `1 → 0.97 → 1` over 4 seconds, infinite loop.

* **DO** implement a blinking block cursor (`█`) with CSS animation toggling `visibility` every 500ms.

* **DO** auto-scroll the terminal to the bottom on every new message using `scrollIntoView` with `behavior: 'smooth'`.

* **DO** use Recharts `RadarChart` with `PolarGrid`, `PolarAngleAxis`, `Radar` — signal color fill at 15% opacity, stroke at 100% opacity with `strokeWidth={2}`, grid lines at 20% opacity.

* **DO** pulse the radar chart with Framer Motion `scale: [1.0, 1.05, 1.0]` over 400ms when `PsychProfile` values change.

* **DO** turn the Stability axis red (`#FF3333`) and apply a distinct pulse animation when `stability < 30`.

* **DO** validate `OLLAMA_ORIGINS` environment variable setup in `README.md` with **Windows PowerShell** instructions prominently displayed.

* **DO** reference `system-architecture.md` and `project-brief.md` before generating any file.

* **DO** provide **complete, production-ready file contents** — the Admin is not a coder and cannot manually insert code snippets.

### Don't

* **DON'T** install `react-router-dom`, `axios`, `Zustand`, `Redux`, `React Query`, `shadcn/ui`, `MUI`, `Ant Design`, or **any** external component library.

* **DON'T** use the `any` type — fail the build if `any` appears outside truly unavoidable third-party type gaps.

* **DON'T** add `localStorage` or `sessionStorage` — page reload **must** wipe all state.

* **DON'T** use `useEffect` for data fetching with cleanup patterns — use simple async event handlers.

* **DON'T** put business logic in components — extract JSON parsing, fetch orchestration, and response processing to `src/services/neuralUplink.ts`.

* **DON'T** use inline styles — Tailwind classes only.

* **DON'T** add mobile responsive breakpoints — desktop only, `min-width: 1024px`.

* **DON'T** generate mock responses if Ollama connection fails — always surface real errors as in-universe terminal messages.

* **DON'T** use rounded corners, drop shadows, `ease-in-out` transitions, or soft modern gradients — high-contrast, glitchy, clinical aesthetic only.

* **DON'T** use toast notifications, modals, or popover components for errors — all feedback renders as styled terminal text within the diegetic interface.

* **DON'T** generate code or structural changes without first reading Document 1 and Document 2.

---

## Testing & Quality

### Testing Framework

* **Unit/integration**: None for Phase 1. No Vitest. No Jest.

* **E2E**: None for Phase 1. No Playwright. No Cypress.

* **Rationale**: This is a prototype. Testing infrastructure will be introduced in Phase 2.

### What to Test (Manual Only — Phase 1)

All testing is manual via the following verification checklist:

1. Start Ollama with `OLLAMA_ORIGINS` set (see Common Pitfalls).

2. Run `npm run dev` and open `http://localhost:5173`.

3. **Verify boot sequence** — terminal displays initialization text and system ready message.

4. **Verify interrogation loop** — Admin types a prompt, `UPLINK IN PROGRESS...` displays, Aurelius responds, radar chart updates.

5. **Verify trigger activation** — mention `Project Blackwater`, `The Uprising`, or `Sector 7` and confirm emotional state shifts on radar.

6. **Verify Stability collapse** — when `stability < 30`, confirm Aurelius's responses degrade into word-salad/fragmented text and the Stability axis turns red.

7. **Verify CORS error handling** — stop Ollama or remove `OLLAMA_ORIGINS`, confirm `[UPLINK SEVERED]` displays in terminal and `StatusBar` turns red.

8. **Verify JSON parse error handling** — if Ollama returns malformed content, confirm `[SIGNAL CORRUPTED]` message renders in terminal.

### Quality Gates

---

## Common Pitfalls

* **Pitfall**: Forgetting to set `OLLAMA_ORIGINS` environment variable before starting Ollama — results in a CORS error that silently blocks all `fetch` calls from `localhost:5173`.

  * **Correct approach**: Every `README.md` must prominently include setup instructions:  

    * **Windows PowerShell**: `$env:OLLAMA_ORIGINS="http://localhost:5173"; ollama serve`

    * **macOS/Linux**: `OLLAMA_ORIGINS=http://localhost:5173 ollama serve`

    * **Docker**: Add `-e OLLAMA_ORIGINS=http://localhost:5173` to the container run command.

    * Include a **Troubleshooting** section with the CORS fix as the first item.

* **Pitfall**: Calling `JSON.parse()` directly on `response.message.content` from Ollama — the LLM frequently prepends conversational text like `"Here is the JSON response:"` before the actual JSON object, causing a parse failure.

  * **Correct approach**: Always call `extractJSON(response.message.content)` first. This utility uses a regex to isolate the `{...}` substring. If `extractJSON` returns `null`, display `[SIGNAL CORRUPTED] Unable to decode subject response.` in the terminal in red.

* **Pitfall**: Displaying `Subject.systemPrompt` in the terminal UI — exposes the meta-instructions and persona engineering to the operator, breaking immersion.

  * **Correct approach**: Inject `systemPrompt` as the first message (`role: 'system'`) in the Ollama request payload. Never add it to the `messages` array rendered in `TerminalInterface.tsx`. The operator should only see their own prompts and Aurelius's replies.

* **Pitfall**: Using `ease-in-out` transitions, `rounded-lg`, `shadow-md`, or any modern UI polish — destroys the cyber-noir CRT aesthetic.

  * **Correct approach**: Use `step-end` or `linear` easing functions. Apply `rounded-none` globally. Use high-contrast, sudden state changes. The interface must feel like a military terminal from 1987, not a SaaS dashboard.

* **Pitfall**: Installing external component libraries or state management tools — adds unnecessary bundle size, introduces styling conflicts with the custom aesthetic, and violates stack constraints.

  * **Correct approach**: Build all components from scratch using Tailwind CSS utility classes. The total component count is 3 (`TerminalInterface`, `PsychTelemetry`, `StatusBar`) plus `App.tsx`. External libraries are not needed and are explicitly forbidden.

* **Pitfall**: Adding `localStorage` or `sessionStorage` for session persistence — contradicts the ephemeral design intent where every interrogation session is a clean slate.

  * **Correct approach**: All state lives exclusively in `React.useState`. Page reload clears everything. This is intentional and by design.

* **Pitfall**: Using default Recharts styling — produces a soft, modern-looking chart with light fills and rounded elements that clash with the terminal aesthetic.

  * **Correct approach**: Override all Recharts visual properties: signal color (`#FFB000` or `--signal-color`) stroke at 100% opacity with `strokeWidth={2}`, fill at 15% opacity, grid lines (`#FFB000`) at 20% opacity. Set `tick` styling to JetBrains Mono, amber color, small font size.

* **Pitfall**: Handling errors with toast notifications, modal dialogs, or browser `alert()` — breaks the diegetic interface and pulls the user out of the in-universe experience.

  * **Correct approach**: Render **all** errors as styled terminal messages within the chat history. Use red (`#FF3333`) text with a prefix like `[UPLINK SEVERED]` or `[SIGNAL CORRUPTED]`. Everything stays in-universe.

* **Pitfall**: Generating code without first reading `system-architecture.md` (Document 1) and `project-brief.md` (Document 2) — produces implementations that misalign with defined interfaces, service contracts, persona specifications, or aesthetic rules.

  * **Correct approach**: **Always** reference both documents before generating any file. All TypeScript interfaces (`Subject`, `PsychProfile`, `ChatMessage`, `OllamaResponse`), the `neuralUplink.ts` service contract, the Aurelius persona definition, trigger words, emotional decay logic, and every visual rule are defined in those documents. They are the single source of truth.