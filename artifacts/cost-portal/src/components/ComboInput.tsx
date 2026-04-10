import { useState, useRef, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ChevronDown, Plus } from "lucide-react";

interface ComboInputProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}

export function ComboInput({ value, onChange, options, placeholder, className }: ComboInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = options.filter(o =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  const isNew = search.trim() && !options.some(o => o.toLowerCase() === search.trim().toLowerCase());

  useEffect(() => {
    if (open) {
      setSearch(value || "");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
            "hover:bg-accent/50 focus:outline-none focus:ring-1 focus:ring-ring",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{value || placeholder || "Select..."}</span>
          <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="p-2 border-b border-border">
          <Input
            ref={inputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar o escribir nuevo..."
            className="h-8 text-xs"
            onKeyDown={e => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (search.trim()) {
                  onChange(search.trim().toUpperCase());
                  setOpen(false);
                }
              }
            }}
          />
        </div>
        <div className="max-h-[200px] overflow-y-auto p-1">
          {filtered.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              className={cn(
                "flex w-full items-center rounded px-2 py-1.5 text-xs cursor-pointer hover:bg-accent",
                value === opt && "bg-accent font-medium"
              )}
            >
              {opt}
            </button>
          ))}
          {isNew && (
            <button
              type="button"
              onClick={() => { onChange(search.trim().toUpperCase()); setOpen(false); }}
              className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-xs cursor-pointer hover:bg-accent text-primary font-medium"
            >
              <Plus className="w-3 h-3" />
              Crear: "{search.trim().toUpperCase()}"
            </button>
          )}
          {filtered.length === 0 && !isNew && (
            <p className="text-xs text-muted-foreground text-center py-2">Sin resultados</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
