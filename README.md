# Marble roulette

This is a lucky draw by dropping marbles.

[Demo]( https://lazygyu.github.io/roulette )

# Requirements

- Typescript
- Parcel
- box2d-wasm

# Development

```shell
> yarn
> yarn dev
```

# Build

```shell
> yarn build
```

# SOOP integration

Connect a SOOP (AfreecaTV) live chat so that 별풍선 (star balloon) donations
automatically add entries to the draw. A small relay server (`server/`) is required
because the browser cannot connect to SOOP chat directly.

See [docs/SOOP_INTEGRATION.md](docs/SOOP_INTEGRATION.md) for setup and details.

```shell
> cd server && npm install && PORT=8787 npm start
```

# Test

```shell
> yarn test
```
