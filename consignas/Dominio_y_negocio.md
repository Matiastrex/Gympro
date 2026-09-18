# Definiciones Generales
## Modelo de datos: entidades principales
### Usuario
Representa a una persona que puede ingresar al sistema y realizar operaciones según su rol.
**Por ejemplo:**
- Administrador.
- Vendedor.
- Responsable comercial.
El grupo deberá determinar qué información se necesita para identificar al usuario, autenticarlo, conocer su estado y controlar sus permisos.

### Empresa
Representa a una organización con la que existe o podría existir una relación comercial.
**Por ejemplo:**
- Una empresa interesada en contratar un servicio.
- Una inmobiliaria que administra propiedades.
- Una institución interesada en una capacitación.
- Un comercio que solicita una cotización.
- Una empresa puede tener diferentes personas de contacto y participar en varias oportunidades comerciales.

### Contacto
Representa a una persona con la que la organización mantiene una relación comercial.
**Por ejemplo:**
El responsable de compras de una empresa.Definiciones Generales1
- Una persona interesada en contratar un seguro.
- Un aspirante a una institución educativa.
- Un posible comprador de un inmueble.
- Un contacto puede estar relacionado con una empresa o actuar como cliente individual.

### Producto o servicio
Representa aquello que la organización ofrece comercialmente.
**Por ejemplo:**
- Un sistema de gestión.
- Un seguro automotor.
- Una propiedad.
- Una capacitación.
- Un tratamiento.
- Un servicio profesional.
- Un producto o servicio puede aparecer en diferentes oportunidades comerciales.

### Oportunidad
Representa una posibilidad concreta de realizar una venta o contratación.
**Por ejemplo:**
- Una empresa está evaluando contratar un sistema de gestión por un valor estimado de $3.000.000.
- La oportunidad deberá permitir conocer, entre otros aspectos, quién es el cliente, qué producto o servicio le interesa, quién es el vendedor responsable y en qué estado se encuentra la negociación.
- Una empresa o contacto podrá tener varias oportunidades a lo largo del tiempo.

### Etapa comercial
Representa uno de los pasos del proceso de venta.
En un CRM genérico, algunas etapas podrían ser:
- Nuevo contacto.
- Necesidad relevada.
- Propuesta enviada.
- Negociación.
- Ganada.
- Perdida.
Cada grupo deberá definir las etapas adecuadas para su tipo de CRM y establecer el orden en que se presentan.

### Historial de etapas
Representa cada cambio de etapa realizado sobre una oportunidad.
Debe permitir reconstruir el recorrido de una negociación y conocer:
- De qué etapa partió.
- A qué etapa avanzó.
- Cuándo se produjo el cambio.
- Qué usuario lo realizó.
El historial no deberá reemplazarse cada vez que se modifica la oportunidad.
Cada cambio deberá conservarse como un registro independiente.

### Actividad
Representa una interacción comercial que ya ocurrió.
**Por ejemplo:**
- Una llamada.
- Una reunión.
- Un mensaje.
- El envío de una propuesta.
- Una demostración.
- Una nota interna.
La actividad podrá relacionarse con una empresa, un contacto o una oportunidad. El grupo deberá decidir qué información es necesaria para reconstruir correctamente el historial comercial.

### Motivo de pérdida
Representa la razón por la cual una oportunidad no se concretó.
**Por ejemplo:**
- Precio.
- Falta de presupuesto.
- Elección de un competidor.
- Producto inadecuado.
- Falta de respuesta.
- Decisión postergada.
Cada grupo deberá determinar qué motivos son adecuados para el tipo de CRM desarrollado.

### Origen comercial
Representa el medio por el cual llegó una empresa, contacto u oportunidad.
**Por ejemplo:**
- Sitio web.
- Redes sociales.
- Publicidad.
- Recomendación.
- Evento.
- Prospección comercial.
- Cliente existente.
Los orígenes podrán variar según la industria elegida.
---
## Reglas generales de negocio
- Toda oportunidad deberá tener un responsable.
- Toda oportunidad deberá estar asociada, como mínimo, con una empresa o un contacto.
- Toda oportunidad deberá tener una etapa actual.
- Una oportunidad abierta deberá encontrarse en una etapa abierta.
- Una oportunidad ganada deberá registrar fecha de cierre y valor final, si el negocio utiliza valores monetarios.
- Una oportunidad perdida deberá registrar fecha de cierre y motivo de pérdida.
- Cada cambio de etapa deberá conservarse en el historial.
- Cada actividad deberá registrar el usuario y la fecha.
- Las actividades deberán relacionarse con una empresa, contacto u oportunidad.
- Los registros con historial comercial no deberán eliminarse físicamente.
- Los vendedores solo podrán acceder a la información permitida por su rol.
- Los permisos deberán validarse en el backend y no solamente en el frontend.
- Las contraseñas deberán almacenarse utilizando un mecanismo seguro.
- Una oportunidad cerrada no deberá modificarse sin autorización.
- Los cambios importantes deberán permitir identificar al usuario que los realizó.
---
## Casos de uso mínimos
- Iniciar sesión.
- Crear y modificar un usuario.
- Crear y modificar una empresa.
- Crear y modificar un contacto.
- Consultar el detalle de una empresa.
- Consultar el detalle de un contacto.
- Crear una oportunidad.
- Asignar una oportunidad a un vendedor.
- Modificar una oportunidad.
- Cambiar una oportunidad de etapa.
- Registrar una actividad.
- Consultar el historial comercial.
- Marcar una oportunidad como ganada.
- Marcar una oportunidad como perdida.
- Consultar el embudo comercial.
- Buscar y filtrar empresas, contactos y oportunidades.
- Utilizar la funcionalidad de inteligencia artificial.
---
## Pantallas mínimas
- Inicio de sesión.
- Pantalla principal.
- Gestión de usuarios.
- Listado de empresas.
- Alta y edición de empresa.
- Detalle de empresa.
- Listado de contactos.
- Alta y edición de contacto.
- Detalle de contacto.
- Listado de productos o servicios.
- Listado de oportunidades.
- Alta y edición de oportunidad.
- Detalle de oportunidad.
- Tablero de oportunidades por etapa.
- Registro de actividad.
- Historial comercial.
- Configuración de etapas.
- Configuración de tipos de actividad.
- Configuración de orígenes.
- Configuración de motivos de pérdida.
- Interfaz correspondiente a la funcionalidad de inteligencia artificial _(Opcional)_
---
## Orden obligatorio de desarrollo
- Análisis del problema y elección del tipo de CRM.
- Definición de usuarios, alcance y requerimientos.
- Diseño de pantallas y modelo de datos.
- Implementación de usuarios, roles y permisos.
- Implementación de empresas y contactos.
- Implementación de productos o servicios.
- Implementación de oportunidades y embudo comercial.
- Implementación de actividades e historial.
- Pruebas y corrección de las funcionalidades principales.
- Diseño e implementación de la funcionalidad de inteligencia artificial.
- Pruebas finales y presentación.