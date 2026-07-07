# Contributing

Thanks for your interest in improving the Kakunin platform.

## Ground rules

- **Security issues:** never open a public issue — see [SECURITY.md](./SECURITY.md).
- This project is licensed under **AGPL-3.0**. By contributing you agree your
  contributions are provided under AGPL-3.0, and you sign the
  [Contributor License Agreement](./CLA.md) (a check runs on your first PR). The
  CLA lets us keep offering the hosted service and, if ever needed, relicense —
  while your contribution stays open under the AGPL for everyone.
- Small, focused PRs get reviewed fastest.

## Development

The platform depends on external services (Supabase, AWS KMS, Upstash, Stripe,
and others). Copy `.env.example` to `.env.local` and provision them.

```bash
npm ci
npm run dev
npm run type-check
npm run lint
npm test
```

## Pull requests

1. Open an issue first for anything beyond a small fix — API/schema changes need discussion.
2. Add or update tests for any behavior change.
3. Every state-changing operation must write to the audit log (see the codebase conventions).
4. CI must be green: build, type-check, lint, tests, dependency audit.

## What we're looking for

- Bug fixes with reproduction tests
- Framework and provider integrations
- Documentation improvements

## AGPL note for operators

If you deploy a modified version of Kakunin as a network service, the AGPL
requires you to make your modified source available to that service's users.
