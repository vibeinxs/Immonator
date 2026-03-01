import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api }      from '../../lib/api';
import { getToken } from '../../lib/auth';
import styles       from './AnalysisChat.module.css';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id:         string;
  role:       'user' | 'assistant';
  content:    string;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// ── Simple Markdown renderer ──────────────────────────────────────────────────

function renderInline(text: string, baseKey: number): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[1]) parts.push(<strong key={`${baseKey}-${match.index}`}>{match[1]}</strong>);
    else if (match[2]) parts.push(<em key={`${baseKey}-${match.index}`}>{match[2]}</em>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^[-*]\s/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(<li key={i}>{renderInline(lines[i].slice(2), i)}</li>);
        i++;
      }
      nodes.push(
        <ul key={`ul-${i}`} style={{ margin: '4px 0', paddingLeft: 18 }}>
          {items}
        </ul>
      );
      continue;
    }

    if (line.trim() === '') {
      nodes.push(<br key={`br-${i}`} />);
    } else {
      nodes.push(
        <p key={`p-${i}`} style={{ margin: '0 0 4px 0' }}>
          {renderInline(line, i)}
        </p>
      );
    }
    i++;
  }

  return (
    <div style={{ fontSize: 14, fontFamily: 'var(--font-body)', lineHeight: 1.55 }}>
      {nodes}
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 2px' }}>
      <span className={`${styles.dot} ${styles.dot1}`} />
      <span className={`${styles.dot} ${styles.dot2}`} />
      <span className={`${styles.dot} ${styles.dot3}`} />
    </div>
  );
}

// ── Message bubbles ───────────────────────────────────────────────────────────

function UserBubble({ msg, animate }: { msg: ChatMessage; animate: boolean }) {
  return (
    <div
      className={animate ? styles.msgIn : undefined}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}
    >
      <div
        style={{
          background:   'var(--color-brand)',
          color:        '#fff',
          borderRadius: '18px 18px 4px 18px',
          padding:      '10px 14px',
          maxWidth:     '75%',
          fontSize:     14,
          fontFamily:   'var(--font-body)',
          lineHeight:   1.5,
          wordBreak:    'break-word',
        }}
      >
        {msg.content}
      </div>
      <span
        style={{
          fontSize:   11,
          color:      'var(--color-text-muted)',
          fontFamily: 'var(--font-body)',
          marginTop:  4,
        }}
      >
        {fmtTime(msg.created_at)}
      </span>
    </div>
  );
}

function AssistantBubble({
  msg,
  showTyping,
  animate,
}: {
  msg:        ChatMessage;
  showTyping: boolean;
  animate:    boolean;
}) {
  return (
    <div
      className={animate ? styles.msgIn : undefined}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
    >
      <div
        style={{
          background:   'var(--color-bg-surface)',
          color:        'var(--color-text-primary)',
          border:       '1px solid var(--color-border)',
          borderRadius: '18px 18px 18px 4px',
          padding:      '10px 14px',
          maxWidth:     '80%',
          wordBreak:    'break-word',
        }}
      >
        {showTyping ? <TypingIndicator /> : <SimpleMarkdown content={msg.content} />}
      </div>
      <span
        style={{
          fontSize:   11,
          color:      'var(--color-text-muted)',
          fontFamily: 'var(--font-body)',
          marginTop:  4,
        }}
      >
        Immonator AI · {fmtTime(msg.created_at)}
      </span>
    </div>
  );
}

// ── Suggestion chips ──────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'Is this a good investment?',
  "What's a fair offer price?",
  'What are the main risks?',
  'How does this fit my strategy?',
  'Explain the numbers to me',
];

// ── Main component ────────────────────────────────────────────────────────────

export function AnalysisChat({
  contextType,
  contextId,
  title,
}: {
  contextType: string;
  contextId?:  string;
  title:       string;
}) {
  const [messages,    setMessages]    = useState<ChatMessage[]>([]);
  const [isExpanded,  setIsExpanded]  = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [inputValue,  setInputValue]  = useState('');
  const [newMsgIds,   setNewMsgIds]   = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load chat history on mount
  useEffect(() => {
    let ignore = false;
    const params = new URLSearchParams({ context_type: contextType });
    if (contextId) params.set('context_id', contextId);

    api.get<ChatMessage[]>(`/api/chat/history?${params.toString()}`).then((res) => {
      if (!ignore && res.data) setMessages(res.data);
    });
    return () => { ignore = true; };
  }, [contextType, contextId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    const userMsg: ChatMessage = {
      id:         `user-${crypto.randomUUID()}`,
      role:       'user',
      content:    trimmed,
      created_at: new Date().toISOString(),
    };
    const pendingId = `pending-${crypto.randomUUID()}`;
    const pendingMsg: ChatMessage = {
      id:         pendingId,
      role:       'assistant',
      content:    '',
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg, pendingMsg]);
    setNewMsgIds(prev => new Set([...prev, userMsg.id, pendingId]));
    setInputValue('');
    setIsStreaming(true);

    try {
      const response = await fetch(`${BASE_URL}/api/chat`, {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${getToken() ?? ''}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          message:      trimmed,
          context_type: contextType,
          context_id:   contextId,
        }),
      });

      if (!response.ok || !response.body) {
        setMessages(prev => prev.filter(m => m.id !== pendingId));
        return;
      }

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value).split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) break outer;
            assistantContent += data.content;
            setMessages(prev =>
              prev.map(m => m.id === pendingId ? { ...m, content: assistantContent } : m)
            );
          } catch {
            // Malformed SSE chunk — skip
          }
        }
      }

      // Settle with a stable id now that streaming is complete
      setMessages(prev =>
        prev.map(m => m.id === pendingId ? { ...m, id: `assistant-${crypto.randomUUID()}` } : m)
      );
    } catch {
      setMessages(prev => prev.filter(m => m.id !== pendingId));
    } finally {
      setIsStreaming(false);
    }
  }, [isStreaming, contextType, contextId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const showChips = messages.length === 0 && !isStreaming;

  return (
    <div
      style={{
        background:   'var(--color-bg-elevated)',
        border:       '1px solid var(--color-border)',
        borderRadius: 12,
        overflow:     'hidden',
      }}
    >
      {/* ── Header ── */}
      <button
        onClick={() => setIsExpanded(e => !e)}
        aria-expanded={isExpanded}
        aria-controls="ac-body"
        style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          width:          '100%',
          padding:        '12px 16px',
          cursor:         'pointer',
          background:     'var(--color-bg-elevated)',
          border:         'none',
          borderBottom:   isExpanded ? '1px solid var(--color-border)' : 'none',
          borderRadius:   0,
          font:           'inherit',
          textAlign:      'left',
        }}
      >
        <span
          style={{
            fontSize:   14,
            fontWeight: 600,
            fontFamily: 'var(--font-body)',
            color:      'var(--color-text-primary)',
          }}
        >
          💬 Chat about {title}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          style={{
            color:      'var(--color-text-muted)',
            transform:  isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 200ms',
          }}
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* ── Expanded body ── */}
      {isExpanded && (
        <div id="ac-body" style={{ display: 'flex', flexDirection: 'column' }}>

          {/* Message area */}
          <div
            style={{
              maxHeight:     400,
              overflowY:     'auto',
              padding:       '16px 16px 8px',
              display:       'flex',
              flexDirection: 'column',
              gap:           12,
            }}
          >
            {/* Suggestion chips — empty state */}
            {showChips && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '8px 0' }}>
                {SUGGESTIONS.map((s) => (
                  <button key={s} className={styles.chip} onClick={() => sendMessage(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Messages */}
            {messages.map((msg) => {
              const animate = newMsgIds.has(msg.id);
              if (msg.role === 'user') {
                return <UserBubble key={msg.id} msg={msg} animate={animate} />;
              }
              return (
                <AssistantBubble
                  key={msg.id}
                  msg={msg}
                  showTyping={isStreaming && msg.content === ''}
                  animate={animate}
                />
              );
            })}

            <div ref={bottomRef} />
          </div>

          {/* Input row */}
          <div
            style={{
              display:    'flex',
              gap:        8,
              padding:    '12px 16px',
              borderTop:  '1px solid var(--color-border)',
              background: 'var(--color-bg-elevated)',
            }}
          >
            <input
              className={styles.input}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              disabled={isStreaming}
            />
            <button
              className={styles.sendBtn}
              onClick={() => sendMessage(inputValue)}
              disabled={isStreaming || !inputValue.trim()}
              aria-label="Send message"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2 8h12M9 3l5 5-5 5"
                  stroke="#fff"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

export default AnalysisChat;
