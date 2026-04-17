# yarn-plugin-npm

Yarn 4 plugins that add extra npm commands not included in Yarn by default.

## Plugins

| Plugin | Package | Commands |
|---|---|---|
| npm-ping | `@verdaccio/yarn-plugin-npm-ping` | `yarn npm ping`, `yarn npm unpublish` |
| npm-login | `@verdaccio/yarn-plugin-npm-login` | `yarn npm login` |

## Requirements

- Yarn >= 4.x (stable)
- Node.js >= 24

## Installation

### Using `@verdaccio/yarn-import` (recommended)

The easiest way to install plugins — no need to find URLs or bundle paths:

```bash
# Install the latest version of a plugin
yarn dlx @verdaccio/yarn-import npm-ping

# Install a specific version
yarn dlx @verdaccio/yarn-import npm-ping 0.0.1

# Install the login plugin
yarn dlx @verdaccio/yarn-import npm-login
```

### From local build

```bash
yarn plugin import ./packages/plugin-npm-ping/bundles/@yarnpkg/plugin-npm-ping.js
yarn plugin import ./packages/plugin-npm-login/bundles/@yarnpkg/plugin-npm-login.js
```

## Commands

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

### `yarn npm login`

Log in to the npm registry and store the auth token in your home `.yarnrc.yml`.

Supports two authentication flows:
- **web**: Opens a browser for SSO/2FA login (default for registries that support it)
- **legacy**: Prompts for username, password, and email (works with Verdaccio and self-hosted registries)

```bash
# Log in to the default registry
yarn npm login

# Log in against a scope's registry
yarn npm login --scope my-org

# Force the legacy flow (useful for Verdaccio)
yarn npm login --auth-type=legacy --registry http://localhost:4873

# Web login without auto-opening the browser
yarn npm login --auth-type=web --no-browser
```

| Option | Description |
|---|---|
| `--registry <url>` | Override the registry URL |
| `--scope <scope>` | Log in against the registry configured for a scope |
| `--auth-type <type>` | Auth flow: `auto` (default), `web`, or `legacy` |
| `--no-browser` | Don't auto-open the login URL in a browser |
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

# Build a single plugin
cd packages/plugin-npm-ping && yarn build
```

### Install a plugin locally (for testing)

```bash
yarn plugin import ./packages/plugin-npm-ping/bundles/@yarnpkg/plugin-npm-ping.js
```

### Upgrade Yarn

```bash
yarn set version stable
```

## License

MIT
