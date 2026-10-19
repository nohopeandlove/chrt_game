# Development and production

- Production is `main`, connected to the live Amvera application.
- Make new feature changes and fixes in `dev` by default. Push to `dev`, not `main`.
- Do not merge or push to `main` unless the user explicitly asks to release tested changes to the main game.
- A test deployment must use a different Amvera application, origin, persistent disk and teacher credentials. Never copy production student results into tests.
- Use `APP_ENV=dev` for the test application; keep `NODE_ENV=production` for deployed Docker images. Production defaults to `APP_ENV=prod`.
- Before publishing development changes run `npm run check`, `npm run build`, and relevant smoke checks.
- Fetch the intended remote branch before work. Preserve the user's GitHub edits, especially `docs/ABOUT.md`. The remote fetch result may be in `FETCH_HEAD` even if remote-tracking references are stale.
