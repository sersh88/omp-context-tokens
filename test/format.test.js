import { expect, test } from "bun:test";
import { contextLevel, formatContextTokens, formatTokens } from "../src/format.js";

test("formatTokens keeps small counts and compacts thousands and millions", () => {
	expect(formatTokens(0)).toBe("0");
	expect(formatTokens(-5)).toBe("0");
	expect(formatTokens(999)).toBe("999");
	expect(formatTokens(12_400)).toBe("12K");
	expect(formatTokens(124_000)).toBe("124K");
	expect(formatTokens(200_000)).toBe("200K");
	expect(formatTokens(272_400)).toBe("272K");
	expect(formatTokens(1_000_000)).toBe("1M");
	expect(formatTokens(1_050_000)).toBe("1.1M");
	expect(formatTokens(1_500_000)).toBe("1.5M");
	expect(formatTokens(Number.NaN)).toBe("0");
});

test("formatContextTokens renders used/window, window-only, and unknown-window forms", () => {
	expect(formatContextTokens({ tokens: 124_000, contextWindow: 200_000, percent: 62 })).toBe("124K/200K");
	expect(formatContextTokens({ tokens: 0, contextWindow: 200_000, percent: null })).toBe("200K");
	expect(formatContextTokens({ tokens: 124_000, contextWindow: 0, percent: 62 })).toBe("124K/?");
	expect(formatContextTokens({ tokens: 5_200, contextWindow: 1_000_000, percent: 0.5 })).toBe("5K/1M");
});

test("contextLevel follows the percentage band", () => {
	expect(contextLevel(10, 200_000)).toBe("normal");
	expect(contextLevel(49.9, 200_000)).toBe("normal");
	expect(contextLevel(52, 200_000)).toBe("warning");
	expect(contextLevel(95, 200_000)).toBe("error");
});

test("contextLevel follows the token band on a large window", () => {
	// 150K of a 1M window is 15%: the token band fires well before 50%.
	expect(contextLevel(14, 1_000_000)).toBe("normal");
	expect(contextLevel(20, 1_000_000)).toBe("warning");
	expect(contextLevel(60, 1_000_000)).toBe("error");
});

test("contextLevel with an unknown window falls back to the percentage band", () => {
	expect(contextLevel(10, 0)).toBe("normal");
	expect(contextLevel(95, 0)).toBe("error");
});
