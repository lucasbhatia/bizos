---
name: step-complete
description: Mark a build step as complete, update CLAUDE.md, commit, and push
---

Do the following in order:
1. Run `npm run build` to verify zero errors
2. Update the "Current Build Status" section in CLAUDE.md:
   - Move the current step to the "Completed" list with today's date
   - Increment "Current Step" to the next step number
3. Git add all changes
4. Git commit with message: "Step [N]: [description of what was built]"
5. Git push to origin main
6. Show me a summary of what was completed and what's next
