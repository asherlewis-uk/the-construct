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

- **Theme**: Dark mode only. Zero-G Brutalist aesthetic rendered on top of the Holodeck 3D background layer. The visual style is hard-edged, monochromatic, and information-dense. No rounded corners (`border-radius: 0px !important`), no drop shadows, no modern UI conventions.

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

**Phase 2 Note**: A `SubjectSelector` component exists in the file structure (as per system-architecture.md) but is currently stubbed out or commented out for Phase 1. Multi-subject selection will be activated in Phase 2.

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

- **Subject** — `id: string`, `name: string`, `modelID: string` (Ollama model tag), `systemPrompt: string`, `visualTheme: "cyber-noir"`, `initialStats: PsychProfile`
- **PsychProfile** — `stability: number` (0–100), `aggression: number` (0–100), `deception: number` (0–100), `isCritical: boolean`
  - **Note**: `isCritical` is derived logic computed as `true` when `stability < 30`. This flag is used to drive the "Red Zone" UI states, including rendering the Stability axis in `#FF3333` (red) on the radar chart and applying pulsing opacity animations to the Stability numeric readout.
- **ChatMessage** — `id: string`, `role: "admin" | "subject"`, `content: string`, `timestamp: Date`, `psychSnapshot?: PsychProfile` (attached to subject messages only)
- **OllamaResponse** — `reply: string`, `psych_profile: PsychProfile`

**Relationships**: A single `Subject` (Aurelius) is hardcoded. The app holds a `ChatMessage[]` array in state representing the conversation. Each subject message includes a `psychSnapshot`. The current `PsychProfile` is always the `psychSnapshot` from the most recent subject message, or `initialStats` if no messages exist.

**API Integration (NeuralUplink service)**:

- Single function: `interrogate(subject: Subject, history: ChatMessage[], userPrompt: string): Promise<OllamaResponse>`
- Sends `POST` to `http://localhost:11434/api/chat` with body:

  ```typescript
  {
    model: subject.model,
    messages: [
      { role: "system", content: subject.systemPrompt },
      ...history.map(m => ({ role: m.role === "admin" ? "user" : "assistant", content: m.content })),
      { role: "user", content: userPrompt }
    ],
    stream: false,
    format: "json"
  }
  ```
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

**Holodeck**: A generic 3D visualization layer (rotating octahedron, stars, grid) rendered via React Three Fiber or similar, strictly positioned as a fixed background (z-index: -1) behind the Terminal and HUD. It must not interfere with the 70/30 split layout. This is a purely visual background layer that provides ambient depth to the interface.

**TerminalInterface**Scrolling div with `overflow-y: auto` and `scroll-behavior: smooth`. Auto-scrolls to bottom on new messages. Each message is a `MessageBubble` component showing the role prefix (`[ADMIN]:` or `[AURELIUS]:`), the content, and a muted timestamp. Admin messages render in full signal color. Subject messages render in signal color at 85% opacity. The input bar is a single-line `<input>` at the bottom with no visible border—just an underline in the signal color. The blinking `█` cursor renders as a `<span>` with CSS `animation: blink 1s step-end infinite`. During loading, the input is replaced with the `UPLINK IN PROGRESS...` text and an animated progress bar built from `█` and `░` characters, advancing via a `setInterval` that fills the bar over the fetch duration.

**PsychTelemetry HUD**Uses `recharts` `RadarChart` with `PolarGrid`, `PolarAngleAxis`, and `Radar` components. Three axes: Stability, Aggression, Deception. The chart fill is the signal color at 15% opacity. The chart stroke is the signal color at full opacity with `strokeWidth: 2`. Grid lines are the signal color at 20% opacity. Beneath the chart, three numeric readouts display as `STB: 75 | AGR: 20 | DEC: 85` in monospaced text. When values change, use Framer Motion `animate` to scale the chart container from 1.0 to 1.05 and back over 400ms (glow pulse). When Stability drops below 30, the Stability axis label and its numeric readout turn `#FF3333` and pulse with a 1-second opacity animation. The entire HUD panel has a faint `box-shadow: inset 0 0 60px rgba(signal-color, 0.05)` for the translucent glow effect.

**StatusBar**Fixed 40px bar at the top of the viewport. Left side: connection status text (`UPLINK ESTABLISHED` in signal color or `UPLINK SEVERED` in `#FF3333`), with a small Lucide `Wifi` or `WifiOff` icon. Center: active model name (`gaius:latest`) in muted signal color. Right side: Reserved for future Signal Toggle functionality (Phase 2).

**NeuralUplink Service (**`src/services/neuralUplink.ts`**)**A pure TypeScript module (no React). Exports the `interrogate` function described in the Data Model section. Also exports the `extractJSON` utility function. This service is responsible for **invisible system prompt injection**—the `Subject.systemPrompt` is inserted as the first message in the `messages` array sent to Ollama, but never displayed in the terminal UI. The Admin sees only their own prompts and the subject's replies.

**JSON Extraction Utility**: The `extractJSON` function uses regex-based extraction to isolate `{...}` from the LLM response. Implementation:
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

## Protocol: Hard-Gate Context Anchor

**Requirement**: All work on The Construct must proceed through the Hard-Gate Context Anchor protocol defined in `.the-construct/docs/PROJECT_STATUS.md`.

**Purpose**: Prevent contextual drift and enforce strict Admin oversight during AI-assisted development.

**Workflow**:

1. All tasks are decomposed into **Phase → Group → Step** hierarchy.
2. Each Step has a two-checkbox system:
   - **Checkbox 1**: AI marks complete after executing the step.
   - **Checkbox 2**: Admin provides Y/N gate-code to proceed.
3. The AI is **STRICTLY FORBIDDEN** from checking Checkbox 2.
4. Work halts at each checkpoint until Admin approval is granted.

**File Location**: `.the-construct/docs/PROJECT_STATUS.md`

**Current Status**: See PROJECT_STATUS.md for the active Phase/Group/Step location.

- **Coding guardrails for AI agent (Trae/Gemini)**:
  - **No code generation without context**: The AI agent must reference the `system-architecture.md` blueprint (Document 1: The Construct App Architecture Plan) for every file it creates. All data structures, interfaces, and service contracts are defined there.
  - **Strict JSON parsing**: The `fetch` logic must include the `extractJSON` utility with regex fallback for malformed model output. If `JSON.parse()` fails after extraction, catch the error and display `[SIGNAL CORRUPTED] Subject response unintelligible. Re-transmitting...` in the terminal.
  - **Invisible injection**: The `Subject.systemPrompt` and character instructions must never appear in the terminal UI. Only the Admin's prompts and the subject's `reply` field are visible.
  - **Uplink simulation**: Implement a loading state that displays `UPLINK IN PROGRESS...` with an animated ASCII progress bar (`[████░░░░░░]`) during LLM inference. Use `setInterval` to advance the bar every 200ms, stopping when the `fetch` resolves.
  - **No hardcoded fallbacks**: If the Ollama connection fails, do not substitute mock responses. Display the error in the terminal and require the Admin to fix the connection.
  - **File paths & Current Architecture**:
    - **ACTIVE IMPLEMENTATION:**
      - `src/App.tsx` — Root state manager
      - `src/components/Holodeck.tsx` — 3D visualization layer (rotating octahedron, stars, grid)
      - `src/components/TerminalInterface.tsx` — Chat input/output with scrolling message log
      - `src/components/PsychTelemetry.tsx` — Radar chart + numeric readouts
      - `src/components/StatusBar.tsx` — Connection status, active modelID, uplink indicator
      - `src/services/neuralUplink.ts` — Ollama API service layer
      - `src/data/subjects.ts` — Subject configuration (Aurelius)
      - `src/types/index.ts` — TypeScript interfaces

    - **PLANNED (Phase 2):**
      - `src/components/SubjectSelector.tsx` — Sidebar/top bar to switch active subject (currently stubbed)
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
