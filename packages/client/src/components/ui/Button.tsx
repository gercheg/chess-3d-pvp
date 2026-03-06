import type { ButtonHTMLAttributes, FC, ReactNode } from "react";

type Variant = "primary" | "cta" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-chess-primary hover:bg-chess-primary/80 text-white shadow-neon hover:shadow-neon-strong",
  cta: "bg-chess-cta hover:bg-chess-cta/80 text-white shadow-neon-cta",
  ghost:
    "bg-transparent border border-chess-border hover:border-chess-primary/50 text-chess-text hover:text-white",
  danger:
    "bg-red-600/20 border border-red-500/30 hover:bg-red-600/40 text-red-400",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm rounded-lg gap-1.5",
  md: "px-5 py-2.5 text-sm rounded-xl gap-2",
  lg: "px-7 py-3 text-base rounded-xl gap-2.5",
};

const Button: FC<Props> = ({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  disabled,
  className = "",
  ...rest
}) => (
  <button
    disabled={disabled || loading}
    className={`inline-flex items-center justify-center font-body font-semibold cursor-pointer
      transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed
      ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    {...rest}
  >
    {loading ? (
      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
    ) : icon ? (
      <span className="shrink-0">{icon}</span>
    ) : null}
    {children}
  </button>
);

export default Button;
