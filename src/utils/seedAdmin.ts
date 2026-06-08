import Admin from "../models/Admin.model";
import { env } from "../config/env";

export const seedAdmin = async () => {
  const name = env.admin.name || "Admin";
  const email = (env.admin.email || "admin@bupfstjournal.com")
    .trim()
    .toLowerCase();
  const initialPassword = env.admin.initialPassword;
  const shouldResetPassword = process.env.ADMIN_RESET_PASSWORD === "true";

  const existingAdmin = await Admin.findOne({ email }).select("+password");

  if (existingAdmin) {
    if (shouldResetPassword && initialPassword) {
      existingAdmin.name = name;
      existingAdmin.password = initialPassword;
      existingAdmin.role = "super_admin";
      existingAdmin.isActive = true;
      existingAdmin.loginOtpHash = undefined;
      existingAdmin.loginOtpExpiresAt = undefined;
      existingAdmin.loginOtpAttempts = 0;
      existingAdmin.loginOtpLastSentAt = undefined;

      await existingAdmin.save();

      console.log(`Admin password reset successfully for: ${email}`);
      console.log(
        "Security reminder: remove ADMIN_RESET_PASSWORD and ADMIN_INITIAL_PASSWORD from .env after login works."
      );
      return;
    }

    console.log(`Admin already exists: ${email}`);
    return;
  }

  if (!initialPassword) {
    console.warn(
      "No admin account found. Set ADMIN_EMAIL and ADMIN_INITIAL_PASSWORD once to create the first admin."
    );
    return;
  }

  await Admin.create({
    name,
    email,
    password: initialPassword,
    role: "super_admin",
    isActive: true,
  });

  console.log(`Initial admin created: ${email}`);
  console.log(
    "Security reminder: remove ADMIN_INITIAL_PASSWORD from .env after login works."
  );
};
