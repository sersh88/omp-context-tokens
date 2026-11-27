# omp-context-tokens

Status-line extension for [omp (Oh My Pi)](https://github.com/can1357/oh-my-pi): show
**used/window tokens** instead of having to calculate them from the percentage.

```
omp as installed:   ▯ 62.0%/200K ↺
with this plugin:   ▯ 124K/200K ↺
```

The percentage hides how many tokens are actually in play — 13% means something very different
on a 200K window than on a 1M one, and the window size alone still leaves you multiplying in
your head. The absolute count is the number you act on when deciding whether to compact, hand
off, or keep going.

On hosts that expose the context segment renderer, the plugin replaces its label in place and
keeps the context and auto-compaction icons and the warning/error coloring.

## Install

Via the marketplace:

```
/marketplace add sersh88/omp-context-tokens
/marketplace install omp-context-tokens@omp-context-tokens
```

From a checkout:

```bash
git clone https://github.com/sersh88/omp-context-tokens.git
omp plugin link ./omp-context-tokens
```

Restart the session; newly loaded extension modules are not picked up by `/reload-plugins`.

Remove it with `omp plugin uninstall omp-context-tokens`.

## Behavior

| Situation | Rendered label |
| --- | --- |
| Usage and window known | `124K/200K` |
| Usage not measured yet (startup, right after compaction) | `200K` |
| Model reports no window | `124K/?` |

On older hosts, the plugin replaces the `context_pct` label in both the terminal renderer and
the native-description path. Keep `context_pct` enabled to see it.

On OMP 19.2.0, the built-in segment cannot be replaced by extensions. The plugin instead adds
a plain token count to the status bar using the extension status API, without the built-in
segment's icons or warning colors. Keep `statusLine.showHookStatus` enabled. To hide the stock
percentage, use the `custom` status-line preset and omit `context_pct` from its segment lists:

```yaml
statusLine:
  preset: custom
  rightSegments: [session_name, token_total, cost]
```

The extension status refreshes on session and agent events. An idle model change is reflected
on the next refresh. The plugin does not change your settings or require transcript presenters.

## Disable

```bash
export OMP_CONTEXT_TOKENS=off   # leave omp's own rendering untouched
```

Or uninstall the plugin. On older hosts, re-applying the renderer patch never stacks layers
(guarded by a marker on the segment).

## Development

```bash
bun test
```

`test/format.test.js` covers the pure formatters. `test/patch.test.js` renders through the real
omp segment registry and skips when `@oh-my-pi/pi-coding-agent` is not resolvable from the
checkout.
`test/status.test.js` exercises the extension status fallback without a host dependency.

## License

MIT
