# Work item template

Copy into the available authorized work record. This file is a blank template, not an active assignment. Do not commit sensitive source extracts or pretend its placeholders are observed evidence.

## Identity and outcome

| Field | Value |
| --- | --- |
| Work ID / parent | `<stable ID>` / `<parent ID or null>` |
| State / previous state if blocked | `INTAKE` / `null` |
| Outcome | `<observable human result>` |
| Request / authority reference | `<actual human instruction or decision reference>` |
| Base SHA | `<full inspected SHA>` |
| Candidate | `<SHA/tree or identified uncommitted diff>` |
| Risk class | `<R1/R2/R3/R4, reason>` |
| Execution mode | `<single_agent/multi_agent/human_led>` |
| Orchestrator / accountable integrator | `<actual executor>` |
| Human decision owners | `<known responsibilities/names; unresolved if unknown>` |
| Effort/tool budget | `<actual limit or null>` |

## Acceptance criteria

| ID | Expected observable behavior | Validation method | Result / evidence |
| --- | --- | --- | --- |
| A1 | `<behavior>` | `<domain check, browser observation, documentation audit…>` | `not_run` |

## Assignment and write reservations

| Child ID | Role / actual executor | Deliverable | Allowed paths | Protected paths | Depends on | Reviewer / independence | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `<ID>` | `<role / executor>` | `<artifact>` | `<paths>` | `<paths>` | `<IDs or []>` | `<actual reviewer, scope, independent/self_review>` | `READY` |

One active writer per file. A shared-path reservation is recorded here before edits. This table is a coordination agreement, not an enforced lock.

## Inputs and assumptions

- Canonical README references: `<sections>`.
- Source evidence: `<actual files/headers/available origins; no secrets>`.
- Fixtures: `<synthetic / sanitized / real-permitted; unknown metadata>`.
- Protected functionality and retained invariants: `<specific behavior>`.
- Unresolved assumptions: `<unknowns and dependent work>`.
- Available capabilities / unavailable environment: `<observed tools and limitations>`.

## Authority and operational targets

| Action | Target | Authority reference | Status |
| --- | --- | --- | --- |
| Code/documentation edits | `<scope>` | `<existing instruction>` | `<authorized/unresolved>` |
| Git integration | `<branch>` | `<existing instruction>` | `<authorized/unresolved>` |
| Pages deployment | `<target or not requested>` | `<reference or null>` | `<authorized/not requested/unresolved>` |
| Remote database / live bot action | `<target or not requested>` | `<reference or null>` | `<authorized/not requested/unresolved>` |

## Interfaces and decisions

| Record ID | Producer / consumers | Proposal or decision | Owner | Status / effective revision | Canonical location |
| --- | --- | --- | --- | --- | --- |
| `<ID>` | `<roles>` | `<change and compatibility>` | `<actual decision owner>` | `<proposed/accepted, revision>` | `<README section for domain; work record for coordination>` |

## Communication and blockers

| Message ID | Kind | Sender → receivers | In reply to | Evidence / linked record |
| --- | --- | --- | --- | --- |
| `<ID>` | `<contract kind>` | `<roles/executors>` | `<ID or null>` | `<pointer>` |

| Blocker / finding | Severity | Blocked action | Owner / decision needed | Safe continuation | Resolution evidence |
| --- | --- | --- | --- | --- | --- |
| `<ID or none>` | `<P0–P3>` | `<action>` | `<owner and concrete question>` | `<independent work>` | `<open or actual evidence>` |

## Review and validation

| Gate / criterion | Method or exact command | Environment | SHA/tree/diff | Result | Evidence and limitations |
| --- | --- | --- | --- | --- | --- |
| `<G0–G5 / A1…>` | `<method>` | `<actual environment>` | `<revision>` | `not_run` | `<pointer; mocks/live/unknown>` |

Review identities and independence: `<who authored, who reviewed, independent/self_review, scoped acceptance>`.

Open findings and closure evidence: `<IDs and actual resolution>`.

## Release and follow-up

- Final remote SHA / target: `<actual values or not published>`.
- CI run / conclusion: `<actual link and result or unavailable/pending>`.
- Operational actions actually performed: `<actions or none>`.
- Remaining limitations: `<real gaps>`.
- Follow-ups: `<owner, outcome and closure evidence>`.
- Final ReleaseReport reference: `<message ID>`.
