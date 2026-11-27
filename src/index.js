/**
 * Show used/window context tokens in the omp status line.
 *
 * When omp exposes the legacy context segment, replace `62.0%/200K` with
 * `124K/200K`, keeping the icons and warning/error coloring. Otherwise show
 * the token counts in an extension status entry alongside the stock display.
 *
 * Set `OMP_CONTEXT_TOKENS=off` to disable both paths.
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
		if (typeof pi.on !== "function") {
			pi.logger?.warn?.("omp-context-tokens: neither the legacy context segment nor extension events are available");
			return;
		}
		const refresh = (_event, ctx) => {
			if (!ctx.hasUI) return;
			const usage = ctx.getContextUsage();
			ctx.ui.setStatus("omp-context-tokens", usage ? formatContextTokens(usage) : undefined);
		};
		for (const event of [
			"session_start",
			"session_switch",
			"session_clear",
			"session_branch",
			"session_compact",
			"session_tree",
			"before_agent_start",
			"turn_end",
			"agent_end",
		]) {
			pi.on(event, refresh);
		}
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
