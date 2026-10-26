-- AlterTable
ALTER TABLE `contactos` ADD COLUMN `creadoPorId` INTEGER NULL;

-- AlterTable
ALTER TABLE `empresas` ADD COLUMN `creadoPorId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `empresas` ADD CONSTRAINT `empresas_creadoPorId_fkey` FOREIGN KEY (`creadoPorId`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contactos` ADD CONSTRAINT `contactos_creadoPorId_fkey` FOREIGN KEY (`creadoPorId`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
