-- CreateTable
CREATE TABLE `solicitudes_reapertura` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `oportunidadId` INTEGER NOT NULL,
    `etapaDestinoId` INTEGER NOT NULL,
    `solicitanteId` INTEGER NOT NULL,
    `motivo` TEXT NOT NULL,
    `estado` ENUM('PENDIENTE', 'APROBADA', 'RECHAZADA') NOT NULL DEFAULT 'PENDIENTE',
    `resueltaPorId` INTEGER NULL,
    `resueltaEn` DATETIME(3) NULL,
    `comentarioResolucion` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `solicitudes_reapertura_estado_idx`(`estado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notificaciones` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioId` INTEGER NOT NULL,
    `tipo` ENUM('REAPERTURA_SOLICITADA', 'REAPERTURA_APROBADA', 'REAPERTURA_RECHAZADA') NOT NULL,
    `mensaje` TEXT NOT NULL,
    `leida` BOOLEAN NOT NULL DEFAULT false,
    `solicitudId` INTEGER NULL,
    `oportunidadId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notificaciones_usuarioId_leida_idx`(`usuarioId`, `leida`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `solicitudes_reapertura` ADD CONSTRAINT `solicitudes_reapertura_oportunidadId_fkey` FOREIGN KEY (`oportunidadId`) REFERENCES `oportunidades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `solicitudes_reapertura` ADD CONSTRAINT `solicitudes_reapertura_etapaDestinoId_fkey` FOREIGN KEY (`etapaDestinoId`) REFERENCES `etapas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `solicitudes_reapertura` ADD CONSTRAINT `solicitudes_reapertura_solicitanteId_fkey` FOREIGN KEY (`solicitanteId`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `solicitudes_reapertura` ADD CONSTRAINT `solicitudes_reapertura_resueltaPorId_fkey` FOREIGN KEY (`resueltaPorId`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notificaciones` ADD CONSTRAINT `notificaciones_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notificaciones` ADD CONSTRAINT `notificaciones_solicitudId_fkey` FOREIGN KEY (`solicitudId`) REFERENCES `solicitudes_reapertura`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notificaciones` ADD CONSTRAINT `notificaciones_oportunidadId_fkey` FOREIGN KEY (`oportunidadId`) REFERENCES `oportunidades`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
