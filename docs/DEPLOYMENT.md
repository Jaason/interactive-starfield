# CI and GitHub Pages

Milestone 9 is partially implemented. Workflows are prepared, locally checked,
and approved for commit/push on 2026-11-27. First hosted verification remains
pending. No site has been deployed.
GitHub Free supports Actions for this private repository within its included
usage allowance. Pages will be enabled after a separately approved change to
public visibility. No paid plan is required for that path.

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

## First hosted run and deployment

These steps remain pending and must follow the project's approval workflow:

1. Commit/push the prepared workflows after approval. Inspect the first CI run
   on GitHub; local checks are not proof that hosted runners have passed.
2. Add the CI badge after that run is available. Confirm pull-request checks on
   a real PR before marking that acceptance criterion complete.
3. After approval to publish the repository/site, review the release checklist
   and change repository visibility to public.
4. In **Settings → Pages → Build and deployment**, select **GitHub Actions**.
   Restrict the `github-pages` environment to `main`; add any desired available
   deployment protection. The workflow's branch guard already requires `main`.
5. In **Actions → GitHub Pages → Run workflow**, select `main` and dispatch.
6. Inspect validation, build, and deployment. Open the URL returned by the
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

Hosted Linux execution, real PR events, environment/OIDC authorization, artifact
upload/download, and public hosting have not been exercised. No hosted success,
deployment reproducibility, or live-site availability is claimed yet. Workflow
files contain no custom credentials; this is not a release history/secrets audit.

References: [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages),
[GitHub Actions usage](https://docs.github.com/en/billing/concepts/product-billing/github-actions),
and [Pages availability](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).
