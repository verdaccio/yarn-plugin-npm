# @verdaccio/yarn-plugin-npm-unpublish

Yarn 4 plugin that adds the `yarn npm unpublish` command to remove packages or specific versions from npm registries.

## Installation

```bash
yarn dlx @verdaccio/yarn-import npm-unpublish
```

Or from a local build:

```bash
yarn plugin import ./packages/plugin-npm-unpublish/bundles/@yarnpkg/plugin-npm-unpublish.js
```

## Usage

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
yarn npm unpublish my-package@1.0.0 --registry http://localhost:4873
```

## Options

| Option | Description |
|---|---|
| `--force` | Required when unpublishing all versions of a package |
| `--otp <code>` | One-time password for two-factor authentication |
| `--registry <url>` | Override the registry URL |
| `--scope <scope>` | Use the registry configured for the given scope |
| `--json` | Format the output as NDJSON |

## Positional arguments

| Argument | Description |
|---|---|
| `package` | Package name with optional version (e.g. `my-package@1.0.0`). Without `@<version>`, `--force` is required. |

## License

MIT
