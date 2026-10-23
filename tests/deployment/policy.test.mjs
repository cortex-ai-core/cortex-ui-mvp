import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { settings, assertDeploymentEnabled } from '../../scripts/deploy/policy.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
test('Dev and Test are enabled and unknown environments never fall back to Dev', () => {
  assert.equal(assertDeploymentEnabled('dev').account, '909762691423');
  assert.equal(assertDeploymentEnabled('test', {}).account, '223323955607');
  for (const name of ['prod']) assert.throws(() => assertDeploymentEnabled(name), /deployment is disabled/);
  for (const name of ['', 'unknown', '__proto__', 'constructor']) assert.throws(() => settings(name));
});

test('Prod publishing is refused before AWS or S3 access even outside the repo cwd', () => {
  const directory = mkdtempSync(join(tmpdir(), 'cortex-web-deployment-gate-'));
  const marker = join(directory, 'aws-was-called');
  writeFileSync(join(directory, 'aws'), '#!/bin/sh\necho called > "$AWS_CALL_MARKER"\nexit 99\n', { mode: 0o700 });
  try {
    for (const environment of ['prod']) {
      const result = spawnSync(process.execPath, [join(root, 'scripts/deploy/publish.mjs'), environment], {
        cwd: directory, encoding: 'utf8', env: { ...process.env, PATH: `${directory}:${process.env.PATH}`, AWS_CALL_MARKER: marker },
      });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /deployment is disabled/);
      assert.equal(existsSync(marker), false);
    }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

// GitHub credentials are issued only for the branch-bound Test release path.
test('Test rejects other refs and pull requests before AWS access', () => {
  for (const execution of [
    {GITHUB_ACTIONS:'true',GITHUB_REF:'refs/heads/dev',GITHUB_EVENT_NAME:'push'},
    {GITHUB_ACTIONS:'true',GITHUB_REF:'refs/pull/1/merge',GITHUB_EVENT_NAME:'pull_request'},
    {GITHUB_ACTIONS:'true',GITHUB_REF:'refs/heads/test',GITHUB_EVENT_NAME:'pull_request'},
  ]) assert.throws(() => assertDeploymentEnabled('test', execution), /requires the test branch/);
  for (const event of ['push','workflow_dispatch']) assert.equal(assertDeploymentEnabled('test',
    {GITHUB_ACTIONS:'true',GITHUB_REF:'refs/heads/test',GITHUB_EVENT_NAME:event}).account, '223323955607');
});
