// utils/jjwt.ts
import jwt, { SignOptions } from "jsonwebtoken";

const SECRET: string = process.env.JWT_SECRET || "fallback_secret";

if (SECRET === "fallback_secret") {
  console.warn("[JWT] Warning: JWT_SECRET is not set. Using fallback secret.");
}

const EXPIRES = process.env.JWT_EXPIRES_IN || "1d";

export interface TokenPayload {
  id: string;
  email: string;
  username: string;
  role: string;
  employeeId: string | null;
}
export const generateToken = (payload: TokenPayload): string => {
  const options: SignOptions = {
    expiresIn: EXPIRES as any,
  };
  return jwt.sign(payload, SECRET, options);
};

export const verifyToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, SECRET) as TokenPayload;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
};