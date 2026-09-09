'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const workflow = read('.github/workflows/windows-package-check.yml');
const recipe = read('build/Package-Check.ps1');
test('package workflow is manual, private, bounded and read-only', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /github\.event\.repository\.private/);
  assert.match(workflow, /timeout-minutes: 10/);
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /actions: read/);
  assert.doesNotMatch(workflow, /\n\s*(push|schedule|pull_request_target):|contents: write|actions: write/);
});
test('packaging requires recorded success and unchanged application sources', () => {
  assert.match(workflow, /actions\/runs\/34310991868/);
  assert.match(workflow, /conclusion -cne 'success'/);
  assert.match(workflow, /c1c1264667650c41e534ec8d6fb1e722871d39a9/);
  assert.match(workflow, /git diff --exit-code --no-ext-diff/);
});
test('all external actions use immutable commit identifiers', () => {
  const actions = [...workflow.matchAll(/uses: ([^\s]+)/g)].map(m => m[1]);
  assert.equal(actions.length, 2);
  for (const action of actions) assert.match(action, /^actions\/[a-z-]+@[a-f0-9]{40}$/);
});
test('artifact selection is bounded, private and expires after three days', () => {
  assert.match(workflow, /retention-days: 3/);
  assert.match(workflow, /ENGINEERING-DO-NOT-INSTALL\.msix/);
  assert.doesNotMatch(workflow, /path: \./);
});
test('engineering baseline does not modify the production client acceptance gate', () => {
  assert.match(recipe, /\$TemporaryConfig = Join-Path \$env:RUNNER_TEMP/);
  assert.match(recipe, /-ConfigPath \$TemporaryConfig/);
  assert.match(recipe, /OriginalHash/);
  const config = JSON.parse(read('packaging/store-config.json'));
  assert.equal(config.maxVersionTested, 'REPLACE_AFTER_WINDOWS_COMPATIBILITY_TEST');
});
test('recipe checks archive allowlist, hashes and Store identity', () => {
  assert.match(recipe, /\$AllowedPayload/);
  assert.match(recipe, /Duplicate or case-colliding archive path/);
  assert.match(recipe, /ComputeHash\(\$Stream\)/);
  assert.match(recipe, /Packaged Microsoft Store identity mismatch/);
});
test('engineering report explicitly leaves Windows 11 acceptance and release unapproved', () => {
  assert.match(recipe, /windows11InstallAcceptance='NOT_RUN'/);
  assert.match(recipe, /maySubmitToStore=\$false/);
  assert.match(recipe, /mayInstallOnOwnerPC=\$false/);
  assert.match(recipe, /ownerProcessorArchitecture='NOT_CONFIRMED'/);
});
test('recipe does not install, sign, upload to Store or weaken endpoint protection', () => {
  assert.doesNotMatch(recipe + workflow, /Add-AppxPackage|New-SelfSignedCertificate|Import-Certificate|Set-MpPreference|Set-ExecutionPolicy|signtool\s+sign|\/nv\b/i);
  assert.match(recipe, /RUNNER_ENVIRONMENT -ne 'github-hosted'/);
});
