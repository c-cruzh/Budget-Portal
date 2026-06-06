---
name: Cotización-required exemptions
description: When a budget item is exempt from the cotización required-field check (and the "incompleto" data-quality flag).
---

Budget items normally require a `cotizacion` value to pass validation; missing
required fields produce the `incomplete` data-quality issue and block dialog save.

**Rule:** items whose `statusCotizacion` is a "No Aplica" status — i.e. in
`STATUS_COTIZACION_NO_APLICA` (In-Kind / Voluntario) — are exempt from the
cotización requirement. They must not be flagged "incompletos" for a missing
cotización.

**Why:** these lines are donated/in-kind or volunteer-provided, so there is no
purchase to quote. Requiring a cotización forced users to enter dummy values.

**How to apply:** the exemption lives in `budgetCalc.ts` (`requiredFieldErrors`
and `missingRequiredLabels`) keyed off the exported `STATUS_COTIZACION_NO_APLICA`
set. Status matching is exact-string after trim, so any new "No Aplica" status
label must be added to that set to inherit the exemption. The badge-display sets
(`STATUS_NO_COTIZACION` in BudgetPage) are broader and separate — keep them
distinct (Pending/Pendiente still expect a future cotización).
