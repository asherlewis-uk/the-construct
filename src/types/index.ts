
/**
 * ============================================================================
 * File:        src/types/index.ts
 * Purpose:     System-wide Type Definitions & Interfaces.
 * Enforcement: Strict TypeScript (no 'any'). Use 'unknown' for indeterminate.
 * ============================================================================
 *
 * This file is the SINGLE SOURCE OF TRUTH for all data structures passing
 * through The Construct's Neural Link. Every interface defined here maps
 * directly to a runtime concern:
 *
 *   PsychProfile   →  Radar chart state & Red Zone detection
 *   Subject         →  Persona config & Ollama model binding
 *   ChatMessage     →  Terminal render log with emotional snapshots
 *   OllamaResponse  →  Raw JSON contract from extractJSON() utility
 *
 * RULES:
 *   - No utility types or helper functions. Definitions only.
 *   - All interfaces exported individually for clean tree-shaking.
 *   - All numeric psych values are integers clamped to 0–100.
 * ============================================================================
 */

/**
 * PsychProfile
 * ------------
 * Core diagnostic interface for real-time emotional state tracking.
 * Maps directly to the three axes of the PsychTelemetry radar chart.
 *
 * All numeric values are integers in the range [0, 100].
 */
export interface PsychProfile {
  /** Emotional coherence index. 100 = fully composed, 0 = total breakdown. */
  stability: number;

  /** Hostility and confrontation index. 0 = passive, 100 = openly hostile. */
  aggression: number;

  /** Evasion and misdirection index. 0 = transparent, 100 = pathological liar. */
  deception: number;

  /**
   * System flag: TRUE when stability < 30.
   *
   * CRITICAL — This flag triggers the "Red Zone" UI state:
   *
   *   - Radar chart Stability axis renders in #FF3333
   *   - Numeric readout pulses with opacity animation
   *   - Subject responses degrade into word-salad fragmentation
   *   - StatusBar displays "PSYCHOLOGICAL COLLAPSE DETECTED"
   *
   * Computed by the NeuralUplink service after parsing OllamaResponse.
   * Never returned directly by the model — always derived from stability.
   */
  isCritical: boolean;
}

/**
 * Subject
 * -------
 * Persona configuration interface for interrogation targets.
 * Pre-configured instances live in src/data/subjects.ts.
 *
 * Each Subject maps 1:1 to a local Ollama model and carries the hidden
 * system prompt that defines personality, behavioral triggers, and
 * JSON output enforcement.
 */
export interface Subject {
  /** Unique subject identifier (e.g., "AUR-0001"). */
  id: string;

  /** Display name rendered in the terminal header and uplink selector. */
  name: string;

  /**
   * Ollama model tag passed directly to the /api/chat endpoint's
   * "model" parameter.
   *
   * Binding: This string MUST match an installed Ollama model tag exactly.
   *
   *   Aurelius  → "gaius:latest"      (6.3GB high-fidelity)
   *   Lighter   → "qwen2.5-coder:7b"  (compact alternative)
   *
   * Validated at runtime by the NeuralUplink service. If the model
   * is not found, Ollama returns a 404 and the uplink fails gracefully.
   */
  modelID: string;

  /**
   * Hidden persona instructions injected as the "system" role message
   * in every Ollama /api/chat request.
   *
   * INJECTION STRATEGY:
   *
   * 1. This string is NEVER displayed in the TerminalInterface UI.
   * 2. It is prepended to the messages array as { role: "system", content: systemPrompt }.
   * 3. It MUST contain the JSON enforcement directive:
   *    'You must ALWAYS respond with valid JSON in this exact format:
   *    {"reply": "string", "psych_profile": {"stability": int, "aggression": int, "deception": int}}'
   * 4. It defines personality traits, behavioral triggers (e.g., "Project Blackwater"),
   *    and degradation rules for stability < 30 word-salad responses.
   */
  systemPrompt: string;

  /**
   * Visual theme applied to the TerminalInterface and PsychTelemetry
   * components when this subject's uplink is active.
   *
   * "cyber-noir"     → Amber CRT phosphor aesthetic (#FFB000 on #0A0A0A)
   * "high-contrast"  → White-on-black clinical readout
   */
  visualTheme: 'cyber-noir' | 'high-contrast';

  /**
   * Starting radar chart values loaded when the subject uplink initializes.
   * These are the baseline PsychProfile stats before any interrogation
   * messages are exchanged. Overwritten by live OllamaResponse data
   * after the first subject reply.
   */
  initialStats: PsychProfile;
}

/**
 * ChatMessage
 * -----------
 * Terminal message log structure for the TerminalInterface component.
 * Stored in ephemeral React state — lost on page reload by design.
 *
 * Messages are rendered in chronological order. Admin messages render
 * with "> " prefix styling. Subject messages render with model-name
 * prefix and optional psych data badge.
 */
export interface ChatMessage {
  /** Unique message identifier generated via crypto.randomUUID(). */
  id: string;

  /**
   * Message author discriminator.
   * "admin"   → The human operator. Input from TerminalInterface text field.
   * "subject" → The AI persona. Parsed from OllamaResponse.reply.
   */
  role: 'admin' | 'subject';

  /** Display text rendered in the terminal output log. */
  content: string;

  /** Message creation time as Date.now() value (Unix ms). */
  timestamp: number;

  /**
   * Emotional state snapshot attached to this specific message.
   *
   * IMPORTANT: This field is ONLY populated on "subject" role messages.
   * Admin messages always have psychSnapshot as undefined.
   *
   * Purpose: Enables per-message emotional state tracking so the
   * PsychTelemetry radar chart can replay the subject's psychological
   * trajectory across the full interrogation timeline. Each subject
   * response carries the exact PsychProfile at that point in time.
   */
  psychSnapshot?: PsychProfile;
}

/**
 * OllamaResponse
 * --------------
 * Raw API response contract from Ollama after extractJSON() processing.
 * Defined in src/services/neuralUplink.ts extraction pipeline.
 *
 * TRANSFORMATION PIPELINE:
 *   1. Ollama /api/chat returns raw text (may include non-JSON preamble)
 *   2. extractJSON() isolates content between first '{' and last '}'
 *   3. JSON.parse() produces an OllamaResponse instance
 *   4. NeuralUplink transforms psych_profile → PsychProfile:
 *        - Maps snake_case fields to PsychProfile interface
 *        - Computes isCritical = (stability < 30)
 *        - Clamps all values to [0, 100] range
 *   5. reply → ChatMessage.content, PsychProfile → ChatMessage.psychSnapshot
 *
 * NOTE: snake_case field names are intentional. They match the JSON
 * format enforced by the system prompt sent to Ollama. The NeuralUplink
 * service handles the snake_case → camelCase transformation.
 */
export interface OllamaResponse {
  /** Subject's spoken response text, displayed in the TerminalInterface. */
  reply: string;

  /**
   * Raw psychological metrics in snake_case Ollama JSON convention.
   *
   * Parsed then transformed into a PsychProfile instance with the
   * computed isCritical flag (stability < 30) before storing in
   * React state. Integer values [0, 100].
   */
  psych_profile: {
    stability: number;
    aggression: number;
    deception: number;
  };
}
