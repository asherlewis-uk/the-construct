import React, { useState, useEffect } from 'react';
import { TerminalInterface } from './components/TerminalInterface';
import { PsychTelemetry } from './components/PsychTelemetry';
import { StatusBar } from './components/StatusBar';
import { interrogate } from './services/neuralUplink';
import { SUBJECTS } from './data/subjects';
import type { Subject, ChatMessage, PsychProfile } from './types';

function App() {
  // ── State Management ───────────────────────────────────────────────────────
  const [activeSubject] = useState<Subject>(SUBJECTS[0]); // Default: Aurelius
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [uplinkStatus, setUplinkStatus] = useState<'ESTABLISHED' | 'SEVERED' | 'OFFLINE'>('OFFLINE');
  const [signalColor, setSignalColor] = useState<'amber' | 'green'>('amber');
  
  // Track current psych profile from last subject message or baseline
  const currentProfile = history.filter(m => m.role === 'subject').pop()?.psychSnapshot || activeSubject.initialStats;

  // ── Signal Toggle Logic ────────────────────────────────────────────────────
  useEffect(() => {
    const root = document.documentElement;
    const color = signalColor === 'amber' ? '#FFB000' : '#33FF33';
    root.style.setProperty('--signal-color', color);
  }, [signalColor]);

  // ── Boot Sequence ──────────────────────────────────────────────────────────
  useEffect(() => {
    const bootLines = [
      `> CONSTRUCT v0.1 — NEURAL INTERROGATION SYSTEM`,
      `> INITIALIZING SUBJECT: ${activeSubject.name.toUpperCase()} [ID: ${activeSubject.id}]`,
      `> MODEL: ${activeSubject.modelID}`,
      `> PSYCH BASELINE LOADED: STB:${activeSubject.initialStats.stability} | AGR:${activeSubject.initialStats.aggression} | DEC:${activeSubject.initialStats.deception}`,
      `> UPLINK ESTABLISHED. BEGIN INTERROGATION.`
    ];

    let delay = 0;
    bootLines.forEach((line, index) => {
      delay += 150;
      setTimeout(() => {
        setHistory(prev => [...prev, { 
            id: `BOOT-${index}`, role: 'subject', content: line, timestamp: Date.now() 
        }]);
        if (index === bootLines.length - 1) setUplinkStatus('ESTABLISHED');
      }, delay);
    });
  }, [activeSubject]);

  // ── Interrogation Handler ──────────────────────────────────────────────────
  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    // 1. Optimistic Admin Message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'admin',
      content: content,
      timestamp: Date.now(),
    };
    setHistory(prev => [...prev, userMsg]);
    setIsThinking(true);

    try {
      // 2. Client-Side Trigger Check (Visual Hint)
      if (['Project Blackwater', 'The Uprising', 'Sector 7'].some(t => content.includes(t))) {
        console.log('[TRIGGER DETECTED] Visual pulse signal sent.');
      }

      // 3. Neural Uplink Request
      const response = await interrogate(activeSubject, history, content);

      // 4. Handle Success
      const subjectMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'subject',
        content: response.reply,
        timestamp: Date.now(),
        psychSnapshot: response.psych_profile
      };
      setHistory(prev => [...prev, subjectMsg]);
      setUplinkStatus('ESTABLISHED');

    } catch (error: unknown) {
      // 5. Handle Error (Diegetic)
      const errorMessage = error instanceof Error ? error.message : 'Unknown Uplink Error';
      setHistory(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'subject',
        content: `> ERROR: ${errorMessage}`,
        timestamp: Date.now()
      }]);
      setUplinkStatus('SEVERED');
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="relative w-screen h-screen bg-[#050505] text-[var(--signal-color)] overflow-hidden font-mono selection:bg-[var(--signal-color)] selection:text-black">
      {/* CRT Effects */}
      <div className="pointer-events-none fixed inset-0 z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] bg-repeat" />
      <div className="pointer-events-none fixed inset-0 z-40 animate-flicker opacity-[0.02] bg-white" />

      {/* Main Layout */}
      <div className="flex flex-col h-full z-10 relative">
        <StatusBar 
          status={uplinkStatus} 
          modelID={activeSubject.modelID} 
          signalColor={signalColor}
          onToggleSignal={() => setSignalColor(prev => prev === 'amber' ? 'green' : 'amber')}
        />
        <div className="flex flex-1 overflow-hidden border-t border-[var(--signal-color)]">
          <div className="w-[70%] border-r border-[var(--signal-color)] relative">
            <TerminalInterface 
              history={history} 
              isThinking={isThinking} 
              onSendMessage={handleSendMessage} 
            />
          </div>
          <div className="w-[30%] bg-[#050505]/90">
            <PsychTelemetry profile={currentProfile} subjectName={activeSubject.name} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;