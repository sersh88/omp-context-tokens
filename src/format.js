/**
 * Pure formatting for the context segment. Kept free of harness imports so it
 * can be tested without loading omp.
 */

/** Warning/error bands, mirroring omp's own context thresholds. */
const WARNING_PERCENT = 50;
const WARNING_TOKENS = 150_000;
const ERROR_PERCENT = 90;
const ERROR_TOKENS = 500_000;

/** Compact token count: `999`, `12K`, `1.5M`. */
export function formatTokens(count) {
	if (!Number.isFinite(count) || count <= 0) return "0";
	if (count >= 1_000_000) {
		const millions = count / 1_000_000;
		return `${Number.isInteger(millions) ? millions : millions.toFixed(1)}M`;
	}
	return count >= 1000 ? `${Math.round(count / 1000)}K` : `${Math.round(count)}`;
}

/**
 * Context label: `124K/200K` (used/window). The window alone while usage is
 * still unknown, and `124K/?` when the model reports no window.
 */
export function formatContextTokens({ tokens, contextWindow, percent }) {
	const used = formatTokens(tokens);
	const window = Number.isFinite(contextWindow) && contextWindow > 0 ? formatTokens(contextWindow) : null;
	if (window === null) return `${used}/?`;
	return percent === null || percent === undefined ? window : `${used}/${window}`;
}

/** Whichever of the percentage or token band is reached first. */
function reachesThreshold(percent, contextWindow, percentThreshold, tokenThreshold) {
	if (!Number.isFinite(percent) || percent <= 0) return false;
	if (!Number.isFinite(contextWindow) || contextWindow <= 0) return percent >= percentThreshold;
	return percent >= Math.min(percentThreshold, (tokenThreshold / contextWindow) * 100);
}

/** `normal` | `warning` | `error`, matching omp's status-line coloring. */
export function contextLevel(percent, contextWindow) {
	if (reachesThreshold(percent, contextWindow, ERROR_PERCENT, ERROR_TOKENS)) return "error";
	if (reachesThreshold(percent, contextWindow, WARNING_PERCENT, WARNING_TOKENS)) return "warning";
	return "normal";
}
