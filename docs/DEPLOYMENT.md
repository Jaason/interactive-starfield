# CI and GitHub Pages

The repository was made public and GitHub Pages deployed with explicit approval
on 2026-11-27. The [playground](https://jaason.github.io/interactive-starfield/)
and [benchmark](https://jaason.github.io/interactive-starfield/benchmark/) are live.
CI and the deployment passed; remaining PR/failure-path checks mean Milestone 9
is not yet fully verified. npm publication remains separate.

## Continuous integration

`.github/workflows/ci.yml` runs on pushes to `main` and pull requests targeting
`main`. It is also reusable by the Pages workflow so deployment validates the
same revision, rather than relying on a previous run's result.

One Ubuntu 24.04 job uses Node 26.2.0 and runs, in order:

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run build:benchmark
npm run verify:site
npm run verify:site -- dist-benchmark
npm run verify:package
node scripts/verify-docs.mjs
```

Any failing step fails the job. There is no `continue-on-error`. Package checking
includes the library build, real tarball installation, zero runtime dependencies,
type resolution, import safety, and bounded resource checks. Site checking
resolves emitted HTML/CSS references under both `/` and `/interactive-starfield/`,
checks entry scripts, the demo's benchmark link, and artifact file types. It does
not parse JavaScript-generated URLs or replace real-browser testing.

The npm download cache is keyed through `setup-node` and the lockfile; `npm ci`
still installs dependencies on every fresh runner. Runs are limited to 15 minutes
and superseded checks for the same workflow/ref are cancelled. No routine CI
artifacts are uploaded, avoiding unnecessary storage use. This is one verified
Node version, not a compatibility matrix for every supported toolchain version.

Browser profiling, external React/browser checks, Safari/Firefox, physical-device
checks, and the deferred eight-hour run remain separate procedures. CI does not
silently launch long-duration tests. A passing CI check does not itself prevent
merges: a repository ruleset/branch protection must separately require that check
if available for the account and repository visibility.

## Prepared Pages workflow

`.github/workflows/pages.yml` is **manual only** (`workflow_dispatch`). Pushing a
commit or making the repository public does not trigger a deployment. Its first
job runs only on `main` in a public repository; private/non-main dispatches skip
the dependent jobs. This guard reflects the agreed Free-account rollout.

The job chain is `validate` → `build` → `deploy`. Validation calls the CI workflow.
Build checks out the same workflow revision, installs from the lockfile, builds
the site, verifies its paths, and uploads only `dist/` as a Pages artifact with
one-day retention. A failed/skipped validation or build cannot reach deployment.
The deployed site contains the playground at its root and benchmark at
`benchmark/`. Relative Vite asset paths support GitHub project-site hosting.

The workflow's default token permission is `contents: read`. The build job also
has `pages: read` for Pages configuration lookup; only the deploy job receives
`pages: write` and `id-token: write`. Checkout does not persist credentials. The
workflow uses GitHub's provided token/OIDC and requires no personal token, npm
token, or repository secret. Official actions are pinned to reviewed release
commit SHAs; update those pins deliberately when maintaining the workflows.

Pages deployments use the `github-pages` environment and a separate concurrency
group. An active deployment is not cancelled by a newer dispatch. The workflow
does not enable Pages, change repository visibility, publish npm, or update the
repository website URL automatically.

## Deploying updates and remaining checks

The first deployment and public-visibility change are complete. For later updates,
follow the project's approval workflow:

1. Confirm pull-request checks on a real PR before marking that acceptance
   criterion complete. The first main-push CI run has already passed.
2. Review and approve the revision to deploy. Pages is already configured to use
   **GitHub Actions**. The workflow requires public visibility and `main`.
3. In **Actions → GitHub Pages → Run workflow**, select `main` and dispatch.
4. Inspect validation, build, and deployment. Open the URL returned by the
   deployment, then verify the demo, controls, benchmark link, and assets in a
   browser. Record the actual URL, update README/package homepage and GitHub's
   website field, and only then mark the hosted checks complete.

Do not infer a live URL from the repository name before deployment succeeds.
The npm release and npm badge remain Milestone 10 work.

## Local verification record

On 2026-11-27, both workflows passed actionlint 1.7.12. Its release binary was
downloaded to a temporary directory and checked against the official release's
checksum; it is not a project dependency. The local commands above passed on
macOS with Node 26.2.0/npm 11.13.0, including 66 tests. A clean `npm ci` from the
lockfile also passed in an isolated temporary directory using the local cache.

The shared site passed checks for seven files and 16 HTML/CSS references across
the two URL prefixes; the standalone benchmark passed for three files and four
references. Temporary copies with an absolute asset path, missing page link,
or missing module entry failed as expected. Previous Chrome production checks
are recorded in [packaging verification](PACKAGING.md); rendering code is unchanged.

## Hosted CI result

On 2026-11-27, [CI run #1](https://github.com/Jaason/interactive-starfield/actions/runs/45966417354)
completed successfully for main-push commit
`04e99116fd775e5fb794142167217c83fc6c302f` on the configured Ubuntu runner.
GitHub job results confirm every step passed: installation, unit tests, types,
both site builds, both path checks, package verification, and documentation.
README now includes a branch-specific CI badge without any embedded token.
The repository is now public, so the CI badge can be viewed without repository access.

Real PR events, deliberate failure propagation on hosted runners, and repeated
deployment reproducibility remain untested. The first successful Pages run below
verified environment/OIDC authorization, artifact transfer, and public hosting.

## First public deployment — 2026-11-27

[Pages run #1](https://github.com/Jaason/interactive-starfield/actions/runs/45977542241)
deployed commit `da8e4adc704fdbfc976d078d0fa354db1ceeb2dd`. Its validation, build,
and deploy jobs all succeeded. Pages uses the workflow build type, HTTPS is
enforced, and the repository website field points to the live playground.

The existing Chrome verifier passed against the actual HTTPS URL: default scene,
presets, configuration export/validation, pause/resume, 100 paused preset switches,
fixed resource counts, reduced motion, clipboard branches, keyboard/focus,
simulated page restoration, native tab hiding, 390px layout/emulated touch, and
the relative benchmark link. No JavaScript exceptions were recorded. Desktop
capture was reviewed; physical mobile and Safari/Firefox checks remain deferred.

Public pages and assets are checked without authentication. No custom domain,
npm publication, or automatic push-triggered deployment was configured. Browser
checks are bounded functional checks, not new performance or eight-hour results.

## Pre-publication repository review

The 2026-11-27 review covered the tracked repository at `04e9911`, all 29 commits
reachable from local refs (main/origin/main), commit messages/author metadata,
and 144 unique historical file blobs. Gitleaks 8.30.1 scanned all those commits
with its default rules and full output redaction: no leaks were detected. Its
temporary release binary was verified against the official release checksum;
neither the tool nor its reports were added as project dependencies/artifacts.

Additional pattern checks found no private-key headers, common service tokens,
credentials in HTTP URLs, local user-home paths, or sensitive-looking filenames
such as `.env`, `.npmrc`, or private-key files. Author/committer email addresses
use GitHub `noreply`. The author's name is intentionally present in commit
metadata and the MIT license. Benchmark reports contain test environment details
and measurements; those are part of the documented verification context.

`AGENTS.md`, milestone approvals, and engineering verification records are project
documentation. No saved AI conversation transcripts were found in the reviewed
files. Retaining the development history is appropriate; no history rewrite or
removal of AI-related workflow instructions was performed.

Markdown URL inventory (current files and their reachable historical versions)
contains 12 distinct external addresses: this repository and its CI run/workflow/
badge, the original JSFiddle prototype, official GitHub/npm/Vite documentation,
and the public MIT badge. URL parameters only select the CI branch/event; no
embedded access token was found. Current relative Markdown links stay inside the
repository. Loopback addresses are local test instructions, not private-service
links. The JSFiddle content could not be independently fetched by the review tool.
Repository and CI URLs currently require repository access; the links themselves
do not grant that access. Hosted CI logs were reviewed separately below.

### Hosted log review

On 2026-11-27 the GitHub API listed one workflow run, one attempt, and one job.
The complete decoded log for run `45966417354`, job `140396044889`, was reviewed
for credentials, private data, URLs, and local paths. Common service-token,
private-key, and credential-bearing URL pattern checks found no matches; the
content review found no unmasked credentials, personal email addresses, private
conversation content, or paths from the author's computer.

Both action token inputs and the checkout authorization header show `***`.
The log records removal of the temporary checkout credentials configuration.
Visible paths belong to the hosted runner (`/home/runner`, `/tmp`, tool-cache
directories), not the developer's machine. Other visible metadata consists of
the repository name, commit/action SHAs, runner image/region and temporary IDs,
tool versions, test results, bundle sizes, and the npm cache key. These are
ordinary build details, not access credentials. URLs point to this repository
or official GitHub action/runner/Node resources; no URL query tokens were found.

No log redaction changes or deletion were needed based on this review. This is
limited to the one available run at the time of inspection; later runs and
content already masked by GitHub are not covered. No raw log was added to the
repository, and this log review did not rerun Gitleaks against the log text.

This is a bounded pre-publication review, not proof that every possible secret,
encoded payload, or private detail has been detected. Ignored/untracked local
files, unreachable Git objects, GitHub issues/PR discussions, and account settings
are outside this review. Review new commits before publication. Repository
visibility, deployment, and npm publication remain separate approval steps.

References: [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages),
[GitHub Actions usage](https://docs.github.com/en/billing/concepts/product-billing/github-actions),
and [Pages availability](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).
