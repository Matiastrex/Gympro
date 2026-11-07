-- Actividades: catálogo de tipos + relación con empresa.
-- Escrita a mano para no perder filas existentes (p. ej. en la base compartida):
-- el texto libre `tipo` se mapea al catálogo por nombre, o a "Otro".

-- CreateTable
CREATE TABLE `tipos_actividad` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `orden` INTEGER NOT NULL DEFAULT 0,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `tipos_actividad_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Tipos iniciales (seed.ts los vuelve a asegurar de forma idempotente).
INSERT INTO `tipos_actividad` (`nombre`, `orden`) VALUES
    ('Llamada', 1),
    ('Correo electrónico', 2),
    ('Mensaje / WhatsApp', 3),
    ('Visita al gimnasio', 4),
    ('Reunión virtual', 5),
    ('Clase de prueba', 6),
    ('Envío de propuesta de membresía', 7),
    ('Nota interna', 8),
    ('Otro', 99);

-- AlterTable: columnas nuevas (tipoActividadId nullable hasta completar el backfill).
ALTER TABLE `actividades`
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `empresaId` INTEGER NULL,
    ADD COLUMN `tipoActividadId` INTEGER NULL;

-- Backfill del tipo: por nombre exacto, si no "Otro".
UPDATE `actividades` a
    LEFT JOIN `tipos_actividad` t ON t.`nombre` = a.`tipo`
    SET a.`tipoActividadId` = COALESCE(t.`id`, (SELECT `id` FROM (SELECT `id` FROM `tipos_actividad` WHERE `nombre` = 'Otro') o));

-- Backfill de empresa: la del contacto relacionado, o la de la oportunidad.
UPDATE `actividades` a
    LEFT JOIN `contactos` c ON c.`id` = a.`contactoId`
    LEFT JOIN `oportunidades` op ON op.`id` = a.`oportunidadId`
    SET a.`empresaId` = COALESCE(c.`empresaId`, op.`empresaId`);

UPDATE `actividades` SET `descripcion` = '' WHERE `descripcion` IS NULL;

ALTER TABLE `actividades`
    DROP COLUMN `tipo`,
    MODIFY `tipoActividadId` INTEGER NOT NULL,
    MODIFY `descripcion` TEXT NOT NULL;

-- CreateIndex
CREATE INDEX `actividades_fecha_idx` ON `actividades`(`fecha`);

-- AddForeignKey
ALTER TABLE `actividades` ADD CONSTRAINT `actividades_tipoActividadId_fkey` FOREIGN KEY (`tipoActividadId`) REFERENCES `tipos_actividad`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `actividades` ADD CONSTRAINT `actividades_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
