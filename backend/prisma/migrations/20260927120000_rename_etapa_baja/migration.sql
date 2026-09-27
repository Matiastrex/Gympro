-- Renombra la etapa del embudo "Baja" a "Inscripción cancelada" en bases ya sembradas.
UPDATE `etapas` SET `nombre` = 'Inscripción cancelada' WHERE `nombre` = 'Baja' AND `tipo` = 'BAJA';
