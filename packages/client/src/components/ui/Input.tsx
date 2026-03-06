import { forwardRef, type InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, error, id, className = "", ...rest }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-chess-muted">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full px-4 py-2.5 rounded-xl bg-chess-surface border transition-all duration-200
            text-chess-text placeholder:text-chess-muted/50 font-body
            focus:outline-none focus:ring-2 focus:ring-chess-primary/50 focus:border-chess-primary
            ${error ? "border-red-500/50" : "border-chess-border hover:border-chess-primary/30"}
            ${className}`}
          {...rest}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
