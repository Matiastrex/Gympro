-- CreateTable
CREATE TABLE `usuarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `apellido` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `rol` ENUM('ADMINISTRADOR', 'VENDEDOR', 'RESPONSABLE_COMERCIAL') NOT NULL DEFAULT 'VENDEDOR',
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `usuarios_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `empresas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `razonSocial` VARCHAR(191) NOT NULL,
    `cuit` VARCHAR(191) NULL,
    `industria` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `telefono` VARCHAR(191) NULL,
    `direccion` VARCHAR(191) NULL,
    `sitioWeb` VARCHAR(191) NULL,
    `estado` ENUM('POTENCIAL', 'CLIENTE', 'INACTIVO', 'NO_CONTACTAR') NOT NULL DEFAULT 'POTENCIAL',
    `origen` VARCHAR(191) NULL,
    `observaciones` TEXT NULL,
    `responsableId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contactos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `apellido` VARCHAR(191) NOT NULL,
    `documento` VARCHAR(191) NULL,
    `cargo` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `telefono` VARCHAR(191) NULL,
    `estado` ENUM('POTENCIAL', 'CLIENTE', 'INACTIVO', 'NO_CONTACTAR') NOT NULL DEFAULT 'POTENCIAL',
    `origen` VARCHAR(191) NULL,
    `observaciones` TEXT NULL,
    `empresaId` INTEGER NULL,
    `responsableId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `productos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NULL,
    `precio` DECIMAL(10, 2) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `etapas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `orden` INTEGER NOT NULL,
    `tipo` ENUM('ABIERTA', 'GANADA', 'PERDIDA') NOT NULL DEFAULT 'ABIERTA',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `oportunidades` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `titulo` VARCHAR(191) NOT NULL,
    `empresaId` INTEGER NULL,
    `contactoId` INTEGER NULL,
    `responsableId` INTEGER NULL,
    `productoId` INTEGER NULL,
    `etapaId` INTEGER NOT NULL,
    `valorEstimado` DECIMAL(10, 2) NULL,
    `probabilidadCierre` INTEGER NULL,
    `fechaEstimadaCierre` DATETIME(3) NULL,
    `fechaRealCierre` DATETIME(3) NULL,
    `origen` VARCHAR(191) NULL,
    `estado` ENUM('ABIERTA', 'GANADA', 'PERDIDA') NOT NULL DEFAULT 'ABIERTA',
    `motivoPerdida` VARCHAR(191) NULL,
    `observaciones` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `actividades` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tipo` VARCHAR(191) NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usuarioId` INTEGER NOT NULL,
    `contactoId` INTEGER NULL,
    `oportunidadId` INTEGER NULL,
    `descripcion` TEXT NULL,
    `resultado` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `historial_etapas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `oportunidadId` INTEGER NOT NULL,
    `etapaAnteriorId` INTEGER NULL,
    `etapaNuevaId` INTEGER NOT NULL,
    `usuarioId` INTEGER NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `observacion` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `empresas` ADD CONSTRAINT `empresas_responsableId_fkey` FOREIGN KEY (`responsableId`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contactos` ADD CONSTRAINT `contactos_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contactos` ADD CONSTRAINT `contactos_responsableId_fkey` FOREIGN KEY (`responsableId`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oportunidades` ADD CONSTRAINT `oportunidades_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oportunidades` ADD CONSTRAINT `oportunidades_contactoId_fkey` FOREIGN KEY (`contactoId`) REFERENCES `contactos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oportunidades` ADD CONSTRAINT `oportunidades_responsableId_fkey` FOREIGN KEY (`responsableId`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oportunidades` ADD CONSTRAINT `oportunidades_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `productos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oportunidades` ADD CONSTRAINT `oportunidades_etapaId_fkey` FOREIGN KEY (`etapaId`) REFERENCES `etapas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `actividades` ADD CONSTRAINT `actividades_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `actividades` ADD CONSTRAINT `actividades_contactoId_fkey` FOREIGN KEY (`contactoId`) REFERENCES `contactos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `actividades` ADD CONSTRAINT `actividades_oportunidadId_fkey` FOREIGN KEY (`oportunidadId`) REFERENCES `oportunidades`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historial_etapas` ADD CONSTRAINT `historial_etapas_oportunidadId_fkey` FOREIGN KEY (`oportunidadId`) REFERENCES `oportunidades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historial_etapas` ADD CONSTRAINT `historial_etapas_etapaNuevaId_fkey` FOREIGN KEY (`etapaNuevaId`) REFERENCES `etapas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historial_etapas` ADD CONSTRAINT `historial_etapas_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
