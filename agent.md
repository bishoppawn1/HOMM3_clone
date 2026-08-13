# Agent Working Rules

This file is the human-readable working agreement for anyone making automated changes. `AGENTS.md` contains the same rules in the conventional filename recognized by coding agents.

- Work from the repository root and make production changes on `main`, unless the user explicitly requests a review branch.
- Treat `origin/main` as the version published by GitHub Pages. Do not leave completed work only on a detached worktree or an unpublished branch.
- Before pushing, run `npm test`, `npm run pages:snapshot`, and inspect `git diff` for accidental files or unrelated changes. The snapshot keeps the game compatible with the repository's branch-based GitHub Pages source.
- Push completed, verified changes to `origin main` when credentials and the remote are available. Never rewrite published history or force-push unless the user explicitly requests it.
- Update `spec.md` whenever gameplay rules, terminology, requirements, controls, data structures, or scope change.
- Put automated tests in `automated-tests/`. Every new gameplay rule or regression fix needs focused test coverage.
- Keep deterministic game rules in `app/game-core.js`, separate from the React interface, so they can be tested without a browser.
- Preserve the core design: grounded historical development, twelve monthly turns per year, non-respawning one-time pickups, systemic era requirements, and no magic or mythical creatures.
- Knowledge Huts may accelerate research by offering a choice between two research bonuses. They must never bypass concrete era-readiness requirements.
- Keep the game keyboard-accessible and responsive. Buttons need clear labels and disabled states.
- Do not commit secrets, generated build folders, dependency folders, or machine-specific configuration.
