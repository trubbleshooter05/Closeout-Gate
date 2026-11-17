# Closeout Gate

Closeout Gate is a prototype manufacturing daily-report trust and release-control application.

It demonstrates:

**BLOCKED → Resolve → Recheck → READY → Release → immutable Audit History**

All people, companies, systems, assets, identifiers, operational values and historical records displayed by the application are fictional synthetic sample data. No real company or workplace data is included.

## Development

Requires [Bun](https://bun.sh).

```sh
bun install
bun run dev        # local dev server
bun run lint       # eslint
bun run build      # production build to dist/ (uses the /Closeout-Gate/ base path)
bun run test       # vitest (no test files yet)
```

## Deployment

Pushes to `main` build the app and publish `dist/` to GitHub Pages via `.github/workflows/deploy.yml`.
Repository setting required: **Settings → Pages → Source: GitHub Actions**.

Live demo URL: _to be added after the first successful deployment._

The site is intentionally excluded from search engines (`noindex,nofollow` and `robots.txt` disallow).
