import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import config from "../config/index.js";
import { prisma } from "../helpers/prisma.js";

export const seedSuperAdmin = async () => {
  if (!config.admin.email || !config.admin.password) return;

  console.log("Checking for Admin with email:", config.admin.email);

  const isExist = await prisma.user.findFirst({
    where: {
      email: config.admin.email,
      role: UserRole.SUPER_ADMIN,
    },
  });

  if (!isExist) {
    const saltRound = config.bcrypt_salt_round || 10;
    const hashedPassword = await bcrypt.hash(
      config.admin.password as string,
      saltRound,
    );

    await prisma.user.create({
      data: {
        username: config.admin.name || "superadmin",
        email: config.admin.email as string,
        phone: config.admin.phone as string,
        password: hashedPassword,
        role: UserRole.SUPER_ADMIN,
        isVerified: true,
      },
    });
    console.log("Super admin created successfully.");
  } else {
    console.log("Super admin already exists.");
  }
};
