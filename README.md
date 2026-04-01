## Boilerplate Dashboard Starter

This project has been cleaned into a reusable starter with:

- Next.js app router scaffold
- Authentication (NextAuth)
- Local database connection (Dexie / IndexedDB)
- Server-side credentials store (SQLite)
- Starter user management (`/employees`)
- Minimal dashboard + settings pages

### Default starter users

- `admin@starter.local` / `admin123`
- `manager@starter.local` / `manager123`
- `staff@starter.local` / `staff123`

### Notes

- Legacy domain-specific POS routes were moved to `app/_archive/dashboard-legacy`.
- Active app routes are intentionally minimal so you can start a new project quickly.
- A new IndexedDB name is used (`boilerplate_dashboard_db`) so old local data is not reused.

## SQLite setup (for credentials auth)

1. (Optional) Set a custom DB file path:
   - `SQLITE_DB_PATH=./data/app.sqlite`
2. Initialize SQLite schema and seed starter users:
   - `npm run db:setup`
3. Start the app:
   - `npm run dev`

Notes:

- Credentials authentication now validates users from SQLite on the server.
- Dexie/IndexedDB remains in place for browser-local app data.
- SQLite schema source of truth: `sql/sqlite-schema.sql`.
- Combined schema reference (web + sqlite): `database-schema.sql`.
- Runtime SQLite safety defaults:
  - `PRAGMA journal_mode = WAL`
  - `PRAGMA busy_timeout = 5000`
- Automatic SQLite backups:
  - A daily backup runs while the server process is alive.
  - Backups checkpoint WAL (`PRAGMA wal_checkpoint(TRUNCATE)`) before copying.
  - Default backup folder: `data/backups`
  - Optional env vars:
    - `SQLITE_AUTO_BACKUP_DISABLED=1`
    - `SQLITE_AUTO_BACKUP_HOUR=2`
    - `SQLITE_AUTO_BACKUP_MINUTE=0`
    - `SQLITE_BACKUP_DIR=./data/backups`
    - `SQLITE_BACKUP_RETENTION_DAYS=14`

## Electron setup

Desktop mode is now wired with Electron main/preload processes and secure IPC.

1. Ensure dependencies are installed:
   - `npm install`
2. Run desktop in development (Next dev server + Electron):
   - `npm run desktop:dev`
3. Run desktop against production build:
   - `npm run build`
   - `npm run desktop:start`
4. Build a Windows installer for local testing:
   - `npm run desktop:dist:win`
5. Build a Windows installer for GitHub Releases:
   - `GITHUB_REPOSITORY=anthonybnajem/blood-system npm run desktop:dist:win:release`
6. Build a Mac installer for local testing:
   - `npm run desktop:dist:mac`
7. Build a Mac installer for GitHub Releases:
   - `GITHUB_REPOSITORY=anthonybnajem/blood-system npm run desktop:dist:mac:release`

Windows auto-update notes:

- Release builds generated with `desktop:dist:win:release` target GitHub Releases.
- Release builds generated with `desktop:dist:mac:release` target the same GitHub Release for macOS.
- Publish tagged releases from GitHub Actions with `.github/workflows/windows-release.yml` and `.github/workflows/mac-release.yml`.
- Push a tag such as `v0.1.0` to trigger the workflow and publish the Windows installer assets to the repo release.
- Push the same tag to publish both Windows and Mac assets under one GitHub Release.
- In the desktop app, open `Settings -> General -> Desktop Updates` to check, download, and install updates from GitHub.

Files added for Electron runtime:

- `electron/main.cjs`
- `electron/preload.cjs`
- `scripts/electron-dev.mjs`
- `scripts/electron-start.mjs`

## Settings: Developer and Backup

The Settings page now includes:

- `General` tab:
  - Project settings and theme mode.
  - Desktop updater controls when the app is running inside Electron.
- `Backup & Restore` tab:
  - Browser data backup/import (IndexedDB ZIP/JSON).
  - SQLite file backup/restore for server-side credential data.
- `Lab Tools` tab:
  - Browser DB health check and IndexedDB reset tools.

## Lab API (SQLite)

- GET /api/lab/dashboard-overview
- GET/POST /api/lab/patients
- GET/POST /api/lab/visits
- GET/POST /api/lab/catalog
- GET /api/lab/form-template
- POST /api/lab/results

## Lab Config UI

- Route: `/lab-config` (admin/manager)
- Manage:
  - Departments, panels, tests (form fields), and reference ranges.
  - Print behavior (show last result, hide empty rows/panels/departments, no-range placeholder).
- Import defaults from:
  - `docs/Dolly Kasshanna1.xlsx`
  - `docs/Norma.xlsx`
  - `docs/Zgharta Form 2.xls` (reads all tabs and imports form structure/ranges)

## Daily Entry UI

- Route: `/lab-entry`
- Workflow:
  - Select/create patient
  - Create visit form
  - Fill dynamic tabs by department/panel
  - Save draft results
