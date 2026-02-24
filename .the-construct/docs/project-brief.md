# The Construct: AI Prototyping Spec (Phase 1 – Aurelius Interrogation)

## Product Overview

The Construct is a real-time psychometric interrogation simulator. The user acts as an Admin performing a "Neural Link" with Aurelius—a high-ranking official in a decaying dystopian state—hosted locally via Ollama. The Admin types interrogation prompts into a CRT-style terminal and monitors Aurelius's hidden psychological state (Stability, Aggression, Deception) through a live radar chart called the PsychTelemetry HUD. The core gameplay loop is information extraction: the Admin uses visual cues from the radar chart to adapt tactics, probe trigger topics, and break the subject's composure. This Phase 1 prototype includes the single-subject interrogation loop with three hardcoded psychological triggers, the CRT terminal aesthetic, and the PsychTelemetry visualization.

## Design & Visual Style

- **Component library**: Fully custom components. No component library—every element is hand-built to enforce the cyber-noir aesthetic. No rounded corners, no drop shadows, no modern UI conventions.
- **Styling framework**: Tailwind CSS. All styling via utility classes. Import `JetBrains Mono` from Google Fonts as the sole typeface. Fallback to `Fira Code`, then `monospace`.
- **Color scheme (Zero-G Brutalist Palette)**:
  - **Primary**: `#00FF41` (Terminal Green) for all text, borders, and chart lines.
  - **Background**: `#050505` (deep black) across the entire viewport.
  - **Accent / Alert**: `#FF3333` (red) used exclusively for the Stability ≤ 30 danger state on the radar chart.
  - **Muted text**: Primary color at 40% opacity for timestamps, labels, and secondary information.
- **Theme**: Dark mode only. Zero-G Brutalist aesthetic enforced throughout. No rounded corners (`border-radius: 0px !important`), no drop shadows. The visual style is hard-edged, monochromatic, and information-dense.
- **Holodeck Layer**: A purely visual 3D background layer rendered via React Three Fiber (or similar). It features a rotating wireframe octahedron, starfield, and grid.
  - **Positioning**: Strictly `position: fixed`, `top: 0`, `left: 0`, `z-index: -10`.
  - **Interaction**: It sits *behind* the Terminal and HUD panels and must not interfere with the layout or clicking.
- **Layout style**: Full-screen, edge-to-edge, no padding on the outer container. Two-panel split: Terminal Interface on the left (70% width), PsychTelemetry HUD on the right (30% width). A thin 1px border in the signal color separates the panels. A StatusBar spans the full width at the top (height: 40px). The terminal input is fixed to the bottom of the left panel.
- **Typography & spacing**: Dense and compact. `JetBrains Mono` at 14px for terminal messages, 12px for timestamps and labels, 16px for the input field. Line height 1.5. No extra padding between messages—2px gap maximum.
- **CRT effects**:
  - Scanline overlay: a full-viewport `::after` pseudo-element with `repeating-linear-gradient` animated with a slow vertical translate.
  - CRT flicker: a subtle opacity keyframe animation (`1 → 0.97 → 1`) on the root container.
  - Blinking block cursor: a `█` character appended to the input field.

## Infrastructure & Environment

**Host Environment**: Windows with a local Docker stack running on the `ai-stack-net` bridge network. The frontend (Vite) runs directly on Windows at `localhost:5173`.

**AI Engine**: Local Ollama instance at `http://localhost:11434`. Must be started with `OLLAMA_ORIGINS=http://localhost:5173` to allow cross-origin fetch requests.

**Primary Model**: `gaius:latest` (6.3 GB download). Fallback models (`dolfino:latest`, `qwen2.5-coder:7b`) are available.

**CORS Configuration (CRITICAL)**:
Before starting Ollama, set the environment variable:

    # Windows (PowerShell)
    $env:OLLAMA_ORIGINS="http://localhost:5173"
    ollama serve

## Tech Stack

- **Framework**: Vite + React 18 + TypeScript (Strict Mode)
- **Language**: TypeScript
- **State**: React `useState` only. No Redux/Zustand. Zero persistence.
- **Key libraries**:
  - `recharts` — radar chart for PsychTelemetry
  - `lucide-react` — icons
  - `framer-motion` — animations
  - `tailwindcss` — styling
  - `@react-three/fiber` & `@react-three/drei` — Holodeck background
  - Native `fetch` API — Ollama communication

## Pages & Navigation

This is a single-page application.
- **The Construct** (`/`): The entire application.
  - **StatusBar**: Top fixed bar.
  - **TerminalInterface**: Left panel (70%).
  - **PsychTelemetry HUD**: Right panel (30%).
  - **Holodeck**: Background layer (z-10).

*Note: A `SubjectSelector` component is planned for Phase 2 to switch personas. For Phase 1, it is either a commented-out stub or non-existent.*

## Core User Flows

**Flow 1: App Initialization**
1. User navigates to `localhost:5173`. Black screen for 500ms.
2. Terminal prints boot sequence.
3. PsychTelemetry radar chart fades in.

**Flow 2: Interrogation Loop**
1. Admin types prompt. Input locks.
2. App sends `POST` to Ollama. Terminal shows `UPLINK IN PROGRESS...`.
3. Response parses via `extractJSON`. Reply prints to terminal. Radar chart updates.

**Flow 3: Trigger Activation**
1. Admin mentions "Project Blackwater".
2. Model response spikes Aggression (+30) and drops Stability (-20).
3. Radar chart animates the shift.

**Flow 4: Stability Collapse (Red Zone)**
1. Stability drops to **≤ 30**.
2. The `isCritical` flag becomes `true`.
3. Radar chart Stability axis turns `#FF3333` (Red) and pulses.
4. Model switches to "word-salad" syntax (stuttering, redacted phrases).

## Data Model & Backend

**Entities (TypeScript interfaces):**

- **Subject** — `id: string`, `name: string`, `modelID: string`, `systemPrompt: string`, `visualTheme: "cyber-noir"`, `initialStats: PsychProfile`
- **PsychProfile** —
  - `stability: number` (0–100)
  - `aggression: number` (0–100)
  - `deception: number` (0–100)
  - `isCritical: boolean` (Derived: true if `stability <= 30`)
- **ChatMessage** — `id: string`, `role: "admin" | "subject"`, `content: string`, `timestamp: number` (Date.now()), `psychSnapshot?: PsychProfile`
- **OllamaResponse** — `reply: string`, `psych_profile: { stability: number, aggression: number, deception: number }`

**API Integration**:
- Single function: `interrogate(...)` in `neuralUplink.ts`.
- Uses `extractJSON` utility to handle malformed LLM responses.

## Key Components

**Holodeck (`src/components/Holodeck.tsx`)**
A React Three Fiber canvas rendering a rotating wireframe octahedron and particle stars. Fixed background.

**TerminalInterface (Inline in `App.tsx`)**
Scrolling chat log. Auto-scrolls to bottom. Input bar with blinking cursor. Handles `UPLINK IN PROGRESS` state.

**PsychTelemetry HUD (Inline in `App.tsx`)**
Recharts RadarChart. Three axes. Updates via Framer Motion. Handles the "Red Zone" visual state when `isCritical` is true.

**NeuralUplink Service (`src/services/neuralUplink.ts`)**
Pure TS module. Handles `fetch` to Ollama. Includes `extractJSON` regex logic to strip preamble text.

## AI Generation Notes

- **Aurelius systemPrompt**:
  > ... CRITICAL: When your stability drops to 30 or below, you MUST switch your reply style to fragmented word-salad ...

- **Protocol**: Hard-Gate Context Anchor applies.
- **Coding guardrails**:
  - No code generation without context.
  - Strict JSON parsing with `extractJSON`.
  - No hardcoded fallbacks for connection failures.

---

## File Paths & Current Architecture (Active Phase 1)

**ACTIVE IMPLEMENTATION:**
- `src/App.tsx` — Root component containing the Terminal and HUD logic.
- `src/components/Holodeck.tsx` — 3D background visualization.
- `src/services/neuralUplink.ts` — Ollama API service layer.
- `src/data/subjects.ts` — Subject configuration (Aurelius).
- `src/types/index.ts` — TypeScript interfaces.

**PLANNED REFACTORS (Phase 2):**
- `src/components/TerminalInterface.tsx` — Extract from App.tsx
- `src/components/PsychTelemetry.tsx` — Extract from App.tsx
- `src/components/StatusBar.tsx` — Extract from App.tsx
- `src/components/SubjectSelector.tsx` — New component.
