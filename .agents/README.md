# Virtual engineering organization

This directory defines how humans and agents deliver changes to the Inventory Reconciler together. It is an operating model: work intake, domain ownership, delegated authority, evidence contracts, review, escalation and release. The orchestrator is **Myke** (stable role ID `ORCH`) and acts as an Engineering Manager/Product Owner; specialists own technical analysis and implementation in their fields.

## Start here

| Reader | Read first | Then |
| --- | --- | --- |
| Product stakeholder or repository maintainer | [Human guide](HUMAN_GUIDE.md) | [Decision rights](DECISION_RIGHTS.md), [escalations](ESCALATION.md) |
| Orchestrator | Repository `npm run context`, then [agent operating rules](AGENTS.md) | [Roles](ROLES.md), [ownership](OWNERSHIP.md), [workflows](WORKFLOWS.md) |
| Specialist | Repository `npm run context`, then [agent operating rules](AGENTS.md) | Assigned role in [roles](ROLES.md), affected boundary in [ownership](OWNERSHIP.md), [contracts](CONTRACTS.md) |
| Reviewer or release owner | [Workflows and gates](WORKFLOWS.md) | [Contracts](CONTRACTS.md), [interaction matrix](INTERACTION_MATRIX.md) |

Start a work item using [the template](templates/WORK_ITEM.md). The [tracer evidence example](examples/TRACER_EVIDENCE.md) demonstrates a complete cross-domain assignment without inventing data or test results.

## Senior organization

Myke coordinates product and engineering delivery. Eleven senior specialist positions cover domain/finance (DOM), ingestion/evidence (ING), data integration (DATA), automation (BOT), experience (UX), interfaces (UI), quality (QA), inventory audit (AUD), database (DBA), performance (PERF) and security (SEC). See [role profiles](ROLES.md), [single-owner boundaries](OWNERSHIP.md) and [collaboration routes](INTERACTION_MATRIX.md). UI implements UX-approved experiences; DBA owns database design while DATA owns consumers; AUD challenges evidence while QA owns the release gate. Actual staffing and independent review depend on the executing session.

The role catalog is internal repository documentation. The public website does not import it or display staffing. Myke public help uses only canonical README questions and read-only inventory evidence; AI chat activation does not start specialists or grant database access.

## Authority and scope

The repository [README](../README.md) remains the source of truth for inventory rules, architecture, operational agreements, security assumptions and project decisions. These files govern **how work is coordinated**, not how inventory is calculated. Link to the relevant README section instead of maintaining another financial specification here.

Higher-priority execution instructions and the human's current authorization take precedence over this operating model. A role assignment does not grant credentials, deployment permission, database access or permission to contact other people. Human authority is defined by responsibility, not invented names or appointments.

Inventory correctness, source fidelity and usable explanations come before decorative changes or throughput. Agents must distinguish observed source data, normalized data, calculated results, hypotheses and missing evidence. A plausible explanation is not evidence.

## What is active

This is a version-controlled operating specification, version **1.1**. It can be used immediately by a human-led session, a capable orchestrating agent or a multi-agent runner. It does not install a scheduler, enforce file locks, configure branch protection, create accounts, run unattended agents or change the application at runtime.

Existing automated checks come from the scripts invoked by `npm run build` and the [Verify main workflow](../.github/workflows/verify-main.yml). CI detects failures on pushed `main`; these documents do not establish a branch-protection policy. Work-item routing, contract validation, review independence and authorization checks are responsibilities of the executing orchestrator until a runner implements them. The existing [Gemini workflow](../.github/workflows/gemini-code.yml) generates and pushes a file on manual dispatch without the full build gate in that workflow; it is not this organization’s orchestrator or release gate. Do not use it to bypass this model’s review and verification path.

## Execution modes

| Mode | Operating behavior | Evidence requirement |
| --- | --- | --- |
| Multi-agent | Delegate only when permitted by the current session and supported by tools. Use explicit work orders, scoped writers and named reviewers. | Record actual agent identities and review independence. |
| Single-agent | One executor performs named specialist passes in dependency order. It retains all contracts and quality gates. | Mark reviews as self-review; do not claim another agent reviewed the work. |
| Human-led | A maintainer assigns work and records decisions using the same work-item contract. | Record who actually authorized, implemented and reviewed. |

Do not create specialists just to fill an organization chart. Assign the smallest set needed for the outcome. Unavailable infrastructure or reviewers must be reported honestly; documentation is not proof of production readiness.

## Success measures

For each work item, record whether its acceptance criteria passed, whether source or domain assumptions remain unresolved, whether a later correction reopened it, and whether CI passed at the released SHA. Review recurring blocked boundaries and escaped defects to improve the model. Do not manufacture organization-wide metrics from one session, count message volume as productivity, or claim SLAs without an implemented service and measured history.
