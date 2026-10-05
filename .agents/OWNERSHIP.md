# Domain and code ownership

Each boundary has one accountable specialist for technical correctness. ORCH is accountable for the combined outcome and integration. Ownership guides assignment and review; it is not a filesystem permission system. A work order grants a narrower write scope than this table.

Paths below are repository-relative. Wildcards identify a family of files, not blanket write authorization. Read the relevant current files before editing; update this map when paths move.

| Domain boundary | Primary specialist | Representative paths | Required collaboration when changed |
| --- | --- | --- | --- |
| RAW inputs, format detection, source catalog | ING | `src/domain/sourceCatalog.js`, `src/services/sourceDetection.js`, `src/parsers/parseDelimitedFile.js`, `src/hooks/useReferenceFiles.js` | DOM for meaning/filter changes; UX for import workflow; DATA for storage |
| 4Wall, QAD, ISPBB, BOM and cost parsers | ING | `src/parsers/parse4WallScans.js`, `parse4WallAreas.js`, `parseQad32.js`, `parseISPBB.js`, `parseBom.js`, `parseCostPart.js` under the same directory | DOM reviews accepted/rejected meaning and invariants |
| Normalized inventory and area/locality rules | DOM | `src/domain/normalize.js`, `src/domain/inventoryEngine.js` | ING supplies origins; DATA reviews persisted schema changes |
| Phantom, BOM definition and contributions | DOM | `src/domain/explodeBom.js`, `src/domain/bomLibrary.js` | ING for columns/eligibility; DATA for cloud library/version conflicts |
| NET, SWING, costs, flags and findings | DOM | `src/domain/reconcileInventory.js`, `buildDiscrepancyFindings.js`, `dataQuality.js`, `visibleAlerts.js`, `notificationState.js` under `src/domain/` | QA verifies mathematics and flags; UX consumes results |
| Tracer, recommended PN, learning and actions | DOM | `src/domain/partLearningTrace.js`, `src/domain/engineGuide.js` | ING verifies attribution; UX presents; QA covers missing data and engine consistency |
| Evidence lookup and source-view model | ING | `src/domain/sourceEvidence.js`, `src/domain/scanView.js` | DOM validates calculation participation; UX validates viewer consumption |
| Snapshot delivery, cloud BOM and local persistence | DATA | `src/services/supabase.js`, `src/services/bomCloud.js`, `src/services/browserStorage.js`, `supabase/source-column-map.json` | BOT for publication; DOM for comparability; SEC for access changes |
| Bot extraction and control | BOT | `bot_extractor.py`, `bot_control_server.py`, `src/hooks/useBotRunningStatus.js` | DATA/ING for snapshot contract; SEC for privileges; UX for status/actions |
| Engine hook and source-mode orchestration | DATA | `src/hooks/useInventoryEngine.js` | DOM for result contract; BOT/ING for replacement behavior |
| Excel exports | DATA | `src/services/exportInventoryWorkbook.js`, `src/services/exportBomWorkbook.js` | DOM reviews financial meaning; ING reviews origins; UX reviews readability |
| Shared UI, dashboards, drawers, help, source viewer | UI | `src/components/`, `src/styles/`, `src/hooks/useMobileMenuSwipe.js`, `src/services/overlayScroll.js` | DOM/ING for interpretations and evidence; QA for interaction/performance |
| UX flows, copy, accessibility acceptance | UX | Existing UI interactions and README help text; UX specifies criteria, UI owns source implementation | DOM/ING for explanation meaning; UI implements; QA verifies |
| Database schema, migrations, policies and indexes | DBA | `supabase/migrations/`, database contracts in `src/services/supabase.js` / `bomCloud.js` | DATA for consumers; SEC for access; DOM for comparability; human authorizes remote action |
| Inventory audit and result attribution | AUD | Review of `src/domain/`, evidence UI and financial exports; no duplicate engine or rule ledger | DOM/ING supply evidence; QA records gate findings; business owner decides semantics |
| Measured runtime performance | PERF | Profiling of affected `src/` paths, build chunks and dependency analysis; source implementation stays with its boundary owner | UI/DATA/DBA implement agreed scope; QA compares behavior; ORCH sequences writes |
| Verification and CI | QA | `scripts/verify-*.mjs`, `scripts/audit-css-usage.mjs`, `scripts/test_bot_control.py`, `.github/workflows/verify-main.yml` | Affected specialist reviews semantic coverage; ORCH owns gate policy |
| Deployment and workflow automation | DATA | `.github/workflows/deploy-pages.yml`, `.github/workflows/gemini-code.yml`, `scripts/deploy-pages.mjs`, `scripts/extract-public-pages-env.mjs` | QA for release checks; SEC for workflow access; human authorizes deployment |
| Integration and project knowledge | ORCH | `src/App.jsx`, `README.md`, `src/data/productUpdates.js`, `package.json`, `package-lock.json`, `.agents/` | Relevant boundary owner reviews; no concurrent writes |
| Myke mascot and documented organization | ORCH | `src/domain/mykeOrganization.js`, `src/domain/mykeKnowledge.js`, `src/components/shell/MykePanel.jsx`, `src/components/visual/MykeMascot.jsx`, `src/components/visual/MykeGhost.jsx`, `src/styles/modules/myke.css`, `src/services/mykeAI.js`, `supabase/functions/myke-chat/`, `scripts/prepare-myke-knowledge.mjs`, `scripts/activate-myke.mjs` | SEC reviews provider credentials, public-context/privacy boundaries and quota assumptions; DATA reviews the exact deployment target; UX/UI for presentation; DOM/ING/AUD for PN replies and evidence; PERF for bounded work; QA for document fidelity and honest local-help limitations |

## Boundary contracts

| Producer → consumer | What must cross the boundary | Change control |
| --- | --- | --- |
| RAW → parsers | Original rows, real file/sheet/row metadata where available, columns and source mode | ING preserves ambiguity/rejections; never invent coordinates. |
| Parsers → domain | Accepted normalized structures, rejected/invalid diagnostics, original-value provenance | ING proposes semantic/schema changes; DOM accepts the interpretation before dependent implementation. |
| Domain → reconciliation / learning | Engine-calculated totals, locality differences, flags, contribution evidence, missing/invalid states | DOM owns mathematics and explanations; evidence additions must preserve engine results unless a rule change was approved. |
| Results/evidence → UI and exports | Calculated values, source references, units, validity and generated/original distinction | UX and DATA format/present; they do not reconstruct financial rules. |
| BOT → Supabase → frontend | Whole published snapshot, known identity/status metadata, stable read behavior | BOT and DATA agree the contract; unknown freshness remains explicit. |
| Current results → saved history | Inventory identity, reference fingerprints, calculation version, snapshot completeness and compatible detail | DATA implements; DOM reviews comparability. Rename must not alter identity. |

These are existing conceptual boundaries, not a new runtime wire schema. Inspect the actual object shapes in code and agree changes through an [InterfaceProposal](CONTRACTS.md). Agent coordination contracts must not be imported into the inventory engine.

## Protected behavior and files

The canonical constraints are in the README [handoff](../README.md#handoff-ui-actual--02-oct-2026) and [principles](../README.md#principios-que-no-deben-romperse). Assignment defaults protect:

- Native scroll and the single rubber-band implementation: `src/components/visual/ScrollEffects.jsx` and `src/styles/modules/interaction-motion.css`. UI is the implementation owner with UX/PERF review; changing this boundary requires a demonstrated need and QA regression evidence for both edges and drawer interactions.
- Existing Pac-Man, navbar, footer, source actions, Bot actions, exports, help and preferences. Retain functionality when improving performance or layout.
- One common `SourcePreviewModal.jsx` / `SourceEvidenceSheet.jsx` architecture. Keep pagination/virtualization and lazy heavy evidence; no parallel viewers per source.
- The stylesheet import order in `src/styles/app.css`, shared overlay lifecycle in `OverlayPortal.jsx` and source replacement/history behavior. A local visual change does not grant permission to rewrite these systems.
- Historical SQL migrations, bot verification, SheetJS vendor and support scripts. A runtime reachability check does not make these orphan files.

If integration genuinely needs a protected-path change, propose the minimal diff, rationale, affected invariants and verification. ORCH can authorize a technical scope extension within the human's existing request; new operational or business authority follows [decision rights](DECISION_RIGHTS.md).
