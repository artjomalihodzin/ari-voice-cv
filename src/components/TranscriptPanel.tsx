import React, { useEffect, useRef } from 'react';
import { Copy, Trash2, Bot, User, Check, Sparkles, Send } from 'lucide-react';

export interface ChatMessage {
  id: string;
  sender: 'ari' | 'user';
  text: string;
  timestamp: string;
  isStreaming?: boolean;
}

interface TranscriptPanelProps {
  messages: ChatMessage[];
  currentStreamingText: string;
  onClear: () => void;
  onSendTextQuery: (text: string) => void;
  isConnected: boolean;
  isAiSpeaking: boolean;
}

export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({
  messages,
  currentStreamingText,
  onClear,
  onSendTextQuery,
  isConnected,
  isAiSpeaking,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [typedInput, setTypedInput] = React.useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentStreamingText]);

  const handleCopy = async () => {
    const formatted = messages
      .map((m) => `[${m.timestamp}] ${m.sender === 'ari' ? 'Ari' : 'Visitor'}: ${m.text}`)
      .join('\n');
    await navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedInput.trim()) return;
    onSendTextQuery(typedInput.trim());
    setTypedInput('');
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900/60 border border-neutral-800/80 rounded-2xl backdrop-blur-xl shadow-2xl overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800/60 bg-neutral-950/40">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
            Live Dialogue Transcript
          </span>
          <span className="text-[10px] font-mono text-neutral-500 bg-neutral-800/80 px-2 py-0.5 rounded-full">
            {messages.length} turns
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={handleCopy}
            disabled={messages.length === 0}
            className="flex items-center space-x-1 px-2.5 py-1 text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 rounded-lg transition disabled:opacity-30 disabled:pointer-events-none"
            title="Copy conversation transcript"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            onClick={onClear}
            disabled={messages.length === 0}
            className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition disabled:opacity-30 disabled:pointer-events-none"
            title="Clear transcript"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Container */}
      <div
        ref={scrollRef}
        className="flex-1 p-4 space-y-3.5 overflow-y-auto max-h-[280px] sm:max-h-[340px] scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent"
      >
        {messages.length === 0 && !currentStreamingText ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-8 text-neutral-500">
            <Sparkles className="w-7 h-7 text-neutral-600 mb-2 animate-pulse" />
            <p className="text-sm font-medium text-neutral-400">No dialogue yet</p>
            <p className="text-xs text-neutral-600 max-w-xs mt-1">
              Tap the microphone or choose a suggested question below to start talking with Ari.
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 text-sm ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.sender === 'ari' && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-cyan-500/10 mt-0.5">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-neutral-800 text-neutral-100 border border-neutral-700/60 rounded-br-none'
                      : 'bg-neutral-900/90 text-neutral-200 border border-neutral-800 rounded-bl-none'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span
                      className={`text-[11px] font-semibold tracking-wide uppercase ${
                        msg.sender === 'ari' ? 'text-cyan-400' : 'text-neutral-400'
                      }`}
                    >
                      {msg.sender === 'ari' ? 'Ari' : 'You'}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-500">
                      {msg.timestamp}
                    </span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-neutral-300" />
                  </div>
                )}
              </div>
            ))}

            {/* Current streaming utterance from Ari */}
            {currentStreamingText && (
              <div className="flex gap-3 text-sm justify-start animate-fadeIn">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-cyan-500/20 mt-0.5 animate-pulse">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="max-w-[85%] rounded-2xl px-4 py-2.5 bg-neutral-900/90 text-neutral-100 border border-cyan-500/40 rounded-bl-none shadow-lg shadow-cyan-950/30">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[11px] font-semibold tracking-wide uppercase text-cyan-400">
                        Ari
                      </span>
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    </div>
                  </div>
                  <p className="leading-relaxed">
                    {currentStreamingText}
                    <span className="inline-block w-1.5 h-4 ml-1 bg-cyan-400 animate-pulse align-middle" />
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Text fallback input bar for quiet places */}
      <form
        onSubmit={handleInputSubmit}
        className="px-3 py-2.5 bg-neutral-950/60 border-t border-neutral-800/60 flex items-center gap-2"
      >
        <input
          type="text"
          value={typedInput}
          onChange={(e) => setTypedInput(e.target.value)}
          placeholder={
            isConnected
              ? 'Or type a question for Ari...'
              : 'Connect voice or type to ask Ari...'
          }
          className="flex-1 bg-neutral-900/90 border border-neutral-800 focus:border-cyan-500 text-xs text-neutral-100 rounded-xl px-3 py-2 outline-none transition placeholder:text-neutral-600"
        />
        <button
          type="submit"
          disabled={!typedInput.trim()}
          className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 disabled:pointer-events-none text-white transition shadow-sm"
          title="Send message"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
