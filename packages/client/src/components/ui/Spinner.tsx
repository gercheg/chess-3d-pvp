import type { FC } from "react";

interface Props {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = { sm: "h-4 w-4", md: "h-8 w-8", lg: "h-12 w-12" };

const Spinner: FC<Props> = ({ size = "md", className = "" }) => (
  <div className={`flex items-center justify-center ${className}`} role="status">
    <svg className={`animate-spin ${sizes[size]} text-chess-primary`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
    <span className="sr-only">Loading...</span>
  </div>
);

export default Spinner;
