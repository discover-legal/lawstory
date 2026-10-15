/**
 * ChatInterface regressions:
 *  - the Document Details panel is NOT positioned inside the scrolling
 *    message list (it rendered ~880px above the viewport once the chat had
 *    scrolled, because `absolute inset-0` resolved against the scrolled
 *    content box);
 *  - auto-follow during fast message bursts uses an instant scroll (a
 *    smooth scroll's intermediate scroll events read as "user scrolled up");
 *  - the divorce greeting names the jurisdiction's own documents
 *    (Ontario: Application for Divorce + Divorce Order).
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

let mockDocument;
const mockUpdate = jest.fn();

jest.mock('@/lib/auth0-client', () => ({
  useAuth0: () => ({ isAuthenticated: true, getAccessTokenSilently: async () => '' }),
}));
jest.mock('@/contexts/DocumentContext', () => ({
  useDocumentData: () => ({ currentDocument: mockDocument }),
  useDocumentActions: () => ({ updateDocumentData: mockUpdate }),
}));
jest.mock('@/components/app/DocumentMetadata', () => {
  const DocumentMetadata = () => <div data-testid="metadata-form" />;
  DocumentMetadata.displayName = 'DocumentMetadata';
  return DocumentMetadata;
});
jest.mock('@/components/app/EvidenceUploadModal', () => () => null);

// eslint-disable-next-line import/first
import ChatInterface, { divorceGreetingIntro, isScrolledToBottom } from '@/components/app/ChatInterface';

beforeEach(() => {
  mockUpdate.mockReset();
  global.fetch = jest.fn(async () => ({ ok: false, json: async () => [] }));
  mockDocument = {
    documentId: 101,
    documentType: 'divorce_package',
    state: 'ON',
    facts: [],
    conversationHistory: [],
  };
});

describe('Document Details panel', () => {
  it('renders outside the scrolling message list so it stays in view', () => {
    render(<ChatInterface />);
    fireEvent.click(screen.getByRole('button', { name: /document details/i }));

    const panel = document.getElementById('document-metadata-panel');
    const scroller = screen.getByTestId('chat-messages');
    expect(panel).not.toBeNull();
    expect(scroller.contains(panel)).toBe(false);
    // Positioned against a non-scrolling wrapper that also holds the list.
    expect(panel.parentElement.contains(scroller)).toBe(true);
    expect(panel.parentElement.className).toMatch(/\brelative\b/);
    expect(scroller.className).not.toMatch(/\brelative\b/);
  });
});

describe('auto-scroll', () => {
  it('treats a few pixels from the bottom as the bottom', () => {
    expect(isScrolledToBottom({ scrollTop: 991, scrollHeight: 1500, clientHeight: 500 })).toBe(true);
    expect(isScrolledToBottom({ scrollTop: 800, scrollHeight: 1500, clientHeight: 500 })).toBe(false);
  });

  it('follows new messages with an instant (not smooth) scroll', () => {
    const scrollTo = jest.fn();
    const original = Element.prototype.scrollTo;
    Element.prototype.scrollTo = scrollTo;
    try {
      mockDocument = {
        ...mockDocument,
        conversationHistory: [
          { type: 'bot', content: 'one' },
          { type: 'user', content: 'two' },
        ],
      };
      render(<ChatInterface />);
      expect(scrollTo).toHaveBeenCalled();
      for (const [arg] of scrollTo.mock.calls) {
        expect(arg.behavior).toBe('auto');
      }
    } finally {
      Element.prototype.scrollTo = original;
    }
  });
});

describe('new document', () => {
  it('holds the chat input until the document exists', () => {
    mockDocument = { ...mockDocument, documentId: null };
    render(<ChatInterface />);
    const input = screen.getByRole('textbox', { name: 'Message' });
    expect(input.disabled).toBe(true);
    expect(input.getAttribute('placeholder')).toBe('Preparing your document…');
  });

  it('enables the input once the document has an id', () => {
    render(<ChatInterface />);
    const input = screen.getByRole('textbox', { name: 'Message' });
    expect(input.disabled).toBe(false);
    expect(input.getAttribute('placeholder')).toBe('Type your message...');
  });
});

describe('divorce greeting', () => {
  it('names Ontario documents in Ontario terms', () => {
    const text = divorceGreetingIntro('ON');
    expect(text).toContain('Application for Divorce');
    expect(text).toContain('Divorce Order');
    expect(text).not.toMatch(/Petition|Decree/);
  });

  it('keeps US terms for Utah', () => {
    expect(divorceGreetingIntro('UT')).toContain('Divorce Petition and Divorce Decree');
  });

  it('names neither before the jurisdiction is known', () => {
    expect(divorceGreetingIntro('')).not.toMatch(/Petition|Decree|Application|Order\b/);
  });

  it('waits for the jurisdiction instead of flashing a generic greeting', async () => {
    let resolveStates;
    global.fetch = jest.fn(() => new Promise((r) => { resolveStates = r; }));
    mockDocument = { ...mockDocument, state: '' };
    const { rerender } = render(<ChatInterface />);
    expect(screen.queryByText(/I'm here to help/)).toBeNull();

    // The single active jurisdiction arrives: the first greeting already
    // names Ontario's documents (no generic text was ever shown).
    mockDocument = { ...mockDocument, state: 'ON' };
    await act(async () => { rerender(<ChatInterface />); });
    expect(screen.getByText(/Application for Divorce and Divorce Order/)).toBeTruthy();
    expect(screen.queryByText(/document that starts your divorce case/)).toBeNull();
    resolveStates({ ok: false, json: async () => [] });
  });

  it('greets neutrally when no single jurisdiction can be resolved', async () => {
    mockDocument = { ...mockDocument, state: '' };
    await act(async () => { render(<ChatInterface />); });
    expect(await screen.findByText(/document that starts your divorce case/)).toBeTruthy();
  });
});
