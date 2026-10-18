/**
 * Show used/window context tokens in the omp status line.
 *
 * omp renders the context segment as `62.0%/200K`; the absolute number is the
 * signal you actually act on when deciding to compact or hand off. This
 * extension replaces the label with `124K/200K`, keeping the segment icon, the
 * auto-compaction icon and the warning/error coloring.
 *
 * Set `OMP_CONTEXT_TOKENS=off` to leave the stock rendering untouched.
 */
import { contextLevel, formatContextTokens } from "./format.js";

const PATCHED = Symbol.for("omp-context-tokens.patched");
const ORIGINAL_RENDER = Symbol.for("omp-context-tokens.original-render");
const ORIGINAL_DESCRIBE = Symbol.for("omp-context-tokens.original-describe");
const LEVEL_COLORS = { normal: "statusLineContext", warning: "warning", error: "error" };

/** Segment label for one render context. */
function contextLabel(ctx) {
	return formatContextTokens({
		tokens: ctx.contextTokens ?? 0,
		contextWindow: ctx.contextWindow ?? 0,
		percent: ctx.contextPercent ?? null,
	});
}

function themeColor(level) {
	return LEVEL_COLORS[level] ?? "statusLineContext";
}

function toneOf(level) {
	return level === "normal" ? undefined : level;
}

export default function ompContextTokens(pi) {
	if (process.env.OMP_CONTEXT_TOKENS === "off") return;

	const segment = pi.pi?.SEGMENTS?.context_pct;
	if (!segment || typeof segment.render !== "function") {
		pi.logger?.warn?.("omp-context-tokens: context_pct segment not found; nothing patched");
		return;
	}
	if (segment[PATCHED]) return;

	const theme = pi.pi.theme;
	const originalRender = segment.render;
	const originalDescribe = segment.describe;
	const level = ctx => contextLevel(ctx.contextPercent ?? 0, ctx.contextWindow ?? 0);
	const autoIcon = ctx => (ctx.autoCompactEnabled && theme.icon.auto ? ` ${theme.icon.auto}` : "");

	// Keep the originals reachable on the segment object so a reload never
	// wraps a previous patch.
	Object.defineProperty(segment, ORIGINAL_RENDER, { value: originalRender, configurable: true });
	segment.render = ctx => {
		const color = themeColor(level(ctx));
		const text = `${theme.fg(color, contextLabel(ctx))}${autoIcon(ctx)}`;
		const icon = theme.icon.context;
		return { content: icon ? `${icon} ${text}` : text, visible: true };
	};

	// Terminals speaking the native description protocol paint the segment from
	// `describe` instead of `render`; swap the label span there too.
	if (typeof originalDescribe === "function") {
		Object.defineProperty(segment, ORIGINAL_DESCRIBE, { value: originalDescribe, configurable: true });
		segment.describe = ctx => {
			const view = originalDescribe.call(segment, ctx);
			const first = view?.spans?.[0];
			if (typeof first?.t !== "string") return view;
			const color = themeColor(level(ctx));
			return { ...view, spans: [{ ...first, t: contextLabel(ctx), s: color }, ...view.spans.slice(1)], tone: toneOf(level(ctx)) };
		};
	}

	Object.defineProperty(segment, PATCHED, { value: true });
	pi.logger?.debug?.("omp-context-tokens: context_pct shows used/window tokens");
}
