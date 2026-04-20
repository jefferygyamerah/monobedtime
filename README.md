# MonoBedtime

AI-generated bedtime stories with illustration and subscription support.

## Current State

MonoBedtime is an MVP-stage product focused on fast validation, not a finished content platform yet.

What already exists:

- story generation flow
- AI-assisted illustration pipeline
- subscription and billing plumbing
- mobile-friendly Next.js frontend

What still needs validation:

- subscription enforcement on premium generation paths
- rate limiting and cost controls
- fallback behavior when AI generation fails
- launch positioning and analytics

See `CURRENT_ISSUES.md` for the active backlog.

## Stack

- Next.js 14
- React 18
- TypeScript
- Stripe
- Vercel AI SDK

## Local Development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the app:

   ```bash
   npm run dev
   ```

3. Open `http://localhost:3000`

## Verification

Run:

```bash
npm run lint
```

If billing, API integration, or generation behavior changes, do a manual end-to-end check of the story flow as well.

## Key Files

- `app/` - routes and app shell
- `components/` - product UI
- `server/` - server-side helpers and integrations
- `lib/` - shared utilities

## Collaboration Notes

- Read `CURRENT_ISSUES.md` before starting work.
- Use `CONTRIBUTING.md` for branch and tracking expectations.
- Keep changes small and tied to a single product or infrastructure concern.
