# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

GymPro CRM — a CRM for neighborhood gyms, built as a coursework project (Gestión Aplicada al
Desarrollo de Software I, Grupo DevLink). It is a monorepo with two independent npm projects:

- `backend/` — Node.js + Express + TypeScript + Prisma (MySQL)
- `frontend/` — React + Vite + TypeScript SPA

There is no root `package.json`; all commands are run from inside `backend/` or `frontend/`.

## Commands

### Backend (`cd backend`)

```bash
npm run dev              # tsx watch — dev server on http://localhost:4000 (health check: /health)
npm run build            # tsc -p tsconfig.json -> dist/
npm start                # run compiled dist/server.js
npm run setup            # prisma generate && prisma migrate dev && seed (first-time DB setup)
npm run prisma:generate  # regenerate Prisma client after editing schema.prisma
npm run prisma:migrate   # create/apply a migration (prompts for a name unless --name is passed)
npm run prisma:seed      # re-run prisma/seed.ts (test user, etapas, productos)
```

There is no lint or test script configured in either project — do not assume `npm test`/`npm run lint`
exist. Type-check by running the relevant `build` command.

Requires a running MySQL instance and a `backend/.env` (copy from `.env.example`) with `DATABASE_URL`,
`JWT_SECRET`, etc. — see `backend/src/config/env.ts` for the full list of required vars.

Seeded login: `admin@gympro.com` / `gympro123`.

### Frontend (`cd frontend`)

```bash
npm run dev       # Vite dev server on http://localhost:5173
npm run build     # tsc -b && vite build
npm run preview   # preview the production build
```

`frontend/.env` (copy from `.env.example`) sets `VITE_API_URL`, defaulting to
`http://localhost:4000/api`.

## Architecture

### Backend: strict layered modules (`routes → service → repository`)

Each domain lives under `backend/src/modules/<name>/` with up to three files:

- `*.routes.ts` — Express router. Mounts `requireAuth`, parses/validates the request with a Zod
  schema (defined in the service file), calls the service, sends the response. No business logic.
- `*.service.ts` — business rules and Zod schemas (e.g. `oportunidadSchema`). Throws `ApiError` for
  domain violations. Calls the repository; never touches `prisma` directly for anything the
  repository already models.
- `*.repository.ts` — the only place that calls `prisma.*`. Encapsulates includes/selects/ordering
  so query shape isn't duplicated across services.

Some modules are read-mostly and skip the service/repository split (`etapas`, `productos`) — routes
call Prisma directly for those. When adding a real module, follow the three-file pattern used by
`empresas`, `contactos`, and `oportunidades`.

All module routers are wired in `backend/src/routes/index.ts` and mounted under `/api` in
`backend/src/app.ts`. `errorMiddleware` (last middleware in `app.ts`) is the single place that turns
`ZodError` → 400 with field errors, `ApiError` → its own status/message, and anything else → 500.
Route handlers don't need try/catch: wrap the handler body in `asyncHandler` (`utils/asyncHandler.ts`)
and just `throw`.

Auth is a JWT bearer token (`utils/jwt.ts`, `middlewares/auth.middleware.ts`) checked per-router with
`router.use(requireAuth)`. `req.user` carries `{ userId, rol }`. `middlewares/role.middleware.ts`
(`requireRole(...roles)`) exists and is wired for future use, but the MVP seed only creates
`ADMINISTRADOR` users, so it doesn't currently block anything — don't remove it as dead code.

### Data model is ahead of the current API/UI on purpose

`backend/prisma/schema.prisma` already models the full domain the final delivery ("Entrega Final")
needs — `Actividad`, `HistorialEtapa`, `Usuario.rol` — even though the current MVP only exposes a
subset through routes/pages. When extending scope, prefer wiring up existing schema/fields over
adding new ones; check the schema before assuming a table/column doesn't exist.

Key domain rules enforced in the service layer (see `oportunidades.service.ts`):
- An `Oportunidad` must be linked to an `Empresa` and/or a `Contacto` — never neither
  (`validarRelacionComercial`).
- Changing an oportunidad's `etapaId` (`cambiarEtapa`) always writes a `HistorialEtapa` row in the
  same Prisma transaction — stage changes and their audit trail must never be split.
- Moving into an `Etapa` whose `tipo` is `GANADA`/`PERDIDA` auto-derives `estado` and
  `fechaRealCierre` on the oportunidad; moving to `PERDIDA` additionally requires `motivoPerdida`.
- Once an oportunidad's `estado` isn't `ABIERTA`, further stage changes are rejected outright (no
  reopen flow yet — planned for the final delivery, gated by an authorization step).
- The embudo board (`tableroEmbudo` / `GET /api/embudo`) groups **all** oportunidades by `etapaId`,
  not just open ones, so won/lost cards keep showing in their closing column instead of vanishing.

### Domain vocabulary (gym-specific mapping — don't rename these back to generic CRM terms)

- **Contacto** = a person (gym member or membership prospect).
- **Empresa** = a corporate agreement (a company paying for its employees' memberships); optional,
  most contactos have no empresa.
- **Producto** = a gym membership plan (e.g. "Musculación mensual", "Personal training") — not the
  same concept as GymPro's own SaaS pricing tiers.
- **Oportunidad** = an in-progress membership inquiry.
- **Etapas** (seeded, ordered): Consulta recibida → Clase de prueba agendada → Clase de prueba
  realizada → Propuesta de membresía enviada → Negociación → Inscripto (Ganada) / Perdida.

### Frontend

Plain React Router SPA, no state library. `src/App.tsx` defines routes; everything except `/login` is
wrapped in `routes/ProtectedRoute.tsx` + `context/AuthContext.tsx` (token/user in context, persisted
via `localStorage`). `src/api/client.ts` is a single Axios instance: it attaches the bearer token from
`localStorage` on every request and force-redirects to `/login` on a 401 response. Pages
(`src/pages/*.tsx`) call the API directly through this client — there's no separate API-hooks layer.

The frontend has no routing/pages beyond empresas, contactos, oportunidades, and the embudo board,
matching the backend's current MVP scope.

## Known bugs to fix

- **Creating or editing an oportunidad with a direct `etapaId` bypasses every `cambiarEtapa` business
  rule.** Both `oportunidadesService.crear()` (`POST /api/oportunidades`) and `actualizar()`
  (`PUT /api/oportunidades/:id`, submitted by the "Nueva oportunidad" / "Editar oportunidad" modals in
  `OportunidadesPage.tsx`) write `etapaId` straight through the repository instead of going through
  `cambiarEtapa()`, which is the only place that derives `estado`/`fechaRealCierre`, enforces
  `motivoPerdida`, blocks changes once closed, and writes the `HistorialEtapa` audit row. Confirmed two
  ways:
  - Live in the current dev database: oportunidad id 12 ("Empleado Textil") sits in etapa "Inscripto"
    (`tipo: GANADA`) with `estado: "ABIERTA"` and `fechaRealCierre: null`, because it was created
    directly into that stage instead of moved there via `cambiar-etapa`.
  - Reproduced via the API: an oportunidad moved to GANADA through `cambiar-etapa` (correctly getting
    `estado: GANADA` + `fechaRealCierre`) and then edited back to an open etapa through the plain `PUT`
    keeps `estado: GANADA` (now sitting in an open-type etapa) and adds **no** new `HistorialEtapa` row.
  Either way, the embudo board and the oportunidades table end up disagreeing about whether the deal is
  still open. Fix by having `crear()`/`actualizar()` derive `estado`/`fechaRealCierre` (and require
  `motivoPerdida` for a PERDIDA etapa) the same way `cambiarEtapa()` does, or by stripping `etapaId` from
  the general create/edit payload and forcing all stage assignment through `cambiar-etapa`.

- **`probabilidadCierre` and `fechaEstimadaCierre` have no input anywhere in the UI.** Both fields
  exist on `Oportunidad` and are rendered on the embudo cards (the progress-bar percentage and the date
  pill), but `OportunidadesPage.tsx`'s create/edit form (`formVacio` and its submit `payload`) never
  includes them, so every oportunidad created or edited through the app has both permanently `null`.
  The embudo board silently falls back to an etapa-order heuristic for the percentage and shows "Sin
  fecha estimada" forever. Add inputs for these two fields to the oportunidad form.

- **The baja lógica endpoints for contactos/empresas are unreachable from the UI.**
  `POST /api/contactos/:id/baja` and `POST /api/empresas/:id/baja` exist and do a soft-delete
  (`estado: INACTIVO`), but neither `ContactosPage.tsx` nor `EmpresasPage.tsx` ever calls them — the
  only way to "dar de baja" a record today is to open the edit modal and manually pick `INACTIVO` from
  the Estado dropdown. Either wire a "Dar de baja" action to the existing endpoint, or remove it if the
  generic edit form is meant to be the only path.

- **`CORS_ORIGIN`'s default doesn't track Vite's actual port.** `backend/src/config/env.ts` defaults
  `corsOrigin` to `http://localhost:5173`, but Vite auto-increments to 5174+ whenever 5173 is already
  taken (observed firsthand running this repo's dev servers) — when that happens every API request from
  the frontend is blocked by CORS until `.env`'s `CORS_ORIGIN` is updated by hand. Worth a callout in
  the setup docs, or making the mismatch fail with a clearer error.
