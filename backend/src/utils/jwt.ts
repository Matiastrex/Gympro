import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { Rol } from "@prisma/client";

export interface JwtPayload {
  userId: number;
  rol: Rol;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"] });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}
