import jwt, { SignOptions } from "jsonwebtoken";

const SECRET: string = process.env.JWT_SECRET || "fallback_secret";
const EXPIRES = process.env.JWT_EXPIRES_IN || "1d";
export const generateToken = (payload: object): string => {
  const options: SignOptions = {
    expiresIn: EXPIRES as any // 'as any' or casting to specific string types fixes the overload mismatch
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