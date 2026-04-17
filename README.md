# yarn-plugin-npm

A Yarn 4 plugin that adds extra npm commands not included in Yarn by default.

## Commands

- `yarn npm ping` — Verify if the npm registry is reachable
- `yarn npm unpublish` — Remove a package or specific version from the registry

## Requirements

- Yarn >= 4.x (stable)
- Node.js >= 18

## Installation

### From local build

```bash
yarn plugin import ./packages/plugin-npm-ping/bundles/@yarnpkg/plugin-npm-ping.js
```

## Usage

### `yarn npm ping`

Ping the npm registry to check connectivity.

```bash
# Ping the default registry
yarn npm ping

# Ping a specific registry
yarn npm ping --registry https://registry.npmjs.org

# Ping the registry configured for a specific scope
yarn npm ping --scope my-org

# Output as JSON
yarn npm ping --json
```

| Option | Description |
|---|---|
| `--registry <url>` | Override the registry URL to ping |
| `--scope <scope>` | Ping the registry configured for the given scope |
| `--json` | Format the output as NDJSON |

#### Example output

```
➤ YN0000: ping https://registry.npmjs.org
➤ YN0000: PONG 123 ms
```

### `yarn npm unpublish`

Remove a package or a specific version from the npm registry.

```bash
# Unpublish a specific version
yarn npm unpublish my-package@1.0.0

# Unpublish a scoped package version
yarn npm unpublish @my-scope/my-package@1.0.0

# Unpublish all versions (requires --force)
yarn npm unpublish my-package --force

# With OTP for two-factor authentication
yarn npm unpublish my-package@1.0.0 --otp 123456

# Against a specific registry
yarn npm unpublish my-package@1.0.0 --registry https://registry.npmjs.org
```

| Option | Description |
|---|---|
| `--registry <url>` | Override the registry URL |
| `--scope <scope>` | Use the registry configured for the given scope |
| `--otp <code>` | One-time password for two-factor authentication |
| `--force` | Required when unpublishing all versions of a package |
| `--json` | Format the output as NDJSON |

## Development

### Prerequisites

```bash
# Install dependencies
yarn install
```

### Build

```bash
# Build all workspaces
yarn build

# Build the plugin only
cd packages/plugin-npm-ping && yarn build
```

### Install the plugin locally (for testing)

```bash
yarn plugin import ./packages/plugin-npm-ping/bundles/@yarnpkg/plugin-npm-ping.js
```

### Upgrade Yarn

```bash
yarn set version stable
```

## License

MIT
