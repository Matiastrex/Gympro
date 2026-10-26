# GymPro CRM

CRM para gimnasios de barrio — Trabajo Práctico de Gestión Aplicada al
Desarrollo de Software I, Grupo DevLink.

Stack: **Node.js + Express + TypeScript + Prisma (MySQL)** en el backend,
**React + Vite + TypeScript** en el frontend.

## Alcance de esta entrega (MVP — 24/9)

Implementado:
- Login con usuario precargado.
- ABM de empresas y contactos, relación entre ambos.
- Productos (planes de membresía del gimnasio) precargados.
- ABM de oportunidades, relacionadas con empresa y/o contacto, responsable y
  producto.
- Embudo comercial: tablero por etapa, cambio de etapa persistido en la base
  (con historial y derivación automática de Ganada/Perdida).
- Historial de etapas: registra la creación y cada movimiento con etapa
  anterior, etapa nueva, usuario, fecha y observación; se consulta desde el
  detalle de una oportunidad y desde `GET /api/oportunidades/:id/historial`.

## Avance de la Entrega Final (12/11)

Implementado:
- Gestión de usuarios (alta, edición, activar/desactivar), solo para el
  administrador.
- Roles de administrador, responsable comercial y vendedor, con permisos
  aplicados en la API y en la interfaz (ver [Roles y permisos](#roles-y-permisos)).
- Asignación y reasignación de responsables en empresas, contactos y
  oportunidades.

Pendiente: gestión de productos, etapas, tipos de actividad, orígenes y
motivos de pérdida desde el sistema; registro de actividades e historial
comercial en la UI; reapertura autorizada de oportunidades cerradas; filtros
y paginación.

## Adaptación al dominio (gimnasio de barrio)

- **Contacto**: una persona — socio o prospecto de membresía.
- **Empresa**: un convenio corporativo (una empresa que paga membresías a sus
  empleados). Es opcional: la mayoría de los contactos son clientes
  individuales sin empresa asociada.
- **Producto/servicio**: los planes que el gimnasio le vende a sus socios
  (Musculación mensual, Personal training, etc.). **No confundir** con los
  planes SaaS "Básico/Profesional" de GymPro (eso es otro nivel: lo que
  DevLink le vende al dueño del gimnasio).
- **Oportunidad**: una consulta de membresía en curso (por ejemplo, "Consulta
  de Juan Pérez por musculación").
- **Etapas del embudo** (precargadas): Consulta recibida → Clase de prueba
  agendada → Clase de prueba realizada → Propuesta de membresía enviada →
  Negociación → Inscripto (Ganada) / Perdida.

## Roles y permisos

| | Administrador | Responsable comercial | Vendedor |
| :--- | :---: | :---: | :---: |
| Gestionar usuarios y asignar roles | ✅ | — | — |
| Ver empresas, contactos y oportunidades de todo el equipo | ✅ | ✅ | — |
| Ver el embudo de todo el equipo | ✅ | ✅ | Solo sus oportunidades |
| Crear y editar empresas, contactos y oportunidades | ✅ | ✅ | Solo las suyas |
| Mover oportunidades de etapa y dar de baja | ✅ | ✅ | Solo las suyas |
| Elegir el responsable al crear | ✅ | ✅ | Queda él mismo |
| Asignar y reasignar responsables | ✅ | ✅ | — |

Reglas de asignación:

- **El vendedor trabaja sobre su cartera.** Ve y modifica solo lo que tiene
  asignado. Lo que crea queda a su nombre y no puede pasárselo a otro. Si
  intenta abrir, editar o mover algo ajeno, la API responde 403.
- **El contacto acompaña a la oportunidad.** Al reasignar una oportunidad, su
  contacto (o su empresa, si es un convenio) pasa al nuevo responsable.
- **Quien creó un contacto o una empresa lo sigue viendo.** Si después se lo
  reasignan a otro vendedor, le queda en su lista para consultarlo, pero
  editarlo o darlo de baja le corresponde al responsable actual. La
  oportunidad reasignada, en cambio, deja de verla.
- **Siempre queda al menos un administrador activo.** Un administrador no
  puede cambiar su propio rol ni desactivar su usuario.
- **Los usuarios no se borran:** se desactivan y dejan de poder iniciar
  sesión, pero conservan su historial. Desactivar a un usuario o cambiarle el
  rol tiene efecto inmediato, aunque tenga una sesión abierta.

## Estructura del proyecto

```
gympro-crm/
├── backend/     API REST (Express + Prisma + MySQL)
└── frontend/    SPA (React + Vite)
```

Arquitectura en capas en el backend (`routes → service → repository`) para
que agregar funcionalidades de la Entrega Final no obligue a reescribir lo
ya construido.

## Requisitos previos

- Node.js 18 o superior.
- Un servidor MySQL corriendo localmente (o accesible por red), con una base
  de datos vacía creada para el proyecto.

## 1. Backend

```bash
cd backend
cp .env.example .env
```

Editar `.env` y completar `DATABASE_URL` con los datos reales de tu MySQL,
por ejemplo:

```
DATABASE_URL="mysql://root:tu_password@localhost:3306/gympro_crm"
```

Instalar dependencias, generar el cliente de Prisma, crear las tablas y
cargar los datos iniciales:

```bash
npm install
npm run setup
```

`npm run setup` ejecuta, en orden: `prisma generate` (genera el cliente
tipado), `prisma migrate dev` (crea las tablas en tu MySQL) y el seed (carga
los usuarios de prueba, las etapas del embudo y los planes de membresía).

Si ya tenías la base creada, **después de cada `git pull`** aplicá las
migraciones nuevas y volvé a correr el seed (no duplica datos, y así se crean
los usuarios que falten):

```bash
npx prisma migrate deploy
npx prisma generate
npm run prisma:seed
```

Para reemplazar los datos comerciales de la base local con un escenario de
prueba completo, usar:

```bash
npm run seed:demo
```

Este comando conserva los usuarios, las etapas y los productos, pero elimina y
recrea empresas, contactos, oportunidades e historiales comerciales. Todos los
datos de demo quedan asignados al administrador, así que el vendedor arranca
con las listas vacías: para probar ese rol, reasigná algunos registros desde
la cuenta del administrador o del responsable comercial.

Usuarios de prueba creados por el seed (uno por rol, todos con la contraseña
`gympro123`):

```
admin@gympro.com         Administrador
responsable@gympro.com   Responsable comercial
vendedor@gympro.com      Vendedor
```

Levantar el servidor en modo desarrollo:

```bash
npm run dev
```

La API queda escuchando en `http://localhost:4000`. Podés verificar que
levantó bien entrando a `http://localhost:4000/health`.

## API disponible

Todos los endpoints, salvo login y health check, requieren un token JWT.

```bash
# Obtener token
curl -X POST http://localhost:4000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@gympro.com\",\"password\":\"gympro123\"}"

# Consultar oportunidades
curl http://localhost:4000/api/oportunidades ^
  -H "Authorization: Bearer TU_TOKEN"

# Consultar historial de una oportunidad
curl http://localhost:4000/api/oportunidades/1/historial ^
  -H "Authorization: Bearer TU_TOKEN"
```

La API incluye autenticación, empresas, contactos, productos, etapas,
usuarios, oportunidades, cambio de etapa y tablero del embudo. El historial
se consulta embebido en el detalle de una oportunidad o mediante el endpoint
específico anterior.

## 2. Frontend

En otra terminal:

```bash
cd frontend
cp .env.example .env   # ya apunta a http://localhost:4000/api por defecto
npm install
npm run dev
```

Abrir `http://localhost:5173`, iniciar sesión con cualquiera de los usuarios
de prueba y ya se puede recorrer el flujo completo: crear empresa/contacto →
crear oportunidad → verla en el embudo → cambiarla de etapa → refrescar y
comprobar que la información persiste. Entrando con cada usuario se ve qué
habilita cada rol; por ejemplo, la sección Usuarios solo aparece para el
administrador.

Si el puerto 5173 está ocupado, Vite arranca en el siguiente (5174, …) y el
backend rechaza las peticiones por CORS. En ese caso, actualizá
`CORS_ORIGIN` en `backend/.env` con el puerto que muestra Vite y reiniciá el
backend.

## Notas para la Entrega Final

El esquema de Prisma (`backend/prisma/schema.prisma`) ya incluye la tabla
`Actividad`, para que registrar actividades sea sumar endpoints y pantallas,
no rediseñar la base.

Los permisos se aplican en dos niveles:

- **Por ruta:** `requireRole` (`backend/src/middlewares/role.middleware.ts`)
  restringe una ruta entera a ciertos roles (hoy, la gestión de usuarios).
- **Por registro:** `backend/src/utils/permisos.ts` reúne las reglas de
  visibilidad y asignación por responsable que usan los servicios de
  empresas, contactos y oportunidades. Cualquier módulo nuevo con
  responsable tiene que pasar por ahí.
