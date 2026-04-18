# @verdaccio/yarn-plugin-npm-login

Yarn 4 plugin that adds the `yarn npm login` command to authenticate against npm registries and store auth tokens.

## Installation

```bash
yarn dlx @verdaccio/yarn-import npm-login
```

Or from a local build:

```bash
yarn plugin import ./packages/plugin-npm-login/bundles/@yarnpkg/plugin-npm-login.js
```

## Usage

```bash
# Default (auto: web then legacy fallback)
yarn npm login

# Force legacy flow (Verdaccio, Nexus, self-hosted)
yarn npm login --auth-type=legacy --registry http://localhost:4873

# Log in against a scope's registry
yarn npm login --scope my-org

# Web login without auto-opening the browser
yarn npm login --auth-type=web --no-browser

# Non-interactive (CI/CD) — all credentials via flags
yarn npm login --auth-type=legacy \
  --user "$NPM_USER" --password "$NPM_PASS" --email "$NPM_EMAIL"

# Partial flags — prompts only for missing credentials
yarn npm login --auth-type=legacy --user alice
```

## Options

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

## Authentication flows

### Web login

Posts to `/-/v1/login`, opens the returned URL in a browser, and polls the registry until the token is issued. Supports SSO and 2FA. Works with registries that implement the npm web login protocol (e.g. npmjs.org).

### Legacy login

Prompts for username, password, and email (or accepts them via CLI flags), then `PUT`s a CouchDB user document to `/-/user/org.couchdb.user:<name>`. This matches the `npm login` / `npm adduser` behaviour:

1. **PUT** `/-/user/org.couchdb.user:<name>` — creates the user if the registry allows it and returns a token.
2. On **409 Conflict** (user already exists) — **GET** `/-/user/org.couchdb.user:<name>?write=true` to fetch the existing doc with its `_rev`, merges the new credentials, then retries with **PUT** `/-/user/org.couchdb.user:<name>/-rev/<rev>`.

Works with Verdaccio, Nexus, JFrog, and most self-hosted registries.

### Auto (default)

Tries web login first. Falls back to legacy if the registry responds with 404 or 501.

## Token storage

Successfully obtained tokens are stored in `~/.yarnrc.yml` under `npmRegistries[<registry>].npmAuthToken`.

## License

MIT
