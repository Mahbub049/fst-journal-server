import app from "./app";
import { env } from "./config/env";
import { connectDB } from "./config/db";
import { seedAdmin } from "./utils/seedAdmin";
import { seedPages } from "./utils/seedPages";
import { seedHomepage } from "./utils/seedHomepage";

const startServer = async () => {
  await connectDB();

  await seedAdmin();
  await seedPages();
  await seedHomepage();

  app.listen(env.port, () => {
    console.log(`Server running on http://localhost:${env.port}`);
  });
};

startServer();