## Boilerplate Dashboard Starter

This project has been cleaned into a reusable starter with:

- Next.js app router scaffold
- Authentication (NextAuth)
- Local database connection (Dexie / IndexedDB)
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
