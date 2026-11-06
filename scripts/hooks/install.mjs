// Installs the pre-commit test gate:  npm run hooks
// Every commit must keep all levels verified + playable, or it is blocked.
// Emergency bypass:  KUBIK_SKIP_HOOKS=1 git commit ...
import { mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const gitDir = execSync('git rev-parse --git-dir', { cwd: root, encoding: 'utf8' }).trim();
const hookPath = join(root, gitDir, 'hooks', 'pre-commit');

const lines = [
  '#!/bin/sh',
  '# KUBIK test gate — every commit must keep all levels solvable AND playable.',
  '#   KUBIK_SKIP_HOOKS=1 git commit ...   (emergency bypass)',
  '[ "$KUBIK_SKIP_HOOKS" = "1" ] && exit 0',
  'echo "▶ pre-commit: KUBIK test gate (verify + playable-route)"',
  'npm test',
  'status=$?',
  'if [ $status -ne 0 ]; then',
  '  echo ""',
  '  echo "✗ test gate failed — commit blocked (bypass: KUBIK_SKIP_HOOKS=1 git commit ...)"',
  '  exit 1',
  'fi',
  'echo "✓ test gate passed — committing"',
  '',
];

mkdirSync(dirname(hookPath), { recursive: true });
writeFileSync(hookPath, lines.join('\n'));
chmodSync(hookPath, 0o755);
console.log(`pre-commit test gate installed → ${hookPath}`);
