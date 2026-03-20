---
name: health-check
description: Verify the project is in a healthy state
---

Run these checks and report results:
1. `npm run build` — should pass with zero errors
2. `npm run lint` — check for lint issues
3. Check that all files import correctly (no missing modules)
4. Verify CLAUDE.md "Current Build Status" matches actual project state
5. Check git status — any uncommitted changes?
6. Report: "Project is healthy" or list what needs fixing
