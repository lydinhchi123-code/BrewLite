# BrewLite deployment and handover

This project is intended to run entirely on Render: the Next.js frontend and NestJS API are separate web services, with PostgreSQL as a private Render database. `render.yaml` describes these resources. Do not use the old Vercel or SSH/Docker-host deployment instructions.

## Production status

Deployment is not complete until the team creates the Render Blueprint, initializes its database, sets the two service URLs below, and verifies the end-to-end order flow.

| Part | Value after setup |
| --- | --- |
| Frontend | Copy the `brewlite-web` `onrender.com` HTTPS URL from Render |
| API | Copy the `brewlite-api` `onrender.com` HTTPS URL from Render |
| Health check | `<API URL>/health` (expected HTTP 200 and `{"status":"ok",...}`) |
| PostgreSQL | Render Postgres internal connection only; external IP allowlist is empty in `render.yaml` |

## First deployment

1. Push the reviewed branch containing `render.yaml` to the GitHub repository that Render can access. The repository must include this file at its root.
2. In Render, choose **New → Blueprint**, connect the BrewLite GitHub repository, and select the branch containing `render.yaml`.
3. Review the resources before applying: `brewlite-api`, `brewlite-web`, and `brewlite-db`. The Blueprint uses Singapore for all three so the API can reach PostgreSQL through Render's private network. The database's external IP allowlist is empty.
4. Apply the Blueprint. Render generates `JWT_SECRET` and sets `DATABASE_URL` from the database's private connection string. Do not copy that connection string into GitHub or the repository.
5. Open the `brewlite-api` service and copy its HTTPS `onrender.com` URL. In **Environment**, set `FRONTEND_URL` to the exact frontend HTTPS origin (no trailing slash). Open `brewlite-web` and set `NEXT_PUBLIC_API_URL` to the API HTTPS origin (no trailing slash). Save and redeploy both services. `NEXT_PUBLIC_API_URL` is included in the Next.js build, so the frontend must rebuild after changing it.
6. Initialize the new database with the SQL schema and seed files from the local setup section of the README. These scripts are for an empty database; do not rerun them on a database with existing data. Keep external database access disabled; use an approved, restricted admin path if the team must import SQL from a developer machine.
7. Open `<API URL>/health` and confirm HTTP 200. Then visit the frontend URL and verify the menu loads, add an item to cart, sign in, place a test order, and confirm it appears in order history.

The Blueprint's free plans are for a class demo, not durable production. Render's free web services can sleep after 15 minutes without traffic, and a free PostgreSQL database expires 30 days after creation. Upgrade to paid services/database before relying on the deployment for long-term production data. See [Render free instance limitations](https://render.com/docs/free).

## CI and deployments

GitHub Actions runs lint, tests, and builds for the API and frontend. Render services use `autoDeployTrigger: checksPass`, so Render deploys commits from the linked branch only after CI checks pass. Deployments and logs are visible in each service's **Events** and **Logs** pages in Render.

The repository does not currently define automated PostgreSQL migrations. For schema changes, back up the database first, apply a reviewed migration using the database owner's process, verify it, and then deploy. Never run the fresh-database schema/seed sequence against an existing production database.

## Health check

The API provides `GET /health`. Render uses `/health` as the API service health check. It confirms that NestJS started; it does not currently verify database connectivity.

## Rollback

1. In Render, open the service's **Events** page and select the last known-good deploy.
2. Choose **Rollback** and confirm. Roll back the API and frontend separately if both services changed.
3. Check `<API URL>/health`, reload the frontend, and verify the affected flow.
4. If a database migration ran, confirm it is compatible with the previous application version. Render code rollback does not reverse database changes; restore a backup or apply a reviewed corrective migration if needed.

## Release and handover checklist

- [ ] Record the production frontend HTTPS URL, API HTTPS URL, and API `/health` URL.
- [ ] Confirm the PostgreSQL external IP allowlist is empty and `DATABASE_URL` uses the private Render connection.
- [ ] Confirm production secrets are stored in Render Environment and absent from the repository and CI logs.
- [ ] Verify the frontend, menu, authentication, checkout, and order history against production.
- [ ] Create a version tag and GitHub Release with release notes after production verification.
- [ ] Record a live end-to-end demo video using non-sensitive demo data.
- [ ] Record Sprint Review feedback and Retrospective action items in the team's sprint notes.
- [ ] Ask someone outside the group to clone the repository, follow the README, and open the production URLs.
