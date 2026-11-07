import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ---------- Un usuario por rol (misma contraseña para las pruebas) ----------
  const passwordHash = await bcrypt.hash("gympro123", 10);
  const usuarios = [
    { nombre: "Admin", apellido: "GymPro", email: "admin@gympro.com", rol: "ADMINISTRADOR" as const },
    { nombre: "Laura", apellido: "Medina", email: "responsable@gympro.com", rol: "RESPONSABLE_COMERCIAL" as const },
    { nombre: "Tomás", apellido: "Ríos", email: "vendedor@gympro.com", rol: "VENDEDOR" as const },
  ];

  for (const usuario of usuarios) {
    await prisma.usuario.upsert({
      where: { email: usuario.email },
      update: {},
      create: { ...usuario, passwordHash },
    });
  }

  // ---------- Etapas del embudo, adaptadas a un gimnasio de barrio ----------
  const etapas = [
    { nombre: "Consulta recibida", orden: 1, tipo: "ABIERTA" as const },
    { nombre: "Clase de prueba agendada", orden: 2, tipo: "ABIERTA" as const },
    { nombre: "Clase de prueba realizada", orden: 3, tipo: "ABIERTA" as const },
    { nombre: "Propuesta de membresía enviada", orden: 4, tipo: "ABIERTA" as const },
    { nombre: "Negociación", orden: 5, tipo: "ABIERTA" as const },
    { nombre: "Inscripto", orden: 6, tipo: "GANADA" as const },
    { nombre: "Perdida", orden: 7, tipo: "PERDIDA" as const },
    { nombre: "Inscripción cancelada", orden: 8, tipo: "BAJA" as const },
  ];

  for (const etapa of etapas) {
    const existente = await prisma.etapa.findFirst({ where: { nombre: etapa.nombre } });
    if (!existente) {
      await prisma.etapa.create({ data: etapa });
    }
  }

  // Backfill: las etapas de clase de prueba pueden haber sido sembradas antes
  // de que existiera este campo, así que se marcan siempre (idempotente).
  await prisma.etapa.updateMany({
    where: { nombre: { in: ["Clase de prueba agendada", "Clase de prueba realizada"] } },
    data: { esClasePrueba: true },
  });

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

  // ---------- Tipos de actividad (configurables por el administrador) ----------
  const tiposActividad = [
    "Llamada",
    "Correo electrónico",
    "Mensaje / WhatsApp",
    "Visita al gimnasio",
    "Reunión virtual",
    "Clase de prueba",
    "Envío de propuesta de membresía",
    "Nota interna",
  ];
  for (const [i, nombre] of tiposActividad.entries()) {
    await prisma.tipoActividad.upsert({ where: { nombre }, update: {}, create: { nombre, orden: i + 1 } });
  }
  await prisma.tipoActividad.upsert({ where: { nombre: "Otro" }, update: {}, create: { nombre: "Otro", orden: 99 } });

  console.log(
    "Seed completado. Usuarios de prueba (contraseña gympro123): " + usuarios.map((u) => u.email).join(", ")
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
