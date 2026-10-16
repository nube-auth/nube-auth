# Docker build workflow

`.github/workflows/docker-build.yml` builds and publishes images, then optionally deploys them to Railway.

## Staging

A manual dispatch with `branch=staging` builds one image:

- `nube-auth-staging` from `nube-scripts/deploy/docker/Dockerfile.app`

Default public hosts, used when the matching GitHub variable is unset:

- Home: `https://s-home.nubeauth.app`
- Admin: `https://s-manage.nubeauth.app`
- User: `https://s-me.nubeauth.app`
- Docs: `https://s-docs.nubeauth.app`
- API: `https://s-api.nubeauth.app`

## Production

A manual dispatch with `branch=trunk`, or a `v*` tag push, builds in three batches:

1. `core` and `gateway` in parallel
2. `workers` and `dashboards` in parallel, after batch 1
3. `prod-all-in-one` after batch 2

`concurrency` allows one workflow run per ref and cancels the older run. It does not limit jobs inside that run; the `needs` graph does.

## Timeouts and attestations

`_build-image.yml` gives each build step 25 minutes and each job 45 minutes. The job timeout is the reliable stop if Buildx ignores step cancellation. Images are pushed with provenance and SBOM attestations enabled.

## Checks

```bash
gh run list --workflow=docker-build.yml --limit 10
gh workflow run docker-build.yml --ref trunk -f branch=trunk
```
