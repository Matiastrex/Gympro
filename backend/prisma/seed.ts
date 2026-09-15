import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ---------- Usuario habilitado (requisito del MVP) ----------
  const passwordHash = await bcrypt.hash("gympro123", 10);
  await prisma.usuario.upsert({
    where: { email: "admin@gympro.com" },
    update: {},
    create: {
      nombre: "Admin",
      apellido: "GymPro",
      email: "admin@gympro.com",
      passwordHash,
      rol: "ADMINISTRADOR",
    },
  });

  // ---------- Etapas del embudo, adaptadas a un gimnasio de barrio ----------
  const etapas = [
    { nombre: "Consulta recibida", orden: 1, tipo: "ABIERTA" as const },
    { nombre: "Clase de prueba agendada", orden: 2, tipo: "ABIERTA" as const },
    { nombre: "Clase de prueba realizada", orden: 3, tipo: "ABIERTA" as const },
    { nombre: "Propuesta de membresía enviada", orden: 4, tipo: "ABIERTA" as const },
    { nombre: "Negociación", orden: 5, tipo: "ABIERTA" as const },
    { nombre: "Inscripto", orden: 6, tipo: "GANADA" as const },
    { nombre: "Perdida", orden: 7, tipo: "PERDIDA" as const },
  ];

  for (const etapa of etapas) {
    const existente = await prisma.etapa.findFirst({ where: { nombre: etapa.nombre } });
    if (!existente) {
      await prisma.etapa.create({ data: etapa });
    }
  }

  // ---------- Productos: planes de membresía del gimnasio ----------
  // (No son los planes SaaS "Básico/Profesional" de GymPro; son lo que EL
  // GIMNASIO le vende a sus socios).
  const productos = [
    { nombre: "Musculación mensual", precio: 15000 },
    { nombre: "Funcional mensual", precio: 17000 },
    { nombre: "Combo musculación + funcional", precio: 22000 },
    { nombre: "Clase suelta", precio: 3000 },
    { nombre: "Personal training (mensual)", precio: 35000 },
  ];

  for (const producto of productos) {
    const existente = await prisma.producto.findFirst({ where: { nombre: producto.nombre } });
    if (!existente) {
      await prisma.producto.create({ data: producto });
    }
  }

  console.log("Seed completado. Usuario de prueba: admin@gympro.com / gympro123");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
