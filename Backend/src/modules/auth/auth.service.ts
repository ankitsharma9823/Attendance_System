import bcrypt from "bcrypt";
import crypto from "crypto";

const SALT_ROUNDS = 10;
const OTP_EXPIRY_MINUTES = 10;
const RESET_TOKEN_EXPIRY_HOURS = 24;

export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const generateResetToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

export const getOTPExpiry = (): Date => {
  const now = new Date();
  return new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);
};

export const getResetTokenExpiry = (): Date => {
  const now = new Date();
  return new Date(now.getTime() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
};

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const verifyPassword = async (
  password: string,
  hash: string | null
): Promise<boolean> => {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
};

export const isOTPExpired = (expiry: Date | null): boolean => {
  if (!expiry) return true;
  return new Date() > expiry;
};

export const isResetTokenExpired = (expiry: Date | null): boolean => {
  if (!expiry) return true;
  return new Date() > expiry;
};
