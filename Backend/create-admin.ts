import prisma from "./src/config/db";
import { hashPassword } from "./src/modules/auth/auth.service";

async function main() {
  try {
    const hashedPassword = await hashPassword("admin123");
    
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
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
