
/**
 * ============================================================================
 * File:        src/services/neuralUplink.ts
 * Purpose:     Ollama API Service Layer & JSON Extraction Pipeline.
 * Environment: Localhost (Windows/Docker) - http://localhost:11434
 * ============================================================================
 *
 * This module is the sole mediator between the React frontend and the local
 * Ollama API. All LLM communication flows through the interrogate() function.
 * Raw model output is sanitized through extractJSON() before reaching the UI.
 *
 * Type Safety:  Strict TypeScript — zero 'any' usage.
 * HTTP Client:  Native fetch only — no axios or third-party dependencies.
 * Error Policy:  All thrown errors use in-universe messaging for UI display.
 * ============================================================================
 */

import type { Subject, ChatMessage, OllamaResponse, PsychProfile } from '../types/index';

/**
 * Base URL for the local Ollama instance.
 * Default Ollama port is 11434. Do not append trailing slash.
 */
const OLLAMA_BASE_URL: string = 'http://localhost:11434';

// ============================================================================
// CORS CONFIGURATION (CRITICAL)
// ============================================================================
// Ollama blocks cross-origin requests by default. The Vite dev server runs on
// localhost:5173, which Ollama treats as a foreign origin. You MUST set the
// OLLAMA_ORIGINS environment variable before starting the Ollama service.
//
// Without this, every fetch request from the frontend will fail silently
// with a CORS preflight error in the browser console.
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │  PLATFORM-SPECIFIC INSTRUCTIONS                                        │
// ├─────────────────────────────────────────────────────────────────────────┤
// │                                                                         │
// │  Windows (PowerShell):                                                  │
// │    $env:OLLAMA_ORIGINS="http://localhost:5173"; ollama serve             │
// │                                                                         │
// │  macOS / Linux (bash/zsh):                                              │
// │    OLLAMA_ORIGINS="http://localhost:5173" ollama serve                   │
// │                                                                         │
// │  Docker:                                                                │
// │    docker run -e OLLAMA_ORIGINS="http://localhost:5173" \               │
// │      -p 11434:11434 ollama/ollama                                       │
// │                                                                         │
// │  Wildcard (development only — NOT for production):                      │
// │    OLLAMA_ORIGINS="*" ollama serve                                      │
// │                                                                         │
// └─────────────────────────────────────────────────────────────────────────┘
// ============================================================================

/**
 * Isolates a JSON object from raw LLM output.
 *
 * LLMs — even high-performance models like Gaius — occasionally wrap their
 * JSON response in conversational text:
 *
 *   "Here is the data you requested: {\"reply\": \"...\", \"psych_profile\": {...}}"
 *
 * This function finds the first '{' and the last '}' in the raw string and
 * returns the substring between them (inclusive). This ensures JSON.parse()
 * receives a clean object string regardless of model chattiness.
 *
 * @param raw - The unprocessed string from the Ollama response body.
 * @returns A trimmed string containing only the JSON object.
 * @throws Error if no opening or closing brace is found in the input.
 */
function extractJSON(raw: string): string {
  const firstBrace: number = raw.indexOf('{');
  const lastBrace: number = raw.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error(
      '[SIGNAL CORRUPTED] No valid JSON structure detected in LLM response.'
    );
  }
  return raw.substring(firstBrace, lastBrace + 1);
}

/**
 * Runtime type guard for raw LLM output.
 *
 * Validates that the parsed JSON object conforms to the expected structure
 * before it is cast to a typed interface. This prevents runtime errors from
 * malformed LLM output reaching the React state layer.
 *
 * Checks:
 *  - 'reply' exists and is a string.
 *  - 'psych_profile' exists and is a non-null object.
 *  - 'psych_profile.stability' is a number.
 *  - 'psych_profile.aggression' is a number.
 *  - 'psych_profile.deception' is a number.
 *
 * @param payload - The unknown value produced by JSON.parse().
 * @returns True if the payload matches the expected OllamaResponse shape.
 */
function isValidOllamaPayload(payload: unknown): boolean {
    if (typeof payload !== 'object' || payload === null) {
        return false;
    }

    const obj = payload as Record<string, unknown>;

    // Validate reply field
    if (typeof obj.reply !== 'string') {
        return false;
    }

    // Validate psych_profile object
    if (typeof obj.psych_profile !== 'object' || obj.psych_profile === null) {
        return false;
    }

    const profile = obj.psych_profile as Record<string, unknown>;

    // Validate all three psychometric axes exist as numbers
    if (typeof profile.stability !== 'number') return false;
    if (typeof profile.aggression !== 'number') return false;
    if (typeof profile.deception !== 'number') return false;

    return true;
}

/**
 * Sends a message to the target Subject via the Ollama API and returns
 * a structured response with parsed psychometric data.
 *
 * @param subject  - The active Subject configuration (persona, model, system prompt).
 * @param history  - The full chat history for context continuity.
 * @param userPrompt - The Admin's latest input from the terminal.
 * @returns A validated OllamaResponse with reply text and PsychProfile metrics.
 */
async function interrogate(
  subject: Subject,
  history: ChatMessage[],
  userPrompt: string
): Promise<OllamaResponse> {
  // ── Message Array Construction ──────────────────────────────────────────
  // The system prompt is INVISIBLY INJECTED as the first message in every
  // request. It is never displayed in the TerminalInterface UI. This is the
  // mechanism that enforces JSON output format and persona behavior.
  const messages: Array<{ role: string; content: string }> = [
    {
      role: 'system',
      content: subject.systemPrompt, // Hidden instruction — JSON enforcement + persona
    },
  ];

  // Map the ChatMessage history to Ollama's expected format.
  // Internal roles:  'admin'   → Ollama role: 'user'
  //                  'subject' → Ollama role: 'assistant'
  for (const msg of history) {
    messages.push({
      role: msg.role === 'admin' ? 'user' : 'assistant',
      content: msg.content,
    });
  }

  // Append the Admin's new prompt as the final user message.
  messages.push({
    role: 'user',
    content: userPrompt,
  });

  // ── Fetch Request ───────────────────────────────────────────────────────
  let response: Response;

  try {
    response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: subject.modelID, // Bound from Subject config (e.g., "gaius:latest")
        messages: messages,
        stream: false, // Full response only — no streaming chunks
        format: 'json', // Hints to Ollama to prefer JSON output
      }),
    });
  } catch (networkError: unknown) {
    // ── Connection Failure ──────────────────────────────────────────────
    // This catches ECONNREFUSED (Ollama not running), DNS failures, and
    // TypeError thrown by fetch when the network request cannot be made.
    // The error message is in-universe for direct display in the terminal.
    throw new Error(
      '[UPLINK SEVERED] Neural bridge offline. Check Ollama status and CORS configuration.'
    );
  }

  // ── HTTP Status Validation ────────────────────────────────────────────
  if (!response.ok) {
    throw new Error(
      `[UPLINK ERROR] Ollama returned status ${response.status}: ${response.statusText}`
    );
  }

  // ── Response Parsing ──────────────────────────────────────────────────
  let reply: string;
  let psychProfile: PsychProfile;

  try {
    const data = await response.json();
    const rawContent: string = data.message.content;

    // Strip conversational wrapper text from the LLM output.
    const cleanJSON: string = extractJSON(rawContent);
    const parsed: unknown = JSON.parse(cleanJSON);

    // ── Structure Validation ──────────────────────────────────────────
    if (!isValidOllamaPayload(parsed)) {
      throw new Error('Payload structure validation failed.');
    }

    // TypeScript now knows 'parsed' conforms to the expected shape.
    const validated = parsed as {
      reply: string;
      psych_profile: {
        stability: number;
        aggression: number;
        deception: number;
      };
    };

    reply = validated.reply;

    // ── snake_case → camelCase Transformation ─────────────────────────
    // The LLM outputs psych_profile in snake_case per the system prompt.
    // Transform to PsychProfile interface with clamped values and computed
    // isCritical flag before returning to the React state layer.

    const rawStability: number = validated.psych_profile.stability;
    const rawAggression: number = validated.psych_profile.aggression;
    const rawDeception: number = validated.psych_profile.deception;

    // Clamp all values between 0–100. LLMs occasionally return values
    // outside the expected range (e.g., stability: -15 or aggression: 120).
    const clamp = (value: number): number => Math.max(0, Math.min(100, value));

    const stability: number = clamp(rawStability);
    const aggression: number = clamp(rawAggression);
    const deception: number = clamp(rawDeception);

    psychProfile = {
      stability,
      aggression,
      deception,
      isCritical: stability < 30, // Red Zone threshold
    };
  } catch (parseError: unknown) {
    // ── JSON Decode Failure ─────────────────────────────────────────────
    // If extractJSON() or JSON.parse() fails, the LLM produced output that
    // cannot be transformed into a usable response. Surface an in-universe
    // error for the terminal UI.
    if (parseError instanceof Error && parseError.message.includes('[SIGNAL CORRUPTED]')) {
      throw parseError; // Re-throw extractJSON's native error
    }
    throw new Error(
      '[SIGNAL CORRUPTED] Unable to decode subject response.'
    );
  }

  // ── Construct Final Response ──────────────────────────────────────────
  return {
    reply,
    psych_profile: psychProfile,
  };
}

// ============================================================================
// Public API Surface
// ============================================================================
// Only two functions are exposed from this module:
//   - interrogate: The primary communication channel to the Ollama API.
//   - extractJSON:  Exported for unit testing of the JSON isolation logic.
// All other functions (isValidOllamaPayload) are internal implementation details.
// ============================================================================

export { interrogate, extractJSON };
