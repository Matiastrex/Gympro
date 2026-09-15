import { Router } from "express";
import { authRouter } from "../modules/auth/auth.routes";
import { empresasRouter } from "../modules/empresas/empresas.routes";
import { contactosRouter } from "../modules/contactos/contactos.routes";
import { productosRouter } from "../modules/productos/productos.routes";
import { etapasRouter } from "../modules/etapas/etapas.routes";
import { oportunidadesRouter } from "../modules/oportunidades/oportunidades.routes";
import { embudoRouter } from "../modules/embudo/embudo.routes";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/empresas", empresasRouter);
apiRouter.use("/contactos", contactosRouter);
apiRouter.use("/productos", productosRouter);
apiRouter.use("/etapas", etapasRouter);
apiRouter.use("/oportunidades", oportunidadesRouter);
apiRouter.use("/embudo", embudoRouter);
