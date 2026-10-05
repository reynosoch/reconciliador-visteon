# Agent interaction matrix

Each cell names the reason the row role initiates contact with the column role. `—` means no routine direct dependency; route new cross-domain work through ORCH. Direction matters. This matrix is for collaboration, not authority transfer.

| Sender → receiver | ORCH | DOM | ING | DATA | BOT | UX | QA | SEC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ORCH | — | Rule/invariant assignment | Source/provenance assignment | Storage/integration assignment | Controller/extraction assignment | Experience assignment | Gate/review assignment | Trust-boundary review |
| DOM | Scope/rule escalation, handoff | — | Accepted-row meaning, origin query | History/version requirements | Extraction semantic query via DATA if shared | Calculated view model, explanation review | Financial/BOM regression request | Sensitive domain exposure review |
| ING | Ambiguity/blocker, handoff | Filter/normalization acceptance | — | Persisted origin/source-mode schema | Published columns/provenance | Evidence/viewer contract | Import/source-fidelity review | Untrusted-input handling |
| DATA | Compatibility/authority blocker, handoff | Comparability/result semantics | Source identity/schema | — | Publication/read contract | Persistence/status/fallback model | Dexie/SQL/export review | Policy/migration/access review |
| BOT | Operational blocker, handoff | Classification interpretation query | Extracted report headers | Snapshot replacement/publication | — | Controller status/actions | Safe controller test request | Credential/origin/process access |
| UX | Scope/product tradeoff, handoff | Explanation/flag/action semantics | Highlight/origin accuracy | Snapshot/history/error presentation | Bot action/status behavior | — | Interaction/responsive review | Exposure/trust-boundary question |
| QA | Gate/finding/release evidence | Math/invariant finding | Source/rejection finding | Persistence/compatibility finding | Process/status finding | Interaction/accessibility finding | — | Security finding |
| SEC | Risk/authority escalation | Financial integrity exposure | Untrusted-source exposure | Permission/data exposure | Operational credential risk | Sensitive UI/log exposure | Security verification requirements | — |

## Senior specialist interaction matrix

These routes extend the core matrix above. Existing UX implementation requests go to UI; database design requests go to DBA. Contacts do not transfer decision ownership or reserve files automatically.

| Sender | Receivers and reason | Expected contract / acceptance |
| --- | --- | --- |
| ORCH | UI: bounded component work; DBA: schema proposal; AUD: audit request; PERF: measured diagnosis | WorkOrder → StatusUpdate → Handoff or ReviewResult; one write owner per file |
| UX | UI: approved flows/copy/touch criteria; PERF: observed friction | InterfaceProposal / acceptance criteria; UX accepts usability |
| UI | UX: design acceptance; DOM/ING: view-model/evidence meaning; PERF: measured rendering concern; QA: responsive review | Handoff + identified candidate; no duplicated formulas or viewers |
| DATA | DBA: schema/RLS/migration needs; PERF: measured sync/storage delays | Consumer shape, compatibility and authority in InterfaceProposal |
| DBA | DATA: migration consumers/recovery; SEC: permission review; PERF: query evidence; ORCH: operational authority blocker | Migration proposal → ReviewResult → DecisionRecord; remote execution separately authorized |
| DOM / ING | AUD: changed calculation explanations or attribution | ReviewRequest with exact rules, candidate and minimal evidence |
| AUD | DOM: invariant finding; ING: provenance finding; QA: blocking audit finding; ORCH: rule/authority escalation | ReviewResult with reproduction and actual independence; author resolves, reviewer closes |
| PERF | UI: rendering/interaction plan; DATA/DBA: storage/query plan; QA: baseline comparison; ORCH: scope tradeoff | Measurements + InterfaceProposal; boundary owner implements, QA verifies retained behavior |
| QA | UI/UX: interaction finding; DBA/DATA: compatibility finding; AUD: domain audit; PERF: repeatable slowdown | ReviewRequest/ReviewResult tied to the candidate, not a role name |
| SEC | DBA: privilege/policy finding; UI: sensitive output finding; ORCH: incident escalation | Sanitized risk evidence + required authority; no access granted by the message |

## Required exchanges

| Situation | Sender / receiver | Contract sequence | Resolution owner |
| --- | --- | --- | --- |
| Assign a bounded deliverable | ORCH → specialist | WorkOrder → StatusUpdate acknowledgment | ORCH |
| Change a producer/consumer interface | Producer → consumers + ORCH | InterfaceProposal → ReviewResult → DecisionRecord | ORCH for technical design; business owner for semantic change |
| Ask for missing evidence | Specialist → boundary owner | StatusUpdate with precise blocker/evidence question → StatusUpdate or Escalation | Boundary owner supplies evidence; ORCH routes blocker |
| Submit implementation | Specialist → ORCH / consumer | Handoff → ReviewRequest → ReviewResult | ORCH integrates after required acceptance |
| Resolve blocking finding | QA/reviewer → author + ORCH | ReviewResult → revised Handoff → renewed ReviewResult | Reviewer closes finding using evidence |
| Request authority or business clarification | Specialist → ORCH → designated human | Escalation → DecisionRecord → revised WorkOrder | Human decision owner |
| Finish and report | QA → ORCH → human | ReviewResult → ReleaseReport | ORCH |

Specialists may resolve factual questions directly. ORCH must be copied when the answer changes scope, schedule, authority, a shared interface or a blocker. No specialist can assign another specialist new write scope, self-authorize a deployment or close the parent work item.

## Coordination limits

Use one canonical work record per parent task, with child IDs for bounded assignments. Cross-domain discussion should converge on one accepted interface, not unbounded all-to-all messages. Avoid duplicate reviews of unchanged evidence; renew reviews when the affected candidate changes. ORCH summarizes decisions for downstream consumers so they do not have to reconstruct a long conversation.
