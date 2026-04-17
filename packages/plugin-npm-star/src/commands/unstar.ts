import { Command, Option } from "clipanion";
import { BaseCommand } from "@yarnpkg/cli";
import { starAction } from "./star";

export default class UnstarCommand extends BaseCommand {
  static paths = [[`npm`, `unstar`]];

  static usage = Command.Usage({
    description: "Unstar a package on the npm registry",
    details: `
      This command removes a star from a package, unmarking it as a favorite in your npm profile.
    `,
    examples: [
      ["Unstar a package", "yarn npm unstar lodash"],
      ["Unstar a scoped package", "yarn npm unstar @verdaccio/core"],
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
      star: false,
      json: this.json,
      registry: this.registry,
      scope: this.scope,
      context: this.context,
    });
  }
}
