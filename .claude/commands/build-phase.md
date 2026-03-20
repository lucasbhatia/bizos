---
name: build-phase
description: Autonomously build an entire phase of the playbook
---

You are going to autonomously work through the current phase of the build playbook.

For each step in the current phase:

1. Read CLAUDE.md to get the current step number
2. Read docs/BUILD_PLAYBOOK.md and find that step's full prompt, success criteria, and validation tests
3. Execute the step completely — write all code, create all files, run all commands
4. Run `npm run build` to verify zero TypeScript errors
5. Test against EVERY success criteria listed for that step
6. If any criteria fails, fix it before moving on
7. Update CLAUDE.md: move the step to "Completed" with today's date, increment current step
8. Git commit with message "Step [N]: [description]"
9. Git push to origin main
10. Move to the next step and repeat

RULES:
- Do NOT stop to ask me questions. Make reasonable decisions and document them.
- If something is ambiguous, choose the simpler option and add a TODO comment.
- If a step requires external setup (like Supabase credentials), skip it, log it as a blocker in CLAUDE.md, and move to the next step that doesn't depend on it.
- If a build fails after 3 fix attempts, log the error in CLAUDE.md, commit what you have, and move on.
- After completing all steps in the phase, give me a full summary of what was built, what was skipped, and what needs my attention.

Start now.
