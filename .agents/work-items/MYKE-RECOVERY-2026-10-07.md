# MYKE-RECOVERY-2026-10-07

- Outcome/authority: Reynoso requested repair of RECUPERACIÓN after the Antigravity change; integrate directly into main under established project instructions.
- Base: `494dcb5abade527ea4e3d2b50a26c8501342711c`.
- Mode/executor: single agent, Codex; ORCH/UI/QA passes and self-review. No independent review claimed.
- Risk: UI runtime recovery; no domain semantics change.
- Write reservations: `src/components/shell/MykePanel.jsx`, `src/styles/modules/myke.css`, `scripts/verify-myke.mjs`, README and this record. Protect all other runtime code, sources, storage, financial rules, bot and scroll implementation.
- Decision: restore the two Myke files exactly from `b91208b54c7e602d40d48ee66bfce90452d10b58`. The last redesign introduced self-referential height initialization, removed full-chat FAQ search and quick-position persistence/keyboard movement, and never applied large-chat drag coordinates to the panel.
- Reproduction: actual React rendering of anchored Myke throws `ReferenceError: Cannot access 'renderedHeight' before initialization`; baseline lint passes. The new integrated render check was also run against the original faulty panel and rejected it with this exact error.
- Acceptance: quick/full/closed/explore render without exceptions; FAQ search, resize, close and keyboard move controls retained; full build green; remote Verify main green at released SHA.
- Validation: render regression covers laptop (1366×900), tablet (820×1180), mobile (390×844), quick anchors on both sides, closed and Explore. Portal/rubber-band DOM shells are mocked; actual panel hooks, calculations, JSX and children run. No browser drag/focus/Safari or corporate live bot/database checks claimed.
- Integration: main, no PR, no force push. Pages deployment is separate and not requested; no live bot or database action.
- Handoff/release: commit and Verify main results recorded in Git history and the final response. Follow-up owner: maintainer for manual Pages deployment if needed.
