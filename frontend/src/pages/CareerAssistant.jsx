import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AIPill, ReviewPill } from '@/components/badges';
import { Send, Sparkles, User, AlertTriangle } from 'lucide-react';

const SUGGESTED_QUESTIONS = [
  'Tell me more about MAJ Tan',
  'Who is the primary candidate for OC XX Squadron?',
  'Show me the succession plan for OC XX Squadron',
  'What happens if MAJ Tan resigns?',
  'Which appointments have no ready successor?',
  'What development does MAJ Tan need for Branch Head?',
  'Who is a primary successor for more than one appointment?',
  'What are MAJ Tan\'s key strengths?'
];

function MessageBubble({ role, content }) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="flex max-w-[80%] items-start gap-2">
          <div className="rounded-sm rounded-tr-none bg-primary px-3 py-2 text-sm text-primary-foreground">
            {content}
          </div>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="flex max-w-[85%] items-start gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ai text-ai-foreground">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[0.625rem] font-semibold uppercase tracking-wide text-ai">AI Career Assistant</span>
            <AIPill />
          </div>
          <div className="whitespace-pre-wrap rounded-sm rounded-tl-none border border-ai/20 bg-ai-soft px-3 py-2 text-sm text-foreground">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CareerAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const ask = async (question) => {
    if (!question.trim() || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setLoading(true);
    try {
      const response = await base44.functions.invoke('careerAssistant', { question });
      const answer = response.data?.answer || 'Unable to generate a response. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: ' + (error.message || 'Unable to reach the assistant. Please try again.') }]);
    }
    setLoading(false);
  };

  return (
    <div className="mx-auto flex h-full max-w-[900px] flex-col px-4 py-6 lg:px-6">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-foreground">AI Career Assistant</h1>
          <AIPill />
        </div>
        <p className="text-sm text-muted-foreground">Conversational access to personnel, posting, assessment and succession intelligence. AI explains — HR decides.</p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto rounded-sm border border-border bg-card p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ai text-ai-foreground">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Ask me about personnel, postings, assessments or succession</p>
              <p className="mt-1 text-xs text-muted-foreground">I use the application's rules engine and structured data. I never invent information or make decisions.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTED_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => ask(q)}
                  className="rounded-sm border border-border bg-secondary/50 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} content={m.content} />
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-ai text-ai-foreground">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              </div>
              <div className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-ai" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-ai" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-ai" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="mt-3 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') ask(input); }}
          placeholder="Ask about a person, appointment, succession or contingency…"
          disabled={loading}
          className="flex-1 rounded-sm border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={() => ask(input)}
          disabled={loading || !input.trim()}
          className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="h-3.5 w-3.5" /> Send
        </button>
      </div>
      <p className="mt-2 flex items-center gap-1 text-[0.625rem] text-muted-foreground">
        <AlertTriangle className="h-3 w-3" /> AI-generated responses are indicative only. All posting and succession decisions require HR confirmation.
      </p>
    </div>
  );
}