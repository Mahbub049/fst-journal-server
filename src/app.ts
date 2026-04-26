import express from "express";
import cors from "cors";
import routes from "./routes";
import { env } from "./config/env";

const app = express();

app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", routes);

app.get("/", (_req, res) => {
  res.send("Server is running");
});

export default app;