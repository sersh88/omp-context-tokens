import { expect, test } from "bun:test";
import ompContextTokens from "../src/index.js";

function startExtension(disabled = false) {
	const handlers = new Map();
	const output = [];
	let usage = { tokens: 124_000, contextWindow: 200_000, percent: 62 };
	const ctx = {
		hasUI: true,
		getContextUsage: () => usage,
		ui: { setStatus: (key, value) => output.push([key, value]) },
	};
	const previous = process.env.OMP_CONTEXT_TOKENS;
	try {
		if (disabled) process.env.OMP_CONTEXT_TOKENS = "off";
		else delete process.env.OMP_CONTEXT_TOKENS;
		ompContextTokens({ on: (event, handler) => handlers.set(event, handler) });
	} finally {
		if (previous === undefined) delete process.env.OMP_CONTEXT_TOKENS;
		else process.env.OMP_CONTEXT_TOKENS = previous;
	}
	return {
		output,
		emit: (event) => handlers.get(event)?.({ type: event }, ctx),
		setUsage: (next) => { usage = next; },
	};
}

test("fallback shows known token usage at session start", async () => {
	const host = startExtension();
	await host.emit("session_start");
	expect(host.output).toEqual([["omp-context-tokens", "124K/200K"]]);
});

test("fallback refreshes token usage at turn end", async () => {
	const host = startExtension();
	await host.emit("session_start");
	host.setUsage({ tokens: 150_000, contextWindow: 200_000, percent: 75 });
	await host.emit("turn_end");
	expect(host.output).toEqual([
		["omp-context-tokens", "124K/200K"],
		["omp-context-tokens", "150K/200K"],
	]);
});

test("fallback clears the status when usage becomes unavailable", async () => {
	const host = startExtension();
	await host.emit("session_start");
	host.setUsage(undefined);
	await host.emit("turn_end");
	expect(host.output).toEqual([
		["omp-context-tokens", "124K/200K"],
		["omp-context-tokens", undefined],
	]);
});

test("OMP_CONTEXT_TOKENS=off leaves fallback status untouched", async () => {
	const host = startExtension(true);
	await host.emit("session_start");
	await host.emit("turn_end");
	expect(host.output).toEqual([]);
});
