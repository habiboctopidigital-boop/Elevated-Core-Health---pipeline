import { rateLimit } from "express-rate-limit";

import { env } from "@/utils/envConfig";

const rateLimiter = rateLimit({
	legacyHeaders: true,
	limit: env.COMMON_RATE_LIMIT_MAX_REQUESTS,
	message: "Too many requests, please try again later.",
	standardHeaders: true,
	windowMs: 15 * 60 * env.COMMON_RATE_LIMIT_WINDOW_MS,
	// Use the library's built-in key generator: it derives the client key from
	// the (trusted-proxy-aware) IP and handles IPv6 correctly. A hand-rolled
	// `req.ip` generator trips express-rate-limit v8's IPv6 safety check.
});

export default rateLimiter;
