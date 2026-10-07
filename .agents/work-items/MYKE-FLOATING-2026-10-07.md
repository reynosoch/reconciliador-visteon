# MYKE-FLOATING-2026-10-07

- Authority/outcome: Reynoso requested full-bar drag, placement reset on reopening, side tips below both chats, clickable tips, headerless full chat, horizontal FAQ tags, random placeholders and motion preferences. Existing direct-main/push authorization applies.
- Base: `084a67b593088a627caab2545fb4117d0a6cb2f5`.
- Executor/mode: Codex, single agent; UI/UX/QA self-review.
- Write scope: MykePanel, existing Myke CSS modules, verify-myke, README, generated public knowledge/context and this record. All other runtime code, inventory semantics, scroll implementation, cloud/bot actions protected.
- Decisions: one shared floating layout for both views; 8 px viewport margins and 104 px below for character/tip; a new anchor or close/open resets window coordinates; only sizes persist. Keep move/resize keyboard controls and clickable navbar actions. Move IA connection form into full-chat Explore; preserve actual handlers. FAQ search filters the single horizontal tag rail.
- Acceptance/evidence: integrated React render cases verify full/quick/closed/explore, dimensions at laptop/tablet/mobile, below-window companion, FAQ/search and SVG move controls. Temporary mounted React test harness verifies all-bar edge drag, reopen at new anchor, six different click tips, typing gaze, random placeholder, full-chat keyboard move and animation-off interval cleanup; portal, physics and Motion DOM surfaces mocked, real panel hooks/handlers executed. No production dependency added for the temporary harness.
- Browser limitation: local Playwright package present but Chromium download unavailable (truncated ZIP); no screenshot, real pointer-layout, focus or Safari claim. Existing glass and overlay/scroll code retained.
- Gates: full lint/build and Verify main at published SHA required; results reported in final response/Git history. No Pages, live bot, provider or remote database action requested.
