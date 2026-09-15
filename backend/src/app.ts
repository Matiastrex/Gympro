import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { apiRouter } from "./routes";
import { errorMiddleware } from "./middlewares/error.middleware";

export const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api", apiRouter);

// Siempre al final: captura cualquier error lanzado (o pasado con next(err))
// por las capas anteriores.
app.use(errorMiddleware);
