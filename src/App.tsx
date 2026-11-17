import { useState } from "react";
import { ChartNoAxesColumn, MessageCircle, Target } from "lucide-react";
import { useFinance } from "./store/useFinance";
import { ChatPage } from "./pages/ChatPage";
import { OverviewPage } from "./pages/OverviewPage";
import { GoalsPage } from "./pages/GoalsPage";

type Page = "chat" | "overview" | "goals";

const NAV: Array<{ id: Page; label: string; icon: typeof MessageCircle }> = [
  { id: "chat", label: "Conversa", icon: MessageCircle },
  { id: "overview", label: "Resumo", icon: ChartNoAxesColumn },
  { id: "goals", label: "Metas", icon: Target },
];

export default function App() {
  const [page, setPage] = useState<Page>("chat");
  const { suggestions } = useFinance();

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#efe6d8] md:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-[-10%] hidden h-[420px] w-[420px] rounded-full bg-[#ead8b9] opacity-70 blur-[90px] md:block"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 bottom-[-15%] hidden h-[380px] w-[380px] rounded-full bg-[#dbe4cd] opacity-70 blur-[90px] md:block"
      />

      <div className="relative flex h-dvh w-full max-w-[440px] flex-col overflow-hidden bg-cream md:h-[min(900px,calc(100dvh-3rem))] md:rounded-[38px] md:shadow-[0_40px_90px_-30px_rgba(90,70,40,0.45)] md:ring-1 md:ring-white/70">
        <main className="min-h-0 flex-1 overflow-hidden">
          <div key={page} className="h-full animate-fade">
            {page === "chat" ? <ChatPage /> : null}
            {page === "overview" ? <OverviewPage onGoToChat={() => setPage("chat")} /> : null}
            {page === "goals" ? (
              <GoalsPage
                onGoToChat={() => setPage("chat")}
                onGoToOverview={() => setPage("overview")}
              />
            ) : null}
          </div>
        </main>

        <nav
          aria-label="Navegação principal"
          className="safe-bottom shrink-0 border-t border-line/80 bg-surface/95 px-3 pt-2 backdrop-blur"
        >
          <ul className="mx-auto flex items-stretch gap-1">
            {NAV.map((item) => {
              const active = page === item.id;
              const Icon = item.icon;
              return (
                <li key={item.id} className="flex-1">
                  <button
                    type="button"
                    onClick={() => setPage(item.id)}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex h-[54px] w-full flex-col items-center justify-center gap-1 rounded-2xl transition ${
                      active
                        ? "bg-amber-soft/85 text-amber-deep"
                        : "text-ink-faint hover:bg-surface-2/70 hover:text-ink-soft"
                    }`}
                  >
                    <span className="relative">
                      <Icon size={19} strokeWidth={active ? 2.1 : 1.8} />
                      {item.id === "goals" && suggestions.length > 0 ? (
                        <span
                          className="absolute -right-1.5 -top-1 h-1.5 w-1.5 rounded-full bg-amber ring-2 ring-surface"
                          aria-hidden="true"
                        />
                      ) : null}
                    </span>
                    <span className="text-[10.5px] font-medium leading-none">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
