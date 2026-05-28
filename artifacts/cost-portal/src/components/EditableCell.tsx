import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface EditableCellProps {
  value: string;
  onSave: (value: string) => void;
  className?: string;
  type?: "text" | "number";
  prefix?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function EditableCell({ value, onSave, className, type = "text", prefix, placeholder, disabled }: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    if (draft !== value) onSave(draft);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (disabled) {
    return (
      <span className={cn("px-0.5", className)}>
        {prefix && value && <span className="text-muted-foreground text-xs">{prefix}</span>}
        {value || <span className="text-muted-foreground/40 italic text-xs">{placeholder || "—"}</span>}
      </span>
    );
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        {prefix && <span className="text-muted-foreground text-xs">{prefix}</span>}
        <input
          ref={inputRef}
          type={type}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
          className={cn(
            "bg-primary/5 border border-primary/30 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary/50",
            "min-w-[60px] max-w-[200px]",
            className
          )}
          placeholder={placeholder}
          step={type === "number" ? "0.01" : undefined}
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={cn(
        "group inline-flex items-center text-left cursor-text transition-colors rounded-sm px-0.5 -mx-0.5",
        "border-b border-dashed border-border/40 hover:border-primary/60 hover:text-primary",
        "focus:outline-none focus-visible:ring-1 focus-visible:ring-primary",
        className
      )}
      title="Click para editar"
    >
      {prefix && value && <span className="text-muted-foreground text-xs">{prefix}</span>}
      <span>{value || <span className="text-muted-foreground/40 italic text-xs">{placeholder || "—"}</span>}</span>
    </button>
  );
}
