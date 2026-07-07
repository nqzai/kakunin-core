// Enforces Conventional Commits format on every git commit.
// Aligns with .claude/rules/git.md

/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],

  rules: {
    // Types — must match .claude/rules/git.md types exactly
    'type-enum': [
      2, 'always',
      ['feat', 'fix', 'chore', 'docs', 'test', 'refactor', 'perf', 'security', 'ci'],
    ],

    // Scopes — must match KYC domain model
    'scope-enum': [
      2, 'always',
      [
        'agents', 'certs', 'events', 'reports', 'webhooks',
        'agentmail', 'billing', 'auth', 'dashboard', 'sdk',
        'rls', 'kms', 'openrouter', 'upstash', 'db', 'deps', 'ci',
      ],
    ],

    'scope-case':    [2, 'always', 'lower-case'],
    'subject-case':  [2, 'never',  ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 72],
    'body-max-line-length': [1, 'always', 100],
  },
};
