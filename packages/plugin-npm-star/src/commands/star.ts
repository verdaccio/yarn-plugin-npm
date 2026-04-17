import { Command, Option } from "clipanion";
import { BaseCommand } from "@yarnpkg/cli";
import {
  Configuration,
  StreamReport,
  MessageName,
  structUtils,
} from "@yarnpkg/core";
import { npmHttpUtils } from "@yarnpkg/plugin-npm";
import { getRegistry } from "./npmUtils";

export default class StarCommand extends BaseCommand {
  static paths = [[`npm`, `star`]];

  static usage = Command.Usage({
    description: "Star a package on the npm registry",
    details: `
      This command stars a package, marking it as a favorite in your npm profile.
    `,
    examples: [
      ["Star a package", "yarn npm star lodash"],
      ["Star a scoped package", "yarn npm star @verdaccio/core"],
    ],
  });

  package = Option.String();

  json = Option.Boolean(`--json`, false, {
    description: `Format the output as an NDJSON stream`,
  });

  registry = Option.String(`--registry`, {
    description: `Override the registry configuration`,
  });

  scope = Option.String(`--scope`, {
    description: `Scope of the registry to use`,
  });

  public async execute() {
    return starAction({
      pkg: this.package,
      star: true,
      json: this.json,
      registry: this.registry,
      scope: this.scope,
      context: this.context,
    });
  }
}

export interface StarActionOptions {
  pkg: string;
  star: boolean;
  json: boolean;
  registry?: string;
  scope?: string;
  context: BaseCommand["context"];
}

export async function starAction({
  pkg,
  star,
  json,
  registry: registryOverride,
  scope,
  context,
}: StarActionOptions) {
  const configuration = await Configuration.find(
    context.cwd,
    context.plugins
  );

  const ident = structUtils.parseIdent(pkg);
  const identUrl = npmHttpUtils.getIdentUrl(ident);

  const configRegistry: string = await getRegistry({
    scope: scope ?? (ident.scope || undefined),
    configuration,
  });
  const registry = registryOverride ?? configRegistry;

  const report = await StreamReport.start(
    {
      configuration,
      json,
      stdout: context.stdout,
    },
    async (report) => {
      // Fetch the package document to get _rev
      const doc = (await npmHttpUtils.get(`${identUrl}?write=true`, {
        configuration,
        registry,
        ident,
        jsonResponse: true,
      })) as PackageDocument;

      // Get current user from whoami
      const whoami = (await npmHttpUtils.get(`/-/whoami`, {
        configuration,
        registry,
        jsonResponse: true,
      })) as { username: string };

      const username = whoami.username;
      const users = doc.users ?? {};

      if (star) {
        users[username] = true;
      } else {
        delete users[username];
      }

      await npmHttpUtils.put(
        `${identUrl}`,
        { _id: doc._id, _rev: doc._rev, users },
        {
          configuration,
          registry,
          ident,
          jsonResponse: true,
        }
      );

      const action = star ? "Starred" : "Unstarred";
      report.reportInfo(
        MessageName.UNNAMED,
        `${action} ${pkg}`
      );
    }
  );

  return report.exitCode();
}

interface PackageDocument {
  _rev: string;
  _id: string;
  name: string;
  users?: Record<string, boolean>;
}
