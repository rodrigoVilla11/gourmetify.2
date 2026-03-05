/**
 * Usage: node scripts/create-superadmin.mjs <username> <password>
 * Example: node scripts/create-superadmin.mjs superadmin MiPassword123
 */
import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";
import { promisify } from "util";

const [,, username, password] = process.argv;

if (!username || !password) {
  console.error("Uso: node scripts/create-superadmin.mjs <usuario> <contraseña>");
  process.exit(1);
}

// bcryptjs compatible hash via native node (uses bcryptjs via dynamic import)
async function hashPassword(plain) {
  const { default: bcrypt } = await import("bcryptjs");
  return bcrypt.hash(plain, 12);
}

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.error(`❌ Ya existe un usuario con el nombre "${username}"`);
    process.exit(1);
  }

  const hashed = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      username,
      password: hashed,
      role: "SUPERADMIN",
      organizationId: null,
      isActive: true,
    },
  });

  console.log(`✅ SUPERADMIN creado: ${user.username} (id: ${user.id})`);
  console.log(`   Login en /login con usuario: ${username}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
