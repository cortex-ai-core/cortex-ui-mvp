# Environment prerequisites

Updated October 23, 2026. **Test publishing is enabled on `test`; Prod remains disabled.** See [the README Test section](../README.md#test-environment-and-dev-to-test-promotion) for the authoritative workflow, account/role configuration, exact artifact verification, backend-version gate, DNS and recovery.

A Test push promotes a retained successful Dev `static-web` artifact after SHA-256 verification. It does not rebuild the website. It requires the compatible backend Dev release in Test and publishes only to account `223323955607`. The AWS role and script gate require the exact Test branch/event. No application data, users or organizations are transferred.

The backend owns all Test infrastructure and viewer-certificate activation. The security contact owns GoDaddy validation/routing records. Use the generated CloudFront URL while custom DNS/ACM issuance is pending.

Prod account `474711723859` remains locked. Its separate authorization, protected release path, accepted same-artifact Test evidence, infrastructure, secrets, data/identity plan, DNS, monitoring and recovery prerequisites are in the [backend environment guide](https://github.com/cortex-ai-core/cortex-mvp/blob/test/docs/environment-prerequisites.md). A Test deployment does not enable Prod.

Offline preparation/policy reports do not establish live readiness. Do not use preparation-fixture templates as deployment inputs or bypass disabled-environment gates.
