import { rateLimit } from 'express-rate-limit';

/**
 * Specifically protects heavy hardware operations (Sync, Reset, Cleanup)
 * to prevent hammering the biometric device's fragile socket interface.
 */
export const deviceOpsLimiter = rateLimit({
	windowMs: 1 * 60 * 1000, // 1 minute
	limit: 5, 
	standardHeaders: 'draft-7',
	legacyHeaders: false,
	message: {
		success: false,
		message: "Too many hardware requests from this IP. Please wait a minute before trying again to protect machine stability."
	}
});

/**
 * Standard API rate limiter for general endpoints
 */
export const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 100, // Limit each IP to 100 requests per `window`
	standardHeaders: 'draft-7',
	legacyHeaders: false,
	message: {
		success: false,
		message: "High traffic detected. Please try again later."
	}
});
