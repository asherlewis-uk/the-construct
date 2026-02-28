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
│  ┌─────────────────────────┐                                    │
│  │ Holodeck.tsx (z-10)     │                                    │
│  │ (3D Background Layer)   │                                    │
│  └───────────┬─────────────┘                                    │
│              │                                                  │
│  ┌───────────▼───────────────────────────────────────────────┐  │
│  │ App.tsx (Root State Manager & UI Layout)                  │  │
│  │  - activeSubject: Subject                                 │  │
│  │  - chatLog: ChatMessage[]                                 │  │
│  │  - currentProfile: PsychProfile                           │  │
│  │  - isThinking: boolean                                    │  │
│  │                                                           │  │
│  │  ┌──────────────────────┐  ┌───────────────────────────┐  │  │
│  │  │ Terminal Interface   │  │ PsychTelemetry HUD        │  │  │
│  │  │ (Inline Component)   │  │ (Inline Component)        │  │  │
│  │  └──────────┬───────────┘  └───────────────────────────┘  │  │
│  └─────────────┼─────────────────────────────────────────────┘  │
│                │ user input                                     │
│  ┌─────────────▼─────────────┐                                  │
│  │ neuralUplink.ts           │  (src/services/)                 │
│  │ - interrogate()           │                                  │
│  │ - extractJSON()           │                                  │
│  └─────────────┬─────────────┘                                  │
│                │ POST fetch (REST/JSON)                         │
└────────────────┼────────────────────────────────────────────────┘
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

**Protocol**: Standard HTTP `POST` to Ollama's `/api/chat` endpoint. Streaming is disabled (`"stream": false`) to receive a single complete JSON payload per exchange.

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

### PsychProfile

**File Location**: `src/types/index.ts`

```typescript
interface PsychProfile {
  stability: number;     // Integer 0–100
  aggression: number;    // Integer 0–100
  deception: number;     // Integer 0–100
  isCritical: boolean;   // TRUE when stability <= 30 (triggers "Red Zone" UI state)
}
```

**Critical State Logic**:
* The `isCritical` flag must be computed and set to `true` whenever `stability <= 30`.
* **UI Behavior**:
  * Render the Stability axis on the radar chart in `#FF3333` (red).
  * Apply a pulsing opacity animation to the Stability numeric readout.
  * Trigger word-salad response patterns in the LLM via system prompt instructions.

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
* The LLM returns `psych_profile` in snake_case.
* After parsing, the frontend must compute `isCritical = psych_profile.stability <= 30` and construct a full `PsychProfile` object.

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
      { role: "system", content: string }, // Subject.systemPrompt (injected invisible)
      { role: "user", content: string },   // Admin's current input
      // ...prior messages (excluding previous system prompts)
    ],
    stream: false,
    format: "json"
  }
```

### NeuralUplink Service Contract

**Service File Location**: `src/services/neuralUplink.ts`

**Critical Implementation Detail (JSON Extraction)**:
LLMs occasionally "talk" around the JSON payload. The `NeuralUplink` service must include a defensive extraction function:

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

**Usage**: Always call `extractJSON(message.content)` before `JSON.parse(message.content)`.

---

## Frontend Architecture

### Tech Choices

* **Framework**: Vite 5 + React 18 + TypeScript
* **Styling**: Tailwind CSS (Utility-first, Custom "Zero-G Brutalist" config)
* **Animation**: Framer Motion (Scanlines, Glitch effects, Radar pulses)
* **3D**: React Three Fiber (`@react-three/fiber`, `@react-three/drei`) for the Holodeck background.
* **State Management**: React `useState` + `useEffect`. No external state libraries.

### Component Structure (Active Phase 1)

```text
src/
├── App.tsx                        — Root state manager. Contains inline Terminal & PsychTelemetry UI.
├── components/
│   └── Holodeck.tsx               — 3D Background Layer (Octahedron/Stars)
├── services/
│   └── neuralUplink.ts            — interrogate(), extractJSON()
├── data/
│   └── subjects.ts                — Pre-configured Subject array (Aurelius)
└── types/
    └── index.ts                   — TypeScript interfaces
```

**Note**: `TerminalInterface`, `PsychTelemetry`, and `StatusBar` are currently implemented as **inline components** within `App.tsx` for rapid prototyping. They will be extracted into separate files in Phase 2. `SubjectSelector` does not exist yet.

### Environment & Deployment

* **Host**: `localhost:5173`
* **AI Engine**: Ollama (`localhost:11434`)
* **CORS**: Must be enabled via `OLLAMA_ORIGINS="http://localhost:5173"`.

### Local Setup Prerequisites

1. **Node.js** ≥ 18
2. **Ollama** installed and running: `OLLAMA_ORIGINS=http://localhost:5173 ollama serve`
3. **Models**: `gaius:latest` (Primary), `dolfino:latest`, `qwen2.5-coder:7b` (Fallbacks)
