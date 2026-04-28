import Admin from "../models/Admin.model";

export const seedAdmin = async () => {
  const name = process.env.ADMIN_NAME || "Admin";
  const email = process.env.ADMIN_EMAIL || "admin@bupfstjournal.com";
  const password = process.env.ADMIN_PASSWORD || "admin12345";

  const existingAdmin = await Admin.findOne({ email });

  if (existingAdmin) {
    console.log("Admin already exists.");
    return;
  }

  await Admin.create({
    name,
    email,
    password,
    role: "super_admin",
    isActive: true,
  });

  console.log(`Default admin created: ${email}`);
};