import { rateLimit } from 'express-rate-limit';
import { Request } from 'express';

const skipHealthCheck = (req: Request) => req.path === '/health';

export const deviceOpsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: 10,                  
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipHealthCheck,
  message: {
    success: false,
    message: "Too many hardware requests. Please wait a moment before retrying.",
  },
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  
  limit: 500,                 
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipHealthCheck,
  message: {
    success: false,
    message: "High traffic detected. Please try again later.",
  },
});