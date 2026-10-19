# Test and Prod frontend preparation

Owner: SolluCIO Cortex frontend. Updated October 19, 2026.

**Test and Prod publishing are disabled.** [deployment/environments.json](../deployment/environments.json) enables the existing Dev path and locks Test/Prod. No AWS resources or GitHub environment settings are created by this preparation. Backend infrastructure and frontend publishing need separate reviewed enablement changes later.

| Environment | Account | Region | Publishing |
| --- | --- | --- | --- |
| Dev | `909762691423` | `us-west-2` | Existing push-to-`dev` path |
| Test | `223323955607` | `us-west-2` | Locked |
| Prod | `474711723859` | `us-west-2` | Locked |

## Safe checks

From the frontend repository, using Node 24:

```bash
npm run test:deployment
npm run prepare:environments
```

These commands use Node built-ins, need no AWS session and do not publish/build the website. The report prints account/region and repository gate settings; it does not verify live infrastructure. PR CI also installs dependencies and builds the real Next.js static export.

Manual GitHub Actions dispatch defaults to `prepare_only: true`: build/verification runs and the deploy job is skipped. Selecting Test/Prod and explicitly disabling preparation still fails at the repository policy check before AWS authentication. `publish.mjs` enforces the same check for manual CLI use, before STS or S3 calls. Dev push behavior is preserved.

This guard is not an AWS permission boundary. Do not bypass it using direct S3/CloudFront CLI calls. Only a reviewed enablement change following the prerequisites below should enable a new environment.

## Prerequisites before enabling publishing

1. Obtain explicit authorization to provision the target account. Follow the backend's [environment preparation runbook](https://github.com/cortex-ai-core/cortex-mvp/blob/dev/docs/environment-prerequisites.md); it owns VPC, RDS/Cognito, ECS/parser/worker, upload signer, logging, certificates, buckets and CloudFront.
2. Repository admin configures `test`/`prod` GitHub environments, approved release references and reviewer protections supported by the organization's plan. Ensure the workflow is available on the default branch. YAML `environment: prod` alone does not create reviewer protection.
3. Apply the reviewed target Foundation with the environment-specific frontend OIDC role. Its trust must match this repository and the actual environment subject. Use temporary OIDC credentials; do not add AWS access keys or backend secrets to frontend settings.
4. Verify Data/Delivery stack outputs in the exact account: private `cortex-web-ENV-ACCOUNT-us-west-2` bucket, CloudFront distribution and same-origin `/api/*` route. Test the backend before publishing dependent UI.
5. Use the generated CloudFront address or approve a custom viewer hostname, validate its us-east-1 certificate and publish GoDaddy DNS records. The selected private API origin needs no public ALB or origin hostname/certificate. Update document-bucket CORS with the exact viewer origin. No Test/Prod names or certificates are created by these files.
6. Implement release-artifact promotion before enablement. Current manual dispatch rebuilds the frontend; it does not promote a previously accepted artifact. The future promotion job must verify the selected successful build/run, frontend commit and artifact checksum, then publish those exact files. Record the compatible backend release and Test acceptance before Prod promotion.
7. Review a separate enablement PR for this repo and the backend. Do not simply change `deploymentEnabled` to true while prerequisites/promotion are missing.

The same build can serve each environment because the deployed UI uses an explicitly empty `NEXT_PUBLIC_BACKEND_URL` (same-origin API) and `NEXT_PUBLIC_DIRECT_UPLOAD=true`. Never bake a Dev API hostname into a Test/Prod artifact. Local testing can continue with the explicit localhost backend URL described in the [README](../README.md).

## Acceptance and recovery

Verify first-login password change, password recovery/email, chat/streaming, temporary chat attachments, library signed S3 uploads, document readiness/retrieval, citations and access isolation. Confirm old browser tabs still load retained hashed assets after a release. Record target account, distribution, URL, backend/frontend versions, successful deployment runs and acceptance evidence.

The publisher uploads hashed assets before HTML, retains old hashed assets and invalidates CloudFront. This is not an atomic website transaction or database rollback. If a release fails, inspect its failed stage and use the reviewed previous artifact/source with the existing guarded publisher. See the backend [runtime and recovery runbook](https://github.com/cortex-ai-core/cortex-mvp/blob/dev/docs/runtime-and-recovery.md).

Only offline repository checks have been performed for this prerequisite work; no Test/Prod deployment or live acceptance is implied.
