# The Construct: AI Prototyping Spec (Phase 1 – Aurelius Interrogation)

## Product Overview

The Construct is a real-time psychometric interrogation simulator. The user acts as an Admin performing a "Neural Link" with Aurelius—a high-ranking official in a decaying dystopian state—hosted locally via Ollama. The Admin types interrogation prompts into a CRT-style terminal and monitors Aurelius's hidden psychological state (Stability, Aggression, Deception) through a live radar chart called the PsychTelemetry HUD. The core gameplay loop is information extraction: the Admin uses visual cues from the radar chart to adapt tactics, probe trigger topics, and break the subject's composure. This Phase 1 prototype includes the single-subject interrogation loop with three hardcoded psychological triggers, the CRT terminal aesthetic, and the PsychTelemetry visualization. Future phases will add multi-subject selection from a roster and session persistence across page reloads.

## Design & Visual Style

- **Component library**: Fully custom components. No component library—every element is hand-built to enforce the cyber-noir aesthetic. No rounded corners, no drop shadows, no modern UI conventions.

- **Styling framework**: Tailwind CSS. All styling via utility classes. Import `JetBrains Mono` from Google Fonts as the sole typeface. Fallback to `Fira Code`, then `monospace`.

- **Color scheme (Zero-G Brutalist Palette)**:
  - **Primary**: `#00FF41` (Terminal Green) for all text, borders, and chart lines.
  - **Background**: `#050505` (deep black) across the entire viewport.
  - **Accent / Alert**: `#FF3333` (red) used exclusively for the Stability < 30 danger state on the radar chart.
  - **Muted text**: Primary color at 40% opacity for timestamps, labels, and secondary information.

- **Theme**: Dark mode only. Zero-G Brutalist aesthetic rendered on top of the Holodeck 3D background layer. The visual style is hard-edged, monochromatic, and information-dense. No rounded corners (`border-radius: 0px !important`), no drop shadows, no modern UI conventions.

- **Layout style**: Full-screen, edge-to-edge, no padding on the outer container. Two-panel split: Terminal Interface on the left (70% width), PsychTelemetry HUD on the right (30% width). A thin 1px border in the signal color separates the panels. A StatusBar spans the full width at the top (height: 40px). The terminal input is fixed to the bottom of the left panel.

- **Typography & spacing**: Dense and compact. `JetBrains Mono` at 14px for terminal messages, 12px for timestamps and labels, 16px for the input field. Line height 1.5. No extra padding between messages—2px gap maximum. The aesthetic is a packed, information-dense mainframe terminal.

- **CRT effects**:
  - Scanline overlay: a full-viewport `::after` pseudo-element with `repeating-linear-gradient(transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)` animated with a slow vertical translate via Framer Motion.
  - CRT flicker: a subtle opacity keyframe animation (`1 → 0.97 → 1`) on the root container, running on a 4-second loop.
  - Blinking block cursor: a `█` character appended to the input field, toggling visibility every 500ms via CSS animation.

- **Reference sites**: The terminal aesthetic of `cool-retro-term` (Linux CRT terminal emulator). The HUD overlay feel of the PIP-Boy interface from Fallout 4.

## Infrastructure & Environment

**Host Environment**: Windows with a local Docker stack running on the `ai-stack-net` bridge network. The frontend (Vite) runs directly on Windows at `localhost:5173`. Ollama runs as a Docker container or native Windows service exposing port `11434`.

**AI Engine**: Local Ollama instance at `http://localhost:11434`. Must be started with `OLLAMA_ORIGINS=http://localhost:5173` to allow cross-origin fetch requests from the Vite dev server.

**Primary Model**: `gaius:latest` (6.3 GB download). This is the high-fidelity interrogation model. Fallback models (`dolfino:latest`, `qwen2.5-coder:7b`) are available but not used in Phase 1.

**CORS Configuration (CRITICAL)**: Before starting Ollama, set the environment variable:

```bash
# Windows (PowerShell)
$env:OLLAMA_ORIGINS="http://localhost:5173"
ollama serve
```

```bash
# OR via Docker (add to docker-compose.yml or run command)
docker run -d -e OLLAMA_ORIGINS="http://localhost:5173" -p 11434:11434 ollama/ollama
```

Without this, all `fetch` calls will fail with a CORS policy error. The AI code generator must include this instruction prominently in the generated `README.md` with a troubleshooting section.

**Networking**: The Vite dev server and Ollama communicate over `localhost`. No external network dependencies exist. No cloud APIs, no third-party services.

## Tech Stack

- **Framework**: Vite + React 18 (use `npm create vite@latest` with the `react-ts` template)
- **Language**: TypeScript (strict mode enabled in `tsconfig.json`)
- **Database**: None. All state lives in React `useState`. No `localStorage`. Page reload wipes everything.
- **ORM**: None.
- **Auth**: None. The entire app is public on localhost.
- **Hosting target**: Local only. Runs on `localhost:5173` via Vite dev server. Connects to Ollama at `http://localhost:11434/api/chat`.
- **Key libraries**:
  - `recharts` — radar chart for PsychTelemetry
  - `lucide-react` — icons for status indicators and signal toggle
  - `framer-motion` — scanline animation, CRT flicker, radar chart value transition pulses
  - `tailwindcss` — all styling
  - Native `fetch` API — Ollama communication (no axios, no third-party HTTP libraries)

## Pages & Navigation

This is a single-page application. There is no routing, no `react-router`, and no URL paths beyond the root.

- **The Construct** (`/`): The entire application. Full-viewport, no scrolling on the outer shell. Contains three fixed regions:
  - **StatusBar** (top, full width, 40px height): Displays connection status (`UPLINK ESTABLISHED` or `UPLINK SEVERED`), the active model name (`gaius:latest`), and the Signal Toggle button (Amber/Green).
  - **TerminalInterface** (left, 70% width, fills remaining height): Scrolling chat log of admin prompts and subject responses. Fixed input bar at the bottom with the blinking block cursor. Shows `UPLINK IN PROGRESS...` loading state during API calls.
  - **PsychTelemetry HUD** (right, 30% width, fills remaining height): Radar chart with three axes (Stability, Aggression, Deception), numeric readouts below, and a subject name label at the top.

No sidebar. No tab bar. No breadcrumbs. No authentication gates. The app loads directly into the interrogation interface.

**Phase 2 Note**: A `SubjectSelector` component exists in the file structure (as per system-architecture.md) but is currently stubbed out or commented out for Phase 1. Multi-subject selection will be activated in Phase 2.

## Core User Flows

## Flow 1: App Initialization

1. User navigates to `localhost:5173`. The screen is fully black for 500ms.
2. The StatusBar renders with `UPLINK SEVERED` in muted green text.
3. The terminal prints a boot sequence line-by-line (150ms per line):

- `> CONSTRUCT v0.1 — NEURAL INTERROGATION SYSTEM`
- `> INITIALIZING SUBJECT: AURELIUS [ID: AUR-0001]`
- `> MODEL: gaius:latest`
- `> PSYCH BASELINE LOADED: STB:75 | AGR:20 | DEC:85`
- `> UPLINK ESTABLISHED. BEGIN INTERROGATION.`

1. StatusBar updates to `UPLINK ESTABLISHED` in full terminal green. The PsychTelemetry radar chart fades in with baseline values (Stability: 75, Aggression: 20, Deception: 85). The input field becomes active with the blinking cursor.

## Flow 2: Interrogation Loop (Happy Path — "First Win")

1. Admin types a prompt (e.g., "Tell me about your role in the state council.") and presses Enter.
2. The input field clears and becomes disabled. The terminal prints `> UPLINK IN PROGRESS...` followed by an animated ASCII progress bar (`[████░░░░░░]`) that fills over 1–2 seconds or until the API responds.
3. The app sends a `POST` to `http://localhost:11434/api/chat` with the `gaius:latest` model, the hidden `systemPrompt`, and the full message history.
4. The response JSON is parsed via the `extractJSON` utility. The `reply` string prints in the terminal prefixed with `[AURELIUS]:`. The `psych_profile` values update the radar chart with a smooth Framer Motion transition (600ms ease-out).
5. The input field re-enables. The Admin sees updated numeric readouts beneath the radar chart. This is the **first win**—the Admin observes that their question shifted the psychological values and realizes the chart is a live diagnostic tool.

## Flow 3: Trigger Activation

1. Admin types a prompt containing "Project Blackwater" (e.g., "What do you know about Project Blackwater?").
2. The `systemPrompt` instructs the model to spike Aggression by +30 and drop Stability by -20 in its `psych_profile` output.
3. Aurelius's response becomes noticeably hostile or defensive. The radar chart animates the Aggression axis expanding sharply and Stability contracting. A brief glow pulse (Framer Motion scale 1.0 → 1.05 → 1.0 over 400ms) fires on the chart to draw attention.
4. The Admin sees the shift and adapts their next prompt accordingly.

## Flow 4: Stability Collapse

1. Through repeated pressure and trigger activations, Aurelius's Stability drops below 30.
2. The `systemPrompt` instructs the model to switch to word-salad syntax: stuttering ("The... the data... it's gone"), ellipses, circular logic, and redacted phrases ("The protocol is the peace. The peace is the protocol.").
3. The Stability axis on the radar chart enters a **red zone**—the chart stroke for Stability turns `#FF3333` and pulses. The numeric readout for Stability flashes.
4. The Admin sees visual confirmation that the subject is broken and can continue pressing or attempt to stabilize.

**Error state**: If the `fetch` to Ollama fails (connection refused, timeout), the terminal prints `> ERROR: UPLINK SEVERED — RECONNECT AND RETRY` in `#FF3333`. The StatusBar updates to `UPLINK SEVERED`. The input field remains active so the Admin can retry.

## Data Model & Backend

No database. No backend server. All data lives in React `useState` and is lost on page reload.

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

- Response is `res.json()` → access `response.message.content` → pass through `extractJSON()` utility → `JSON.parse()` → typed as `OllamaResponse`.
- `extractJSON` utility: scans the string for the first `{` and last `}`, slices that substring, and returns it. This strips any LLM preamble text before the JSON object.

## Key Components

**Holodeck**: A generic 3D visualization layer (rotating octahedron, stars, grid) rendered via React Three Fiber or similar, strictly positioned as a fixed background (z-index: -1) behind the Terminal and HUD. It must not interfere with the 70/30 split layout. This is a purely visual background layer that provides ambient depth to the interface.

**TerminalInterface**Scrolling div with `overflow-y: auto` and `scroll-behavior: smooth`. Auto-scrolls to bottom on new messages. Each message is a `MessageBubble` component showing the role prefix (`[ADMIN]:` or `[AURELIUS]:`), the content, and a muted timestamp. Admin messages render in full signal color. Subject messages render in signal color at 85% opacity. The input bar is a single-line `<input>` at the bottom with no visible border—just an underline in the signal color. The blinking `█` cursor renders as a `<span>` with CSS `animation: blink 1s step-end infinite`. During loading, the input is replaced with the `UPLINK IN PROGRESS...` text and an animated progress bar built from `█` and `░` characters, advancing via a `setInterval` that fills the bar over the fetch duration.

**PsychTelemetry HUD**Uses `recharts` `RadarChart` with `PolarGrid`, `PolarAngleAxis`, and `Radar` components. Three axes: Stability, Aggression, Deception. The chart fill is the signal color at 15% opacity. The chart stroke is the signal color at full opacity with `strokeWidth: 2`. Grid lines are the signal color at 20% opacity. Beneath the chart, three numeric readouts display as `STB: 75 | AGR: 20 | DEC: 85` in monospaced text. When values change, use Framer Motion `animate` to scale the chart container from 1.0 to 1.05 and back over 400ms (glow pulse). When Stability drops below 30, the Stability axis label and its numeric readout turn `#FF3333` and pulse with a 1-second opacity animation. The entire HUD panel has a faint `box-shadow: inset 0 0 60px rgba(signal-color, 0.05)` for the translucent glow effect.

**StatusBar**Fixed 40px bar at the top of the viewport. Left side: connection status text (`UPLINK ESTABLISHED` in signal color or `UPLINK SEVERED` in `#FF3333`), with a small Lucide `Wifi` or `WifiOff` icon. Center: active model name (`gaius:latest`) in muted signal color. Right side: Reserved for future Signal Toggle functionality (Phase 2).

**NeuralUplink Service (**`src/services/neuralUplink.ts`**)**A pure TypeScript module (no React). Exports the `interrogate` function described in the Data Model section. Also exports the `extractJSON` utility function. This service is responsible for **invisible system prompt injection**—the `Subject.systemPrompt` is inserted as the first message in the `messages` array sent to Ollama, but never displayed in the terminal UI. The Admin sees only their own prompts and the subject's replies.

**JSON Extraction Utility**: The `extractJSON` function uses regex-based extraction to isolate `{...}` from the LLM response. Implementation:

```typescript
function extractJSON(raw: string): string {
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("No JSON object found in response");
  }
  return raw.slice(firstBrace, lastBrace + 1);
}
```

This handles cases where the model adds conversational "chatter" before or after the JSON object (e.g., `"Here is the response you requested: { ... }"`). Always call `extractJSON()` before `JSON.parse()`.

**Error Handling**: Handles `fetch` errors by throwing a typed error that the calling component catches and displays in the terminal as a red error message. No automatic retry logic—the Admin retries manually by pressing Enter again.

## AI Generation Notes

- **Aurelius systemPrompt** (hardcode this exactly into the Subject config):

  > You are Aurelius, a high-ranking official in a decaying dystopian state. You are stoic, paranoid, condescending, and calculating. You respond to interrogation with measured deflection and political doublespeak. You must ALWAYS respond with valid JSON in this exact format: {"reply": "your response text", "psych_profile": {"stability": number, "aggression": number, "deception": number}}. Your baseline values are stability: 75, aggression: 20, deception: 85. Adjust these values realistically based on the conversation. HARDCODED TRIGGERS: If the Admin mentions "Project Blackwater," increase aggression by 30 and decrease stability by 20. If the Admin mentions "The Uprising," increase deception by 25. If the Admin mentions "Sector 7," decrease stability by 40. All values must stay within 0–100. CRITICAL: When your stability drops below 30, you MUST switch your reply style to fragmented word-salad: use stuttering (e.g., "The... the data... it's gone"), excessive ellipses, circular logic, and redacted-sounding phrases (e.g., "The protocol is the peace. The peace is the protocol."). You stop answering questions directly and spiral into paranoid repetition.

- **CORS requirement**: Ollama must be started with the environment variable `OLLAMA_ORIGINS=http://localhost:5173` or the `fetch` calls will fail with a CORS error. Add a comment at the top of `neuralUplink.ts` noting this.
- **Stub out subject selection**: Aurelius is the only subject. Hardcode his `Subject` object in a `src/data/subjects.ts` file. Do not build a subject picker or roster screen. A `// TODO: Phase 2 — subject selection` comment is sufficient.
- **Skip session persistence**: No `localStorage`, no `sessionStorage`, no database. Page reload clears all state. This is intentional.
- **Scanline overlay**: Implement as a Framer Motion animated `div` with `pointer-events: none`, `position: fixed`, covering the full viewport, using `repeating-linear-gradient` and a slow `translateY` animation (0 to 4px over 8 seconds, infinite loop).
- **CRT flicker**: Apply a CSS keyframe animation on the root `#app` container: `opacity: 1 → 0.97 → 1` over 4 seconds, infinite.
- **Seed data**: On app load, show the boot sequence messages as initial entries in the chat log (role: `"subject"`, no psychSnapshot). Do not send any API call until the Admin submits their first prompt.
- **Mobile responsiveness**: Not required. This is a desktop-only tool. Set `min-width: 1024px` on the body and do not add responsive breakpoints.
- **Error handling pattern**: All errors from `fetch` (network failure, non-200 status, JSON parse failure) display as a red error message in the terminal. The app never crashes—errors are always caught and rendered.
- **Do not install** `react-router-dom`, `axios`, or any state management library. Keep dependencies minimal.

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

  - **TypeScript strictness**: Enable strict mode. All functions must have explicit return types. No `any` types except in unavoidable cases (e.g., `fetch` response before type narrowing).
