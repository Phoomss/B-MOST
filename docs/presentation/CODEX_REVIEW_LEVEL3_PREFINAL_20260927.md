# B-MOST Presentation — Level 3 Technical Review

## Review Status

CHANGES_REQUIRED

Reviewed on 2026-09-27 against current repository HEAD `020588dd2b1484910ef24899fe9147a81a1fad83` and the available presentation output, [PRESENTATION.md](PRESENTATION.md) (SHA-256 `40ACE969B9D4B4F598457F36257F68043CDF4D14EF499D155470CD30C07C5BC3`). The [AGY handoff](AGY_HANDOFF.md) identifies this Markdown file as the delivered artifact. No `PRESENTATION_FINAL.md`, rendered deck, or application screenshots were supplied. The Level 3 workflow explicitly requires review of the exact `PRESENTATION_FINAL.md` content, so this verdict cannot be `APPROVED` even though the available draft is substantially corrected.

## Required Changes

1. **Slides 1–4 and all associated notes, demo, and Q&A — missing final review artifact.**

   **Current content/claim:** [AGY_HANDOFF.md](AGY_HANDOFF.md) reports `READY_FOR_CODEX_REVIEW` and points to [PRESENTATION.md](PRESENTATION.md) as the delivered presentation. There is no `docs/presentation/PRESENTATION_FINAL.md` in the workspace.

   **Reason/source:** [BMOST_PRESENTATION_AGENT_WORKFLOW.md](BMOST_PRESENTATION_AGENT_WORKFLOW.md), “LEVEL 3 — CODEX FINAL TECHNICAL REVIEW,” requires Codex to review `PRESENTATION_FINAL.md` and says to review the exact content that will become the presentation. [WORKFLOW.md](WORKFLOW.md), Phase 3, also requires review of the presentation output. Approval of a different file would not establish that the final content was reviewed.

   **Exact correction:** Create `docs/presentation/PRESENTATION_FINAL.md` containing the exact four slide texts, diagrams, Thai speaker notes, combined three-minute script, five-minute demo checklist, and Q&A intended for the final package. Carry forward the corrected content in `PRESENTATION.md`, apply item 2 below, and update `AGY_HANDOFF.md` to point to that exact file. Submit it for another Level 3 review. Do not label it technically approved before that review.

2. **Slide 4 live-demo transition / five-minute demo, 2:40–3:15 — owner wallet display.**

   **Current content/claim:** The [demo script](PRESENTATION.md) says on `/products/[id]` that the current owner has changed to the Distributor **wallet**, and its expected verification says “Current Owner ตรงกับ Wallet Distributor.”

   **Reason/source:** [product detail page](../../apps/web/app/products/%5Bid%5D/page.tsx) renders `product.currentOwner?.name || product.currentOwnerId` in the current-owner field; it does not render `currentOwner.walletAddress` there. The API confirm does update SQL `currentOwner` to the receiver organization after a successful `receiveProduct` receipt in [blockchain-action.service.ts](../../apps/api/src/blockchain/blockchain-action.service.ts). The wallet address can be checked separately in [traceability/page.tsx](../../apps/web/app/traceability/page.tsx), which renders `data.currentOwner.walletAddress`, or in contract/receipt data.

   **Exact correction:** In the 2:40–3:15 narration and expected verification, say that `/products/[id]` shows the Distributor **organization** as current owner after API confirm. If the demo needs to show the wallet address, direct the presenter to the traceability ownership card or contract evidence and verify that address there. Do not claim the product detail page displays a wallet-address match.

## Findings from the available draft

The nine technical corrections in [the prior Phase 3 review](CODEX_REVIEW_PHASE3_20260927.md) have been incorporated into the available `PRESENTATION.md` and its handoff: selected-field hash limits, public status-label defect, Sepolia migration scope, chain/SQL sync boundary, lifecycle labels, draft/registration permissions, explorer handling, SQL storage inventory, and honest asset inventory. No further correction is required for those items in this draft.

The four-slide structure and Thai script match the requested scope. The architecture diagram correctly separates browser signing, API receipt confirmation, PostgreSQL, and Sepolia; its event indexer is labeled partial. The contract lifecycle and receipt ownership behavior, SQL UUID versus contract `uint256` IDs, pinned Sepolia chain/address, public API-backed lookup, and prepared Manufacturer-to-Distributor demo are supported by current source. The handoff accurately says no screenshots or rendered slide deck were supplied.

This was a source and document review, not a live MetaMask/Sepolia rehearsal. Wallet balances, deployed bytecode and roles, transaction timing, browser screenshots, and rendered diagram layout were not verified. The earlier local contract/API/web test results remain in [the Level 1 audit](CODEX_REVIEW_LEVEL1_20260927.md); tests were not rerun for this documentation review.

## Review boundary

Only this review record and its archived Level 1 predecessor were changed. No presentation, application, or contract content was edited in Level 3. Re-review `PRESENTATION_FINAL.md` after the two required changes before setting `Review Status: APPROVED`.
