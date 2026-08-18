---
'@verdaccio/yarn-plugin-npm-login': patch
---

Stop sending Basic authentication headers from the legacy login flow. Existing-user legacy login now retries only when the registry exposes revision metadata without Basic authentication and reports a clear error otherwise.
