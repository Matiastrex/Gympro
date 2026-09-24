import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.usuario.findUnique({ where: { email: "admin@gympro.com" } });
  if (!admin) {
    throw new Error("Falta admin@gympro.com. Ejecutá primero npm run prisma:seed.");
  }

  const etapas = await prisma.etapa.findMany({ orderBy: { orden: "asc" } });
  const productos = await prisma.producto.findMany({ orderBy: { id: "asc" } });
  const etapa = (nombre: string) => {
    const encontrada = etapas.find((item) => item.nombre === nombre);
    if (!encontrada) throw new Error(`Falta la etapa ${nombre}. Ejecutá primero npm run prisma:seed.`);
    return encontrada;
  };
  const producto = (nombre: string) => {
    const encontrado = productos.find((item) => item.nombre === nombre);
    if (!encontrado) throw new Error(`Falta el producto ${nombre}. Ejecutá primero npm run prisma:seed.`);
    return encontrado;
  };

  await prisma.$transaction(async (tx) => {
    await tx.historialEtapa.deleteMany();
    await tx.actividad.deleteMany();
    await tx.oportunidad.deleteMany();
    await tx.contacto.deleteMany();
    await tx.empresa.deleteMany();

    const empresa = await tx.empresa.create({
      data: {
        razonSocial: "Textil del Oeste S.A.",
        cuit: "30-71234567-8",
        industria: "Indumentaria",
        email: "rrhh@textildeloeste.test",
        telefono: "011-4567-8901",
        estado: "POTENCIAL",
        origen: "Recomendación",
        observaciones: "Interesada en convenio corporativo para empleados.",
        responsableId: admin.id,
      },
    });

    const contactoCorporativo = await tx.contacto.create({
      data: {
        nombre: "Laura",
        apellido: "Méndez",
        cargo: "Recursos Humanos",
        email: "laura.mendez@textildeloeste.test",
        telefono: "011-4567-8902",
        empresaId: empresa.id,
        responsableId: admin.id,
        origen: "Recomendación",
      },
    });

    const juan = await tx.contacto.create({
      data: {
        nombre: "Juan",
        apellido: "Pérez",
        email: "juan.perez@test.local",
        telefono: "11-5555-0101",
        responsableId: admin.id,
        origen: "Instagram",
        observaciones: "Consulta por musculación y horarios de la mañana.",
      },
    });

    const sofia = await tx.contacto.create({
      data: {
        nombre: "Sofía",
        apellido: "Gómez",
        email: "sofia.gomez@test.local",
        telefono: "11-5555-0102",
        responsableId: admin.id,
        origen: "Sitio web",
      },
    });

    const crearOportunidad = async (data: {
      titulo: string;
      contactoId?: number;
      empresaId?: number;
      productoId: number;
      etapaId: number;
      estado: "ABIERTA" | "GANADA" | "PERDIDA";
      valorEstimado: number;
      probabilidadCierre: number;
      motivoPerdida?: string;
      observaciones?: string;
      recorrido: { etapaId: number; observacion: string }[];
    }) => {
      const oportunidad = await tx.oportunidad.create({
        data: {
          titulo: data.titulo,
          contactoId: data.contactoId,
          empresaId: data.empresaId,
          productoId: data.productoId,
          etapaId: data.etapaId,
          responsableId: admin.id,
          estado: data.estado,
          valorEstimado: data.valorEstimado,
          probabilidadCierre: data.probabilidadCierre,
          fechaEstimadaCierre: data.estado === "ABIERTA" ? new Date("2026-10-15") : null,
          fechaRealCierre: data.estado === "ABIERTA" ? null : new Date("2026-09-20"),
          motivoPerdida: data.motivoPerdida,
          observaciones: data.observaciones,
        },
      });

      await tx.historialEtapa.createMany({
        data: data.recorrido.map((movimiento, index) => ({
          oportunidadId: oportunidad.id,
          etapaAnteriorId: index === 0 ? null : data.recorrido[index - 1].etapaId,
          etapaNuevaId: movimiento.etapaId,
          usuarioId: admin.id,
          fecha: new Date(`2026-09-${String(10 + index).padStart(2, "0")}T10:00:00.000Z`),
          observacion: movimiento.observacion,
        })),
      });

      return oportunidad;
    };

    await crearOportunidad({
      titulo: "Consulta de Juan Pérez por musculación",
      contactoId: juan.id,
      productoId: producto("Musculación mensual").id,
      etapaId: etapa("Clase de prueba agendada").id,
      estado: "ABIERTA",
      valorEstimado: 15000,
      probabilidadCierre: 35,
      observaciones: "Clase de prueba coordinada para el jueves.",
      recorrido: [
        { etapaId: etapa("Consulta recibida").id, observacion: "Llegó por Instagram." },
        { etapaId: etapa("Clase de prueba agendada").id, observacion: "Agendada por WhatsApp." },
      ],
    });

    await crearOportunidad({
      titulo: "Convenio corporativo Textil del Oeste",
      empresaId: empresa.id,
      productoId: producto("Combo musculación + funcional").id,
      etapaId: etapa("Propuesta de membresía enviada").id,
      estado: "ABIERTA",
      valorEstimado: 220000,
      probabilidadCierre: 65,
      observaciones: "Se envió propuesta para diez empleados.",
      recorrido: [
        { etapaId: etapa("Consulta recibida").id, observacion: "Contacto derivado por un socio." },
        { etapaId: etapa("Propuesta de membresía enviada").id, observacion: "Propuesta enviada a RRHH." },
      ],
    });

    await crearOportunidad({
      titulo: "Inscripción de Sofía Gómez",
      contactoId: sofia.id,
      productoId: producto("Personal training (mensual)").id,
      etapaId: etapa("Inscripto").id,
      estado: "GANADA",
      valorEstimado: 35000,
      probabilidadCierre: 100,
      observaciones: "Comienza el plan el próximo mes.",
      recorrido: [
        { etapaId: etapa("Consulta recibida").id, observacion: "Consulta desde el sitio web." },
        { etapaId: etapa("Clase de prueba realizada").id, observacion: "La clase fue satisfactoria." },
        { etapaId: etapa("Inscripto").id, observacion: "Se confirmó la inscripción." },
      ],
    });

    await crearOportunidad({
      titulo: "Consulta perdida por precio",
      contactoId: contactoCorporativo.id,
      productoId: producto("Funcional mensual").id,
      etapaId: etapa("Perdida").id,
      estado: "PERDIDA",
      valorEstimado: 17000,
      probabilidadCierre: 0,
      motivoPerdida: "Eligió una alternativa más económica.",
      recorrido: [
        { etapaId: etapa("Consulta recibida").id, observacion: "Consulta inicial." },
        { etapaId: etapa("Perdida").id, observacion: "Informó que eligió otra opción." },
      ],
    });
  });

  console.log("Datos demo cargados: 1 empresa, 3 contactos y 4 oportunidades con historial.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());