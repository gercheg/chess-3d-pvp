import type { FC } from "react";

type Variant = "default" | "success" | "warning" | "danger" | "info";

interface Props {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<Variant, string> = {
  default: "bg-chess-border text-chess-muted",
  success: "bg-green-500/20 text-green-400",
  warning: "bg-yellow-500/20 text-yellow-400",
  danger: "bg-red-500/20 text-red-400",
  info: "bg-chess-primary/20 text-chess-secondary",
};

const Badge: FC<Props> = ({ variant = "default", children, className = "" }) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold
      ${variantClasses[variant]} ${className}`}
  >
    {children}
  </span>
);

export default Badge;
