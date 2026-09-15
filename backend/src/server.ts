import { app } from "./app";
import { env } from "./config/env";

app.listen(env.port, () => {
  console.log(`GymPro CRM API escuchando en http://localhost:${env.port}`);
});
