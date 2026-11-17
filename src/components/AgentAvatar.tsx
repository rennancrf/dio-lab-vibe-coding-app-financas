import { Sun } from "lucide-react";

export function AgentAvatar({ size = 42 }: { size?: number }) {
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <span
        className="grid h-full w-full place-items-center rounded-full bg-gradient-to-br from-[#e7b06c] via-[#d99a4e] to-[#c1813a] text-[#fffaf1] shadow-[inset_0_-2px_6px_rgba(120,75,20,0.18)] ring-2 ring-white/80"
        aria-hidden="true"
      >
        <Sun size={size * 0.5} strokeWidth={1.7} />
      </span>
      <span
        className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-cream bg-green"
        aria-hidden="true"
      />
    </span>
  );
}
