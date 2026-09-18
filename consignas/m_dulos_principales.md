# Módulos Principales

## Módulo 1: gestión de empresas y contactos

La información de los clientes constituye la base del CRM.
El sistema deberá diferenciar entre empresas y personas.

### Empresa
Representa a una organización o cliente corporativo.

**Datos mínimos:**
- Razón social o nombre comercial.
- CUIT, si corresponde.
- Industria o actividad.
- Correo electrónico.
- Teléfono.
- Dirección.
- Sitio web, si corresponde.
- Estado.
- Responsable comercial.
- Origen.
- Observaciones.

### Contacto
Representa a una persona.

**Datos mínimos:**
- Nombre.
- Apellido.
- Documento, si corresponde.
- Cargo.
- Correo electrónico.
- Teléfono.
- Empresa relacionada, si corresponde.
- Responsable comercial.
- Estado.
- Origen.
- Observaciones.

### Relaciones
- Una empresa podrá tener varios contactos.
- Un contacto también podrá existir sin estar relacionado con una empresa cuando se trate de un cliente individual.
- Una empresa o contacto podrá tener varias oportunidades a lo largo del tiempo.

### Estados posibles
Como mínimo:
- Potencial.
- Cliente.
- Inactivo.
- No contactar.

### Baja lógica
Los registros que tengan información histórica no deberán eliminarse físicamente.
Cuando una empresa o contacto deje de utilizarse, deberá modificarse su estado para conservar sus oportunidades y actividades anteriores.

### Concepto clave: contacto y oportunidad
Un contacto y una oportunidad representan conceptos diferentes.

**Contacto**
Es una persona o empresa registrada en el CRM.
Puede existir aunque actualmente no haya una negociación comercial.
*Ejemplo:* María Gómez es responsable de compras de una empresa y se encuentra registrada como contacto.

**Oportunidad**
Es una posibilidad concreta de vender un producto o servicio.
*Ejemplo:* La empresa de María Gómez está evaluando contratar un servicio por un valor determinado.
Un mismo contacto podrá participar en varias oportunidades a lo largo del tiempo.
El modelo de datos deberá conservar esta separación.

---

## Módulo 2: gestión de oportunidades

Una oportunidad representa una negociación comercial concreta.

### Datos mínimos
- Título.
- Empresa o contacto relacionado.
- Responsable comercial.
- Producto o servicio.
- Valor estimado, si corresponde.
- Etapa actual.
- Probabilidad de cierre, si el grupo decide utilizarla.
- Fecha estimada de cierre.
- Fecha real de cierre.
- Origen.
- Estado.
- Observaciones.
- Motivo de pérdida, si corresponde.

### Estados de una oportunidad
- Abierta.
- Ganada.
- Perdida.

### Embudo comercial
El sistema deberá representar el proceso de venta mediante etapas.
Cada grupo deberá definir las etapas según el CRM seleccionado.

**Ejemplo de embudo genérico:**
1. Nuevo contacto.
2. Contactado.
3. Necesidad relevada.
4. Propuesta enviada.
5. Negociación.
6. Ganada.
7. Perdida.

**Ejemplo para una inmobiliaria:**
1. Consulta recibida.
2. Necesidad relevada.
3. Propiedades seleccionadas.
4. Visita realizada.
5. Negociación.
6. Reserva.
7. Operación concretada.
8. Operación perdida.

### Visualización del embudo
El sistema deberá incluir:
- Una vista de lista de oportunidades.
- Una vista individual de cada oportunidad.
- Un tablero con las oportunidades agrupadas por etapa.
- Filtros por responsable, etapa, estado y origen.

El cambio de etapa podrá realizarse desde el detalle de la oportunidad o desde el tablero.

### Reglas para el cambio de etapas
Los cambios de etapa deberán cumplir las siguientes condiciones:
- Cada oportunidad deberá tener una única etapa actual.
- La etapa deberá ser compatible con el estado de la oportunidad.
- Una oportunidad abierta no podrá estar en una etapa ganada o perdida.
- Una oportunidad ganada deberá registrar la fecha real de cierre.
- Una oportunidad perdida deberá registrar la fecha real de cierre y el motivo de pérdida.
- Cada cambio deberá conservarse en el historial.
- Una oportunidad cerrada no podrá volver a una etapa abierta sin autorización.
- Si se modifica una oportunidad cerrada, el cambio deberá quedar registrado.
- Los grupos podrán definir reglas adicionales según la industria elegida.

---

## Módulo 3: actividades e historial comercial

Una actividad representa una interacción comercial que ya ocurrió.
El sistema no deberá gestionar acciones futuras, agendas, tareas ni recordatorios.

### Tipos de actividad
Como mínimo:
- Llamada.
- Correo electrónico.
- Mensaje.
- Reunión presencial.
- Reunión virtual.
- Demostración.
- Envío de propuesta.
- Nota interna.
- Otro tipo configurable.

### Datos mínimos
Cada actividad deberá registrar:
- Tipo.
- Fecha y hora.
- Usuario que la registró.
- Empresa o contacto relacionado.
- Oportunidad relacionada, si corresponde.
- Descripción.
- Resultado.

### Historial cronológico
Las actividades deberán mostrarse ordenadas cronológicamente en:
- El detalle del contacto.
- El detalle de la empresa.
- El detalle de la oportunidad.

Esto deberá permitir reconstruir qué sucedió durante una relación comercial.
Una actividad representa un hecho histórico. No debe confundirse con una acción pendiente.

### Historial de etapas
Además de las actividades, el sistema deberá registrar los cambios de etapa de cada oportunidad.

Cada registro deberá incluir:
- Oportunidad.
- Etapa anterior.
- Nueva etapa.
- Fecha y hora.
- Usuario que realizó el cambio.
- Observación, si corresponde.

No será suficiente almacenar únicamente la etapa actual.
El historial deberá permitir responder:
- En qué etapa comenzó la oportunidad.
- Qué etapas atravesó.
- Cuándo se produjo cada cambio.
- Quién realizó el cambio.
- Cuándo y cómo finalizó la oportunidad.