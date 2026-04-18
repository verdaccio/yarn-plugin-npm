# @verdaccio/yarn-plugin-npm-ping

Yarn 4 plugin that adds the `yarn npm ping` command to verify npm registry connectivity.

## Installation

```bash
yarn dlx @verdaccio/yarn-import npm-ping
```

Or from a local build:

```bash
yarn plugin import ./packages/plugin-npm-ping/bundles/@yarnpkg/plugin-npm-ping.js
```

## Usage

```bash
# Ping the default registry
yarn npm ping

# Ping a specific registry
yarn npm ping --registry http://localhost:4873

# Ping the registry configured for a scope
yarn npm ping --scope my-org

# Output as JSON
yarn npm ping --json
```

## Options

| Option | Description |
|---|---|
| `--registry <url>` | Override the registry URL to ping |
| `--scope <scope>` | Ping the registry configured for the given scope |
| `--json` | Format the output as NDJSON |

## Example output

```
➤ YN0000: ping https://registry.npmjs.org
➤ YN0000: PONG 123 ms
```

## License

MIT
