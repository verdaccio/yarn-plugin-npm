# @verdaccio/yarn-plugin-npm-star

Yarn 4 plugin that adds the `yarn npm star` and `yarn npm unstar` commands to star/unstar packages on npm registries.

## Installation

```bash
yarn dlx @verdaccio/yarn-import npm-star
```

Or from a local build:

```bash
yarn plugin import ./packages/plugin-npm-star/bundles/@yarnpkg/plugin-npm-star.js
```

## Usage

### `yarn npm star`

Star a package on the registry (requires authentication).

```bash
yarn npm star lodash
yarn npm star @verdaccio/core
yarn npm star my-package --registry http://localhost:4873
```

### `yarn npm unstar`

Remove a star from a package on the registry (requires authentication).

```bash
yarn npm unstar lodash
yarn npm unstar @verdaccio/core
```

## Options

Both commands share the same options:

| Option | Description |
|---|---|
| `--registry <url>` | Override the registry URL |
| `--scope <scope>` | Use the registry configured for the given scope |
| `--json` | Format the output as NDJSON |

## Positional arguments

| Argument | Description |
|---|---|
| `package` | Package name to star or unstar |

## License

MIT
