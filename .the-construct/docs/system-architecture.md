# The Construct: App Architecture Plan

## System Overview

The Construct is a single-page React application that simulates a psychometric interrogation interface. A single Admin operator engages in real-time conversation with pre-configured fictional personas—each powered by a local Ollama large language model—while a live radar chart visualizes the subject's shifting emotional state (stability, aggression, deception) with every response. The application is entirely client-side with zero backend, zero persistence, and zero authentication. All session data is ephemeral and exists only in React state; a page reload wipes everything clean.

### Architecture Pattern

* **Type**: Client-side SPA (Jamstack without the "stack"—no build-time data, no backend, no database)

* **Key Components**:

  * **Frontend SPA**: Vite + React 18 + TypeScript
  * **Local LLM Inference**: Ollama running as a local service on `localhost:11434`
  * **Service Layer**: `NeuralUplink`—a TypeScript module that mediates all communication between the React UI and the Ollama REST API
  * **No Database**: All state is held in-memory via React `useState`
  * **No Background Jobs**: All operations are synchronous request/response via `fetch`

### System Diagram

The data flow is linear and contained entirely on the operator's local machine:

```text
┌─────────────────────────────────────────────────────────────────┐
│  Browser (localhost:5173)                                       │
│                                                                 │
│  ┌────────────────┐    ┌─────────────────────────────────────┐  │
│  │ SubjectSelect  │───▶│ App.tsx (Root State Manager)        │  │
│  │ (Phase 2 stub) │    │  - activeSubject: Subject           │  │
│  └────────────────┘    │  - chatLog: ChatMessage[]           │  │
│                        │  - currentProfile: PsychProfile      │  │
│                        │  - isThinking: boolean              │  │
│                        └──────┬──────────────┬───────────────┘  │
│                               │              │                  │
│          ┌────────────────────▼───┐  ┌───────▼────────────────┐ │
│          │ TerminalInterface.tsx  │  │ PsychTelemetry.tsx     │ │
│          │ (Chat UI + Input)      │  │ (Recharts RadarChart)  │ │
│          └────────────┬───────────┘  └────────────────────────┘ │
│                       │ user input                              │
│          ┌────────────▼────────────┐                            │
│          │ neuralUplink.ts         │  (src/services/)           │
│          │ - interrogate()         │                            │
│          │ - extractJSON()         │                            │
│          └────────────┬────────────┘                            │
│                       │ POST fetch (REST/JSON)                  │
└───────────────────────┼─────────────────────────────────────────┘
                        │
                        ▼
            ┌────────────────────────────┐
            │  Ollama (localhost:11434)  │
            │  Endpoint: /api/chat       │
            │                            │
            │  Models (modelID):         │
            │  - gaius:latest            │
            │  - dolfino:latest          │
            │  - qwen2.5-coder:7b        │
            └────────────────────────────┘
```

Type Definitions: `src/types/index.ts`
Subject Config:   `src/data/subjects.ts`

**Protocol**: Standard HTTP `POST` to Ollama's `/api/chat` endpoint. Streaming is disabled (`"stream": false`) to receive a single complete JSON payload per exchange. No WebSockets, no GraphQL.

---

## Data Model

All entities are TypeScript interfaces held in React state. There is no database, no ORM, and no persistence layer.

### Subject

**File Location**: `src/types/index.ts`

```typescript
interface Subject {
  id: string;                    // Unique identifier (e.g., "AUR-0001")
  name: string;                  // Display name (e.g., "Aurelius")
  modelID: string;               // Ollama model tag (e.g., "gaius:latest")
  systemPrompt: string;          // Hidden persona instructions + JSON enforcement
  visualTheme: "cyber-noir" | "high-contrast";
  initialStats: PsychProfile;    // Starting radar chart values
}
```

**Configuration Storage**: `src/data/subjects.ts` contains the pre-configured subject array.

**Design Notes**:

* `modelID` maps directly to Ollama model tags and is passed to the `/api/chat` endpoint's `model` parameter
* Different subjects can use different local models (e.g., Aurelius on `gaius:latest`, lightweight subjects on `qwen2.5-coder:7b`)
* `systemPrompt` is injected as the first message (`role: "system"`) in every Ollama request but never displayed in the terminal UI

### PsychProfile

**File Location**: `src/types/index.ts`

```typescript
interface PsychProfile {
  stability: number;     // Integer 0–100
  aggression: number;    // Integer 0–100
  deception: number;     // Integer 0–100
  isCritical: boolean;   // TRUE when stability < 30 (triggers "Red Zone" UI state)
}
```

**Critical State Logic**:

* The `isCritical` flag must be computed and set to `true` whenever `stability < 30`
* When `isCritical === true`, the UI must:

  * Render the Stability axis on the radar chart in `#FF3333` (red)
  * Apply a pulsing opacity animation to the Stability numeric readout
  * Trigger word-salad response patterns in the LLM via system prompt instructions

* This flag enables the UI to detect the "psychological collapse" state without checking raw stability values in multiple components

### ChatMessage

**File Location**: `src/types/index.ts`

```typescript
interface ChatMessage {
  id: string;                      // Generated via crypto.randomUUID()
  role: "admin" | "subject";       // Message sender
  content: string;                 // Display text (admin input or subject reply)
  timestamp: number;               // Date.now()
  psychSnapshot?: PsychProfile;    // Attached only to "subject" role messages
}
```

### OllamaResponse

**File Location**: `src/types/index.ts`

```typescript
interface OllamaResponse {
  reply: string;           // The subject's spoken response (displayed in terminal)
  psych_profile: {         // Raw emotional state from LLM (snake_case preserved for API contract)
    stability: number;     // Integer 0–100
    aggression: number;    // Integer 0–100
    deception: number;     // Integer 0–100
  };
}
```

**Parsing Notes**:

* The LLM returns `psych_profile` in snake_case to match JSON convention
* After parsing, the frontend must compute `isCritical = psych_profile.stability < 30` and construct a full `PsychProfile` object before storing it in state
* The `reply` field is the only content displayed in the terminal; `psych_profile` drives the radar chart visualization

### Relationships

* **Subject → ChatMessage**: One-to-many. Each subject has its own chat history array held in a `Map<string, ChatMessage[]>` keyed by `subject.id`. Switching subjects preserves each session in memory.
* **ChatMessage → PsychProfile**: One-to-one (optional). Only messages with `role: "subject"` carry a `psychSnapshot`.
* **Subject → PsychProfile**: The `initialStats` field provides the starting state; the latest `psychSnapshot` from the chat log represents the current state.

**Indexes/Constraints**: Not applicable—no database. The `Subject.id` field must be unique across the pre-configured subject array. `ChatMessage.id` is guaranteed unique via `crypto.randomUUID()`.

---

## API Design

There is a single external endpoint: Ollama's local REST API. The `NeuralUplink` service module wraps all interaction with it.

### Ollama Chat Completion

```http
POST http://localhost:11434/api/chat
  Auth: none (local service)
  Headers: { "Content-Type": "application/json" }
  Body: {
    model: string,          // e.g. "gaius:latest"
    messages: [
      {
        role: "system",
        content: string     // Subject.systemPrompt (injected by NeuralUplink)
      },
      {
        role: "user",
        content: string     // Admin's current input
      },
      // ...prior messages in conversation history
    ],
    stream: false,
    format: "json"
  }
  Response: {
    message: {
      role: "assistant",
      content: string       // Raw JSON string to parse as OllamaResponse
    }
  }
```

### NeuralUplink Service Contract

The `NeuralUplink` module exposes a single function:

**Service File Location**: `src/services/neuralUplink.ts`

### JSON Extraction Utility

**Critical Implementation Detail**: LLMs occasionally "talk" around the JSON payload (e.g., `"Here is the data you requested: { ... }"`), which will crash `JSON.parse()`. The `NeuralUplink` service must include a defensive extraction function:

```typescript
function extractJSON(raw: string): string {
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('No JSON object found in response');
  }
  return raw.slice(firstBrace, lastBrace + 1);
}
```

**Usage**: Before calling `JSON.parse(message.content)`, always call `extractJSON(message.content)` to isolate the JSON object. This ensures the app remains stable even when the model gets chatty outside the structured format.

### Error Handling

* **Connection Refused** (`ECONNREFUSED`): Ollama is not running. Surface a terminal-styled error: `"[UPLINK SEVERED] Neural bridge offline. Start Ollama and retry."`
* **JSON Parse Failure**: Model returned non-JSON or malformed JSON. Surface: `"[SIGNAL CORRUPTED] Subject response unintelligible. Re-transmitting..."` and optionally retry once.
* **Missing Fields**: Parsed JSON lacks `reply` or `psych_profile`. Use fallback values: `reply: "[STATIC]"`, and retain the previous `PsychProfile` snapshot unchanged.
* **Rate Limiting / Pagination**: Not applicable. Single user, single request at a time, local inference.

---

## Auth & Permissions

### Authentication

* **Provider**: None
* **Methods**: None
* **Session handling**: None

This is a single-user local application. There is no login, no tokens, no cookies. The "Admin" persona is purely a UI framing device—a label on the terminal input.

### Authorization

* **Roles**: Single implicit role—"Admin Operator." All UI capabilities are available to whoever opens the browser tab.
* **Enforcement**: None required.
* **Public routes**: The entire application is "public" within the context of `localhost`.

### Multi-tenancy

Not applicable. Single operator, single machine, ephemeral sessions.

---

## Third-Party Services

### Ollama — Local LLM Inference Engine

* **Service**: Runs large language models locally for text generation. Provides a REST API compatible with chat-completion patterns.
* **SDK/Library**: No SDK needed—standard `fetch` API against `http://localhost:11434/api/chat`.
* **Models hosted locally**:
* **Config**:

  * `VITE_OLLAMA_BASE_URL=http://localhost:11434` (public env var, embedded in client bundle)
  * Ollama must be started with CORS enabled: `OLLAMA_ORIGINS=http://localhost:5173 ollama serve`

* **Failure handling**: If Ollama is unreachable, `NeuralUplink` catches the `fetch` error and renders a styled "uplink severed" message in the terminal. The application remains functional—the Admin can switch subjects or retry—but no inference occurs until Ollama is restored.

**No other external services are used.** No payments, no email, no file storage, no analytics, no cloud APIs.

---

## Frontend Architecture

### Tech Choices

* **Framework**: Vite 5 + React 18 + TypeScript — chosen for instant HMR, zero-config setup, and no SSR complexity. This is a client-only prototype; Next.js overhead is unnecessary.
* **Component Library**: None (custom components). Minimal UI surface area doesn't justify a library.
* **Styling**: Tailwind CSS — utility-first approach for rapid iteration on the cyber-noir aesthetic. Custom theme tokens for glow effects, scanline overlays, and monospace terminal fonts.
* **Icons**: Lucide-React — lightweight, tree-shakeable, consistent stroke style.
* **Charts**: Recharts (RadarChart) — React-native charting with straightforward data binding to `PsychProfile`.
* **Animation**: Framer Motion — glitch effects on subject transitions, text flicker on incoming messages, radar chart pulse animations.
* **State Management**: React `useState` + `useEffect`. No Zustand, no Redux, no React Query. The state tree is shallow enough that prop drilling through 4 components is cleaner than introducing external state tooling.

### Component Structure

```text
App.tsx (src/App.tsx)                              — Root state manager
├── SubjectSelector (Phase 2)                      — Sidebar/top bar to switch active subject
├── TerminalInterface.tsx (src/components/)        — Chat input/output with scrolling message log
│   ├── MessageBubble (inline)                     — Single chat message (admin or subject)
│   └── TerminalInput (inline)                     — Input field with ">" prompt styling
├── PsychTelemetry.tsx (src/components/)           — Radar chart + numeric readouts
│   └── RadarChart (Recharts)                      — Renders current PsychProfile with isCritical styling
└── StatusBar.tsx (src/components/)                — Connection status, active modelID, uplink indicator
```

`Service Layer:`
`└── neuralUplink.ts (src/services/)                — interrogate(), extractJSON()`

`Type Definitions:`
`└── index.ts (src/types/)                          — Subject, PsychProfile, ChatMessage, OllamaResponse`

`Configuration:`
`└── subjects.ts (src/data/)                        — Pre-configured Subject array (Aurelius)`

### Page Structure

### Data Fetching Strategy

* **All client components**: No server rendering. Vite serves a static `index.html`; React hydrates the full SPA.
* **Caching**: None. Every `interrogate()` call is a fresh `POST` to Ollama. Conversation history is rebuilt from React state on each request.
* **Loading state**: A `isThinking: boolean` state flag disables the input, displays a pulsing `"[PROCESSING NEURAL SIGNAL...]"` animation in the terminal, and triggers a subtle radar chart flicker via Framer Motion.
* **Error state**: Errors from `NeuralUplink` are rendered as styled system messages directly in the terminal log (not as toast notifications or modals—everything stays in-universe).

---

## Infrastructure & Deployment

### Hosting

* **Frontend**: `localhost:5173` via Vite dev server. No production hosting. No CDN. No deployed URL.
* **Backend**: Ollama running as a local system service on `localhost:11434`.
* **Database**: None.

### CI/CD Pipeline

None. This is a local prototype. The workflow is:

1. `git clone` the repository
2. `npm install`
3. `npm run dev`
4. Open `http://localhost:5173`

### Environments

### Local Setup Prerequisites

1. **Node.js** ≥ 18
2. **Ollama** installed and running: `OLLAMA_ORIGINS=http://localhost:5173 ollama serve`
3. **Models pulled**:

* `ollama pull gaius:latest`
* `ollama pull dolfino:latest`
* `ollama pull qwen2.5-coder:7b`

### CORS Configuration (CRITICAL)

**Problem**: By default, Ollama blocks cross-origin requests. Since the Vite dev server runs on `localhost:5173` and Ollama runs on `localhost:11434`, the browser will reject `fetch` calls unless Ollama is explicitly configured to allow the origin.

**Solution**: Before starting Ollama, set the `OLLAMA_ORIGINS` environment variable:

```bash
# macOS/Linux
export OLLAMA_ORIGINS="http://localhost:5173"
ollama serve
```

```powershell
# Windows (PowerShell)
$env:OLLAMA_ORIGINS="http://localhost:5173"
ollama serve
```

```bash
# OR allow all origins (less secure, but fine for local dev)
export OLLAMA_ORIGINS="*"
ollama serve
```

**Validation**: If CORS is misconfigured, the browser console will show:

```text
Access to fetch at 'http://localhost:11434/api/chat' from origin 'http://localhost:5173'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present.
```

**README Requirement**: The AI agent must include this CORS setup instruction prominently in the generated `README.md` with a troubleshooting section for CORS errors.

### Environment Variables

No secret variables exist. No API keys, no auth tokens, no database connection strings. The entire application runs on `localhost` with zero external network dependencies.
