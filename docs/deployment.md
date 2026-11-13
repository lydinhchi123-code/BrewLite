# BrewLite deployment and handover

This guide describes the deployment currently represented by the repository: Vercel serves the frontend; GitHub Actions builds the NestJS API image, pushes it to Docker Hub, then deploys it to a Docker host over SSH.

## Current status

| Part | Status |
| --- | --- |
| Frontend | Vercel URL: <https://brew-lite-khaki.vercel.app> |
| Production API host | Not configured in this repository. `PROD_HOST` must be supplied by the deployment owner. |
| Production database | No provider or URL is documented. The database must be reachable privately by the API host. |
| Health check | `GET /health`; the workflow checks `https://$PROD_HOST/health`. |
| Vercel API URL | Must be changed from `http://localhost:3001` to the production API HTTPS URL after the API is deployed. |

The Vercel frontend currently requests `http://localhost:3001/menu/products`; that address refers to the computer opening the page. The production flow is incomplete until a public HTTPS API URL and private production database are configured.

## Required production layout

1. Vercel serves the Next.js frontend at `https://brew-lite-khaki.vercel.app`.
2. A server with Docker and an HTTPS reverse proxy serves the NestJS API at `https://<PROD_HOST>` and forwards requests to container port `3001`.
3. PostgreSQL accepts connections only from the API host/private network. Do not publish its database port to the internet.
4. GitHub Actions and the hosting platform hold production credentials. Do not commit them or print them in CI logs.

The exact API host, DNS/TLS setup, and PostgreSQL provider are deployment-owner configuration and are not present in this repository yet.

## Configure GitHub Actions

In the repository's **Settings → Secrets and variables → Actions → Secrets**, add:

| Secret | Purpose |
| --- | --- |
| `DOCKER_USERNAME` | Docker Hub account that owns `brewlite-api` |
| `DOCKER_PASSWORD` | Docker Hub access token |
| `PROD_HOST` | SSH host name; use the host name only, without `https://` |
| `PROD_USER` | SSH user with permission to run Docker |
| `PROD_SSH_KEY` | Private SSH key for the production host |
| `PROD_DATABASE_URL` | PostgreSQL connection string available to the API host |
| `PROD_JWT_SECRET` | Long random signing key for production JWTs |

The production frontend origin is currently set in the workflow to `https://brew-lite-khaki.vercel.app` for CORS. If the Vercel production domain changes, update the `FRONTEND_URL` entries in `.github/workflows/ci.yml` and redeploy.

Never paste secret values into issues, pull requests, chat, README, or terminal commands that may be recorded in shell history. Verify that each required secret is configured without exposing its value.

## Deploy

1. Confirm the API host has Docker installed, HTTPS enabled, and a reverse proxy forwarding to host port `3000` (the workflow maps this to container port `3001`).
2. Confirm PostgreSQL is provisioned, has the BrewLite schema and seed data, and is not publicly accessible. Allow the API host to connect privately.
3. Configure all required GitHub Actions secrets above.
4. Set Vercel **Project → Settings → Environment Variables → Production**:

   ```env
   NEXT_PUBLIC_API_URL=https://<PROD_HOST>
   ```

   Use the API origin, not the frontend URL and not `localhost`. Redeploy the Vercel production project after changing the variable.

5. Merge the reviewed deployment change into `master`. The workflow runs lint, tests, and builds for pull requests; after a push to `master`, it builds and pushes the API image, deploys it over SSH, and checks `https://<PROD_HOST>/health`.
6. Confirm the workflow's **Deploy & Verify Production** job succeeds. Open the health URL and the Vercel site from a browser outside the development setup. Verify menu loading and the end-to-end order flow.

The workflow does not currently apply database migrations automatically. For a schema change, back up production first, apply the reviewed SQL migration using the production database owner’s process, verify it, then deploy the API. Do not use a destructive reset or re-run seed scripts on production.

## Health check

The API responds to `GET /health` with HTTP 200 and a small JSON status response when NestJS has started. This endpoint is a process health check; it does not expose database credentials or application data.

## Rollback

- If deployment or the health check fails, GitHub Actions attempts to restart the previous Docker image.
- If a successful deployment needs to be reverted, create and merge a revert pull request for the deployment commit on `master`. The normal CI/CD workflow then builds and deploys the reverted code.
- If a database migration was applied, check compatibility before reverting API code. The current workflow does not roll back database schema changes; restore from the pre-migration backup or apply a reviewed corrective migration.
- After rollback, verify `https://<PROD_HOST>/health` and the production frontend again.

## Release and handover checklist

- [ ] Replace `<PROD_HOST>` with the actual production API URL in the handover materials.
- [ ] Verify HTTPS frontend and API URLs, including `/health`.
- [ ] Confirm database access is private and CI/hosting secrets are configured.
- [ ] Create a version tag and GitHub Release with notes after production verification.
- [ ] Record a live end-to-end demo video using non-sensitive demo data.
- [ ] Record Sprint Review feedback and Retrospective action items in the team's sprint notes.
- [ ] Ensure a new contributor can clone the repository and follow the README.
