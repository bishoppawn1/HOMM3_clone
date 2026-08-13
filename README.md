# Through the Ages

A browser-based, turn-based historical strategy game inspired by the exploration, city building, and tactical combat structure of *Heroes of Might and Magic III*. Civilizations progress through historical ages without magic or mythical creatures.

## Play and develop

```bash
npm install
npm run dev
```

Run the automated suite with `npm test`, create a production build with `npm run build`, and refresh the branch-compatible GitHub Pages snapshot with `npm run pages:snapshot`.

The `main` branch deploys through GitHub Pages. A committed static snapshot supports the repository's current branch-publishing setting, while `.github/workflows/deploy-pages.yml` also verifies and deploys the static export through Actions.

See [spec.md](spec.md) for the game design and [AGENTS.md](AGENTS.md) for repository working rules.
