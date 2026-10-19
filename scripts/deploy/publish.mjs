import {spawnSync} from 'node:child_process';
import {writeFile,mkdir,cp} from 'node:fs/promises';
import {assertDeploymentEnabled} from './policy.mjs';
const environment=process.argv[2]||'dev';
const target=assertDeploymentEnabled(environment);
const aws=(args)=>{const r=spawnSync('aws',[...args,'--region','us-west-2','--output','json'],{encoding:'utf8'});if(r.status!==0)throw new Error(r.stderr);return r.stdout.trim()?JSON.parse(r.stdout):null;};
if(aws(['sts','get-caller-identity']).Account!==target.account)throw new Error('Wrong AWS account.');
const outputs=Object.fromEntries(aws(['cloudformation','describe-stacks','--stack-name',`cortex-${environment}-delivery`]).Stacks[0].Outputs.map(o=>[o.OutputKey,o.OutputValue]));
const bucket=`cortex-web-${environment}-${target.account}-us-west-2`;
const run=(args)=>{if(spawnSync(args[0],args.slice(1),{stdio:'inherit'}).status!==0)throw new Error('Web publishing failed.');};
// Upload hashed assets first, then pages. Keep older hashed assets for open tabs and rollback.
run(['aws','s3','sync','out/_next',`s3://${bucket}/_next`,'--cache-control','public,max-age=31536000,immutable','--region','us-west-2','--only-show-errors']);
run(['aws','s3','sync','out',`s3://${bucket}`,'--exclude','_next/*','--cache-control','no-cache,max-age=0,must-revalidate','--region','us-west-2','--only-show-errors']);
await mkdir('out/releases',{recursive:true});
await writeFile('out/releases/current.json',JSON.stringify({commit:process.env.GITHUB_SHA||'local-reviewed-build',run:process.env.GITHUB_RUN_ID||null,at:new Date().toISOString()}));
run(['aws','s3','cp','out/releases/current.json',`s3://${bucket}/releases/current.json`,'--cache-control','no-cache','--region','us-west-2','--only-show-errors']);
aws(['cloudfront','create-invalidation','--distribution-id',outputs.DistributionId,'--paths','/*']);
console.log('Oregon UI:',outputs.Url);
