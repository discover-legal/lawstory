'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { partyDisplayName, useDemoDocument } from './DemoDocumentContext';
import { DocumentDetails } from './DocumentDetails';
import { suggestionAt } from './engine';

// Port of components/app/ChatInterface.js (c34b131): progress trail, Document Details, transcript,
// status line and input. Removed for the demo: auth, the /api/chat request (the recorded engine answers
// instead), the jurisdiction probe, transcript persistence and evidence upload. Added: the recorded
// answer as a suggestion, and the demo note in place of "AI can make mistakes".
const DIVORCE_PHASE_ORDER = ['INTAKE', 'RESIDENCY', 'GROUNDS', 'CHILDREN', 'PROPERTY', 'SUPPORT', 'SERVICE', 'INDIGENCY', 'MILITARY', 'REVIEW'];
const PHASE_NAMES: Record<string, string> = {
  INTAKE: 'Getting Started', RESIDENCY: 'Residency', GROUNDS: 'Grounds & Marriage', CHILDREN: 'Children', PROPERTY: 'Property & Debts',
  SUPPORT: 'Spousal Support', SERVICE: 'Serving Your Spouse', INDIGENCY: 'Court Costs', MILITARY: 'Military Status', REVIEW: 'Review & Confirm',
};
// Tailwind needs whole class names; the v1 bar set width inline, which this site's lint forbids.
const WIDTH = ['w-0', 'w-[10%]', 'w-[20%]', 'w-[30%]', 'w-[40%]', 'w-[50%]', 'w-[60%]', 'w-[70%]', 'w-[80%]', 'w-[90%]', 'w-full'];

export function ChatInterface() {
  const { currentDocument, messages, isLoading, sendMessage, step } = useDemoDocument();
  const [message, setMessage] = useState('');
  const [showMetadata, setShowMetadata] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const suggestion = suggestionAt(step);

  useEffect(() => {
    const el = chatContainerRef.current;
    if (el && isAtBottom) el.scrollTop = el.scrollHeight;
  }, [messages, isLoading, isAtBottom]);

  const handleScroll = () => {
    const el = chatContainerRef.current;
    if (el) setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 10);
  };
  const send = () => {
    if (!message.trim() || isLoading) return;
    sendMessage(message);
    setMessage('');
    setIsAtBottom(true);
  };

  const statusName = partyDisplayName(currentDocument);
  const phase = currentDocument.phase;
  const currentPhaseIndex = phase ? DIVORCE_PHASE_ORDER.indexOf(phase) : -1;
  const progress = currentPhaseIndex + 1; // tenths: the v1 trail divides by 10 phases
  const facts = currentDocument.facts.length;

  return (
    <div className="relative flex flex-col h-full min-h-0 bg-slate-50">
      {currentPhaseIndex >= 0 && (
        <div className="bg-brand-tint border-b border-brand-soft px-4 py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-brand-strong">
              Step {currentPhaseIndex + 1} of {DIVORCE_PHASE_ORDER.length}: {PHASE_NAMES[phase!] ?? phase}
            </span>
            <span className="text-xs text-slate-500">{progress * 10}% complete</span>
          </div>
          <div className="h-1.5 bg-brand-soft rounded-full overflow-hidden">
            <div className={`h-full bg-brand rounded-full transition-all duration-500 ${WIDTH[progress]}`} />
          </div>
        </div>
      )}

      <div className="border-b bg-white">
        <button type="button" onClick={() => setShowMetadata(!showMetadata)} aria-expanded={showMetadata} aria-controls="document-metadata-panel"
          className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${showMetadata ? 'bg-slate-200' : 'hover:bg-slate-50'}`}>
          <span className="font-medium">Document Details</span>
          <Icon name={showMetadata ? 'chevronUp' : 'chevronDown'} className="h-5 w-5 text-brand" />
        </button>
      </div>

      <div ref={chatContainerRef} onScroll={handleScroll} className="relative flex-1 min-h-0 overflow-y-auto p-4 space-y-4" aria-live="polite">
        {showMetadata && (
          <div id="document-metadata-panel" className="absolute inset-0 bg-white z-10 overflow-y-auto p-3 shadow-lg">
            <DocumentDetails />
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg p-3 text-sm sm:text-base ${msg.type === 'user' ? 'bg-brand text-white'
              : msg.note ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'bg-white text-slate-800 shadow-sm'}`}
              data-role={msg.type === 'user' ? 'user' : 'assistant'}>
              <div className="flex items-start">
                {msg.type === 'bot' && <Icon name={msg.note ? 'info' : 'bot'} className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />}
                <div className="whitespace-pre-wrap flex-1 min-w-0">{msg.content}</div>
                {msg.type === 'user' && <Icon name="user" className="ml-2 mt-0.5 h-4 w-4 flex-shrink-0" />}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white p-3 rounded-lg shadow-sm flex items-center" role="status">
              <Icon name="loader" className="h-4 w-4 mr-2 animate-spin text-brand" />
              <span className="text-slate-600">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t bg-white p-3 sm:p-4">
        {(statusName || currentDocument.state) && (
          <div className="mb-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
            {statusName && <span className="flex items-center text-emerald-700"><Icon name="check" className="h-3 w-3 mr-1" />Name: {statusName}</span>}
            {currentDocument.state && <span className="flex items-center text-emerald-700"><Icon name="check" className="h-3 w-3 mr-1" />Jurisdiction: {currentDocument.state}</span>}
            {facts > 0 && <span className="flex items-center text-brand"><Icon name="check" className="h-3 w-3 mr-1" />{facts} fact{facts !== 1 ? 's' : ''}</span>}
          </div>
        )}
        {suggestion && (
          <button type="button" onClick={() => setMessage(suggestion)} disabled={isLoading}
            className="mb-2 w-full rounded-lg border border-dashed border-brand/40 bg-brand-tint px-3 py-2 text-left text-xs text-slate-700 hover:bg-brand-soft disabled:opacity-50">
            <span className="font-semibold text-brand-strong">Suggested reply (recorded): </span>{suggestion}
          </button>
        )}
        <p className="mb-2 text-xs text-slate-500 text-center">
          Recorded demo with a fictional client: replies come from a fixed recording, not a live AI. What you type stays in this tab.
        </p>
        <div className="flex gap-2">
          <label htmlFor="demo-chat-input" className="sr-only">Your message</label>
          <input id="demo-chat-input" type="text" value={message} onChange={(e) => setMessage(e.target.value)} autoComplete="off" maxLength={500}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } }} placeholder="Type your message..."
            className="flex-1 min-w-0 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent" />
          <button type="button" onClick={send} aria-label="Send message" disabled={isLoading || !message.trim()}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${isLoading || !message.trim() ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-brand text-white hover:bg-brand-strong'}`}>
            <Icon name="send" className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
