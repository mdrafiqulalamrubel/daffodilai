'use client';
import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles, ArrowUpRight, Bot } from 'lucide-react';
import type { Lang } from '@/lib/catalog';

type ChatMsg = { role: 'bot' | 'user'; text: string; sources?: { label: string; href: string }[] };

const STARTERS = [
  'What features does Perfect HR include?',
  'What is Eduvas built for?',
  'What can AI Professor do?',
  'What does LeadershipOS connect?',
];

export function Chatbot({ lang = 'en' }: { lang?: Lang }) {
  const bn = lang === 'bn';
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: 'bot',
      text: "Hi! I'm the Daffodil AI assistant. Ask me about Perfect HR, AI Professor, Eduvas or LeadershipOS — their features, modules and pricing — and I'll answer from our product knowledge base.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy, open]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setInput('');
    setBusy(true);
    try {
      const r = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q }),
      });
      const d = (await r.json()) as { answer?: string; sources?: { label: string; href: string }[]; error?: string };
      setMessages((m) => [
        ...m,
        { role: 'bot', text: d.error || d.answer || 'Something went wrong. Please try again.', sources: d.sources },
      ]);
    } catch {
      setMessages((m) => [...m, { role: 'bot', text: "I couldn't reach the knowledge base. Please try again in a moment." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        className={'chatbot-toggle' + (open ? ' open' : '')}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close assistant' : 'Open AI assistant'}
        aria-expanded={open}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {!open && <span className="chatbot-ping" />}
      </button>
      {open && (
        <div className="chatbot-panel" role="dialog" aria-label="Daffodil AI assistant">
          <div className="chatbot-head">
            <div className="chatbot-avatar">
              <Bot size={19} />
            </div>
            <div>
              <strong>{bn ? 'ড্যাফোডিল এআই সহকারী' : 'Daffodil AI Assistant'}</strong>
              <span>{bn ? 'পণ্যের তথ্যভাণ্ডার থেকে উত্তর' : 'Answers from our product knowledge base'}</span>
            </div>
            <button className="chatbot-close" onClick={() => setOpen(false)} aria-label="Close">
              <X size={17} />
            </button>
          </div>
          <div className="chatbot-body" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={'chatbot-msg ' + m.role}>
                <p>{m.text}</p>
                {m.sources && m.sources.length > 0 && (
                  <div className="chatbot-sources">
                    {m.sources.map((s) => (
                      <a key={s.href} href={s.href} className="chatbot-source-link">
                        {s.label}
                        <ArrowUpRight size={12} />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="chatbot-msg bot chatbot-typing">
                <Loader2 size={15} className="animate-spin" />
                <span>{bn ? 'খুঁজছি…' : 'Searching the knowledge base…'}</span>
              </div>
            )}
            {messages.length === 1 && (
              <div className="chatbot-starters">
                {STARTERS.map((s) => (
                  <button key={s} onClick={() => ask(s)}>
                    <Sparkles size={13} />
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <form
            className="chatbot-input"
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={bn ? 'একটি প্রশ্ন লিখুন…' : 'Ask about a product…'}
              maxLength={500}
              aria-label="Ask the assistant"
            />
            <button type="submit" disabled={busy || !input.trim()} aria-label="Send">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
