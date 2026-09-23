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

Fuera de alcance de esta entrega (planificado para la Entrega Final, ya
contemplado en el modelo de datos y en la arquitectura para no requerir
rediseño): gestión completa de usuarios/roles/permisos, actividades e
historial visible en la UI, configuración de etapas desde el sistema,
búsqueda/filtros/paginación avanzados.

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
el usuario de prueba, las etapas del embudo y los planes de membresía).

Si la base ya estaba creada antes de incorporar el historial completo, aplicar
las migraciones pendientes con:

```bash
npx prisma migrate deploy
```

Para reemplazar los datos comerciales de la base local con un escenario de
prueba completo, usar:

```bash
npm run seed:demo
```

Este comando conserva el usuario, las etapas y los productos, pero elimina y
recrea empresas, contactos, oportunidades e historiales comerciales.

Usuario de prueba creado por el seed:

```
email:    admin@gympro.com
password: gympro123
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

Abrir `http://localhost:5173`, iniciar sesión con el usuario de prueba y ya
se puede recorrer el flujo completo: crear empresa/contacto → crear
oportunidad → verla en el embudo → cambiarla de etapa → refrescar y
comprobar que la información persiste.

## Notas para la Entrega Final

El esquema de Prisma (`backend/prisma/schema.prisma`) ya incluye las tablas
de `Actividad` y `HistorialEtapa`, y el campo `rol` en `Usuario`, para que
agregar esas funcionalidades sea sumar endpoints y pantallas, no rediseñar
la base. El middleware `requireRole` (`backend/src/middlewares/role.middleware.ts`)
ya está listo para empezar a restringir rutas por rol cuando se implemente
la gestión completa de usuarios.
