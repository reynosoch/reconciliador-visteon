# Working with the virtual organization

You describe the outcome and constraints. The orchestrator translates them into a reviewable engineering plan, assigns specialists, integrates their work and reports what actually shipped. You should not need to manage every agent or approve routine visual choices.

## Give a useful request

Include the observable problem, the desired behavior, protected features and any known data limitation. State deployment or database authorization separately from permission to edit code.

For example: “When I select a PN, explain which loaded records contributed to its Physical, QAD and cost values. Keep the search and shared Excel-style viewer. Unknown source rows must remain unknown. Commit to main after the full build passes; do not deploy Pages.”

The orchestrator must inspect `main`, recent commits, the README entrypoint and affected code before assigning changes. It should resolve routine implementation choices itself and ask only when a missing answer changes correctness, authority or an important tradeoff.

## Who owns what

| Human responsibility | Decisions retained | Agent support |
| --- | --- | --- |
| Requesting stakeholder | Desired outcome, priority, acceptance of visible behavior | ORCH scopes the work and proposes measurable acceptance. |
| Inventory business owner / department | Counting interpretation, reference validity, locality/report scope, financial and BOM rule changes | DOM and ING provide evidence, alternatives and impact. |
| Repository maintainer | Integration policy, release authorization, accepted technical risk | ORCH and QA provide exact changes and verification. |
| Infrastructure administrator | Production access, credentials, Supabase policies, operational bot environment, approved migrations | DBA, DATA, BOT and SEC prepare a concrete plan and checks. |

These are responsibilities to resolve during intake, not assertions that particular people hold these positions. One human may hold several roles. Record the actual decision maker only when known; unresolved authority is not agent permission to make the decision.

## What proceeds without another question

Within your existing authorization, agents inspect files, reproduce bugs, implement reversible changes, run local checks, refine copy and styling, and prepare reviewable migration or deployment plans. They reuse existing features and libraries. They do not reopen an authorization question you already answered.

A business-rule dispute, unavailable critical source, unapproved destructive operation or missing release authority pauses only the dependent action. The orchestrator continues independent work and brings you a concrete choice with evidence. Silence, a deadline or an agent majority never grants approval.

## What you receive

The release report includes the final SHA or uncommitted state, what changed, affected source boundaries, exact checks and CI links, any deployment actually performed, and remaining limitations. A command that was planned is not a test result. A mock bot response is not a successful extraction. A synthetic PN is not a real inventory finding.

You may inspect the work record using the [work-item template](templates/WORK_ITEM.md). Decisions changing inventory semantics must be documented concisely in the relevant README section, with decision maker, date, evidence and scope. `.agents` does not become a second business-rule ledger.

## When escalation is appropriate

The orchestrator should escalate a rule ambiguity with a specific question: which current rule applies, what evidence conflicts with it, what behavior remains safe while unresolved, and what decision is needed. It must not label unfinished physical counting as a confirmed loss or treat locality differences as proven transfers.

For security or data integrity incidents, the team prepares containment and recovery first within available authority. Only authorized actions are executed. See [escalation paths](ESCALATION.md) for who decides and what evidence accompanies the request.

## Current production boundary

The application remains the controlled PoC described in the README. The existing no-login BOM sharing model, remote snapshot limitations and local-only history are not removed by adopting this organization. “Enterprise-grade” here describes a disciplined operating model; production security and operations still require their own authorized implementation and validation.

## Myke's senior team

The public team view shows eleven specialist positions from [the role catalog](ROLES.md): engine, source files, data integration, automation, UX, UI, quality, inventory audit, database, performance and security. Myke coordinates product/engineering delivery. Colors and uncapped ghost portraits identify positions visually; they do not indicate online workers. The page can explain documented behavior and inspect a PN from the current reconciliation; it cannot execute engineering work or connect to external AI. Use the session/work-order contracts to perform authorized repository tasks.
