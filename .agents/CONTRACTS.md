# Agent communication contracts

Contract version: **1.0**. These contracts describe coordination messages, not inventory runtime objects. Use structured records in the available agent channel, work-item thread or session transcript. A runner may validate them, but this repository currently has no automatic message validator or queue.

## Delivery and evidence rules

- Route using role IDs from [roles](ROLES.md) and the [interaction matrix](INTERACTION_MATRIX.md). Identify the actual executor separately from its role.
- Use stable work and message IDs; reply with `in_reply_to`. A receiver acknowledges a WorkOrder through a StatusUpdate before writing. Replayed messages with the same ID must not create a second assignment, commit or operational action.
- The work record is the coordination ledger. ORCH records accepted changes there; a chat suggestion alone does not change scope, authority or an interface.
- Send concise claims with evidence pointers, not full inventory workbooks. Distinguish observed data from hypotheses and synthetic fixtures. Do not include secrets or unnecessary raw production records.
- Bind code claims to a base SHA and changed-artifact claims to a candidate SHA or tree. If no commit exists yet, provide a diff/patch identifier and mark validation as local/uncommitted. A branch name alone is insufficient because it moves.
- A timestamp records actual emission time in ISO 8601 with timezone. It does not prove a source extraction time. Missing source metadata remains unknown.
- A message is not a deployment instruction unless it carries explicit scope-specific authority from the decision owner. Tool availability is not authorization.

## Common envelope

All messages require these fields. Payloads use the kind-specific contract below. Markdown is acceptable if it preserves the named fields and explicit values.

| Field | Type / allowed values | Meaning |
| --- | --- | --- |
| `contract_version` | String, `1.0` | Message schema version |
| `message_id` | Unique string within work item | Deduplication key |
| `work_id` | Stable string | Parent work item |
| `kind` | One of the nine kinds below | Payload contract |
| `sender` | `{ role, executor }` | Role ID and actual human/agent identity |
| `recipients` | Nonempty list of role IDs | Named receivers; ORCH copied on scope/authority/blockers |
| `in_reply_to` | Message ID or `null` | Causal predecessor; root messages use `null` |
| `base_sha` | Full Git SHA | Inspected repository baseline |
| `sent_at` | ISO 8601 string with timezone | Actual message emission time |
| `payload` | Object | Required fields for the selected kind |

An invalid envelope, incompatible contract version or missing authority is returned to the sender with a StatusUpdate identifying the defect. Do not guess a missing SHA, silently convert an incompatible contract, or perform the requested mutation while clarifying. Independent read-only analysis may continue.

## Payload definitions

Fields listed here are required. Use explicit `[]`, `null` or `not_applicable` where allowed; do not omit a material unknown. Additional fields may supply evidence but cannot replace required fields.

### WorkOrder

ORCH → assigned specialist. Creates or revises a bounded assignment.

| Field | Content |
| --- | --- |
| `revision` | Increasing integer; revised orders state what supersedes the old scope |
| `parent_work_id` | Parent ID or `null` |
| `outcome` | Observable user result and problem being solved |
| `owner_role` / `executor` | Assigned role and actual executor |
| `mode` | `multi_agent`, `single_agent` or `human_led` |
| `allowed_paths` / `protected_paths` | Repository-relative paths or explicit patterns; no blanket unstated rights |
| `acceptance` | List of criterion IDs, expected behavior and validation method |
| `dependencies` | Work IDs / accepted interface records; `[]` if independent |
| `inputs` | README references, source/code evidence and fixture classification |
| `deliverables` | Artifacts and required Handoff |
| `reviewers` | Role, executor if assigned, scope and required independence |
| `authorization` | Human instruction reference, permitted Git/operational targets, explicit exclusions |
| `risk` / `budget` | R1–R4 from [workflows](WORKFLOWS.md), with reason, and bounded effort/tool constraints; `null` budget means no numeric budget specified |

### StatusUpdate

Executor → ORCH, and dependency receiver when relevant.

Required: `state` (lifecycle value), `acknowledges` (message ID or `null`), `progress` (observed deliverables), `next_action`, `blockers` (list), `scope_change_needed` (proposal or `null`), `evidence` (list of pointers). Progress describes results, not “90% done” without artifacts.

### InterfaceProposal

Producer → consumers, copied to ORCH. Required: `interface_id`, `producer`, `consumers`, `affected_paths`, `before`, `after`, `invariants`, `missing_data_behavior`, `compatibility`, `validation_plan`, `decision_needed`. Use actual object fields inspected in code; state whether existing consumers break. Consumers respond through ReviewResult, and ORCH records acceptance as a DecisionRecord before dependent interface work proceeds.

### ReviewRequest

Executor/ORCH → reviewer. Required: `candidate` (revision identity), `scope`, `criteria` (acceptance IDs), `artifacts`, `observed_checks`, `known_gaps`, `required_independence`. Include the diff and inputs needed to reproduce findings. Do not ask reviewers to approve an unspecified branch.

### ReviewResult

Reviewer → executor and ORCH. Required: `candidate`, `scope`, `independence` (`independent` or `self_review`, plus author/reviewer identities), `disposition` (`accept`, `changes_requested`, `blocked`), `findings`, `checks`, `limitations`.

Each finding includes `id`, `severity`, `blocking`, `path_or_boundary`, `evidence`, `impact`, `required_resolution` and `owner_role`. Severity uses the [escalation scale](ESCALATION.md): P0–P3. An empty finding list is explicit. Acceptance is scoped to the inspected revision and criteria; it is not authorization to deploy.

### Handoff

Executor → ORCH and downstream specialist. Required: `candidate`, `changed_paths`, `summary`, `criteria_results`, `interfaces`, `source_fidelity`, `checks`, `open_findings`, `risks`, `next_owner`. Include missing/invalid data behavior, preserved invariants and source/fixture limitations. A blocked handoff states which criteria remain unfulfilled.

### Escalation

Any role → ORCH; ORCH → designated decision owner through an available authorized channel. Required: `severity`, `blocked_action`, `decision_owner`, `reason`, `evidence`, `options`, `recommendation`, `safe_continuation`, `authority_needed`, `linked_findings`. The decision owner may be unresolved; say so instead of appointing a person. A live incident includes current containment status and target environment.

### DecisionRecord

Authorized decision owner / ORCH recording that owner's decision → affected roles. Required: `decision_id`, `decision_class`, `owner`, `decision`, `rationale`, `alternatives`, `authority_reference`, `scope`, `effective_revision`, `record_location`, `follow_up`. A proposed decision is labeled `proposed` in `decision` until the actual owner responds; no downstream behavior depends on unaccepted semantics.

Domain decisions use the relevant README section as `record_location`. Routine task/process decisions use the work record. Record when a new decision supersedes an earlier one.

### ReleaseReport

ORCH → human and work record. Required: `target`, `final_sha`, `changes`, `acceptance_results`, `checks`, `ci`, `operational_actions`, `remaining_limitations`, `follow_ups`. If not published, `final_sha` is `null` and the actual candidate is recorded in `target`; do not report a local candidate as remote `main`.

## Revision and check structures

Every `candidate` uses `{ "sha": "<full SHA or null>", "tree_sha": "<tree SHA or null>", "patch_id": "<diff artifact or null>", "state": "committed | uncommitted" }`. At least one immutable revision/diff identity is required. Placeholders below are examples only and must be replaced before execution.

Every check record uses `command_or_method`, `environment`, `revision`, `result` (`passed`, `failed`, `not_run`, `not_applicable`), `evidence` and `limitations`. Failed checks preserve the failure; subsequent successful reruns are additional evidence. “Passed on mock data” must name that limitation.

## Copyable message example

This is a **template**, not an executed assignment. Replace angle-bracket fields with actual values; an orchestrator must not dispatch it as-is.

```json
{
  "contract_version": "1.0",
  "message_id": "INV-014-M01",
  "work_id": "INV-014",
  "kind": "StatusUpdate",
  "sender": { "role": "ING", "executor": "<actual executor>" },
  "recipients": ["ORCH", "DOM"],
  "in_reply_to": "INV-014-M00",
  "base_sha": "<inspected full SHA>",
  "sent_at": "<actual ISO 8601 time with timezone>",
  "payload": {
    "state": "ACTIVE",
    "acknowledges": "INV-014-M00",
    "progress": [],
    "next_action": "Inspect accepted-row provenance and the shared source-view model.",
    "blockers": [],
    "scope_change_needed": null,
    "evidence": ["src/domain/sourceEvidence.js"]
  }
}
```

## Retry, conflict and closure

ORCH treats duplicate message IDs as re-delivery of the same event. A correction uses a new ID referencing the superseded message; preserve the original. Out-of-order handoffs wait for their dependencies. Two contradictory decisions trigger escalation to the owning authority, not last-message-wins behavior.

If the channel fails, record undelivered messages in the work record and retry through an available approved channel. Do not send email/Slack or disclose inventory to a new destination without authorization. Reconcile state before resuming after interruption. The final report closes the loop with the human; a specialist's Handoff alone does not close the parent task.

## 4Wall control and publication contract — 08 OCT 2026

Only outbound HTTPS runner traffic; Supabase is the authoritative control plane. Technical Auth identity is separate from human roles; no localhost listener, shared control password or permanent service-role in the exe. Daily 4Wall credentials stay in source memory. Each run is owned by UID + run_id + private lease; claims occur before Edge launch. One active run/machine and at most one pending TTL-bound Run now. Pause finishes the active run and persists.

The shared 14-field contract produces identical Python/JS canonical values and SHA256 hashes. Ticket is TEXT and cut-local uniqueness determines preferred identity; safe composite transitions preserve internal UUIDs and ambiguity rejects before writes. Stage batches are private/temporary; publish validates the complete manifest, generation/CAS and quality gates, commits changed CURRENT + SUCCESS receipt atomically, and repeats idempotently. Full valid cuts count absences; partial/failed/rejected never do. Manual correction is temporary and next AUTO full wins with audit. No financial computation enters UI/control.

Status polls are narrow every 5s with Realtime hints; CURRENT pages reload only on content_version change. General dashboard stays public until the login flag gates UI/RLS and shared BOM/reports. Notification jobs are unique per final automatic run; channel workers/keys remain server-only. Tests use synthetic data, not real corporate exports. Remote access to the exact project is a separate prerequisite; local SQL/packaging results never imply corporate extraction was tested.
