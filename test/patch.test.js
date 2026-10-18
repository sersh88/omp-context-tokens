/**
 * Renders through the real omp segment registry. Skipped when the host package
 * is not resolvable (the plugin's own checkout has no omp dependency).
 */
import { expect, test } from "bun:test";
import ompContextTokens from "../src/index.js";

let SEGMENTS = null;
try {
	({ SEGMENTS } = await import("@oh-my-pi/pi-coding-agent"));
} catch {
	SEGMENTS = null;
}

const run = SEGMENTS ? test : test.skip;

const theme = {
	fg: (_color, text) => text,
	icon: { context: "▯", auto: "↺" },
};

const pi = { pi: { SEGMENTS, theme }, logger: { debug: () => {}, warn: () => {} } };

function context(overrides = {}) {
	return {
		contextTokens: 124_000,
		contextWindow: 200_000,
		contextPercent: 62,
		autoCompactEnabled: true,
		compactionSpeculation: null,
		speculationBlinkOn: false,
		...overrides,
	};
}

run("render shows used/window tokens with the segment and auto-compaction icons", () => {
	ompContextTokens(pi);
	expect(SEGMENTS.context_pct.render(context()).content).toBe("▯ 124K/200K ↺");
});

run("render shows the window alone before usage is known", () => {
	ompContextTokens(pi);
	expect(SEGMENTS.context_pct.render(context({ contextPercent: null, contextTokens: 0 })).content).toBe("▯ 200K ↺");
});

run("describe carries the token label instead of the percentage", () => {
	ompContextTokens(pi);
	const view = SEGMENTS.context_pct.describe(context());
	expect(view.spans[0].t).toBe("124K/200K");
	expect(view.icon).toBe("context");
});

run("applying the patch twice does not stack", () => {
	ompContextTokens(pi);
	ompContextTokens(pi);
	expect(SEGMENTS.context_pct.render(context()).content).toBe("▯ 124K/200K ↺");
});

run("OMP_CONTEXT_TOKENS=off leaves the original renderer in place", () => {
	const original = SEGMENTS.context_pct.render;
	process.env.OMP_CONTEXT_TOKENS = "off";
	ompContextTokens(pi);
	expect(SEGMENTS.context_pct.render).toBe(original);
	delete process.env.OMP_CONTEXT_TOKENS;
});
