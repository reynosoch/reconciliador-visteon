# Escalation and incident paths

Escalate missing authority, conflicting rules, unsafe data behavior or an unresolved blocker. The purpose is to route a concrete decision and contain risk while useful independent work continues.

## Severity and routing

| Level | Trigger / examples | Immediate owner and action | Final decision path |
| --- | --- | --- | --- |
| P0 — integrity or exposure incident | Exposed server credential; unauthorized shared-data destruction; published result known to violate financial rules | Reporter notifies ORCH immediately; SEC and affected DOM/DATA/BOT specialist assess. Pause implicated operations and preserve sanitized evidence within authority. | Authorized infrastructure/security administrator for containment/access; business owner for inventory interpretation; maintainer for corrective release |
| P1 — release-blocking correctness | Wrong NET/SWING sign/value; source mismatch; Phantom/BOM semantics conflict; mixed manual/bot snapshots; failing required build | QA or affected specialist marks blocked release gate; ORCH assigns a reproducer and minimal correction. | DOM resolves implementation against current rule; business owner resolves rule change; maintainer decides release after correction |
| P2 — blocked scope or capability | Unknown source row/file; unresolved QAD/locality scope; unavailable environment/reviewer; changed shared interface | ORCH records dependent work and safe continuation. Distinguish truthful missing evidence from a UI defect. | Appropriate business/technical/operational decision owner in the decision table |
| P3 — advisory improvement | Nonblocking readability issue, optional optimization or process refinement | Record finding and priority; avoid turning it into an unrequested redesign. | ORCH within scope; human sets new priority if needed |

Severity describes impact, not message volume or urgency language. A passing test does not downgrade an exposure incident. Unknown provenance that is accurately disclosed may be a limitation rather than a defect; fabricated provenance is a correctness problem.

## Required escalation packet

Use the [Escalation contract](CONTRACTS.md). Include:

1. Exact blocked action, target environment and affected revision/source.
2. Observed evidence and expected rule, with sensitive values removed.
3. Known impact and remaining unknowns; do not infer customer losses from test data.
4. Two concrete options when meaningful, the specialist's recommendation and tradeoffs.
5. Specific authority/decision needed, its owner or the fact that the owner is unresolved.
6. Safe work that can continue, current containment and recovery/validation plan.

If a skill, tool approval policy or automatic review actually blocks an operation, identify that source and its stated reason accurately. Do not attribute an invented restriction to this model. First try an authorized safer path that still accomplishes the goal.

## Escalation ladder

The reporter first routes to ORCH and the affected boundary owner. The specialist verifies the evidence and attempts an in-scope resolution. ORCH resolves routine scope/sequencing questions, then routes only unresolved business or operational authority to the designated human from [decision rights](DECISION_RIGHTS.md).

If the owner is not known, ask the requesting human to identify the owner using the prepared decision packet. If no response arrives, preserve the blocker and continue independent work. Elapsed time, retries and silence never count as consent.

For a disagreement, compare canonical README rule, accepted source evidence and code behavior. Technical alternatives can be decided by ORCH; changing the rule cannot. Do not resolve financial semantics by a vote of agents.

## Incident containment and recovery

Prepare the smallest action that limits further damage: pause the implicated publication/deployment, avoid destructive retry loops, preserve reproducible evidence, and identify affected revisions or snapshots. Execute only actions already within authority. Do not start an extractor, revoke credentials, alter remote RLS or delete cloud records as an incidental response to a local test failure.

If a secret was exposed, avoid repeating it in messages, Git or screenshots. Removal from the current file does not revoke it; the authorized administrator must assess rotation and history exposure. SEC records what was verified, not a claim that the issue is solved by deleting text.

Recovery requires a corrective work item, targeted regression, full candidate checks, authorized integration and confirmed CI. Production actions require their separate authority and verification. Preserve the incident record and link follow-up ownership; the final report describes remaining exposure and unavailable checks.

## Response expectations

P0/P1 interrupts the implicated release path as soon as observed. P2 is reported at the next meaningful status update; P3 can be included in review. ORCH keeps the human informed when a material blocker changes the expected result and follows the session's communication cadence.

These are operating priorities, not implemented timed alerts, paging or service-level guarantees. Do not create unattended external notifications without explicit authorization and an available supported channel.
