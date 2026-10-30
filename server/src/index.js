import { app } from "./app.js";
import { ensureAdminUser } from "./db.js";
import { env } from "./env.js";

ensureAdminUser()
  .then(() => {
    app.listen(env.port, () => {
      console.log(`API listening on ${env.port}`);
    });
  })
  .catch((error) => {
    console.error("Database is not connected");
    console.error(error);
    process.exit(1);
  });
