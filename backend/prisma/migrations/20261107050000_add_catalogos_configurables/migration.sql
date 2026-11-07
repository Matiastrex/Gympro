-- Catálogos configurables: orígenes y motivos de pérdida pasan de texto libre
-- a tablas con relación; las etapas se pueden desactivar.
-- Escrita a mano para conservar los datos existentes (también en la base compartida).

-- CreateTable
CREATE TABLE `origenes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `orden` INTEGER NOT NULL DEFAULT 0,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `origenes_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `motivos_perdida` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `orden` INTEGER NOT NULL DEFAULT 0,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `motivos_perdida_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Valores iniciales del gimnasio (seed.ts los vuelve a asegurar).
INSERT INTO `origenes` (`nombre`, `orden`) VALUES
    ('Instagram', 1), ('Facebook', 2), ('Sitio web', 3), ('Recomendación', 4),
    ('Pasó por el gimnasio', 5), ('Volante / cartel', 6), ('Convenio corporativo', 7), ('Otro', 99);

INSERT INTO `motivos_perdida` (`nombre`, `orden`) VALUES
    ('Precio', 1), ('Horarios', 2), ('Eligió otro gimnasio', 3), ('Distancia / se mudó', 4),
    ('Falta de tiempo', 5), ('No respondió más', 6), ('Salud', 7), ('Otro', 99);

-- Los orígenes ya cargados como texto se suman al catálogo (la colación ignora
-- mayúsculas y acentos, así que "recomendacion" no duplica "Recomendación").
INSERT IGNORE INTO `origenes` (`nombre`, `orden`)
    SELECT DISTINCT TRIM(`origen`), 50 FROM (
        SELECT `origen` FROM `empresas`
        UNION SELECT `origen` FROM `contactos`
        UNION SELECT `origen` FROM `oportunidades`
    ) t
    WHERE `origen` IS NOT NULL AND TRIM(`origen`) <> '';

-- AlterTable: columnas nuevas antes de borrar las viejas.
ALTER TABLE `empresas` ADD COLUMN `origenId` INTEGER NULL;
ALTER TABLE `contactos` ADD COLUMN `origenId` INTEGER NULL;
ALTER TABLE `oportunidades`
    ADD COLUMN `origenId` INTEGER NULL,
    ADD COLUMN `motivoPerdidaId` INTEGER NULL,
    ADD COLUMN `motivoPerdidaDetalle` TEXT NULL;
ALTER TABLE `etapas` ADD COLUMN `activo` BOOLEAN NOT NULL DEFAULT true;

-- Backfill de origen por nombre.
UPDATE `empresas` e JOIN `origenes` o ON o.`nombre` = TRIM(e.`origen`) SET e.`origenId` = o.`id`;
UPDATE `contactos` c JOIN `origenes` o ON o.`nombre` = TRIM(c.`origen`) SET c.`origenId` = o.`id`;
UPDATE `oportunidades` op JOIN `origenes` o ON o.`nombre` = TRIM(op.`origen`) SET op.`origenId` = o.`id`;

-- Backfill de motivo: si coincide con uno del catálogo se usa ese; si no, va a
-- "Otro" y el texto original queda como detalle (no se ensucia el catálogo).
UPDATE `oportunidades` op
    LEFT JOIN `motivos_perdida` m ON m.`nombre` = TRIM(op.`motivoPerdida`)
    SET op.`motivoPerdidaId` = COALESCE(m.`id`, (SELECT `id` FROM (SELECT `id` FROM `motivos_perdida` WHERE `nombre` = 'Otro') x)),
        op.`motivoPerdidaDetalle` = IF(m.`id` IS NULL, TRIM(op.`motivoPerdida`), NULL)
    WHERE op.`motivoPerdida` IS NOT NULL AND TRIM(op.`motivoPerdida`) <> '';

-- Ahora sí, las columnas de texto libre.
ALTER TABLE `empresas` DROP COLUMN `origen`;
ALTER TABLE `contactos` DROP COLUMN `origen`;
ALTER TABLE `oportunidades` DROP COLUMN `origen`, DROP COLUMN `motivoPerdida`;

-- AddForeignKey
ALTER TABLE `empresas` ADD CONSTRAINT `empresas_origenId_fkey` FOREIGN KEY (`origenId`) REFERENCES `origenes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `contactos` ADD CONSTRAINT `contactos_origenId_fkey` FOREIGN KEY (`origenId`) REFERENCES `origenes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `oportunidades` ADD CONSTRAINT `oportunidades_origenId_fkey` FOREIGN KEY (`origenId`) REFERENCES `origenes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `oportunidades` ADD CONSTRAINT `oportunidades_motivoPerdidaId_fkey` FOREIGN KEY (`motivoPerdidaId`) REFERENCES `motivos_perdida`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
