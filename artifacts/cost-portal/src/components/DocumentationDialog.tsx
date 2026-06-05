import { useEffect, useRef, useState } from "react";
import { Sparkles, Download, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { HELP_DOCS } from "@/data/helpDocs";
import { buildDocsMarkdown } from "@/lib/docsMarkdown";

interface DocumentationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Category to scroll to when the dialog opens. */
  initialCategoryId?: string;
}

export function DocumentationDialog({ open, onOpenChange, initialCategoryId }: DocumentationDialogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});
  const [copied, setCopied] = useState(false);

  const scrollTo = (id: string) => {
    categoryRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (!open || !initialCategoryId) return;
    const t = setTimeout(() => {
      categoryRefs.current[initialCategoryId]?.scrollIntoView({ block: "start" });
    }, 60);
    return () => clearTimeout(t);
  }, [open, initialCategoryId]);

  const handleDownload = () => {
    const md = buildDocsMarkdown(HELP_DOCS);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "emtech-portal-documentacion.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    const md = buildDocsMarkdown(HELP_DOCS);
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select-less copy via temporary textarea
      const ta = document.createElement("textarea");
      ta.value = md;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        /* no-op */
      }
      document.body.removeChild(ta);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 gap-0 max-h-[88vh] flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-primary" />
            Documentación del portal
          </DialogTitle>
          <DialogDescription>
            Guía completa de todas las pestañas y funciones. Descárgala o cópiala para usarla con un asistente de IA.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          <nav className="hidden md:flex flex-col w-60 shrink-0 border-r border-border overflow-y-auto py-4 px-2 gap-0.5 bg-muted/20">
            <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Índice
            </p>
            {HELP_DOCS.map((cat) => {
              const Icon = cat.icon;
              return (
                <div key={cat.id} className="mb-1">
                  <button
                    onClick={() => scrollTo(cat.id)}
                    className="flex items-center gap-2 px-2 py-1.5 w-full rounded-md text-left text-[13px] font-medium text-foreground/80 hover:text-foreground hover:bg-muted/60 transition-colors"
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0 text-primary/70" />
                    <span className="truncate">{cat.title}</span>
                  </button>
                </div>
              );
            })}
          </nav>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-10">
            {HELP_DOCS.map((cat) => {
              const CatIcon = cat.icon;
              return (
                <div
                  key={cat.id}
                  ref={(el) => { categoryRefs.current[cat.id] = el; }}
                  className="scroll-mt-4"
                >
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border">
                    <CatIcon className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">{cat.title}</h2>
                  </div>
                  <div className="space-y-8">
                    {cat.sections.map((section) => {
                      const Icon = section.icon;
                      return (
                        <section key={section.id} className="scroll-mt-4">
                          <div className="flex items-center gap-2.5 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                              <Icon className="w-4 h-4" />
                            </div>
                            <h3 className="text-base font-semibold text-foreground">{section.title}</h3>
                          </div>
                          {section.intro && (
                            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{section.intro}</p>
                          )}
                          <dl className="space-y-2.5">
                            {section.entries.map((e, idx) => (
                              <div
                                key={idx}
                                className={cn("rounded-lg border border-card-border bg-card/50 px-3 py-2.5")}
                              >
                                <dt className="text-sm font-medium text-foreground">{e.term}</dt>
                                <dd className="text-[13px] text-muted-foreground mt-0.5 leading-relaxed">{e.desc}</dd>
                              </div>
                            ))}
                          </dl>
                          {section.extra && <div className="mt-3">{section.extra}</div>}
                        </section>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-3 border-t border-border bg-muted/30 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            Exporta esta guía en Markdown para conversar con una IA sobre cómo usar el portal.
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-2" onClick={handleCopy}>
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copiado" : "Copiar para IA"}
            </Button>
            <Button size="sm" variant="outline" className="gap-2" onClick={handleDownload}>
              <Download className="w-4 h-4" />
              Descargar .md
            </Button>
            <Button size="sm" onClick={() => onOpenChange(false)}>Entendido</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface DocumentationButtonProps {
  triggerLabel?: string;
  triggerIcon?: typeof Sparkles;
  variant?: "default" | "outline" | "ghost" | "secondary";
  className?: string;
  initialCategoryId?: string;
}

export function DocumentationButton({
  triggerLabel = "Documentación",
  triggerIcon: Icon = Sparkles,
  variant = "outline",
  className,
  initialCategoryId,
}: DocumentationButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant={variant}
        size="sm"
        onClick={() => setOpen(true)}
        className={cn("gap-2", className)}
        title="Documentación del portal"
      >
        <Icon className="w-4 h-4" />
        {triggerLabel}
      </Button>
      <DocumentationDialog open={open} onOpenChange={setOpen} initialCategoryId={initialCategoryId} />
    </>
  );
}
