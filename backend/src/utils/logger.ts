import { pino } from "pino";

import { env } from "@/utils/envConfig";

export const logger = pino({
	name: "agency-dashboard-api",
	level: env.isProduction ? "info" : "debug",
});
