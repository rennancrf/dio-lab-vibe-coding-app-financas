import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import type { ChatMessage } from "../types";
import { formatTime } from "../lib/dates";
import { useFinance } from "../store/useFinance";
import { AgentAvatar } from "../components/AgentAvatar";

const STARTERS = ["almoço 30 reais", "táxi 28", "cinema 40", "mercado 120"];

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const isQuestion = message.tone === "question";
  const isNudge = message.tone === "nudge";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "animate-rise max-w-[86%] rounded-[22px] px-4 py-3 text-[14.5px] leading-relaxed whitespace-pre-line shadow-[0_1px_2px_rgba(61,53,44,0.04)]",
          isUser
            ? "rounded-br-[8px] bg-[#f4e3c6] text-ink"
            : "rounded-bl-[8px] border border-line/80 bg-surface text-ink",
          isQuestion && !isUser ? "border-amber/35 bg-[#fffaf0]" : "",
          isNudge && !isUser ? "border-attention/30 bg-attention-soft/40" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <p>{message.text}</p>
        <p
          className={`mt-1.5 text-right text-[10px] ${isUser ? "text-[#a28457]" : "text-ink-faint"}`}
        >
          {formatTime(new Date(message.createdAt))}
        </p>
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex justify-start" aria-label="Sol está escrevendo">
      <div className="flex items-center gap-1.5 rounded-[22px] rounded-bl-[8px] border border-line/80 bg-surface px-4 py-4 shadow-[0_1px_2px_rgba(61,53,44,0.04)]">
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-faint" />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-faint" />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-faint" />
      </div>
    </div>
  );
}

export function ChatPage() {
  const { state, typing, sendMessage } = useFinance();
  const [value, setValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, [value]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const frame = window.requestAnimationFrame(() => {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [state.messages.length, typing]);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!value.trim()) return;
    sendMessage(value);
    setValue("");
    textareaRef.current?.focus();
  };

  const isFresh = state.transactions.length === 0;

  return (
    <section className="flex h-full min-h-0 flex-col bg-cream">
      <header className="z-10 flex shrink-0 items-center gap-3 border-b border-line/70 bg-cream/95 px-5 pb-3.5 pt-4 backdrop-blur">
        <AgentAvatar size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-[15px] font-semibold tracking-tight text-ink">Sol</h1>
            <span className="pill bg-green-soft py-0.5 text-[10px] text-green-deep">online</span>
          </div>
          <p className="truncate text-[12.5px] leading-snug text-ink-soft">
            O que você gastou hoje? Me conta.
          </p>
        </div>
      </header>

      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label="Conversa com Sol"
        className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-5"
      >
        <div className="flex items-center justify-center" aria-hidden="true">
          <span className="pill bg-cream-2/80 px-3 text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            hoje
          </span>
        </div>

        {state.messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {typing ? <TypingBubble /> : null}

        {isFresh && !typing ? (
          <div className="animate-rise pt-2">
            <p className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-medium text-ink-faint">
              <Sparkles size={12} className="text-amber" />
              Pode começar por um destes
            </p>
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => sendMessage(starter)}
                  className="rounded-full border border-line bg-surface px-3.5 py-2 text-[12.5px] text-ink-soft shadow-[0_1px_2px_rgba(61,53,44,0.03)] transition hover:border-amber/50 hover:bg-[#fffaf0] hover:text-amber-deep active:scale-[0.98]"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="shrink-0 bg-gradient-to-t from-cream via-cream to-cream/60 px-3 pb-2 pt-1">
        <form onSubmit={submit} className="mx-auto max-w-[440px]">
          <div className="flex items-end gap-1.5 rounded-[26px] border border-line bg-surface p-1.5 pl-4 shadow-[0_2px_12px_-4px_rgba(61,53,44,0.12)] transition focus-within:border-amber/50 focus-within:ring-4 focus-within:ring-amber/10">
            <textarea
              ref={textareaRef}
              rows={1}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit();
                }
              }}
              placeholder='Ex.: "almoço 30 reais"'
              aria-label="Mensagem para o Sol"
              className="max-h-[120px] min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-faint"
            />
            <button
              type="submit"
              disabled={!value.trim()}
              aria-label="Enviar mensagem"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-deep text-white shadow-sm transition hover:bg-[#9f6728] active:scale-95 disabled:cursor-not-allowed disabled:bg-line disabled:text-ink-faint"
            >
              <ArrowUp size={19} strokeWidth={2.4} />
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] leading-relaxed text-ink-faint">
            Sem login. Suas conversas ficam só neste navegador.
          </p>
        </form>
      </div>
    </section>
  );
}
