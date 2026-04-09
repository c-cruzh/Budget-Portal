import { useState, useRef, useEffect } from "react";
import { ExternalLink, Edit3, Link2, FileText, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface LinkCellProps {
  value: string;
  documento?: string;
  itemId: string;
  onSave: (field: string, value: string) => void;
}

export function LinkCell({ value, documento, itemId, onSave }: LinkCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [docDraft, setDocDraft] = useState(documento || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { setDocDraft(documento || ""); }, [documento]);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const commit = () => {
    onSave("cotizacion", draft);
    onSave("documento", docDraft);
    setEditing(false);
  };

  const isUrl = (v: string) => v.startsWith("http://") || v.startsWith("https://");

  if (editing) {
    return (
      <div className="flex flex-col gap-1.5 py-1 min-w-[200px]">
        <div>
          <label className="text-xs text-muted-foreground mb-0.5 block">Quote / URL</label>
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setDocDraft(documento || ""); setEditing(false); } }}
            className="w-full text-xs bg-primary/5 border border-primary/30 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary/50"
            placeholder="URL or quote reference"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-0.5 block">Document</label>
          <input
            value={docDraft}
            onChange={e => setDocDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setDocDraft(documento || ""); setEditing(false); } }}
            className="w-full text-xs bg-primary/5 border border-primary/30 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary/50"
            placeholder="Document reference"
          />
        </div>
        <button
          onClick={commit}
          className="self-start text-xs bg-primary text-primary-foreground rounded px-2 py-0.5 flex items-center gap-1 mt-0.5 hover:opacity-90 transition-opacity"
        >
          <Check className="w-3 h-3" />
          Save
        </button>
      </div>
    );
  }

  const hasContent = value || documento;
  if (!hasContent || value === "NA" || value === "VOLUNTARIO" || value === "" || value === "PROVEE ESEN") {
    return (
      <button
        onClick={() => setEditing(true)}
        className="group flex items-center gap-1 text-muted-foreground/40 hover:text-primary transition-colors"
        title="Add link or document"
      >
        <Link2 className="w-3.5 h-3.5" />
        <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">Add link</span>
      </button>
    );
  }

  return (
    <div className="flex items-start gap-1 group">
      <div className="flex-1 min-w-0 space-y-0.5">
        {value && value !== "PENDING" && value !== "NA" && value !== "VOLUNTARIO" && value !== "PROVEE ESEN" && (
          isUrl(value) ? (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors"
              onClick={e => e.stopPropagation()}
            >
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
              <span className="truncate max-w-[120px]">Open link</span>
            </a>
          ) : (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <FileText className="w-3 h-3 flex-shrink-0" />
              <span className="truncate max-w-[120px]" title={value}>{value}</span>
            </div>
          )
        )}
        {documento && (
          isUrl(documento) ? (
            <a
              href={documento}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors"
              onClick={e => e.stopPropagation()}
            >
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
              <span className="truncate max-w-[120px]">Doc</span>
            </a>
          ) : (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <FileText className="w-3 h-3 flex-shrink-0" />
              <span className="truncate max-w-[120px]" title={documento}>{documento}</span>
            </div>
          )
        )}
      </div>
      <button
        onClick={() => setEditing(true)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary flex-shrink-0"
        title="Edit links"
      >
        <Edit3 className="w-3 h-3" />
      </button>
    </div>
  );
}
