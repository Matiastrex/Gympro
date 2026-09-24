-- AlterTable
ALTER TABLE `contactos` ADD COLUMN `bajaDefinitiva` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `empresas` ADD COLUMN `bajaDefinitiva` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `etapas` ADD COLUMN `esClasePrueba` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `tipo` ENUM('ABIERTA', 'GANADA', 'PERDIDA', 'BAJA') NOT NULL DEFAULT 'ABIERTA';

-- AlterTable
ALTER TABLE `oportunidades` ADD COLUMN `fechaBaja` DATETIME(3) NULL,
    ADD COLUMN `motivoBaja` VARCHAR(191) NULL,
    MODIFY `estado` ENUM('ABIERTA', 'GANADA', 'PERDIDA', 'BAJA') NOT NULL DEFAULT 'ABIERTA';
