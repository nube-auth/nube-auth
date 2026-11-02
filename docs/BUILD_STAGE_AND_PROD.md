# Build staging and production

How to publish container images for staging and production, and how those images land on Railway.

Builds are not automatic on branch push. They run from GitHub Actions. The source of truth is:

- [`.github/workflows/deploy-staging.yml`](../.github/workflows/deploy-staging.yml) — one-click staging build & deploy (zero inputs required)
- [`.github/workflows/deploy-production.yml`](../.github/workflows/deploy-production.yml) — production build, redeploy, or single-service rollout
- [`.github/workflows/_build-image.yml`](../.github/workflows/_build-image.yml) — reusable image build called by both workflows
- [`.github/workflows/build-verify.yml`](../.github/workflows/build-verify.yml) — lint, typecheck, and tests on push/PR

`build-verify.yml` does not produce a deployable artifact. A green check there only means the branch is safe to build.

## What each environment builds

| | Staging | Production |
|---|---|---|
| Git branch | `staging` | `trunk` |
| Trigger | Manual dispatch of **Deploy Staging** (zero inputs) | Manual dispatch of **Deploy Production**, or a `v*` tag push |
| Topology | One all-in-one container | Four microservice images, plus one combined image |
| Dockerfile | `nube-scripts/deploy/docker/Dockerfile.app` | Per-service Dockerfiles, plus `Dockerfile.app` |
| Platforms | `linux/amd64` | `linux/amd64,linux/arm64` |
| Railway | One `nubeauth-staging` service | `nubeauth-core`, `nubeauth-gateway`, `nubeauth-workers`, `nubeauth-dashboards` |
| Public hosts | `s-*` prefix (`s-api`, `s-manage`, `s-me`, `s-docs`, `s-home`) | `api`, `manage`, `me`, `docs`, and `www` |

Staging keeps Railway cheap: supervisord runs core (3003), gateway (3004), workers (3005), and nginx (8080) in one container. Production splits those so each service can scale and roll independently. The combined `nube-auth-prod-all:latest` image is published as a fallback; the build workflow only deploys it if explicitly requested (`service: all-in-one`).

### Image Naming Convention

Registry: `ghcr.io/nube-auth`.

Pattern: `nube-auth-<env>-<service>:<tag>`

```text
ghcr.io/nube-auth/nube-auth-<env>-<service>:latest
ghcr.io/nube-auth/nube-auth-<env>-<service>:sha-<commit_sha>
ghcr.io/nube-auth/nube-auth-<env>-<service>:<version>   # v* push or explicit release tag
```

| Image Name | Environment | Target |
|---|---|---|
| `nube-auth-staging-all` | Staging | Combined all-in-one container (`Dockerfile.app`) |
| `nube-auth-prod-core` | Production | Core API & database logic (`Dockerfile.core`) |
| `nube-auth-prod-gateway` | Production | API gateway & proxy (`Dockerfile.gateway`) |
| `nube-auth-prod-workers` | Production | Background workers & queues (`Dockerfile.workers`) |
| `nube-auth-prod-dashboards` | Production | Admin, User, Docs & Home frontend (`Dockerfile.dashboards`) |
| `nube-auth-prod-all` | Production | Fallback / Standalone all-in-one container (`Dockerfile.app`) |

A `v*` push always builds **trunk**, not the commit the tag happens to point at. The reusable workflow checks out `ref: trunk` on purpose, so a stale tag cannot overwrite the `:latest` tags Railway watches. The version is an extra tag on those same images.

Production builds in three batches for speed and stability:

1. Core and Gateway, in parallel
2. Workers and Dashboards, in parallel, after batch 1
3. Combined `nube-auth-prod-all`, after batch 2

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
| `RAILWAY_SERVICE_ID_STAGING` | Staging `nubeauth-staging` service |
| `RAILWAY_SERVICE_ID_PRODUCTION_CORE` | Production `nubeauth-core` |
| `RAILWAY_SERVICE_ID_PRODUCTION_GATEWAY` | Production `nubeauth-gateway` |
| `RAILWAY_SERVICE_ID_PRODUCTION_WORKERS` | Production `nubeauth-workers` |
| `RAILWAY_SERVICE_ID_PRODUCTION_DASHBOARDS` | Production `nubeauth-dashboards` |
| `RAILWAY_SERVICE_ID_PRODUCTION_APP` | Production standalone `nubeauth-app` (optional) |

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

Set `NUBE_DOMAIN` if the apex is not `nubeauth.com`.

Runtime secrets (`SESSION_SECRET`, `DATABASE_URL`, payment keys, and the rest) are not build args. They live on the Railway service, or are fetched at startup by DaemonHound. See [nube-auth.deploy.staging.yml](../nube-scripts/deploy/configs/nube-auth.deploy.staging.yml) and [nube-auth.deploy.prod.yml](../nube-scripts/deploy/configs/nube-auth.deploy.prod.yml).

## Build & Deploy Staging

Staging is a **one-click deploy**: zero inputs required!

```bash
gh workflow run deploy-staging.yml --ref staging
gh run list --workflow=deploy-staging.yml --limit 5
gh run watch
```

Or in GitHub: Actions → **Deploy Staging** → Run workflow.

Expected jobs: `Parameters`, then `Staging (all-in-one)`.

On success the image is:

```text
ghcr.io/nube-auth/nube-auth-staging-all:latest
ghcr.io/nube-auth/nube-auth-staging-all:sha-<commit_sha>
```

The job automatically deploys `:latest` to the `nubeauth-staging` service on Railway.

### Check staging

```bash
curl -fsS https://s-api.nubeauth.com/ready
curl -fsS -o /dev/null -w "%{http_code}\n" https://s-manage.nubeauth.com
curl -fsS -o /dev/null -w "%{http_code}\n" https://s-me.nubeauth.com
```

## Build & Deploy Production

Promote to `trunk` first, then trigger:

```bash
git checkout trunk
git pull
git merge staging --no-ff
git push origin trunk

# Build and deploy all production microservices
gh workflow run deploy-production.yml --ref trunk
gh run watch
```

Or in GitHub: Actions → **Deploy Production** → Run workflow.

### Production Workflow Options:
- **`action`**:
  - `build_and_deploy` (default) — builds image(s), pushes to GHCR, rolls Railway.
  - `deploy_only` — skips build; redeploys existing image tag to Railway.
  - `build_only` — builds and pushes to GHCR without deploying to Railway.
- **`service`**:
  - `all` (default) — all 4 microservices (`core`, `gateway`, `workers`, `dashboards`).
  - `core` — only `nube-auth-prod-core`.
  - `gateway` — only `nube-auth-prod-gateway`.
  - `workers` — only `nube-auth-prod-workers`.
  - `dashboards` — only `nube-auth-prod-dashboards`.
  - `all-in-one` — standalone fallback container `nube-auth-prod-all`.
- **`tag`**:
  - `latest` (default) — or specify a release tag like `v1.2.3` or commit SHA.

### Release tag push

Pushing a `v*` tag also triggers **Deploy Production**. It checks out `trunk`, builds all services, and tags them with both `:latest` and the version tag (`:v1.2.3`):

```bash
git checkout trunk
git pull
git tag v1.2.3
git push origin v1.2.3
```

### Redeploy without rebuilding (deploy_only)

```bash
# Roll all production microservices
gh workflow run deploy-production.yml --ref trunk -f action=deploy_only -f service=all

# Roll only the gateway
gh workflow run deploy-production.yml --ref trunk -f action=deploy_only -f service=gateway

# Roll back to a specific tag
gh workflow run deploy-production.yml --ref trunk -f action=deploy_only -f service=core -f tag=v1.2.2
```

## Local image build with Just

```bash
# Build staging all-in-one locally
just docker-staging

# Build all production services locally
just docker-prod-all-services

# Build a single service locally
just docker-core
just docker-gateway
just docker-workers
just docker-dashboards
just docker-prod
```
