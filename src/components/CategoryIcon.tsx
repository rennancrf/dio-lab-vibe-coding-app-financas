import { Bus, CircleDashed, Gamepad2, ShoppingBag, Utensils } from "lucide-react";
import type { CategoryId } from "../types";
import { getCategory } from "../lib/categories";

const ICONS = {
  alimentacao: Utensils,
  transporte: Bus,
  compras: ShoppingBag,
  lazer: Gamepad2,
  outros: CircleDashed,
} as const;

type CategoryIconProps = {
  category: CategoryId;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZES = {
  sm: { box: 30, icon: 15 },
  md: { box: 38, icon: 18 },
  lg: { box: 48, icon: 22 },
};

export function CategoryIcon({ category, size = "md", className = "" }: CategoryIconProps) {
  const info = getCategory(category);
  const Icon = ICONS[category];
  const dimensions = SIZES[size];

  return (
    <span
      className={`grid shrink-0 place-items-center rounded-[14px] ${className}`}
      style={{
        width: dimensions.box,
        height: dimensions.box,
        backgroundColor: info.soft,
        color: info.color,
      }}
      aria-hidden="true"
    >
      <Icon size={dimensions.icon} strokeWidth={1.9} />
    </span>
  );
}
