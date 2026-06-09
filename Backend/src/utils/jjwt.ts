import jwt, { SignOptions } from "jsonwebtoken";

const SECRET: string = process.env.JWT_SECRET || "fallback_secret";
if (SECRET === "fallback_secret") {
  console.warn("[JJWT] Warning: JWT_SECRET is not set in environment. Using fallback secret. This will cause authentication to fail after server restarts.");
}
const EXPIRES = process.env.JWT_EXPIRES_IN || "1d";
export const generateToken = (payload: object): string => {
  const options: SignOptions = {
    expiresIn: EXPIRES as any 
  };
  return jwt.sign(payload, SECRET, options);
};
export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, SECRET);
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
};