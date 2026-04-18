# @verdaccio/yarn-import

CLI to easily import Verdaccio Yarn plugins into your Yarn 4 project. Downloads the plugin bundle from npm and runs `yarn plugin import` for you.

## Usage

```bash
# Install a plugin by short name
yarn dlx @verdaccio/yarn-import npm-ping

# Install a specific version
yarn dlx @verdaccio/yarn-import npm-ping 0.0.1

# Show help and available plugins
yarn dlx @verdaccio/yarn-import --help
```

## Available plugins

| Short name | Package | Command(s) added |
|---|---|---|
| `npm-ping` | `@verdaccio/yarn-plugin-npm-ping` | `yarn npm ping` |
| `npm-login` | `@verdaccio/yarn-plugin-npm-login` | `yarn npm login` |
| `npm-deprecate` | `@verdaccio/yarn-plugin-npm-deprecate` | `yarn npm deprecate` |
| `npm-unpublish` | `@verdaccio/yarn-plugin-npm-unpublish` | `yarn npm unpublish` |
| `npm-star` | `@verdaccio/yarn-plugin-npm-star` | `yarn npm star`, `yarn npm unstar` |

## How it works

1. Resolves the plugin package from the npm registry
2. Downloads and extracts the tarball to a temp directory
3. Runs `yarn plugin import <bundle-path>` to install it into your project
4. Cleans up the temp directory

## License

MIT
