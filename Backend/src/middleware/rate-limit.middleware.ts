import { rateLimit } from 'express-rate-limit';

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
