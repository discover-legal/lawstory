'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { chatTurn, docAt, previewAt, questionAt, type DemoDoc, type Sections, type SubDocument } from './engine';

// Stands in for contexts/DocumentContext.js (c34b131) with the parts the editor reads: currentDocument,
// preview, the chat transcript and switchSubDocument. State lives in memory only (no localStorage, no
// save); reset() returns to the first turn.
export type Message = { type: 'user' | 'bot'; content: string; note?: boolean };
type Ctx = {
  currentDocument: DemoDoc & { activeSubDocument: SubDocument };
  preview: { sections: Sections } | null;
  messages: Message[];
  isLoading: boolean;
  step: number;
  session: number; // bumps on reset, so panels remount with clean local state
  sendMessage: (text: string) => void;
  switchSubDocument: (s: SubDocument) => void;
  reset: () => void;
};
const DocumentCtx = createContext<Ctx | null>(null);
const THINK_MS = 450;

export function DemoDocumentProvider({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState(0);
  const [sub, setSub] = useState<SubDocument>('divorce_petition');
  const [messages, setMessages] = useState<Message[]>([{ type: 'bot', content: questionAt(0) }]);
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState(0);
  const epoch = useRef(0); // drops a reply still "thinking" when the visitor resets

  const sendMessage = useCallback((text: string) => {
    const message = text.trim();
    if (!message || isLoading) return;
    setMessages((m) => [...m, { type: 'user', content: message }]);
    setIsLoading(true);
    const at = epoch.current;
    window.setTimeout(() => {
      if (epoch.current !== at) return;
      const r = chatTurn(message, step);
      setMessages((m) => [...m, { type: 'bot', content: r.response, note: r.outcome !== 'played' }]);
      setStep(r.step);
      setIsLoading(false);
    }, THINK_MS);
  }, [isLoading, step]);

  const reset = useCallback(() => {
    epoch.current += 1;
    setSession((n) => n + 1);
    setStep(0);
    setSub('divorce_petition');
    setMessages([{ type: 'bot', content: questionAt(0) }]);
    setIsLoading(false);
  }, []);

  const value = useMemo<Ctx>(() => ({
    currentDocument: { ...docAt(step), activeSubDocument: sub }, preview: previewAt(step, sub), messages, isLoading, step, session,
    sendMessage, switchSubDocument: setSub, reset,
  }), [step, sub, messages, isLoading, session, sendMessage, reset]);
  return <DocumentCtx.Provider value={value}>{children}</DocumentCtx.Provider>;
}

export function useDemoDocument(): Ctx {
  const c = useContext(DocumentCtx);
  if (!c) throw new Error('useDemoDocument outside DemoDocumentProvider');
  return c;
}

/** lifeStory.fullName (c34b131) for the applicant side, which is all this recording has. */
export const partyDisplayName = (d: DemoDoc) =>
  d.affiantName || d.petitionerName || [d.petitionerFirstName, d.petitionerLastName].filter(Boolean).join(' ');
