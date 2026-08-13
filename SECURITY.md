# Security policy

## Supported version

Security fixes are applied to the latest Three Body Lab release. The project is research and
educational software; it performs deterministic classical-mechanics simulation only, accepts
no untrusted file uploads, and must not be treated as a source of real-world orbital or
navigational predictions.

## Reporting a vulnerability

Please use GitHub's private vulnerability-reporting flow for this repository. Do not include
secrets, personal data, or exploit payloads in a public issue.

## Dependency boundary

CI rejects known high-severity vulnerabilities in production web dependencies
(`pnpm audit --prod --audit-level high`). The interactive site accepts no user file uploads,
no authentication, and no server-side persistence of visitor input — every simulator control is
computed client-side from typed, bounded numeric inputs.

The `image-size` package currently has two published denial-of-service advisories
([ICNS](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr),
[JXL/HEIF](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq)) with no patched npm release at
the time of this release. It is a transitive `vinext` build dependency (via
`@vinext/cloudflare`), is absent from the deployed worker bundle, and Three Body Lab accepts no
file uploads or remote image input. This is the same upstream, unresolved dependency this
maintainer's sibling project (Fairshift Lab) already tracks; the residual build-time risk
remains tracked here until an upstream fix is available.
