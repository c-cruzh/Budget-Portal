import { HelpCircle } from "lucide-react";
import { DocumentationButton } from "@/components/DocumentationDialog";

export function BudgetHelpGuide() {
  return (
    <DocumentationButton
      triggerLabel="Ayuda"
      triggerIcon={HelpCircle}
      initialCategoryId="budget"
    />
  );
}
