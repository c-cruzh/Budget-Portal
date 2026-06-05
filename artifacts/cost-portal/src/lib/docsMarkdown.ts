import type { HelpCategory } from "@/data/helpDocs";

export function buildDocsMarkdown(categories: HelpCategory[], opts?: { generatedAt?: Date }): string {
  const date = opts?.generatedAt ?? new Date();
  const lines: string[] = [];

  lines.push("# EmTech Digital El Salvador 2026 — Documentación del Portal de Costos");
  lines.push("");
  lines.push(`> Generado desde la Ayuda del portal el ${date.toLocaleString("es-ES")}.`);
  lines.push("");
  lines.push(
    "Este documento describe, función por función, cómo se usa el portal de organizadores para gestionar los costos y la logística del evento. Está pensado para alimentar a un asistente de IA: pega el texto completo y pregúntale cómo realizar cualquier tarea, cómo interpretar los números o cómo hacer bien un proceso.",
  );
  lines.push("");

  lines.push("## Índice");
  for (const cat of categories) {
    lines.push(`- ${cat.title}`);
    for (const sec of cat.sections) {
      lines.push(`  - ${sec.title}`);
    }
  }
  lines.push("");

  for (const cat of categories) {
    lines.push(`## ${cat.title}`);
    lines.push("");
    for (const sec of cat.sections) {
      lines.push(`### ${sec.title}`);
      lines.push("");
      if (sec.intro) {
        lines.push(sec.intro);
        lines.push("");
      }
      for (const e of sec.entries) {
        lines.push(`- **${e.term}** — ${e.desc}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}
