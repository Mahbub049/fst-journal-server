import app from "./app";
import { env } from "./config/env";

const port = Number(env.port);
const host = "127.0.0.1";

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PORT value: ${env.port}`);
}

app.listen(port, host, () => {
  console.log(`Server running on http://${host}:${port}`);
});
