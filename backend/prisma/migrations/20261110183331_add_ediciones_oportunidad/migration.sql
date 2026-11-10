-- CreateTable
CREATE TABLE `ediciones_oportunidad` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `oportunidadId` INTEGER NOT NULL,
    `usuarioId` INTEGER NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `motivo` TEXT NOT NULL,
    `cambios` JSON NOT NULL,

    INDEX `ediciones_oportunidad_oportunidadId_idx`(`oportunidadId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ediciones_oportunidad` ADD CONSTRAINT `ediciones_oportunidad_oportunidadId_fkey` FOREIGN KEY (`oportunidadId`) REFERENCES `oportunidades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ediciones_oportunidad` ADD CONSTRAINT `ediciones_oportunidad_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
