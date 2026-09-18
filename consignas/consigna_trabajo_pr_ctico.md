# Sistema CRM para Gestión Comercial

**Trabajo Práctico - Gestión Aplicada al Desarrollo de Software II**
*Universidad Nacional de La Matanza - Ingeniería en Informática*

## Introducción

El presente trabajo práctico propone el análisis, diseño y desarrollo de un sistema CRM destinado a centralizar la información de clientes y organizar el seguimiento de oportunidades comerciales.

Cada grupo podrá elegir entre dos alternativas:
* Desarrollar un CRM genérico, aplicable a diferentes tipos de empresas.
* Desarrollar un CRM especializado en una industria, como seguros, inmobiliarias, educación, salud, turismo, concesionarias o servicios profesionales.

Si se elige una industria específica, esta deberá reflejarse en los datos, las etapas comerciales, las reglas de negocio y el vocabulario utilizado por el sistema. No será suficiente modificar únicamente nombres, colores o elementos visuales.

## Contexto del problema

Muchas pequeñas y medianas empresas gestionan sus clientes mediante planillas, correos electrónicos, WhatsApp y anotaciones personales.

Esta forma de trabajo genera diferentes problemas:

### Información dispersa
Los datos de los clientes se encuentran distribuidos entre diferentes archivos, dispositivos y aplicaciones.

### Falta de historial
La empresa no dispone de un registro centralizado de las conversaciones, reuniones y acciones realizadas con cada cliente.

### Dependencia del vendedor
Parte de la información depende de la memoria y organización personal de cada integrante del equipo comercial. Si un vendedor se ausenta o deja la empresa, ese conocimiento puede perderse.

### Dificultad para conocer el estado de las negociaciones
El responsable comercial no puede saber fácilmente qué oportunidades están abiertas, en qué etapa se encuentran ni quién está gestionando cada una.

### Oportunidades abandonadas
Al no existir un proceso comercial organizado, algunas oportunidades dejan de recibir seguimiento y se pierden sin conocer claramente el motivo.

## El problema de los usuarios

El CRM deberá responder a las necesidades de dos usuarios principales: el vendedor y el responsable comercial.

### Problemas del vendedor
* Pierde tiempo buscando información en diferentes herramientas.
* Registra varias veces los mismos datos.
* No dispone de un historial completo del cliente.
* Tiene dificultades para retomar una negociación anterior.
* No puede conocer rápidamente qué se conversó con un cliente.
* No puede continuar fácilmente una gestión iniciada por otra persona.
* No cuenta con una visión ordenada de sus oportunidades.

### Problemas del responsable comercial
* No sabe con precisión cuántas oportunidades existen.
* No conoce el estado actual de cada negociación.
* Depende de explicaciones informales de los vendedores.
* No puede revisar fácilmente el historial de una oportunidad.
* Desconoce por qué se pierden las ventas.
* Tiene dificultades para redistribuir clientes y oportunidades.
* No puede asegurar que el proceso comercial se cumpla de manera consistente.

## Objetivos del sistema

El sistema deberá cumplir tres objetivos funcionales principales.

1. **Centralizar la información**
   Registrar en una única base de datos las empresas, contactos, oportunidades y actividades comerciales.

2. **Organizar el proceso comercial**
   Representar las negociaciones mediante oportunidades y etapas claramente definidas.

3. **Conservar el historial**
   Mantener un registro cronológico de las actividades y cambios realizados durante cada relación comercial.

## Elección del tipo de CRM

Cada grupo deberá definir el tipo de CRM antes de comenzar el diseño del sistema.

### CRM genérico
Podrá utilizarse en diferentes tipos de empresas. Deberá permitir configurar:
* Etapas comerciales.
* Tipos de actividad.
* Orígenes de los contactos.
* Motivos de pérdida.
* Productos o servicios.
* Estados principales.

### CRM especializado
Estará dirigido a una industria determinada e incorporará información y procesos propios de ese negocio.

Algunos ejemplos:

* **Seguros:** Podrá incorporar asegurados, riesgos, tipos de seguros, cotizaciones, compañías y renovaciones.
* **Inmobiliarias:** Podrá incorporar propietarios, interesados, inmuebles, visitas y operaciones de venta o alquiler.
* **Educación:** Podrá incorporar aspirantes, carreras, cursos, entrevistas, documentación e inscripciones.
* **Salud:** Podrá incorporar pacientes potenciales, tratamientos consultados, evaluaciones y presupuestos.
* **Servicios profesionales:** Podrá incorporar empresas, servicios solicitados, reuniones de relevamiento, propuestas y contrataciones.

La especialización deberá producir cambios reales en el modelo de datos y en el proceso comercial.

## Alcance del producto

| Dentro del alcance | Fuera del alcance |
| :--- | :--- |
| Inicio de sesión | Gestión de tareas |
| Gestión de usuarios | Agenda comercial |
| Roles y permisos | Recordatorios y notificaciones |
| Gestión de empresas | Indicadores y estadísticas |
| Gestión de contactos | Exportación de información |
| Asignación de responsables comerciales | Integraciones con otros sistemas |
| Gestión de productos o servicios | API pública para terceros |
| Gestión de oportunidades | Importación automática de información |
| Embudo comercial configurable | Facturación |
| Registro de actividades realizadas | Gestión de pagos |
| Historial comercial del cliente | Contabilidad |
| Historial de cambios de etapa | Gestión de stock |
| Cierre de oportunidades ganadas o perdidas | Campañas de marketing |
| Registro de motivos de pérdida | Envío de correos electrónicos desde el CRM |
| Búsqueda, filtros y paginación | Integración con WhatsApp |
| Incorporación final de una funcionalidad de inteligencia artificial (Opcional) | Soporte para múltiples organizaciones |

## Usuarios del sistema

El sistema deberá contemplar, como mínimo, tres tipos de usuarios.

### Administrador
* Crea y modifica usuarios.
* Asigna roles.
* Configura las etapas comerciales.
* Gestiona los tipos de actividad.
* Gestiona los motivos de pérdida.
* Gestiona los orígenes comerciales.
* Puede acceder a toda la información.
* Puede asignar y reasignar contactos y oportunidades.

### Vendedor
* Registra empresas y contactos.
* Consulta los clientes asignados.
* Crea oportunidades.
* Actualiza las oportunidades.
* Cambia oportunidades de etapa.
* Registra actividades realizadas.
* Consulta el historial comercial.
* Marca oportunidades como ganadas o perdidas.

### Responsable comercial
* Consulta la información de todo el equipo.
* Supervisa las oportunidades abiertas.
* Visualiza el embudo comercial.
* Consulta el historial de cada negociación.
* Asigna y reasigna oportunidades.
* Revisa las oportunidades ganadas y perdidas.

## Extra Opcional: incorporación de inteligencia artificial

La inteligencia artificial deberá incorporarse únicamente después de completar y probar las funcionalidades principales del CRM y es opcional.

### Objetivo
Cada grupo deberá identificar un problema concreto dentro del uso del CRM que pueda resolverse o simplificarse mediante inteligencia artificial.

### Condiciones
La funcionalidad deberá:
* Resolver una necesidad real.
* Estar relacionada directamente con el CRM desarrollado.
* Utilizar información registrada en el sistema.
* Integrarse en un flujo existente.
* Producir un resultado útil para alguno de los usuarios.
* Justificar por qué requiere inteligencia artificial.
* Permitir que el usuario revise el resultado.