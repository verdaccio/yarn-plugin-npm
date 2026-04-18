import { Command, Option, UsageError } from "clipanion";
import { BaseCommand } from "@yarnpkg/cli";
import {
  Configuration,
  StreamReport,
  MessageName,
  miscUtils,
} from "@yarnpkg/core";
import { npmHttpUtils } from "@yarnpkg/plugin-npm";
import { prompt } from "enquirer";
import { exec } from "child_process";
import { hostname } from "os";
import { getRegistry } from "./npmUtils";

const WEB_LOGIN_TIMEOUT_MS = 5 * 60 * 1000;
const WEB_LOGIN_DEFAULT_RETRY_S = 5;

type AuthType = "auto" | "web" | "legacy";

interface LegacyLoginResponse {
  ok?: boolean;
  id?: string;
  rev?: string;
  token?: string;
}

interface WebLoginKickoff {
  loginUrl: string;
  doneUrl: string;
}

export default class LoginCommand extends BaseCommand {
  static paths = [[`npm`, `login`]];

  static usage = Command.Usage({
    description: "Log in to the npm registry (creates the user if missing)",
    details: `
      Authenticates against the npm registry and stores the returned token under \`npmRegistries\` in your home \`.yarnrc.yml\`.

      Two flows are supported:

      - \`web\`: posts to \`/-/v1/login\`, opens the returned URL in a browser, and polls the registry until the token is issued. This is what \`npm login\` uses by default and supports SSO / 2FA.

      - \`legacy\`: prompts for username, password, and email, then \`PUT\`s a CouchDB user document to \`/-/user/org.couchdb.user:<name>\`. The endpoint both creates users and verifies existing ones. Works with Verdaccio and most self-hosted registries.

      The default \`--auth-type=auto\` tries web first and falls back to legacy if the registry responds with 404 or 501.
    `,
    examples: [
      ["Log in to the default registry", "yarn npm login"],
      ["Log in against a scope's registry", "yarn npm login --scope my-org"],
      [
        "Force the legacy flow",
        "yarn npm login --auth-type=legacy --registry http://localhost:4873",
      ],
      [
        "Web login without auto-opening the browser",
        "yarn npm login --auth-type=web --no-browser",
      ],
      [
        "Non-interactive login (all credentials via flags)",
        "yarn npm login --auth-type=legacy --user alice --password s3cret --email alice@example.com",
      ],
    ],
  });

  json = Option.Boolean(`--json`, false, {
    description: `Format the output as an NDJSON stream`,
  });

  registry = Option.String(`--registry`, {
    description: `Override the registry configuration`,
  });

  scope = Option.String(`--scope`, {
    description: `Log in against the registry configured for a scope`,
  });

  authType = Option.String(`--auth-type`, `auto`, {
    description: `Auth flow: "auto" (web, then legacy on 404/501), "web", or "legacy"`,
  });

  browser = Option.Boolean(`--browser`, true, {
    description: `Auto-open the login URL in a browser during web login`,
  });

  username = Option.String(`--user,--username`, {
    description: `Username for legacy auth. Skips the interactive prompt.`,
  });

  password = Option.String(`--password`, {
    description: `Password for legacy auth. Insecure on shared machines — prefer piping via stdin or setting env vars.`,
  });

  email = Option.String(`--email`, {
    description: `Email for legacy auth. Skips the interactive prompt.`,
  });

  public async execute() {
    const configuration = await Configuration.find(
      this.context.cwd,
      this.context.plugins
    );

    const configRegistry = await getRegistry({
      scope: this.scope,
      configuration,
    });
    const registry = normalizeRegistry(this.registry ?? configRegistry);

    const authType = this.authType as AuthType;
    if (authType !== `auto` && authType !== `web` && authType !== `legacy`) {
      throw new UsageError(
        `--auth-type must be one of: auto, web, legacy (got "${this.authType}")`
      );
    }

    const report = await StreamReport.start(
      {
        configuration,
        json: this.json,
        stdout: this.context.stdout,
      },
      async (report) => {
        let token: string | undefined;

        if (authType === `web` || authType === `auto`) {
          report.reportInfo(null, `Attempting web login at ${registry}`);

          const kickoff = await webLoginKickoff(registry);

          if (kickoff) {
            token = await runWebLogin({
              kickoff,
              openBrowser: this.browser,
              report,
            });
          } else if (authType === `web`) {
            report.reportError(
              MessageName.AUTHENTICATION_INVALID,
              `Registry ${registry} does not support web login`
            );
            return;
          } else {
            report.reportInfo(
              null,
              `Registry does not support web login; falling back to legacy`
            );
          }
        }

        if (!token) {
          if (this.password) {
            report.reportWarning(
              MessageName.UNNAMED,
              `Passing --password on the command line is insecure (shell history, process listings). Prefer stdin or env vars.`
            );
          }

          const { username, password, email } = await promptCredentials({
            username: this.username,
            password: this.password,
            email: this.email,
          });

          report.reportInfo(null, `Logging in as ${username}`);

          token = await legacyLogin({
            registry,
            username,
            password,
            email,
            configuration,
          });
        }

        if (!token) {
          report.reportError(
            MessageName.AUTHENTICATION_INVALID,
            `Registry did not return an auth token`
          );
          return;
        }

        await persistToken({ registry, token });

        report.reportInfo(
          MessageName.UNNAMED,
          `Logged in — token saved to home .yarnrc.yml`
        );
      }
    );

    return report.exitCode();
  }
}

function normalizeRegistry(registry: string) {
  return registry.replace(/\/+$/, ``);
}

async function promptCredentials(seeds: {
  username?: string;
  password?: string;
  email?: string;
}): Promise<{ username: string; password: string; email: string }> {
  const questions = [
    {
      type: `input`,
      name: `username`,
      message: `npm username`,
      validate: (value: string) =>
        value.length > 0 ? true : `Username cannot be empty`,
      skip: Boolean(seeds.username),
    },
    {
      type: `password`,
      name: `password`,
      message: `npm password`,
      validate: (value: string) =>
        value.length > 0 ? true : `Password cannot be empty`,
      skip: Boolean(seeds.password),
    },
    {
      type: `input`,
      name: `email`,
      message: `npm email (public)`,
      validate: (value: string) =>
        /.+@.+\..+/.test(value) ? true : `Enter a valid email`,
      skip: Boolean(seeds.email),
    },
  ].filter((q) => !q.skip);

  const answers = questions.length
    ? await prompt<{ username?: string; password?: string; email?: string }>(
        questions
      )
    : {};

  return {
    username: seeds.username ?? answers.username!,
    password: seeds.password ?? answers.password!,
    email: seeds.email ?? answers.email!,
  };
}

async function webLoginKickoff(
  registry: string
): Promise<WebLoginKickoff | null> {
  const response = await fetch(`${registry}/-/v1/login`, {
    method: `POST`,
    headers: { "content-type": `application/json` },
    body: JSON.stringify({ hostname: hostname() }),
  });

  if (response.status === 404 || response.status === 501) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `Web login kickoff failed: ${response.status} ${response.statusText}`
    );
  }

  const body = (await response.json()) as Partial<WebLoginKickoff>;
  if (!body.loginUrl || !body.doneUrl) {
    throw new Error(
      `Registry returned an invalid web-login payload (missing loginUrl or doneUrl)`
    );
  }

  return { loginUrl: body.loginUrl, doneUrl: body.doneUrl };
}

interface RunWebLoginOptions {
  kickoff: WebLoginKickoff;
  openBrowser: boolean;
  report: StreamReport;
}

async function runWebLogin({
  kickoff,
  openBrowser,
  report,
}: RunWebLoginOptions): Promise<string | undefined> {
  report.reportInfo(null, `Open this URL to authenticate:`);
  report.reportInfo(null, `  ${kickoff.loginUrl}`);

  if (openBrowser) {
    tryOpenBrowser(kickoff.loginUrl);
  }

  return pollDoneUrl(kickoff.doneUrl, report);
}

async function pollDoneUrl(
  doneUrl: string,
  report: StreamReport
): Promise<string | undefined> {
  const start = Date.now();
  let announced = false;

  while (Date.now() - start < WEB_LOGIN_TIMEOUT_MS) {
    const response = await fetch(doneUrl, {
      headers: { accept: `application/json` },
    });

    if (response.status === 200) {
      const body = (await response.json()) as { token?: string };
      return body.token;
    }

    if (response.status === 202) {
      if (!announced) {
        report.reportInfo(null, `Waiting for browser authentication…`);
        announced = true;
      }
      const retryAfter =
        Number(response.headers.get(`retry-after`)) ||
        WEB_LOGIN_DEFAULT_RETRY_S;
      await sleep(retryAfter * 1000);
      continue;
    }

    throw new Error(
      `Unexpected status while polling doneUrl: ${response.status} ${response.statusText}`
    );
  }

  throw new Error(`Timed out waiting for web login to complete`);
}

function tryOpenBrowser(url: string) {
  const command =
    process.platform === `darwin`
      ? `open`
      : process.platform === `win32`
        ? `start ""`
        : `xdg-open`;
  exec(`${command} ${JSON.stringify(url)}`, () => {
    // Ignore — the URL is printed either way.
  });
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

interface LegacyLoginOptions {
  registry: string;
  username: string;
  password: string;
  email: string;
  configuration: Configuration;
}

async function legacyLogin({
  registry,
  username,
  password,
  email,
  configuration,
}: LegacyLoginOptions): Promise<string | undefined> {
  const userId = `org.couchdb.user:${username}`;
  const body = {
    _id: userId,
    name: username,
    password,
    email,
    type: `user`,
    roles: [],
    date: new Date().toISOString(),
  };

  const basic = Buffer.from(`${username}:${password}`).toString(`base64`);

  const response = (await npmHttpUtils.put(
    `/-/user/${encodeURIComponent(userId)}`,
    body,
    {
      configuration,
      registry,
      authType: npmHttpUtils.AuthType.NO_AUTH,
      headers: {
        authorization: `Basic ${basic}`,
      },
      jsonResponse: true,
    }
  )) as LegacyLoginResponse;

  return response?.token;
}

async function persistToken({
  registry,
  token,
}: {
  registry: string;
  token: string;
}) {
  await Configuration.updateHomeConfiguration({
    npmRegistries: (
      current: miscUtils.ToMapValue<Record<string, { npmAuthToken?: string }>>
    ) => ({
      ...(current ?? {}),
      [registry]: {
        ...((current as Record<string, { npmAuthToken?: string }> | undefined)?.[
          registry
        ] ?? {}),
        npmAuthToken: token,
      },
    }),
  });
}
