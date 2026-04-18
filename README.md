# yarn-plugin-npm

Yarn 4 plugins that add npm registry commands not included in Yarn by default.

## Plugins

| Plugin | Package | Commands |
|---|---|---|
| npm-ping | `@verdaccio/yarn-plugin-npm-ping` | `yarn npm ping` |
| npm-login | `@verdaccio/yarn-plugin-npm-login` | `yarn npm login` |
| npm-deprecate | `@verdaccio/yarn-plugin-npm-deprecate` | `yarn npm deprecate` |
| npm-unpublish | `@verdaccio/yarn-plugin-npm-unpublish` | `yarn npm unpublish` |
| npm-star | `@verdaccio/yarn-plugin-npm-star` | `yarn npm star`, `yarn npm unstar` |

Plus `@verdaccio/yarn-import` — a CLI that batch-imports any subset of the above.

## Requirements

- Yarn >= 4.x (stable)
- Node.js >= 24

## Installation

### Using `@verdaccio/yarn-import` (recommended)

```bash
# Install a plugin by name
yarn dlx @verdaccio/yarn-import npm-ping

# Install a specific version
yarn dlx @verdaccio/yarn-import npm-ping 0.0.1

# Install the login plugin
yarn dlx @verdaccio/yarn-import npm-login
```

### From local build

```bash
yarn install
yarn build

yarn plugin import ./packages/plugin-npm-ping/bundles/@yarnpkg/plugin-npm-ping.js
yarn plugin import ./packages/plugin-npm-login/bundles/@yarnpkg/plugin-npm-login.js
yarn plugin import ./packages/plugin-npm-deprecate/bundles/@yarnpkg/plugin-npm-deprecate.js
yarn plugin import ./packages/plugin-npm-unpublish/bundles/@yarnpkg/plugin-npm-unpublish.js
yarn plugin import ./packages/plugin-npm-star/bundles/@yarnpkg/plugin-npm-star.js
```

## Commands

### `yarn npm ping`

Verify the registry is online.

```bash
yarn npm ping
yarn npm ping --registry http://localhost:4873
yarn npm ping --scope my-org
```

| Option | Description |
|---|---|
| `--registry <url>` | Override the registry URL |
| `--scope <scope>` | Ping the registry configured for the given scope |
| `--json` | Format the output as NDJSON |

### `yarn npm login`

Log in to a registry and store the returned token in `~/.yarnrc.yml`. Supports two authentication flows:

- **web** — opens a browser for SSO/2FA login via `/-/v1/login` (default for registries that support it, e.g. npmjs.org)
- **legacy** — prompts for username, password, and email, then `PUT`s a CouchDB user document. Handles both user creation and authentication identically to `npm login` / `npm adduser` (including 409 Conflict retry with `_rev`). Works with Verdaccio, Nexus, JFrog, and most self-hosted registries.

The default `--auth-type=auto` tries web first and falls back to legacy on 404/501.

```bash
# Default (auto: web then legacy fallback)
yarn npm login

# Force legacy flow (Verdaccio, self-hosted)
yarn npm login --auth-type=legacy --registry http://localhost:4873

# Log in against a scope's registry
yarn npm login --scope my-org

# Web login without auto-opening the browser
yarn npm login --auth-type=web --no-browser

# Non-interactive (CI/CD) — all credentials via flags
yarn npm login --auth-type=legacy \
  --user "$NPM_USER" --password "$NPM_PASS" --email "$NPM_EMAIL"
```

| Option | Description |
|---|---|
| `--auth-type <type>` | Auth flow: `auto` (default), `web`, or `legacy` |
| `--user`, `--username` | Username for legacy auth (skips prompt) |
| `--password` | Password for legacy auth (skips prompt; emits security warning) |
| `--email` | Email for legacy auth (skips prompt) |
| `--browser` / `--no-browser` | Auto-open the login URL in a browser (default: on) |
| `--registry <url>` | Override the registry URL |
| `--scope <scope>` | Log in against the registry configured for a scope |
| `--json` | Format the output as NDJSON |

### `yarn npm deprecate`

Deprecate a package version or range with a message. Pass an empty string to un-deprecate.

```bash
# Deprecate a specific version
yarn npm deprecate my-package@1.0.0 "Use v2 instead"

# Deprecate a version range
yarn npm deprecate my-package@"<2.0.0" "Upgrade to v2"

# Deprecate a scoped package
yarn npm deprecate @my-scope/my-package@1.0.0 "No longer maintained"

# Un-deprecate
yarn npm deprecate my-package@1.0.0 ""

# With OTP
yarn npm deprecate my-package@1.0.0 "Use v2 instead" --otp 123456
```

| Option | Description |
|---|---|
| `--otp <code>` | One-time password for two-factor authentication |
| `--registry <url>` | Override the registry URL |
| `--scope <scope>` | Use the registry configured for the given scope |
| `--json` | Format the output as NDJSON |

### `yarn npm unpublish`

Remove a package version (or the whole package with `--force`) from the registry.

```bash
# Unpublish a specific version
yarn npm unpublish my-package@1.0.0

# Unpublish a scoped package version
yarn npm unpublish @my-scope/my-package@1.0.0

# Unpublish all versions (requires --force)
yarn npm unpublish my-package --force

# With OTP
yarn npm unpublish my-package@1.0.0 --otp 123456
```

| Option | Description |
|---|---|
| `--force` | Required when unpublishing all versions of a package |
| `--otp <code>` | One-time password for two-factor authentication |
| `--registry <url>` | Override the registry URL |
| `--scope <scope>` | Use the registry configured for the given scope |
| `--json` | Format the output as NDJSON |

### `yarn npm star`

Star a package on the registry (requires auth).

```bash
yarn npm star lodash
yarn npm star @verdaccio/core
yarn npm star my-package --registry http://localhost:4873
```

| Option | Description |
|---|---|
| `--registry <url>` | Override the registry URL |
| `--scope <scope>` | Use the registry configured for the given scope |
| `--json` | Format the output as NDJSON |

### `yarn npm unstar`

Remove a star from a package on the registry (requires auth).

```bash
yarn npm unstar lodash
yarn npm unstar @verdaccio/core
```

| Option | Description |
|---|---|
| `--registry <url>` | Override the registry URL |
| `--scope <scope>` | Use the registry configured for the given scope |
| `--json` | Format the output as NDJSON |

## Development

```bash
# Install dependencies
yarn install

# Build all plugins
yarn build

# Build a single plugin
cd packages/plugin-npm-ping && yarn build

# Install a plugin locally for testing
yarn plugin import ./packages/plugin-npm-ping/bundles/@yarnpkg/plugin-npm-ping.js

# Verify
yarn plugin list
yarn npm <command> --help
```

## License

MIT
