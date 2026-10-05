# Decision ownership and authority

There is one final decision owner per decision class. Contributors provide recommendations; reviewers verify evidence. Neither review nor majority agreement changes the final owner. The work record names the actual human or executor where known.

| Decision class | Final owner | Proposes / implements | Required review or evidence |
| --- | --- | --- | --- |
| Requested outcome and priority | Requesting human stakeholder | ORCH | Observable acceptance criteria and scope tradeoffs |
| Work decomposition, sequencing, specialist assignment and temporary position creation/merger/retirement | Myke (`ORCH`) | ORCH | Ownership map, dependency graph, execution capabilities and authorization; preserve accountability and required review coverage |
| Technical design preserving existing inventory semantics | ORCH | Affected specialist | Interface acceptance by producer/consumer; risk-based QA |
| Local design, copy, spacing and responsive behavior within scope | UX | UX/UI | Existing visual language; source/domain review when explaining calculations |
| Parser implementation preserving accepted schema and filters | ING | ING | DOM review of normalized meaning; import/provenance checks |
| Financial/BOM/QAD scope or inventory interpretation change | Inventory business owner / department | DOM with ING; ORCH coordinates | Dated decision and evidence in README; independent domain/QA review of implementation (AUD may supply qualified domain review) before release |
| Cost reference, BOM version or counting-source validity | Inventory business owner / department | ING/DOM analyze | Actual references, fingerprints and impact; no silent substitution |
| Database schema/policy design preserving authority | DBA | DBA with DATA | SEC for access; DOM for comparability; local SQL and recovery evidence |
| Persisted application schema and compatibility design | DATA | DATA | DOM for comparability; SEC for access; migration/recovery verification |
| Production migration, access policy or destructive shared-data action | Authorized infrastructure administrator | DBA/DATA/BOT prepare | Exact target, authority, impact and recovery plan; SEC review |
| Live bot start/stop, extraction or snapshot publication | Authorized bot operator | BOT | Controller/environment authority and source-mode safety; code editing alone is insufficient |
| Verification result and blocking test/review finding | QA | QA/AUD and boundary reviewers | Reproducible evidence on identified candidate; findings can be challenged with new evidence |
| Acceptable residual non-business technical risk | Repository maintainer, or ORCH if explicitly delegated | ORCH summarizes | Impact, mitigation and follow-up owner; no waiver of mathematical integrity or secrets exposure |
| Integration into requested Git target | Repository maintainer, or ORCH under existing authorization | ORCH / designated integrator | Full build and required reviews, exact candidate, no unrelated changes |
| Pages deployment | Authorized release owner | DATA / ORCH | Explicit deployment authority, passing candidate and manual workflow result |
| Organization process changes | Repository maintainer, or ORCH under task authorization | ORCH | Consistent contracts, role ownership and README authority |

“Independent DOM/QA review” means review by an executor who did not author the changed semantics, with relevant domain and QA coverage. One qualified reviewer can cover both roles but must record that fact. Different role names used by the author do not establish independence. This release requirement applies to changes in business semantics, not ordinary documentation, CSS or behavior-preserving fixes.

## Inventory decisions cannot be delegated by accident

The current financial, Phantom, BOM, locality, cost and classification rules remain in the README. In particular, the organization cannot decide to halve SWING, classify Phantom by a prefix, substitute a different BOM quantity field, silently expand BOM recursion, mix manual and bot scans, or report unfinished counts as confirmed losses. Any proposed semantic change follows the business-owner path above, with evidence; an implementation bug must be assessed against the existing rule first.

Unresolved locality/reporting scope, QAD filters and presentation during counting stay in the README [pending logic questions](../README.md#preguntas-de-lógica-para-próxima-revisión). Agents may analyze alternatives with clearly labeled fixtures; they must not promote a hypothesis to the production rule.

## Record decisions once

Use the [DecisionRecord contract](CONTRACTS.md) for an operational decision or its communication. If the decision changes domain behavior, update the relevant README section with date, responsible decision maker, evidence and scope; reference that section from the work record. Do not copy another domain specification into `.agents`.

Interface decisions record producer, consumers, before/after shape, compatibility, missing-data semantics and accepted reviewers. Architectural decisions record alternatives and the reason selected. Routine implementation choices can be summarized in the handoff; they do not require a separate ceremony.

## Resolve disagreement

Specialists first compare the actual rule, code and source evidence. ORCH resolves implementation sequencing and technical tradeoffs within its authority. DOM decides whether the proposal preserves current semantics; a conflict about which business rule should apply goes to the designated human owner. QA maintains a blocking finding until it is resolved with evidence. ORCH cannot mark an unresolved integrity finding “passed” to meet a deadline.

The [escalation protocol](ESCALATION.md) applies when authority or evidence is missing. It must identify the exact blocked action and a concrete decision, not ask for blanket approval. Previously granted authorization persists; never request it again solely because a specialist changed.
