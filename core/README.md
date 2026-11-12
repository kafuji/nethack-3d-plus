# Game core

The game itself: NetHack 5.0 source with this project's changes, compiled to
WebAssembly and loaded by the client in `src/runtime/`.

- `NetHack/`: the source tree, vendored with `git subtree` (squashed).
- `build-wasm.sh`: builds `build/nethack.js` and `build/nethack.wasm`.

Everything under `core/` is distributed under the NetHack General Public
License (`NetHack/dat/license`).

## Provenance

| Layer | Source |
| --- | --- |
| Upstream base | [NetHack/NetHack](https://github.com/NetHack/NetHack), branch `NetHack-5.0`, commit `f3fc8537a47331578fe6ba67a7949fe46d1486a8` (2026-09-23) |
| WebAssembly integration | [JamesIV4/NetHack](https://github.com/JamesIV4/NetHack), branch `forked-wasm-5`, commit `e76b93423a3dd4432e2a46bc47066a8ba529f468`, by James Pound and Adam Powers |

To list every file that differs from the upstream base:

```bash
git diff --stat 4cf833505: HEAD:core/NetHack
```

`4cf833505` is the squashed upstream snapshot the subtree started from.

## Building

The build needs a POSIX host with `make`, `cc`, `curl` and an activated
Emscripten SDK, so it runs in CI: the
[Build game core](../.github/workflows/build-core-wasm.yml) workflow builds
every push that touches `core/`, checks the result against the interface of
the artifacts in `public/`, starts a game on it, and uploads the build.

On such a host:

```bash
bash core/build-wasm.sh
```

The client still loads the checked-in `public/nethack-5.js` and
`public/nethack-5.wasm`; a build is not shipped until those files are replaced.

## Taking upstream changes

```bash
git subtree pull --prefix=core/NetHack https://github.com/NetHack/NetHack.git NetHack-5.0 --squash
```

This fetches the full upstream history (about 170 MB) and merges it into
`core/NetHack`, with conflicts wherever this project changed the same lines.
