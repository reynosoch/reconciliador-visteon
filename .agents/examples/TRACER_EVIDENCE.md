# Worked operating example: source explanation in the tracer

This is an **illustrative work plan**, not a completed change or an actual inventory analysis. It shows how the organization handles a realistic request against existing repository boundaries. It contains no invented PN, source coordinates, approvals, executed tests or CI result.

## Human outcome

“For a selected PN, make the Physical, QAD and cost origins clear. Let me open the relevant evidence in the existing Excel-style viewer. Explain missing sources honestly. Preserve the engine results, search, drawer behavior and performance.”

ORCH inspects current `main`, recent commits and the README context before deciding whether this behavior already exists, has a bug, or needs extension. It records the real base SHA and acceptance criteria; it does not blindly create another tracer.

## Acceptance

| ID | Observable behavior | Planned evidence |
| --- | --- | --- |
| A1 | PN origin distinguishes accepted physical input, accepted QAD input and generated BOM contribution where present. Catalog-only entries do not silently expand the PN universe. | DOM result checks; actual source-label inspection |
| A2 | Physical identifies manual 4Wall or the published bot copy; QAD identifies the loaded frozen reference. Unknown extraction metadata is disclosed. | ING source-mode/provenance review |
| A3 | “View source” uses the shared viewer, locates actual available evidence and does not invent a row or filename when missing. | ING/UX checks for valid, filtered, missing and legacy origins |
| A4 | UI summary/explanation uses domain values and preserves NET/SWING/Phantom behavior. | Existing domain verifier plus targeted invariant comparison |
| A5 | Selection, step navigation, nested preview, Escape, responsive reading and bounded rendering continue to work. | Observed browser flow and applicable UI checks |

These are planned checks. Every result starts as `not_run` until actually observed.

## Assignment sequence

| Work unit | Role | Scope / output | Dependency |
| --- | --- | --- | --- |
| Inspect origins | ING | `sourceEvidence.js`, `scanView.js` and relevant parsers; document real shape, accepted rows and gaps | Actual inspected baseline |
| Define learning evidence | DOM | `partLearningTrace.js`; reuse engine calculations and define participation/missing-state explanations | ING evidence analysis; accepted interface if shape changes |
| Present evidence | UX | `PartLogicTracer.jsx`, `SourceEvidenceSheet.jsx`, `SourcePreviewModal.jsx`, scoped `data-review.css` changes | Accepted domain/source view-model contract |
| Verify outcome | QA | Acceptance A1–A5, domain/missing-data checks, full build and final CI | Integrated candidate |

ORCH owns any README/App orchestration edits and serializes shared CSS changes. DATA is consulted if saved evidence or remote contracts change; BOT is consulted if controller/publication behavior changes. SEC is activated if the proposal changes access or exposes sensitive records. None is spawned merely to fill a role list.

In single-agent mode, the same executor performs these passes in order and labels review as self-review. Multi-agent mode uses real executor identities, WorkOrders and Handoffs with disjoint paths or isolated worktrees.

## Boundary negotiation

ING may find that a source retains a raw row but has no original Excel coordinate. Its InterfaceProposal must distinguish a known source row position from a real workbook row, and original records from generated PN-catalog entries. DOM specifies which cells actually participated and how unknown states affect the learning summary. UX agrees how the shared viewer renders each state.

Consumers respond with scoped ReviewResults. ORCH records the accepted interface before parallel dependent work begins. No agent invents `row = index + 2` or labels a generated catalog as an uploaded file.

## Example blocker

Suppose the bot copy lacks an extraction timestamp. ING sends a P2 Escalation identifying the blocked freshness claim and the available published metadata. The safe continuation is to show the source type and that freshness is unconfirmed. DATA may propose a separately scoped publication contract change with BOT; a live environment change needs its actual operational authority.

The missing timestamp does not justify a fabricated snapshot time or stopping all UI work. A hypothetical locality regrouping or SWING rule change goes to the business owner and README decision path, not to a UI shortcut.

## Review and delivery

Handoffs identify the changed paths and actual candidate. QA checks that source highlights are correct, missing data does not crash the viewer, examples do not mix with actual inventory and engine values remain unchanged. The full `npm run build` is run on the integrated candidate. Any protected scroll change requires its own demonstrated need and edge-regression evidence.

ORCH reviews the complete diff and integrates only under the existing Git authorization. Verify main CI is observed at the final remote SHA. Pages remains a separate manual operation requiring deployment authority.

The ReleaseReport contains actual SHA, changed behavior, checks, CI link and limitations. It never upgrades planned checks in this example to “passed,” claims a real iPad test from a Chromium viewport, or reports a successful live 4Wall extraction from controller mocks.
