import type { FC, HTMLAttributes, ReactNode } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  children: ReactNode;
}

const Card: FC<Props> = ({ glow = false, children, className = "", ...rest }) => (
  <div
    className={`glass-card p-6 transition-all duration-200
      ${glow ? "shadow-neon animate-glow-pulse" : "hover:border-chess-primary/30"}
      ${className}`}
    {...rest}
  >
    {children}
  </div>
);

export default Card;
