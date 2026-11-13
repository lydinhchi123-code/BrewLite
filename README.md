# BrewLite

BrewLite is a drink ordering web application. The frontend is built with Next.js, the API with NestJS, and data is stored in PostgreSQL.

## Production

- Frontend: <https://brew-lite-murex.vercel.app>
- API: not configured yet. The production frontend currently needs a public API URL; see [deployment guide](docs/deployment.md).
- API health check: `GET /health` after the API is deployed.

## Requirements

- Node.js 24 and npm
- PostgreSQL 18
- Git

## Run locally

### 1. Create and initialize the database

Start the PostgreSQL service, then create a fresh database:

```powershell
psql -U postgres -h localhost -c "CREATE DATABASE brewlite_db;"
```

From the repository root, load the SQL files in this order:

```powershell
psql -U postgres -h localhost -d brewlite_db -f database/Menu.sql
psql -U postgres -h localhost -d brewlite_db -f database/TaiKhoanKhachHang.sql
psql -U postgres -h localhost -d brewlite_db -f database/NguyenLieu.sql
psql -U postgres -h localhost -d brewlite_db -f database/DonHang-ThanhToan.sql
psql -U postgres -h localhost -d brewlite_db -f database/GiamGia.sql
psql -U postgres -h localhost -d brewlite_db -f database/migrations/20261027_upgrade_order_details.sql
```

The scripts initialize a new local database. Do not rerun them against a database that already contains the schema unless you intend to reset it.

### 2. Configure the API

Create `apps/api/.env`:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/brewlite_db
PORT=3001
FRONTEND_URL=http://localhost:3000
JWT_SECRET=replace_with_a_local_random_secret
```

Replace the sample database password and JWT secret locally. Never commit `.env` files or production credentials.

Install dependencies and start the API in one terminal:

```powershell
cd apps/api
npm ci
npm run start:dev
```

The API is available at <http://localhost:3001>. Check <http://localhost:3001/health> for `{"status":"ok"}`.

### 3. Configure and start the frontend

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

In a second terminal:

```powershell
cd apps/web
npm ci
npm run dev
```

Open <http://localhost:3000>.

## Check, test, and build

Run commands from the relevant app directory:

```powershell
# API
cd apps/api
npm run lint
npm test -- --runInBand
npm run build

# Frontend
cd ..\web
npm run lint
npm run test
npm run build
```

The GitHub Actions workflow runs lint, unit tests, and builds for both apps on pull requests to `master`.

## Deploy and rollback

The frontend is deployed from Vercel. The API workflow builds a Docker image, pushes it to Docker Hub, deploys it to a server over SSH, checks `/health`, and attempts to restore the previous image if the health check fails. Deployment configuration and required GitHub settings are documented in [docs/deployment.md](docs/deployment.md).

The production API host, database, and their URLs must be configured before the frontend can use the production API. The current Vercel deployment must not use `localhost` as its API URL.

## Security

- Keep production database access limited to the API host; do not expose PostgreSQL directly to the public internet.
- Store `DATABASE_URL`, SSH credentials, and registry credentials in the hosting provider or GitHub Actions secrets.
- Do not place production secrets in this repository, `.env.example`, or CI output.
