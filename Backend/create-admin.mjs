import { PrismaClient } from "./src/generated/client/client.js";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  try {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    
    const admin = await prisma.user.create({
      data: {
        username: "admin",
        email: "admin@example.com",
        password: hashedPassword,
        role: "admin",
        emailVerified: true,
      },
    });
    
    console.log("Admin user created successfully!");
    console.log(`Email: ${admin.email}`);
    console.log(`Password: admin123`);
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
