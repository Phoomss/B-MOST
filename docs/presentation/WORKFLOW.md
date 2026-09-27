# B-MOST Codex + Antigravity Collaboration Workflow

## Goal

Create the final B-MOST presentation using two agents:

- Codex = Technical Auditor / Reviewer
- Antigravity = Presentation Designer / Builder

Neither agent should duplicate the other's primary responsibility.

---

# PHASE 1 — CODEX TECHNICAL AUDIT

Codex must inspect the CURRENT repository.

Review:

- README.md
- docs/
- apps/web/
- apps/api/
- Prisma schema
- packages/contracts/
- SupplyChainRegistry.sol
- ABI
- RBAC
- routes/pages
- blockchain integration
- Docker/configuration
- existing UI/assets

The current implementation is the source of truth.

Then update:

- PRESENTATION_CONTEXT.md
- ARCHITECTURE.md
- DEMO_FLOW.md
- QNA.md

Do not modify application functionality during this phase.

Do not invent missing features.

Do not expose secrets.

After completing the audit, create/update:

CODEX_REVIEW.md

with:

## Audit Status
READY_FOR_AGY

## Verified
- ...

## Corrected
- ...

## Unsupported / Do Not Present
- ...

## Demo Risks
- ...

---

# PHASE 2 — ANTIGRAVITY PRESENTATION

Before starting, read:

1. WORKFLOW.md
2. PRESENTATION_CONTEXT.md
3. ARCHITECTURE.md
4. DEMO_FLOW.md
5. QNA.md
6. CODEX_REVIEW.md

Only continue when:

Audit Status = READY_FOR_AGY

Use these documents as the presentation source of truth.

Use the repository primarily for:

- real screenshots
- logo
- assets
- branding
- current UI

Do not independently reinterpret technical architecture when it
conflicts with Codex-verified documentation.

Create ONLY 4 main slides.

Slide 1:
B-MOST / Problem / Solution / Supply Chain

Slide 2:
Complete System Workflow

Slide 3:
System Architecture

Slide 4:
Blockchain Traceability + Demo Transition

Also prepare:

- Thai speaker notes
- combined 3-minute script
- 5-minute demo checklist
- Q&A backup notes

After completing the presentation, create/update:

AGY_HANDOFF.md

Include:

## Status
READY_FOR_CODEX_REVIEW

## Slides Created
...

## Technical Claims Used
...

## Diagrams Used
...

## Screenshots Used
...

## Assumptions
...

---

# PHASE 3 — CODEX PRESENTATION REVIEW

Read:

- presentation output
- AGY_HANDOFF.md
- all docs/presentation/*.md
- current source code

Check:

- technical claims
- architecture
- Product lifecycle
- Shipment lifecycle
- roles
- permissions
- MetaMask flow
- Sepolia configuration
- smart-contract behavior
- PostgreSQL vs Blockchain responsibilities
- DB ID vs Blockchain ID
- demo feasibility
- screenshots

Do NOT redesign the presentation.

Write results to CODEX_REVIEW.md.

If correct:

## Review Status
APPROVED

If changes are required:

## Review Status
CHANGES_REQUIRED

### Required Changes
1. ...
2. ...

Every requested change must explain:
- slide
- incorrect claim
- source evidence
- exact correction

---

# PHASE 4 — ANTIGRAVITY FINAL REVISION

Read CODEX_REVIEW.md.

If:

Review Status = CHANGES_REQUIRED

fix only the requested issues.

Preserve the visual design unless a technical correction requires
a layout change.

Update AGY_HANDOFF.md after corrections.

If:

Review Status = APPROVED

do not make additional technical changes.

---

# Ownership Rules

## Codex owns

- technical facts
- source-code verification
- architecture accuracy
- smart-contract behavior
- RBAC verification
- lifecycle verification
- demo feasibility
- final technical approval

## Antigravity owns

- slide composition
- storytelling
- visual hierarchy
- diagrams
- screenshot placement
- typography
- speaker-note presentation
- visual consistency

---

# Conflict Rule

If Antigravity finds a possible technical conflict:

DO NOT guess.

Record it in:

AGY_HANDOFF.md

under:

## Needs Technical Review

Codex must resolve it.

If Codex requests a visual change:

Codex describes WHAT is technically wrong.

Antigravity decides HOW to visually correct it.

---

# Final Condition

The presentation is final only when:

CODEX_REVIEW.md

contains:

Review Status = APPROVED