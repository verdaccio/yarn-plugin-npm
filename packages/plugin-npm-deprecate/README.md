# @verdaccio/yarn-plugin-npm-deprecate

Yarn 4 plugin that adds the `yarn npm deprecate` command to deprecate (or un-deprecate) package versions on npm registries.

## Installation

```bash
yarn dlx @verdaccio/yarn-import npm-deprecate
```

Or from a local build:

```bash
yarn plugin import ./packages/plugin-npm-deprecate/bundles/@yarnpkg/plugin-npm-deprecate.js
```

## Usage

```bash
# Deprecate a specific version
yarn npm deprecate my-package@1.0.0 "Use v2 instead"

# Deprecate a version range
yarn npm deprecate my-package@"<2.0.0" "Upgrade to v2"

# Deprecate a scoped package
yarn npm deprecate @my-scope/my-package@1.0.0 "No longer maintained"

# Un-deprecate a version (pass an empty message)
yarn npm deprecate my-package@1.0.0 ""

# With OTP for two-factor authentication
yarn npm deprecate my-package@1.0.0 "Use v2 instead" --otp 123456
```

## Options

| Option | Description |
|---|---|
| `--otp <code>` | One-time password for two-factor authentication |
| `--registry <url>` | Override the registry URL |
| `--scope <scope>` | Use the registry configured for the given scope |
| `--json` | Format the output as NDJSON |

## Positional arguments

| Argument | Description |
|---|---|
| `package` | Package name with optional version range (e.g. `my-package@1.0.0`, `my-package@"<2"`) |
| `message` | Deprecation message, or `""` to un-deprecate |

## License

MIT
