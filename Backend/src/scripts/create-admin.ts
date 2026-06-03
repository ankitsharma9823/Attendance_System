import { prisma } from "../config/db";
import { hashPassword } from "../modules/auth/auth.service";

const email = "rimalankush587@gmail.com";
const plainPassword = "3184309@w";

async function main() {
  const existing = await prisma.user.findFirst({ where: { email: email.toLowerCase() } });
  if (existing) {
    console.log("Admin user already exists:", existing.id);
    return;
  }
  const hashed = await hashPassword(plainPassword);
  const admin = await prisma.user.create({
    data: {
      username: "admin",
      email: email.toLowerCase(),
      password: hashed,
      role: "admin",
      emailVerified: true,
    },
  });
  console.log("Created admin user:", admin.id);
}

main()
  .catch((e) => console.error("Error creating admin:", e))
  .finally(() => prisma.$disconnect());
