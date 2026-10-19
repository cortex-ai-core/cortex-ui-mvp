import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { settings, assertDeploymentEnabled } from '../../scripts/deploy/policy.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
test('only Dev is enabled and unknown environments never fall back to Dev', () => {
  assert.equal(assertDeploymentEnabled('dev').account, '909762691423');
  for (const name of ['test', 'prod']) assert.throws(() => assertDeploymentEnabled(name), /deployment is disabled/);
  for (const name of ['', 'unknown', '__proto__', 'constructor']) assert.throws(() => settings(name));
});

test('Test/Prod publishing is refused before AWS or S3 access even outside the repo cwd', () => {
  const directory = mkdtempSync(join(tmpdir(), 'cortex-web-deployment-gate-'));
  const marker = join(directory, 'aws-was-called');
  writeFileSync(join(directory, 'aws'), '#!/bin/sh\necho called > "$AWS_CALL_MARKER"\nexit 99\n', { mode: 0o700 });
  try {
    for (const environment of ['test', 'prod']) {
      const result = spawnSync(process.execPath, [join(root, 'scripts/deploy/publish.mjs'), environment], {
        cwd: directory, encoding: 'utf8', env: { ...process.env, PATH: `${directory}:${process.env.PATH}`, AWS_CALL_MARKER: marker },
      });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /deployment is disabled/);
      assert.equal(existsSync(marker), false);
    }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
