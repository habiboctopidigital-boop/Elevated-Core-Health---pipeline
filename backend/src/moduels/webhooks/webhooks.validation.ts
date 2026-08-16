import { z } from "zod";

/**
 * Deliberately loose — the whole point of the test-send is to relay whatever
 * the admin typed straight into the real POST /patients/intake route and show
 * them exactly what Make.com would get back, including its own validation
 * errors. Re-validating here against IntakeSchema would just duplicate that
 * and hide the real response behind a different error message.
 */
export const TestWebhookSchema = z.object({
	body: z.object({}).passthrough(),
});
