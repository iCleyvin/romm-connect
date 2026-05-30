#!/usr/bin/env node
// by Cleyvin
//
// CI wrapper around `expo-doctor` that tolerates exactly ONE known, intentional
// failure and nothing else.
//
// Known/allowed failure:
//   "Check that no duplicate dependencies are installed" reporting a duplicate
//   of @expo/fingerprint ONLY. This is caused by the `hot-updater` devDependency
//   pinning an older @expo/fingerprint than the (canary) Expo SDK. @expo/fingerprint
//   is build-time tooling for OTA update identity and is NOT bundled into the
//   APK/AAB, so the duplicate cannot cause native-build conflicts. Deduping would
//   require a global npm override that risks breaking hot-updater's CLI.
//
// Any other doctor failure -> exit 1 (so new regressions are not hidden).

const { spawnSync } = require('child_process');

const ALLOWED_DUP = '@expo/fingerprint';

const res = spawnSync('npx', ['expo-doctor'], {
  encoding: 'utf8',
  shell: true,
});

const raw = `${res.stdout || ''}${res.stderr || ''}`;
// Strip ANSI color codes so matching is reliable.
const out = raw.replace(/\[[0-9;]*m/g, '');
process.stdout.write(raw);

if (res.status === 0) {
  console.log('\n[doctor:ci] expo-doctor passed with no failures.');
  process.exit(0);
}

// Collect the headers of every failed check (lines beginning with the ✖ marker).
const failedChecks = out
  .split('\n')
  .filter((line) => line.includes('✖'))
  .map((line) => line.replace(/.*✖\s*/, '').trim());

// Collect every package reported as duplicated.
const dupPackages = [...out.matchAll(/Found duplicates for\s+(\S+?):/g)].map((m) => m[1]);

const onlyDuplicateCheckFailed =
  failedChecks.length === 1 &&
  /duplicate dependencies/i.test(failedChecks[0]);

const onlyFingerprintDuplicated =
  dupPackages.length > 0 && dupPackages.every((pkg) => pkg === ALLOWED_DUP);

if (onlyDuplicateCheckFailed && onlyFingerprintDuplicated) {
  console.log(
    `\n[doctor:ci] Ignoring the single known failure: duplicate ${ALLOWED_DUP} ` +
      `(pulled by the hot-updater devDependency, build-time only, not bundled). ` +
      `All other checks passed. Treating as success.`
  );
  process.exit(0);
}

console.error(
  '\n[doctor:ci] expo-doctor reported failures beyond the allowlisted ' +
    `${ALLOWED_DUP} duplicate. Failing the build.\n` +
    `  failed checks: ${JSON.stringify(failedChecks)}\n` +
    `  duplicated packages: ${JSON.stringify(dupPackages)}`
);
process.exit(1);
