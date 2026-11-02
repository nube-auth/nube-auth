# Build staging and production

How to publish container images for staging and production, and how those images land on Railway.

Builds are not automatic on branch push. They run from GitHub Actions. The source of truth is:

- [`.github/workflows/docker-build.yml`](../.github/workflows/docker-build.yml) — build, publish, and redeploy
- [`.github/workflows/_build-image.yml`](../.github/workflows/_build-image.yml) — reusable image build called by Build & Publish. Not a workflow you run
- [`.github/workflows/build-verify.yml`](../.github/workflows/build-verify.yml) — lint, typecheck, and tests on push/PR

`build-verify.yml` does not produce a deployable artifact. A green check there only means the branch is safe to build.

## What each environment builds

| | Staging | Production |
|---|---|---|
| Git branch | `staging` | `trunk` |
| Trigger | Manual dispatch of **Build & Publish** | Manual dispatch, or a `v*` tag push |
| Topology | One all-in-one container | Four service images, plus one combined image |
| Dockerfile | `nube-scripts/deploy/docker/Dockerfile.app` | Per-service Dockerfiles, plus `Dockerfile.app` |
| Platforms | `linux/amd64` | `linux/amd64,linux/arm64` |
| Railway | One `app` service | `core`, `gateway`, `workers`, `dashboards` |
| Public hosts | `s-*` prefix (`s-api`, `s-manage`, `s-me`, `s-docs`, `s-home`) | `api`, `manage`, `me`, `docs`, and `www` |

Staging keeps Railway cheap: supervisord runs core (3003), gateway (3004), workers (3005), and nginx (8080) in one container. Production splits those so each service can scale and roll independently. The combined `nube-auth-app:production` image is published as a fallback; the build workflow does not deploy it.

### Images and tags

Registry: `ghcr.io/nube-auth`.

The package name is the service. The tag is the environment. Git branch names and `:latest` are not image tags.

```text
ghcr.io/nube-auth/nube-auth-<service>:<env>
ghcr.io/nube-auth/nube-auth-<service>:<env>-<sha>
ghcr.io/nube-auth/nube-auth-<service>:<version>   # v* push only
```

| Image | Staging | Production |
|---|---|---|
| `nube-auth-app` | `:staging` | `:production` (published, not deployed) |
| `nube-auth-core` | not built | `:production` |
| `nube-auth-gateway` | not built | `:production` |
| `nube-auth-workers` | not built | `:production` |
| `nube-auth-dashboards` | not built | `:production` |

A `v*` push always builds **trunk**, not the commit the tag happens to point at. The reusable workflow checks out `ref: trunk` on purpose, so a stale tag cannot overwrite the `:production` tags Railway watches. The version is an extra tag on those same images.

Production builds in three batches so runners do not exhaust themselves:

1. Core and gateway, in parallel
2. Workers and dashboards, in parallel, after batch 1
3. Combined `nube-auth-app:production`, after batch 2

Each image job times out at 30 minutes. The build step itself times out at 20 minutes.

## Before you build

### 1. Code is on the right branch

```bash
git checkout staging   # or trunk
git pull
git status             # clean, and nube-scripts submodule is the commit you intend
```

Dockerfiles and the Railway deploy script live in the `nube-scripts` submodule. CI checks that submodule out with `secrets.GH_PAT`. A local commit that only bumps the submodule pointer is not enough if that pointer was never pushed.

### 2. GitHub secrets and variables

**Secrets** (Settings → Secrets and variables → Actions → Secrets):

| Name | Used for |
|---|---|
| `GH_PAT` | Read the private `nube-scripts` submodule during checkout |
| `RAILWAY_TOKEN` | Railway GraphQL deploy after the image is pushed |
| `GITHUB_TOKEN` | Provided by Actions. Logs in to GHCR |

**Variables:**

| Name | Used for |
|---|---|
| `NUBE_DOMAIN` | Apex domain baked into dashboard URLs. Defaults to `nubeauth.com` |
| `RAILWAY_PROJECT_ID` | Railway project UUID |
| `RAILWAY_STAGING_ENVIRONMENT_ID` | Staging environment UUID |
| `RAILWAY_PRODUCTION_ENVIRONMENT_ID` | Production environment UUID |
| `RAILWAY_SERVICE_ID_STAGING` | Staging `app` service |
| `RAILWAY_SERVICE_ID_PRODUCTION_CORE` | Production core |
| `RAILWAY_SERVICE_ID_PRODUCTION_GATEWAY` | Production gateway |
| `RAILWAY_SERVICE_ID_PRODUCTION_WORKERS` | Production workers |
| `RAILWAY_SERVICE_ID_PRODUCTION_DASHBOARDS` | Production dashboards |

If `RAILWAY_TOKEN`, `RAILWAY_PROJECT_ID`, or the environment id is missing, the image still publishes. The deploy step logs that Railway is not configured and exits 0. The same happens when a service id variable is unset. A green **Build & Publish** run is not proof that Railway rolled.

`RAILWAY_SERVICE_ID_PRODUCTION_APP` is only used by a manual redeploy of the combined image. The build workflow does not set a Railway suffix for `nube-auth-app:production`.

### 3. Hosts baked into the image

Dashboard and marketing URLs are compile-time. The `meta` job runs [`scripts/print-nube-hosts.mjs`](../scripts/print-nube-hosts.mjs) and passes the result as Docker build args.

With the default domain, staging gets:

- `VITE_GATEWAY_URL` / `PUBLIC_GATEWAY_URL` = `https://s-api.nubeauth.com`
- `VITE_HOME_URL` / `PUBLIC_SITE_URL` = `https://s-home.nubeauth.com`
- `VITE_ADMIN_URL` / `PUBLIC_ADMIN_URL` = `https://s-manage.nubeauth.com`
- `VITE_USER_URL` / `PUBLIC_USER_URL` = `https://s-me.nubeauth.com`
- `VITE_DOCS_URL` / `PUBLIC_DOCS_URL` = `https://s-docs.nubeauth.com`
- `VITE_ENV_TAG` / `PUBLIC_ENV_TAG` = `Staging`

Production uses `https://api.nubeauth.com`, `https://www.nubeauth.com`, `https://manage.nubeauth.com`, `https://me.nubeauth.com`, `https://docs.nubeauth.com`, and `Production`.

Set `NUBE_DOMAIN` if the apex is not `nubeauth.com`. Do not invent per-URL GitHub variables; the workflow does not read them.

Runtime secrets (`SESSION_SECRET`, `DATABASE_URL`, payment keys, and the rest) are not build args. They live on the Railway service, or are fetched at startup by DaemonHound. See [nube-auth.deploy.staging.yml](../nube-scripts/deploy/configs/nube-auth.deploy.staging.yml) and [nube-auth.deploy.prod.yml](../nube-scripts/deploy/configs/nube-auth.deploy.prod.yml).

## Build staging

Staging does not build on push. Dispatch it.

```bash
gh workflow run docker-build.yml --ref staging -f branch=staging -f action=build
gh run list --workflow=docker-build.yml --limit 5
gh run watch
```

Or in GitHub: Actions → **Build & Publish** → Run workflow → branch `staging`, action `build`.

The `--ref` must be able to see the workflow file. Use `staging` (or `trunk` if that branch already has the same workflow). The `branch` input is what selects the staging job. Passing `branch=trunk` builds production even if you started the run from the staging ref.

Expected jobs: `Parameters`, then `Staging (all-in-one)`.

On success the image is:

```text
ghcr.io/nube-auth/nube-auth-app:staging
ghcr.io/nube-auth/nube-auth-app:staging-<sha>
```

If Railway variables are set, the same job deploys that `:staging` tag to the staging `app` service and waits for the deployment.

### Check staging

```bash
curl -fsS https://s-api.nubeauth.com/ready
curl -fsS -o /dev/null -w "%{http_code}\n" https://s-manage.nubeauth.com
curl -fsS -o /dev/null -w "%{http_code}\n" https://s-me.nubeauth.com
```

The all-in-one container's healthcheck is `GET /ready` on port 8080. Nginx serves the dashboards and proxies the API.

## Build production

Promote to `trunk` first, then build. Do not dispatch a trunk build from a staging-only commit; the workflow checks out `trunk`.

```bash
git checkout trunk
git pull
git merge staging --no-ff
git push origin trunk

gh workflow run docker-build.yml --ref trunk -f branch=trunk -f action=build
gh run watch
```

Or: Actions → **Build & Publish** → Run workflow → branch `trunk`, action `build`.

Expected jobs, in order:

1. `Parameters`
2. `Core` and `Gateway`
3. `Workers` and `Dashboards (combined)`
4. `Production (all-in-one)`

Core, gateway, workers, and dashboards each deploy themselves when their image push succeeds. The combined image is pushed and not deployed.

### Release tag

Pushing a `v*` tag also starts **Build & Publish**. It still checks out `trunk`, and it adds the version as an extra tag (`v1.2.3`) on the production images.

```bash
git checkout trunk
git pull
git tag v1.2.3
git push origin v1.2.3
```

Railway keeps watching `:production`. The version tag is for pinning a later redeploy, not for changing what the automatic deploy uses.

### Check production

```bash
curl -fsS https://api.nubeauth.com/ready
curl -fsS -o /dev/null -w "%{http_code}\n" https://manage.nubeauth.com
curl -fsS -o /dev/null -w "%{http_code}\n" https://me.nubeauth.com
curl -fsS -o /dev/null -w "%{http_code}\n" https://www.nubeauth.com
```

Service containers (core, gateway, workers) expose `/ready` on port 8080. The dashboards image exposes `/health` on port 8080.

## Redeploy without rebuilding

Dispatch **Build & Publish** with `action=deploy`. That skips the image build and rolls a tag already in GHCR: an env-var change, a failed deploy step, or a rollback.

```bash
# Current staging image
gh workflow run docker-build.yml --ref trunk \
  -f branch=staging -f action=deploy

# One production service
gh workflow run docker-build.yml --ref trunk \
  -f branch=trunk -f action=deploy -f service=gateway

# All production services (core, gateway, workers, dashboards)
gh workflow run docker-build.yml --ref trunk \
  -f branch=trunk -f action=deploy

# Pin a previous image
gh workflow run docker-build.yml --ref trunk \
  -f branch=staging -f action=deploy -f tag=staging-<sha>
```

`branch=staging` redeploys the staging app. `branch=trunk` redeploys production. Blank `tag` means `staging` or `production`. Blank `service` on production deploys core, gateway, workers, and dashboards, not the combined `app` image. Staging always deploys `app`.

This does not build. If the tag is not in GHCR, Railway will fail the rollout.

There is no workflow that deletes GHCR packages. Delete a retired package (`nube-auth-staging`, `nube-auth-prod`) from the GitHub Packages UI after both environments are on the new names.

## Concurrency

- A second **build** on the same branch cancels the in-progress build. A **deploy** does not cancel another deploy.
- **Lint, Typecheck & Test** cancels older runs on the same branch.

Do not start a second staging or trunk build while the first is still pushing. The second run can cancel the first mid-push.

## When a build fails

```bash
gh run list --workflow=docker-build.yml --limit 5
gh run view <run-id> --log-failed
```

| Symptom | What it usually means |
|---|---|
| Checkout fails on `nube-scripts` | `GH_PAT` missing, expired, or lacking read access to `nube-auth/nube-scripts` |
| Job cancelled as soon as another run starts | Concurrency group cancelled it. Re-run after the other build finishes |
| Build step killed around 20 minutes | Buildx hung or the runner ran out of resources. Re-run that workflow; do not raise the timeout to hide a hang |
| Image published, Railway still on the old release | Railway vars/token missing, or the deploy step failed. It is `continue-on-error: true`. Redeploy with `action=deploy` |
| Dashboard calls the wrong API | `NUBE_DOMAIN` was wrong at build time. URLs are baked in. Rebuild; changing Railway env vars does not rewrite `VITE_*` |
| Tag push deployed unexpected code | Expected. Tag builds check out `trunk`, not the tagged commit |

A failed Railway step in the build workflow does not roll back the GHCR tag. The next successful build of that environment overwrites `:staging` or `:production`.

## Local image build

CI is the supported path. A local build is only for debugging the Dockerfile. Run it from the repo root so the workspace context is correct.

```bash
# Staging all-in-one (amd64 is what Railway staging runs)
NUBE_DOMAIN=nubeauth.com NUBE_ENV=staging node scripts/print-nube-hosts.mjs > /tmp/nube-build-args
docker build -f nube-scripts/deploy/docker/Dockerfile.app \
  --platform linux/amd64 \
  --build-arg NUBE_DOMAIN=nubeauth.com \
  -t nube-auth-app:local .

# One production service
docker build -f nube-scripts/deploy/docker/Dockerfile.core \
  --platform linux/amd64 \
  -t nube-auth-core:local .
```

Pass the host build args from `print-nube-hosts.mjs` for any image that compiles dashboards (`Dockerfile.app`, `Dockerfile.dashboards`). Core, gateway, and workers do not need them.

Do not `docker push` over `:staging` or `:production` from a laptop. Those tags are what Railway deploys.
