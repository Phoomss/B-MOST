# B-MOST Presentation — Codex + Antigravity + Canva Workflow

## Goal

Create a technically accurate, highly visual B-MOST presentation using a controlled multi-agent workflow.

Final outputs:

1. Editable Canva presentation
2. PDF presentation
3. 4 main slides
4. Thai speaker notes for ~3 minutes
5. 5-minute live demo flow
6. Q&A preparation

The presentation must be based on the CURRENT B-MOST implementation, not assumptions.

---

# Agent Responsibilities

## Codex — Technical Owner

Codex owns:

- repository audit
- technical facts
- architecture accuracy
- Prisma/database verification
- smart-contract behavior
- blockchain integration
- role/RBAC verification
- product/shipment lifecycle
- demo feasibility
- final technical approval

Codex must NOT redesign slides or make aesthetic decisions.

## Antigravity (AGY) — Presentation Owner

Antigravity owns:

- storytelling
- information hierarchy
- slide layout
- diagrams
- screenshot selection and placement
- visual consistency
- presentation wording
- speaker notes
- demo transition
- Canva-ready presentation specification

AGY must NOT override technical facts verified by Codex.

## Canva — Final Editable Output

Canva is the final presentation surface.

Canva receives only the final approved presentation specification after Codex review.

The Canva version should keep text, diagrams, shapes, and major visual elements editable whenever possible and should be exportable as PDF.

---

# Source-of-Truth Files

Use this structure:

```text
docs/presentation/
├── WORKFLOW.md
├── PRESENTATION_CONTEXT.md
├── ARCHITECTURE.md
├── DEMO_FLOW.md
├── QNA.md
├── PRESENTATION_FINAL.md
├── CODEX_REVIEW.md
└── AGY_HANDOFF.md
```

The current repository implementation remains the highest technical source of truth.

---

# Execution Levels

## LEVEL 0 — Preparation

Owner: Human / Project

Required before agents start:

- current code is checked out
- repository builds or known issues are documented
- current contract/config is present
- `docs/presentation/` exists
- presentation workflow files are committed or available

No slide generation yet.

---

# LEVEL 1 — CODEX TECHNICAL AUDIT

Owner: Codex

Recommended model: strongest repository reasoning model available.
Recommended reasoning: High for full repository audit.

## Objective

Turn the current repository into verified presentation facts.

## Codex must inspect

- root README/docs
- `apps/web/`
- `apps/api/`
- Prisma schema/migrations where relevant
- `SupplyChainRegistry.sol`
- current ABI
- blockchain service/integration
- role/RBAC implementation
- routes/pages
- product workflow
- shipment workflow
- QR/public verification
- Docker/runtime configuration
- environment variable names (never expose secret values)
- existing UI/assets/logo/screens that may be used in slides

## Codex outputs

Update:

- `PRESENTATION_CONTEXT.md`
- `ARCHITECTURE.md`
- `DEMO_FLOW.md`
- `QNA.md`

Create/update:

- `CODEX_REVIEW.md`

Use this status:

```text
Audit Status: READY_FOR_AGY
```

Also record:

```md
## Verified
...

## Corrected
...

## Unsupported / Do Not Present
...

## Demo Risks
...

## Useful Real Screens
...
```

## Prompt — Codex Level 1

```text
Read docs/presentation/WORKFLOW.md and execute LEVEL 1 / PHASE 1 only.

Perform a technical audit of the CURRENT B-MOST repository.

Treat the current source code as the technical source of truth, especially:
- apps/web
- apps/api
- Prisma schema
- SupplyChainRegistry.sol
- current ABI
- blockchain integration
- RBAC/permissions
- runtime and Docker configuration

Update:
- docs/presentation/PRESENTATION_CONTEXT.md
- docs/presentation/ARCHITECTURE.md
- docs/presentation/DEMO_FLOW.md
- docs/presentation/QNA.md

Then create/update docs/presentation/CODEX_REVIEW.md.

Set:
Audit Status: READY_FOR_AGY

only after the presentation facts have been verified.

In CODEX_REVIEW.md include:
- Verified
- Corrected
- Unsupported / Do Not Present
- Demo Risks
- Useful Real Screens

Important rules:
- Do not modify application functionality.
- Do not create slides.
- Do not redesign UI.
- Do not invent features.
- Do not expose secret values.
- Distinguish PostgreSQL IDs from blockchain IDs.
- Verify every smart-contract state transition from Solidity.
- Verify application RBAC separately from smart-contract authorization.
- Verify the actual MetaMask transaction architecture.
- Verify the current network/contract configuration.

Finish with a concise audit summary.
```

---

# LEVEL 2 — ANTIGRAVITY PRESENTATION SPEC

Owner: Antigravity

Recommended reasoning: High enough for whole-presentation synthesis.

## Preconditions

AGY must read `CODEX_REVIEW.md` first.

Continue only if:

```text
Audit Status: READY_FOR_AGY
```

## Objective

Convert verified technical information into the final 4-slide story.

## AGY reads

- `WORKFLOW.md`
- `PRESENTATION_CONTEXT.md`
- `ARCHITECTURE.md`
- `DEMO_FLOW.md`
- `QNA.md`
- `CODEX_REVIEW.md`

AGY may inspect the repository for real UI, logo, screenshots, and assets, but must not replace Codex-verified technical facts with assumptions.

## Required presentation

### Slide 1 — B-MOST

Problem + solution + participants.

### Slide 2 — Complete System Workflow

One Product across:

```text
Manufacturer → Distributor → Warehouse → Retailer → Customer
```

Show product lifecycle without implying unsupported transitions.

### Slide 3 — System Architecture

Show the verified application/database/blockchain architecture.

### Slide 4 — Blockchain Value + Demo Transition

Show traceability, verification, QR/customer journey, and transition directly into live demo.

## AGY outputs

Create/update:

- `PRESENTATION_FINAL.md`
- `AGY_HANDOFF.md`

`PRESENTATION_FINAL.md` must contain for every slide:

```md
# Slide N — Title

## Purpose

## Timing

## Exact Text

## Main Message

## Visual Hierarchy

## Diagram Specification

## Screenshot Specification

## Speaker Notes

## Technical Claims Used
```

AGY handoff status:

```text
Status: READY_FOR_CODEX_REVIEW
```

## Prompt — AGY Level 2

```text
Read docs/presentation/WORKFLOW.md first.

Then read:
- docs/presentation/PRESENTATION_CONTEXT.md
- docs/presentation/ARCHITECTURE.md
- docs/presentation/DEMO_FLOW.md
- docs/presentation/QNA.md
- docs/presentation/CODEX_REVIEW.md

Execute LEVEL 2 / PHASE 2 only.

Do not continue unless CODEX_REVIEW.md contains:
Audit Status: READY_FOR_AGY

Use the Codex-verified documentation as the technical source of truth.

Create the final presentation specification in:
docs/presentation/PRESENTATION_FINAL.md

Create exactly 4 main slides:
1. B-MOST — Problem / Solution / Supply Chain
2. Complete System Workflow
3. System Architecture
4. Traceable / Transparent / Verifiable + Demo Transition

For every slide provide:
- Purpose
- Timing
- Exact Text
- Main Message
- Visual Hierarchy
- Diagram Specification
- Screenshot Specification
- Speaker Notes
- Technical Claims Used

Presentation constraints:
- 16:9
- modern enterprise design
- white/light theme
- B-MOST branding
- Thai-first content with concise English technical labels
- diagrams > screenshots > short labels > paragraphs
- avoid generic blockchain theory
- avoid Bitcoin/crypto visual clichés
- use real repository UI/assets/screenshots where useful
- never invent a screen or feature
- keep content suitable for ~3 minutes total
- prepare a clean transition to the 5-minute live demo
- design all elements so the final deck can be recreated as editable Canva elements

Do NOT create PDF yet.
Do NOT flatten slides into images.
Do NOT modify application functionality.
Do NOT override technical facts verified by Codex.

Create/update docs/presentation/AGY_HANDOFF.md with:
Status: READY_FOR_CODEX_REVIEW

Include:
- Slides Created
- Technical Claims Used
- Diagrams Used
- Screenshots/Assets Used
- Assumptions
- Needs Technical Review

Finish with a short handoff summary for Codex.
```

---

# LEVEL 3 — CODEX FINAL TECHNICAL REVIEW

Owner: Codex

Recommended reasoning: High.

## Objective

Review the exact content that will become the presentation.

Codex must review `PRESENTATION_FINAL.md`, not merely the earlier context documents.

## Verify

- technical claims
- architecture diagram
- product lifecycle
- shipment lifecycle
- roles
- permissions
- ownership rules
- MetaMask flow
- Sepolia configuration
- contract functions
- PostgreSQL vs blockchain responsibility
- database ID vs blockchain ID
- QR verification claims
- demo feasibility
- screenshot authenticity

Codex must not redesign the slides.

## Result

If correct:

```text
Review Status: APPROVED
```

If changes are required:

```text
Review Status: CHANGES_REQUIRED
```

Each correction must contain:

- slide number
- current incorrect/unsafe claim
- reason/source
- exact required correction

## Prompt — Codex Level 3

```text
Read docs/presentation/WORKFLOW.md and execute LEVEL 3 / PHASE 3 only.

Review:
- docs/presentation/PRESENTATION_FINAL.md
- docs/presentation/AGY_HANDOFF.md
- all verified presentation docs
- the CURRENT B-MOST source code

Perform a final technical review of every claim that will appear in the presentation.

Verify:
- architecture
- Product lifecycle
- Shipment lifecycle
- roles and RBAC
- smart-contract authorization
- ownership transitions
- MetaMask transaction flow
- Sepolia/contract configuration
- PostgreSQL vs blockchain responsibilities
- DB IDs vs blockchain IDs
- QR/public verification
- demo feasibility
- screenshot authenticity

Do not redesign the slides.
Do not change presentation style unless a visual implies an incorrect technical claim.

Update docs/presentation/CODEX_REVIEW.md.

If technically correct, set:
Review Status: APPROVED

If corrections are required, set:
Review Status: CHANGES_REQUIRED

For every required correction specify:
1. Slide number
2. Current claim/content
3. Why it is incorrect or unsupported
4. Source/code evidence
5. Exact replacement/correction

Do not approve unsupported claims.
```

---

# LEVEL 4 — ANTIGRAVITY REVISION

Owner: Antigravity

Run only when:

```text
Review Status: CHANGES_REQUIRED
```

## Objective

Correct only issues identified by Codex while preserving presentation quality.

## Prompt — AGY Level 4

```text
Read docs/presentation/WORKFLOW.md and docs/presentation/CODEX_REVIEW.md.

Execute LEVEL 4 / PHASE 4 only.

CODEX_REVIEW.md contains technical corrections for the presentation.

Apply every item under Required Changes to:
docs/presentation/PRESENTATION_FINAL.md

Preserve the existing visual/storytelling direction unless a technical correction requires a layout change.

Do not introduce new technical claims while fixing the requested items.

Update docs/presentation/AGY_HANDOFF.md with:
Status: READY_FOR_CODEX_REVIEW

Also list exactly what was changed.

Do not create PDF yet.
```

After Level 4, run **Level 3 again** until Codex returns `Review Status: APPROVED`.

---

# LEVEL 5 — FINAL PRESENTATION PACKAGE

Owner: Antigravity + Canva

Precondition:

```text
Review Status: APPROVED
```

## AGY Final Handoff

Set in `PRESENTATION_FINAL.md`:

```text
Status: FINAL
Technical Review: APPROVED
```

Ensure the file contains the exact final slide text and visual instructions.

## Prompt — AGY Level 5

```text
Read docs/presentation/WORKFLOW.md and docs/presentation/CODEX_REVIEW.md.

Proceed only if:
Review Status: APPROVED

Execute LEVEL 5 final handoff.

Finalize docs/presentation/PRESENTATION_FINAL.md without introducing any new technical claims.

Set:
Status: FINAL
Technical Review: APPROVED

Ensure the file contains the exact final content for all 4 slides, including:
- exact visible text
- diagram structure
- screenshot references
- visual hierarchy
- speaker notes
- slide timing
- demo transition

The next step is Canva production, so describe visuals as editable text/shapes/lines/cards/icons rather than flattened slide images wherever possible.

Do not modify source code.
Do not create new technical content.
```

---

# LEVEL 6 — CANVA PRODUCTION + PDF

Owner: Canva / ChatGPT Canva workflow

Input:

```text
docs/presentation/PRESENTATION_FINAL.md
```

Only use the version containing:

```text
Status: FINAL
Technical Review: APPROVED
```

## Canva Requirements

- Presentation 16:9
- exactly 4 main slides unless explicitly changed later
- editable text
- editable diagrams/shapes where possible
- real B-MOST screenshots/assets where specified
- modern enterprise white/light theme
- no fake UI
- no unsupported technical claims
- no crypto/Bitcoin visual clichés
- retain Thai text correctly
- exportable as PDF

## Prompt — Canva Production

```text
Create an editable 16:9 Canva presentation using the APPROVED content from PRESENTATION_FINAL.md exactly as the presentation source of truth.

Create exactly 4 main slides.

Keep text, labels, cards, arrows, architecture blocks, lifecycle steps, and other diagram elements editable in Canva wherever possible.

Use real B-MOST screenshots/assets only where PRESENTATION_FINAL.md specifies them.

Visual direction:
- modern enterprise software
- white/light theme
- clean spacing
- strong visual hierarchy
- B-MOST branding
- Thai-first content
- concise English technical labels
- diagrams over paragraphs
- no cryptocurrency clichés
- no invented UI

Do not add technical claims that are absent from the approved specification.

The final Canva design must be suitable for export as a presentation PDF.
```

---

# Quick Commands

## Start Codex

```text
Read docs/presentation/WORKFLOW.md and execute LEVEL 1 only.
```

## Send to AGY

```text
Read docs/presentation/WORKFLOW.md and execute LEVEL 2 only.
```

## Return to Codex

```text
Read docs/presentation/WORKFLOW.md and execute LEVEL 3 only.
```

## AGY Corrections

```text
Read docs/presentation/WORKFLOW.md and execute LEVEL 4 only.
```

## AGY Finalization

```text
Read docs/presentation/WORKFLOW.md and execute LEVEL 5 only.
```

---

# Approval Gate

Never send the presentation to Canva as final until:

```text
CODEX_REVIEW.md
Review Status: APPROVED
```

and:

```text
PRESENTATION_FINAL.md
Status: FINAL
Technical Review: APPROVED
```

This prevents the visual design stage from silently changing or inventing technical facts.
