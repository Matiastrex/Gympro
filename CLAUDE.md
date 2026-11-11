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
npm run prisma:seed      # re-run prisma/seed.ts (users, etapas, productos and the catálogos)
npm run seed:demo        # WIPES oportunidades/contactos/empresas/actividades and loads demo data
```

There is no lint or test script configured in either project — do not assume `npm test`/`npm run lint`
exist. Type-check by running the relevant `build` command.

Requires a running MySQL instance and a `backend/.env` (copy from `.env.example`) with `DATABASE_URL`,
`JWT_SECRET`, etc. — see `backend/src/config/env.ts` for the full list of required vars. The team also
shares a MySQL on Azure (commented-out `DATABASE_URL` in `.env.example`): after pulling a branch with
new migrations, run `npm run prisma:migrate` (and `prisma:seed` if it adds catalogs) against whichever DB
you use. Write migrations that touch existing rows by hand (see `add_actividades`) so shared data isn't lost.

Stop dev servers you started before handing back: a leftover `npm run dev` keeps port 4000 busy
(`EADDRINUSE`) and pushes Vite to 5174, which breaks CORS.

Seeded logins (one per rol, all with password `gympro123`): `admin@gympro.com` (ADMINISTRADOR),
`responsable@gympro.com` (RESPONSABLE_COMERCIAL), `vendedor@gympro.com` (VENDEDOR).

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

Every module follows the three-file pattern (`embudo` is just a route over `oportunidadesService`).
Follow it when adding one.

All module routers are wired in `backend/src/routes/index.ts` and mounted under `/api` in
`backend/src/app.ts`. `errorMiddleware` (last middleware in `app.ts`) is the single place that turns
`ZodError` → 400 with field errors, `ApiError` → its own status/message, and anything else → 500.
Route handlers don't need try/catch: wrap the handler body in `asyncHandler` (`utils/asyncHandler.ts`)
and just `throw`.

Auth is a JWT bearer token (`utils/jwt.ts`, `middlewares/auth.middleware.ts`) checked per-router with
`router.use(requireAuth)`. `requireAuth` re-reads the usuario on every request, so `req.user`
(`{ userId, rol }`) carries the **current** rol, and a usuario with `activo: false` gets a 401 even with
a still-valid token. Gate whole routes with `requireRole(...roles)` (`middlewares/role.middleware.ts`)
after `requireAuth`. It's used by usuarios management, approving or rejecting reaperturas, and every
write in configuración (catálogos, etapas, productos).

Per-record permissions live in `utils/permisos.ts`, and services receive the `actor` (`req.user!`):
- ADMINISTRADOR and RESPONSABLE_COMERCIAL (`veTodo`) see everything and can assign/reassign
  `responsableId` to any active usuario. A VENDEDOR only sees records where they are the responsable:
  `alcance(actor)` adds `{ responsableId }` to listados and to the embudo, and `verificarAcceso` returns
  403 on detail/edit/baja/cambiar-etapa of someone else's record.
- Contactos and empresas also store `creadoPorId`. A VENDEDOR's listado of those two includes what they
  created (`alcanceConCreador`), and `obtener(id, actor, "ver")` lets the creator open the detail.
  That access is read-only: edit/baja use the default `"editar"` mode, which requires being the current
  responsable. The UI disables those buttons in that case.
- Reassigning an oportunidad (`responsableId` changes in `actualizar`) also reassigns its contacto/empresa
  in the same transaction (`reasignarEntidades` in the repository, on both the plain update path and the
  `cambiarEtapa` path).
- `resolverResponsable` decides the stored responsable: whatever a VENDEDOR creates is assigned to them,
  and they can't reassign it (403). Use it in every create/update of empresa, contacto or oportunidad.
- `verificarAccesoRelacion` stops a VENDEDOR from linking a contacto to someone else's empresa, or an
  oportunidad to someone else's empresa/contacto.
- `oportunidadesService.obtener(id, actor?)` and `cambiarEtapa({ actor? })` skip the check when `actor`
  is omitted. That's only for internal calls, like `cancelarInscripcion` from a baja, which already
  checked access on the contacto/empresa. Routes must always pass the actor.
- Frontend mirror: `veTodo(rol)` in `constants/roles.ts`, and `components/ResponsableSelect.tsx` (used by
  the empresa, contacto and oportunidad forms) renders a locked "(vos)" select for a VENDEDOR.

Usuarios (`modules/usuarios`, page `UsuariosPage.tsx`, admin-only) have no DELETE — they're deactivated
with `activo: false`. The service rejects an admin changing their own rol or deactivating themselves,
and any change that would leave zero active `ADMINISTRADOR`s. `GET /api/usuarios` stays open to every
rol (it feeds the responsable selects) and returns only active usuarios; `?incluirInactivos=true` is
honored for admins only. On the frontend, `constants/roles.ts` holds the `Rol` type and labels;
`ProtectedRoute` accepts `roles` and the Sidebar's links can declare `roles` to hide themselves.

Actividades (`modules/actividades`, page `ActividadesPage.tsx`) are past interactions — **immutable**:
only `POST /api/actividades` and reads, no PUT/DELETE. Rules in `actividades.service.ts`:
- `tipoActividadId` points to the configurable `TipoActividad` catalog (`GET
  /api/catalogos/tipos-actividad`). `fecha` can't be in the future
  (agenda/tareas are out of scope) and `usuarioId` is always the actor.
- Must link a contacto, empresa and/or oportunidad. From an oportunidad, its contacto/empresa are
  copied onto the actividad; a contacto with convenio adds its empresa. That's what makes it show up in
  every related historial. Registering requires edit access (responsable) on what it links to.
- `GET /api/actividades` is paginated (`utils/paginacion.ts`: `page`/`pageSize` → `Paginado<T>`), with
  filters `tipoActividadId`, `usuarioId`, `desde`, `hasta`, `q`. A VENDEDOR sees what they registered plus
  activity on records they're responsable for (`alcanceActividades` in `permisos.ts`).
- `GET /api/actividades/historial?contactoId=|empresaId=|oportunidadId=` (exactly one, `RefEntidad`)
  returns the merged timeline: `{ kind: "actividad" | "etapa" | "edicion", fecha, ... }` sorted newest first. An
  empresa's historial includes its contactos' activity. An oportunidad's historial also includes the
  actividades of its contacto/empresa that have no `oportunidadId` (e.g. logged before the oportunidad was
  created), dated after the previous oportunidad of that entity closed (`findCierreAnterior`) and up to this
  one's `fechaRealCierre`, so consecutive oportunidades don't share them. Nothing is written onto the actividades. Frontend: `components/HistorialComercial.tsx`
  (used in the contacto, empresa, oportunidad and embudo detail modals) and `ActividadForm.tsx`; shared
  types in `src/types/actividades.ts`.

Reapertura of a lost oportunidad (`modules/reaperturas`) is the only way back from a closed estado:
- Only `estado: PERDIDA` can be reopened (Inscripto and Inscripción cancelada can't), into an etapa with
  `tipo: ABIERTA` that the requester picks (the UI defaults to the etapa it was lost from), with a
  mandatory `motivo`. Same guards as creating one: the contacto/empresa can't be `CLIENTE` or already have
  another `oportunidadAbiertaId`, and `bajaDefinitiva` blocks clase de prueba etapas. They're re-checked
  on approval because things may have changed in between.
- `POST /api/oportunidades/:id/reapertura`: a VENDEDOR (own oportunidades) or RESPONSABLE_COMERCIAL
  creates a `SolicitudReapertura` (`PENDIENTE`) and a notification for every active admin. An
  ADMINISTRADOR calling it reopens directly (they're the authorizer). One `PENDIENTE` per oportunidad.
- `POST /api/reaperturas/:id/aprobar` / `rechazar` (`{ comentario }`, mandatory) are admin-only.
  `resolver()` moves the solicitud out of `PENDIENTE` with a conditional `updateMany`, so a double click
  or a second admin gets "ya fue resuelta" instead of reopening twice. `GET /api/reaperturas?estado=`:
  admins see all, others only their own.
- `reaperturasRepo.reabrir` is one transaction: oportunidad → destino etapa, `estado: ABIERTA`,
  `fechaRealCierre`, `motivoPerdidaId` and `motivoPerdidaDetalle` → null; contacto/empresa → `POTENCIAL` with this oportunidad as
  `oportunidadAbiertaId` (an empresa's contactos follow it); a `HistorialEtapa` row authored by the admin
  ("Reabierta con autorización de X. Pedido por Y: motivo"); solicitud → `APROBADA`; notification to the
  requester. `cambiarEtapa`'s "ya está cerrada" guard is unchanged — don't add reopen logic there.
- Frontend: `components/Reapertura.tsx` renders the callout and modal in the oportunidad and embudo
  detail modals when `estado === "PERDIDA"`. On the embudo board, dragging a lost card onto an open
  column (or using its "Reabrir en..." select) opens `ReaperturaModal` with that etapa preselected,
  instead of calling `cambiar-etapa`. `handleMover` in `EmbudoPage.tsx` routes any move of a closed
  card: lost → open etapa goes to reapertura, Inscripto → Inscripción cancelada goes to the baja modal,
  and anything else shows an error. `oportunidadesRepo.findById` includes the pending
  `solicitudesReapertura` so the detail shows "Reapertura pendiente".

Notificaciones (`modules/notificaciones`, page `NotificacionesPage.tsx`) are a per-user inbox. Each user
only reads or marks their own; the queries filter by `usuarioId` and marking someone else's returns 404.
They're always created inside the transaction that causes them (`notificacionesRepo.crearMuchas(tx, …)`),
never on their own. `tipo` (`REAPERTURA_SOLICITADA | _APROBADA | _RECHAZADA`) discriminates the
frontend union in `src/types/notificaciones.ts`. Endpoints: `GET /api/notificaciones?soloNoLeidas=`
(paginated), `GET /no-leidas` → `{ total }`, `POST /:id/leer`, `POST /leer-todas`. The Topbar bell polls
`/no-leidas` every 60 s and on window focus, and refreshes right away when a page dispatches the
`EVENTO_NOTIFICACIONES` window event (exported from `Topbar.tsx`). Admins approve or reject from the
notification itself.

Dashboard (`modules/dashboard`, `GET /api/dashboard?desde=&hasta=&usuarioId=&rol=`, page
`DashboardPage.tsx` at `/`) is the first screen for every rol:
- Scope (`resolverAlcance`): VENDEDOR **and RESPONSABLE_COMERCIAL** always get only their own numbers, and
  the filters are ignored. This differs from the rest of the CRM, where the responsable comercial sees
  the whole team. ADMINISTRADOR gets the whole team, a rol (`VENDEDOR | RESPONSABLE_COMERCIAL`) or one
  `usuarioId`. Oportunidades count for their `responsableId`; actividades for the `usuarioId` who
  logged them.
- Metrics: open oportunidades and their `valorEstimado` (now, not by period); inscriptos = `estado
  GANADA | BAJA` (a cancelled inscription was still won) and perdidas, by `fechaRealCierre` in the period;
  conversion = inscriptos / (inscriptos + perdidas); open oportunidades per `ABIERTA` etapa; top 6
  `motivoPerdidaId` (by catálogo name) + "Otros"; actividades per tipo; a monthly inscriptos vs. perdidas series; pending
  reaperturas (admin only). The default period is the last 6 months.
- Charts use `recharts`, lazy-loaded in `App.tsx` so the rest of the bundle stays small. Series colors are
  `--info` (inscriptos) and `--brand` (perdidas / single-series bars), a pair that passed the dataviz
  palette validator.

Configuración (admin only; page `ConfiguracionPage.tsx` at `/configuracion/:seccion`, with tabs for
etapas · productos · tipos-actividad · origenes · motivos-perdida). **Nothing configurable is ever
deleted, only deactivated (`activo: false`)**, because old records keep pointing at it.
- `modules/catalogos`: `origenes`, `motivos-perdida` and `tipos-actividad` share one module and one route,
  `/api/catalogos/:catalogo`. `GET` returns active rows (every rol, it feeds the selects;
  `?incluirInactivos=true` is admin only). Admin-only `POST`, `PUT /:id` (`nombre`, `activo`) and
  `POST /:catalogo/reordenar` (`{ ids }`). An unknown catálogo → 404, and the last active row can't be
  deactivated. The repository maps each name to its Prisma table with an exhaustive `switch`.
- `catalogosService.validarSeleccion(catalogo, id, actual?)` is how forms accept a catálogo value. It must
  exist and be active, unless it's unchanged from what the record already had. Empresa, contacto and
  oportunidad use it for `origenId`, and loss uses it for `motivoPerdidaId`.
- `modules/etapas`: `GET` returns active ones (`?incluirInactivas=true` for admin), plus `POST`,
  `PUT /:id` and `POST /reordenar`. There must always be **at least one active etapa of each tipo**
  (ABIERTA, GANADA, PERDIDA, BAJA). An etapa that currently holds oportunidades can't be deactivated
  or change `tipo`. `esClasePrueba` only sticks on ABIERTA. The board and the dashboard show active
  etapas only, which is safe because an inactive one can't hold oportunidades.
- `modules/productos`: active ones on `GET` (`?incluirInactivos=true` for admin); admin `POST` and `PUT /:id`.
- `errorMiddleware` maps Prisma `P2002` (unique violation) → 409 "Ya existe uno con ese nombre".
- Frontend: `components/config/` holds `CatalogoEditor` (generic), `EtapasEditor` (with a live preview
  of the embudo) and `ProductosEditor`; `comun.tsx` holds the shared row pieces. Forms pick catálogo
  values with `components/CatalogoSelect.tsx`, which caches per catálogo; call
  `invalidarCatalogo(catalogo)` after editing one. It keeps showing a deactivated current value as
  "(inactivo)".
- `origen` (empresa, contacto, oportunidad) and `motivoPerdida` used to be free text. The
  `add_catalogos_configurables` migration moved existing origins into the catálogo and old loss texts
  into "Otro", with the original text as `motivoPerdidaDetalle`.

### Data model is ahead of the current API/UI on purpose

`backend/prisma/schema.prisma` already models the full domain the final delivery ("Entrega Final")
needs — e.g. `Usuario.rol`, `Oportunidad.probabilidadCierre` — even though the current MVP only exposes a
subset through routes/pages. When extending scope, prefer wiring up existing schema/fields over
adding new ones; check the schema before assuming a table/column doesn't exist.

Key domain rules enforced in the service layer (see `oportunidades.service.ts`):
- An `Oportunidad` must be linked to an `Empresa` and/or a `Contacto` — never neither
  (`validarRelacionComercial`).
- Changing an oportunidad's `etapaId` (`cambiarEtapa`) always writes a `HistorialEtapa` row in the
  same Prisma transaction — stage changes and their audit trail must never be split.
- Moving into an `Etapa` whose `tipo` is `GANADA`/`PERDIDA` auto-derives `estado` and
  `fechaRealCierre` on the oportunidad. Moving to `PERDIDA` also requires an active `motivoPerdidaId` (plus
  an optional `motivoPerdidaDetalle`), and the historial gets "Motivo de pérdida: {nombre} — {detalle}".
  Rules key off the etapa's `tipo`, never its name, so several GANADA or PERDIDA etapas work. Only
  active etapas are valid destinations (`crear`, `cambiarEtapa`, reapertura).
- Once an oportunidad's `estado` isn't `ABIERTA`, `cambiarEtapa` rejects further stage changes. A
  `PERDIDA` one can only come back through the authorized reapertura flow (see above). The one other
  exception is Inscripto (`GANADA`) → "Inscripción cancelada" (`tipo: BAJA`), which is only reachable
  from Inscripto and is itself terminal. It sets `estado: BAJA`, `fechaBaja` and `motivoBaja` (without
  touching `fechaRealCierre`), leaves the contacto/empresa `INACTIVO` by default, and marks their
  `bajaDefinitiva`, which blocks them from ever booking a clase de prueba again (`esClasePrueba`
  etapas).
- Editing the *data* of a closed oportunidad (`PUT /api/oportunidades/:id` when `estado` isn't `ABIERTA`)
  goes through `actualizarCerrada` in the service: only an ADMINISTRADOR can do it (403 otherwise), with a
  mandatory `motivoEdicion`, and never together with an etapa change or a new contacto/empresa. Each
  correction writes an `EdicionOportunidad` row (`cambios`: `[{ campo, antes, despues }]` with readable
  values) in the same transaction as the update, and shows up in the historial as `kind: "edicion"`.
  An etapa-only PUT still goes to `cambiarEtapa`. In the UI, Editar is disabled for non-admins on closed
  rows, and the admin's form locks the etapa and asks for the motivo.
- The internal identifiers for that etapa still say "baja" (enum `BAJA`, `fechaBaja`, `motivoBaja`,
  `bajaDefinitiva`, CSS `is-baja`); only its name and the UI copy say "Inscripción cancelada". Don't
  confuse it with the baja lógica of a contacto/empresa below.
- The embudo board (`tableroEmbudo` / `GET /api/embudo`) groups **all** oportunidades by `etapaId`,
  not just open ones, so won/lost cards keep showing in their closing column instead of vanishing.

Baja lógica of a contacto/empresa (`POST /api/contactos/:id/baja`, `POST /api/empresas/:id/baja`,
body `{ contactarNuevamente: boolean, motivoBaja?: string }`) is a soft delete — there is no physical
DELETE. It's triggered by the `baja-button` in each table's `row-actions` (left of Editar), which opens
the shared `components/BajaModal.tsx`:
- `contactarNuevamente: true` → estado `INACTIVO`; `false` → estado `NO_CONTACTAR`.
- Rejected when the record has an open oportunidad (`oportunidadAbiertaId`), and for a contacto that
  belongs to an empresa (its estado is driven by the empresa — dar de baja the empresa instead). The UI
  disables the button in those cases, and also when the record is already `NO_CONTACTAR`.
- If the record is `CLIENTE` with a won oportunidad, the baja moves that oportunidad to "Inscripción
  cancelada" through `oportunidadesService.cancelarInscripcion()` → `cambiarEtapa()` (so the
  historial row, `fechaBaja`, `motivoBaja` and `bajaDefinitiva` all apply), with the chosen estado
  passed via `estadoEntidadBaja`. The modal then shows a warning and an optional motivo field.
- Dando de baja an empresa also sets its contactos to `INACTIVO` — `NO_CONTACTAR` is a decision about
  the convenio, not each employee (same rule as editing the empresa's estado).

### Domain vocabulary (gym-specific mapping — don't rename these back to generic CRM terms)

- **Contacto** = a person (gym member or membership prospect).
- **Empresa** = a corporate agreement (a company paying for its employees' memberships); optional,
  most contactos have no empresa.
- **Producto** = a gym membership plan (e.g. "Musculación mensual", "Personal training") — not the
  same concept as GymPro's own SaaS pricing tiers.
- **Oportunidad** = an in-progress membership inquiry.
- **Etapas** (seeded, configurable by the admin): Consulta recibida → Clase de prueba agendada → Clase de prueba
  realizada → Propuesta de membresía enviada → Negociación → Inscripto (Ganada) / Perdida, plus
  Inscripción cancelada (`tipo: BAJA`, only reachable from Inscripto).

### Frontend

Plain React Router SPA, no state library. `src/App.tsx` defines routes; everything except `/login` is
wrapped in `routes/ProtectedRoute.tsx` + `context/AuthContext.tsx` (token/user in context, persisted
via `localStorage`). `src/api/client.ts` is a single Axios instance: it attaches the bearer token from
`localStorage` on every request and force-redirects to `/login` on a 401 response. Pages
(`src/pages/*.tsx`) call the API directly through this client — there's no separate API-hooks layer.

Routes: `/` is the Dashboard (landing page after login for every rol), `/embudo` is the board (it used to
live at `/`), plus `/oportunidades`, `/contactos`, `/empresas`, `/actividades`, `/notificaciones`, and
`/usuarios` and `/configuracion/:seccion` (admin only). Add new routes to both `App.tsx` and the `TITLES`
map in `Topbar.tsx`.

## Known bugs to fix

- **`probabilidadCierre` and `fechaEstimadaCierre` have no input anywhere in the UI.** Both fields
  exist on `Oportunidad` and are rendered on the embudo cards (the progress-bar percentage and the date
  pill), but `OportunidadesPage.tsx`'s create/edit form (`formVacio` and its submit `payload`) never
  includes them, so every oportunidad created or edited through the app has both permanently `null`.
  The embudo board silently falls back to an etapa-order heuristic for the percentage and shows "Sin
  fecha estimada" forever. Add inputs for these two fields to the oportunidad form.

- **`CORS_ORIGIN`'s default doesn't track Vite's actual port.** `backend/src/config/env.ts` defaults
  `corsOrigin` to `http://localhost:5173`, but Vite auto-increments to 5174+ whenever 5173 is already
  taken (observed firsthand running this repo's dev servers) — when that happens every API request from
  the frontend is blocked by CORS until `.env`'s `CORS_ORIGIN` is updated by hand. Worth a callout in
  the setup docs, or making the mismatch fail with a clearer error.
