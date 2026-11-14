# BrewLite

BrewLite is a drink ordering web application. The frontend is built with Next.js, the API with NestJS, and data is stored in PostgreSQL.

## Production

The production target is Render. Production URLs will be recorded in [the deployment guide](docs/deployment.md) after the Render services are created and verified. The API health check is `GET /health`.

## Requirements

- Node.js 24 and npm
- PostgreSQL 18
- Git

## Run locally

### Option A: run the full stack with Docker Compose

Install and open Docker Desktop, then run this from the repository root:

```powershell
docker compose up --build
```

The first run creates PostgreSQL, applies the schema/seed SQL in the documented order, and starts the API and web app. Open <http://localhost:3000>; the API health endpoint is <http://localhost:3001/health>. PostgreSQL is available to local tools at `localhost:5433` so it does not conflict with a PostgreSQL service already using port 5432. If port 5433 is already in use, set `$env:POSTGRES_PORT = "5434"` in PowerShell before starting Compose and use the same port for database-backed tests.

Stop the services with `Ctrl+C`, then run `docker compose down`. The database volume remains so your local data is kept. To intentionally erase that volume and recreate the seeded database, run `docker compose down -v` and then `docker compose up --build`. **This deletes all local Compose database data.**

### Option B: run the apps against a manually started PostgreSQL

#### 1. Create and initialize the database

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

#### 2. Configure the API

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

#### 3. Configure and start the frontend

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

The GitHub Actions workflow runs lint, unit tests, an API end-to-end test against seeded PostgreSQL, and builds for both apps on pull requests to `master`.

The API end-to-end test also needs a fresh seeded PostgreSQL database. Docker Compose provides one:

```powershell
# From the repository root
$env:POSTGRES_PORT = "5434" # Use 5433 instead if it is free on your computer.
docker compose up -d --wait db
cd apps/api
$env:DATABASE_URL = "postgresql://postgres:brewlite_dev@localhost:5434/brewlite_db"
$env:JWT_SECRET = "local-e2e-only-secret"
npm run test:e2e -- --runInBand
Remove-Item Env:DATABASE_URL
Remove-Item Env:JWT_SECRET
cd ..\..
docker compose down
```

The e2e test loads the menu, registers and signs in a temporary customer, creates and pays for a pickup order, then reads the order confirmation. GitHub Actions starts the same Compose database before running this test and removes it afterward.

## Deploy and rollback

The frontend, API, and private PostgreSQL database are configured as Render resources in `render.yaml`. GitHub Actions validates changes; Render deploys after the linked branch's CI checks pass. Follow [docs/deployment.md](docs/deployment.md) to create the Blueprint, set the production URLs, initialize the database, and roll back a deployment.

## Security

- Keep production database access limited to the API host; do not expose PostgreSQL directly to the public internet.
- Store `DATABASE_URL` and application secrets in Render Environment; do not copy them to GitHub Actions or the repository.
- Do not place production secrets in this repository, `.env.example`, or CI output.
