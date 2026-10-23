import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const expectedAccounts = { dev: '909762691423', test: '223323955607', prod: '474711723859' };
const configuration = JSON.parse(readFileSync(new URL('../../deployment/environments.json', import.meta.url), 'utf8'));

export function settings(environment) {
  if (!Object.hasOwn(expectedAccounts, environment)) throw new Error('Select dev, test or prod explicitly.');
  const saved = configuration[environment];
  if (saved?.account !== expectedAccounts[environment] || saved?.region !== 'us-west-2') throw new Error('Environment account/region configuration mismatch.');
  return saved;
}

export function assertDeploymentEnabled(environment, execution = process.env) {
  const saved = settings(environment);
  if (saved.deploymentEnabled !== true) {
    throw new Error(`${environment} deployment is disabled. Complete docs/environment-prerequisites.md and approve a separate enablement PR first.`);
  }
  if (environment === 'test' && execution.GITHUB_ACTIONS === 'true'
      && (execution.GITHUB_REF !== 'refs/heads/test' || !['push', 'workflow_dispatch'].includes(execution.GITHUB_EVENT_NAME))) {
    throw new Error('Test deployment requires the test branch and a push or workflow_dispatch event.');
  }
  return saved;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv[2] === '--report') {
    console.log(JSON.stringify({ preparationOnly: true, liveReadiness: 'Not checked',
      environments: Object.keys(expectedAccounts).map(environment => ({ environment, ...settings(environment) })) }, null, 2));
  } else {
    assertDeploymentEnabled(process.argv[2]);
    console.log(`${process.argv[2]} deployment policy allows the existing release path.`);
  }
}
