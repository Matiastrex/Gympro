-- AddForeignKey
ALTER TABLE `historial_etapas`
ADD CONSTRAINT `historial_etapas_etapaAnteriorId_fkey`
FOREIGN KEY (`etapaAnteriorId`) REFERENCES `etapas`(`id`)
ON DELETE SET NULL ON UPDATE CASCADE;