# omp-context-tokens

Status-line extension for [omp (Oh My Pi)](https://github.com/can1357/oh-my-pi): the context
segment shows **used/window tokens** instead of a bare percentage.

```
omp as installed:   ▯ 62.0%/200K ↺
with this plugin:   ▯ 124K/200K ↺
```

The percentage hides how many tokens are actually in play — 13% means something very different
on a 200K window than on a 1M one, and the window size alone still leaves you multiplying in
your head. The absolute count is the number you act on when deciding whether to compact, hand
off, or keep going.

The segment keeps everything else omp draws there: the context icon, the auto-compaction icon,
and the warning/error coloring (omp's own bands: warning at 50% or 150K tokens, error at 90% or
500K, whichever comes first).

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

Compared with omp's built-in `formatContextUsage`, only the label changes: the native-description
path (terminals speaking the surface protocol) carries the same label, so the segment reads the
same everywhere.

Requires the `context_pct` segment to be on the status line — it is in the default, `full` and
`nerd` presets (see `statusLine.rightSegments` in `omp config list`).

## Disable

```bash
export OMP_CONTEXT_TOKENS=off   # leave omp's own rendering untouched
```

Or uninstall the plugin. Nothing else is patched: the extension only replaces the `context_pct`
segment's `render`/`describe`, and re-applying it never stacks layers (guarded by a `Symbol.for`
marker on the segment).

## Development

```bash
bun test
```

`test/format.test.js` covers the pure formatters. `test/patch.test.js` renders through the real
omp segment registry and skips when `@oh-my-pi/pi-coding-agent` is not resolvable from the
checkout.

## License

MIT
