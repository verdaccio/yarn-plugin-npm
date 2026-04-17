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

export default class UnpublishCommand extends BaseCommand {
  static paths = [[`npm`, `unpublish`]];

  static usage = Command.Usage({
    description: "Remove a package or a specific version from the npm registry",
    details: `
      This command removes a package version from the npm registry. If no version is specified, it removes the entire package.

      The package argument should be in the format \`packageName\` or \`packageName@version\`.
    `,
    examples: [
      [
        "Unpublish a specific version of a package",
        "yarn npm unpublish my-package@1.0.0",
      ],
      [
        "Unpublish an entire package",
        "yarn npm unpublish my-package --force",
      ],
      [
        "Unpublish a scoped package version",
        "yarn npm unpublish @my-scope/my-package@1.0.0",
      ],
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

  otp = Option.String(`--otp`, {
    description: `One-time password for two-factor authentication`,
  });

  force = Option.Boolean(`--force`, false, {
    description: `Required to unpublish an entire package (all versions)`,
  });

  public async execute() {
    const configuration = await Configuration.find(
      this.context.cwd,
      this.context.plugins
    );

    const { name, version } = parsePackageArg(this.package);
    const ident = structUtils.parseIdent(name);
    const identUrl = npmHttpUtils.getIdentUrl(ident);

    const configRegistry: string = await getRegistry({
      scope: this.scope ?? (ident.scope || undefined),
      configuration,
    });
    const registry = this.registry ?? configRegistry;

    const report = await StreamReport.start(
      {
        configuration,
        json: this.json,
        stdout: this.context.stdout,
      },
      async (report) => {
        if (!version && !this.force) {
          report.reportError(
            MessageName.UNNAMED,
            `Refusing to unpublish all versions of ${name}. Use --force to proceed.`
          );
          return;
        }

        // Fetch the package document (needed for _rev and version manipulation)
        const doc = await npmHttpUtils.get(
          `${identUrl}?write=true`,
          {
            configuration,
            registry,
            ident,
            jsonResponse: true,
          }
        ) as PackageDocument;

        const rev = doc._rev;

        if (version) {
          await unpublishVersion({
            name,
            version,
            ident,
            identUrl,
            doc,
            rev,
            configuration,
            registry,
            otp: this.otp,
            report,
          });
        } else {
          await unpublishAll({
            name,
            ident,
            identUrl,
            rev,
            configuration,
            registry,
            otp: this.otp,
            report,
          });
        }
      }
    );

    return report.exitCode();
  }
}

function parsePackageArg(pkg: string): { name: string; version?: string } {
  // Handle scoped packages: @scope/name@version
  const atIndex = pkg.lastIndexOf("@");
  // If the only @ is at position 0, it's a scoped package with no version
  if (atIndex <= 0) {
    return { name: pkg };
  }
  return {
    name: pkg.substring(0, atIndex),
    version: pkg.substring(atIndex + 1),
  };
}

interface PackageDocument {
  _rev: string;
  _id: string;
  name: string;
  versions: Record<string, unknown>;
  "dist-tags": Record<string, string>;
  _attachments?: Record<string, unknown>;
}

interface UnpublishVersionOptions {
  name: string;
  version: string;
  ident: ReturnType<typeof structUtils.parseIdent>;
  identUrl: string;
  doc: PackageDocument;
  rev: string;
  configuration: Configuration;
  registry: string;
  otp?: string;
  report: StreamReport;
}

async function unpublishVersion({
  name,
  version,
  ident,
  identUrl,
  doc,
  rev,
  configuration,
  registry,
  otp,
  report,
}: UnpublishVersionOptions) {
  if (!doc.versions[version]) {
    report.reportError(
      MessageName.UNNAMED,
      `Version ${version} not found in ${name}`
    );
    return;
  }

  report.reportInfo(
    MessageName.UNNAMED,
    `Unpublishing ${name}@${version} from ${registry}`
  );

  // Remove the version
  delete doc.versions[version];

  // Update dist-tags: remove any tags pointing to this version
  for (const [tag, tagVersion] of Object.entries(doc["dist-tags"])) {
    if (tagVersion === version) {
      delete doc["dist-tags"][tag];
    }
  }

  // If latest was removed, set latest to the highest remaining version
  if (
    !doc["dist-tags"].latest &&
    Object.keys(doc.versions).length > 0
  ) {
    const remaining = Object.keys(doc.versions).sort();
    doc["dist-tags"].latest = remaining[remaining.length - 1];
  }

  // Remove the tarball attachment
  const tarballName = `${name}-${version}.tgz`;
  if (doc._attachments) {
    delete doc._attachments[tarballName];
  }

  // PUT the modified document back
  await npmHttpUtils.put(
    `${identUrl}/-rev/${rev}`,
    doc,
    {
      configuration,
      registry,
      ident,
      otp,
      jsonResponse: true,
    }
  );

  report.reportInfo(
    MessageName.UNNAMED,
    `Successfully unpublished ${name}@${version}`
  );
}

interface UnpublishAllOptions {
  name: string;
  ident: ReturnType<typeof structUtils.parseIdent>;
  identUrl: string;
  rev: string;
  configuration: Configuration;
  registry: string;
  otp?: string;
  report: StreamReport;
}

async function unpublishAll({
  name,
  ident,
  identUrl,
  rev,
  configuration,
  registry,
  otp,
  report,
}: UnpublishAllOptions) {
  report.reportInfo(
    MessageName.UNNAMED,
    `Unpublishing all versions of ${name} from ${registry}`
  );

  await npmHttpUtils.del(
    `${identUrl}/-rev/${rev}`,
    {
      configuration,
      registry,
      ident,
      otp,
      jsonResponse: true,
    }
  );

  report.reportInfo(
    MessageName.UNNAMED,
    `Successfully unpublished ${name}`
  );
}
