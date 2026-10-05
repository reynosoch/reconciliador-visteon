# Delivery workflows and quality gates

ORCH runs the smallest workflow that covers the affected risk. All paths use the same [lifecycle](AGENTS.md) and [communication contracts](CONTRACTS.md). Documentation does not bypass existing repository checks.

## 1. Intake and planning

Inspect the current branch/worktree, recent commits and `npm run context`. Capture the human's existing authorization, desired outcome, protected features and acceptance criteria in the [work item](templates/WORK_ITEM.md). Identify actual inputs, available environment and unresolved business assumptions.

Classify risk by the most sensitive changed boundary:

| Risk class | Typical change | Required specialist passes |
| --- | --- | --- |
| R1 — presentation/process | Documentation, behavior-preserving styling or copy | ORCH; UX when UI changes; QA gate assessment |
| R2 — interface/data behavior | Parser evidence, viewer navigation, persistence, exports, bot status, shared UI behavior | Affected owners and consumers; QA; SEC if trust boundary changes |
| R3 — inventory semantics | Financial formula, Phantom/BOM eligibility, QAD filter, counting interpretation or cost validity rule | Business-owner decision, DOM/ING as needed, independent domain/QA review |
| R4 — operational privilege | Production migration, access/credentials, destructive shared data, live automation or deployment | Authorized operational owner; DATA/BOT/SEC; QA; separate execution authority |

A cosmetic task touching a financial or privileged boundary is reassessed; the original label does not waive higher-risk gates. A documentation change proposing a new business rule is also subject to business authority before that rule is adopted.

Assign only the required roles. Use accepted interface proposals to order dependencies. Record one writer per shared file. Set an effort boundary appropriate to the request; do not invent numeric budgets or inflate assignments to use every available agent.

## 2. Cross-domain implementation

For a source/evidence feature, use this sequence:

1. ING verifies raw identity, headers, accepted/rejected rows and available provenance.
2. DOM defines calculation participation, explanations and missing/invalid states using existing engine results.
3. DATA checks persisted or remote compatibility only if that boundary changes.
4. UX integrates the view model into existing components without recalculating values.
5. QA verifies source fidelity, domain consistency and the user flow on the integrated candidate.

Parallel implementation is allowed only after interfaces are accepted and write scopes do not conflict. Read-only investigation can begin earlier. For shared-checkout work, ORCH serializes shared files and inspects the combined diff before review.

## 3. Workflow variants

| Variant | Additional requirements |
| --- | --- |
| Financial or Phantom/BOM change | Reproduce against the README rule first. Separate bug correction from semantic change. A semantic change needs the dated business decision in README, impact/compatibility assessment and independent review. Verify production domain functions without rendering React. Assess saved-cut calculation-version compatibility before release. |
| Parser/source change | Verify required/ambiguous headers, accepted and rejected rows, origin coordinates, site/type filters and original/normalized values. Retain manual/bot replacement rules. Distinguish no row, filtered row and accepted zero where available. |
| Tracer or source viewer | Reuse shared viewer/excerpts. Verify PN origin, generated vs original labels, highlights, unknown source fallback, warning references, deterministic summary/actions and bounded rendering. Keep computations in domain; synthetic guide examples stay separate. |
| UI/drawer change | Inspect current components/CSS before edits. Verify laptop, iPad-sized and small layouts, keyboard/focus, touch targets, nested overlays, Escape and missing data. If scroll boundary changes, verify top/bottom, F5/fast-scroll and handoff while preserving native scrolling. Report actual browser/platform tested; iPad-sized Chromium is not Safari on an iPad. |
| Persistence or cloud change | Verify fingerprint/revision conflicts, idempotency, offline/recovery behavior, local history identity and comparison compatibility. Run relevant Dexie/SQL checks. Prepare migration recovery; do not execute remote mutations under code-edit authorization alone. |
| Bot/control change | Run safe controller unit tests. Verify accepted request vs running process vs published snapshot, concurrency, stop, error/timeout and source switching. State when actual corporate 4Wall extraction was not tested. |
| Documentation/organization change | Verify links, code-path references, one owner per decision, role/contract consistency, evidence status and README authority. No synthetic UI tests are needed for unchanged application code. |

## 4. Review and verification

Specialists hand off an identified candidate with scoped checks and open findings. QA reviews acceptance against that candidate. DOM/ING review cross-boundary semantic/provenance claims. SEC reviews changed trust boundaries. Ordinary isolated visual/doc changes do not require every role.

Required gates:

| Gate | Evidence | Owner |
| --- | --- | --- |
| G0 — Ready to implement | WorkOrder, authority, accepted scope/interfaces and write reservations | ORCH |
| G1 — Domain/source fidelity | Current rule preserved or approved change; actual origins; missing/invalid behavior; applicable regressions | DOM/ING or disclosed role passes |
| G2 — User/compatibility behavior | Applicable UI, storage, export, bot or migration checks; retained features | Affected specialist + QA |
| G3 — Integrated build | Successful `npm run build` on final candidate tree; required review findings resolved | QA reports; ORCH gates |
| G4 — Authorized integration | Target/authority confirmed, clean scoped diff, refreshed remote base, candidate identity | ORCH / integrator |
| G5 — Remote verification | Final remote SHA, Verify main CI result/link; separate deployment result if authorized | QA observes; ORCH reports |

Non-applicable gates or checks require a short reason. `npm run build` already runs lint and the financial, discrepancy, UI safety, Dexie, export, meeting-rule, import, tracer and local Supabase checks, plus repository hygiene, runtime module/dependency and CSS audits, then Vite. `package.json` is the exact command source; do not maintain a second hardcoded build chain here.

Use `npm run lint` for the explicit lint result when requested. Risk-specific examples:

```sh
npm run context
npm run lint
npm run build
python3 scripts/test_bot_control.py
```

The Python command is for bot/control changes and safe controller regression; it does not run live 4Wall. On corporate Windows use the README's `npm.cmd` commands and the available Python executable. Do not broaden testing repeatedly after sufficient checks pass unless new changes or findings justify it.

## 5. Integration and release

Specialists do not independently push shared `main`. ORCH or the designated integrator stages only the reviewed paths, makes coherent commits, refreshes the remote base and checks for concurrent changes. Follow the human's requested Git target. Existing authorization for direct `main` commits is valid; this model does not impose an extra PR approval flow. If no target/authority was given, prepare the reviewed candidate before asking for the missing release decision.

If remote `main` advanced, integrate without overwriting others, reassess interfaces and renew affected reviews/checks. Never force-push to resolve a coordination problem. Report exact SHA/tree correspondence when commit metadata differs between local and remote publication; local checks apply to identical content, and CI must observe the final remote SHA.

Push to `main` triggers [Verify main](../.github/workflows/verify-main.yml). Observe its conclusion at the final SHA. Record CI pending or unavailable explicitly; close only with observed results or a disclosed verification blocker/follow-up. A failed remote gate opens corrective work and prevents a success claim.

Pages is a **separate manual deployment** under [the existing workflow](../.github/workflows/deploy-pages.yml). Pushing `main` does not deploy it. Do not dispatch Pages, the Gemini generator, a remote migration or a live extractor as an incidental quality check.

The final ReleaseReport states outcome, SHA, important paths, exact checks/CI, operational actions and real limitations. Include Novedades only for user-visible functionality, not every internal process change. Update README concisely for important project or domain decisions.

## 6. Interruption, recovery and learning

Resume from the work record, current repository state and actual agent status. Reconcile completed edits and stale evidence before starting new assignments. Do not rerun completed work merely because the conversation resumed.

For corrective work, preserve the original failure and link its cause, correction and regression. Record follow-up owner and what evidence will close it. Process improvements belong in `.agents`; business/domain decisions remain in README. A persistent external tracker may hold the work record when already available and authorized; otherwise use the session's durable work record and commit/review references. Never claim a tracker or agent ledger exists when it does not.
