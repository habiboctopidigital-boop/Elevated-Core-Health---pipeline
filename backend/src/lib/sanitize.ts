/**
 * Strips HTML/script-relevant characters from free-text user input before it's persisted.
 * React already escapes text content on render, so this isn't the only line of defense —
 * it's a defense-in-depth measure so stored values are plain text no matter how they're
 * eventually rendered (emails, PDFs, other clients, etc).
 */
export function sanitizeText(value: string): string {
	return value
		.replace(/<[^>]*>/g, "") // strip tag-like sequences, e.g. <script>
		.replace(/[<>`]/g, "") // strip any stray angle brackets / backticks
		.trim();
}
