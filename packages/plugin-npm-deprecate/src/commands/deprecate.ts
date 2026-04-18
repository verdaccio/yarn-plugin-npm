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

export default class DeprecateCommand extends BaseCommand {
  static paths = [[`npm`, `deprecate`]];

  static usage = Command.Usage({
    description:
      "Deprecate a package version or range with a message",
    details: `
      This command updates the npm registry metadata to mark specific versions of a package as deprecated.

      The package argument should be in the format \`packageName@versionRange\` (e.g. \`my-package@"<1.0.0"\`).

      To un-deprecate, pass an empty string as the message.
    `,
    examples: [
      [
        "Deprecate a specific version",
        'yarn npm deprecate my-package@1.0.0 "Use v2 instead"',
      ],
      [
        "Deprecate a version range",
        'yarn npm deprecate my-package@"<2.0.0" "Upgrade to v2"',
      ],
      [
        "Deprecate a scoped package",
        'yarn npm deprecate @my-scope/my-package@1.0.0 "No longer maintained"',
      ],
      [
        "Un-deprecate a version",
        'yarn npm deprecate my-package@1.0.0 ""',
      ],
    ],
  });

  package = Option.String();

  message = Option.String();

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

  public async execute() {
    const configuration = await Configuration.find(
      this.context.cwd,
      this.context.plugins
    );

    const { name, versionRange } = parsePackageArg(this.package);

    if (!versionRange) {
      throw new Error(
        `A version or version range is required (e.g. my-package@1.0.0 or my-package@">=1.0.0")`
      );
    }

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
        const doc = (await npmHttpUtils.get(`${identUrl}?write=true`, {
          configuration,
          registry,
          ident,
          jsonResponse: true,
        })) as PackageDocument;

        const matchingVersions = resolveVersionRange(
          Object.keys(doc.versions),
          versionRange
        );

        if (matchingVersions.length === 0) {
          report.reportError(
            MessageName.UNNAMED,
            `No versions matched "${versionRange}" in ${name}`
          );
          return;
        }

        const action = this.message ? "Deprecating" : "Un-deprecating";
        report.reportInfo(
          MessageName.UNNAMED,
          `${action} ${name}@${versionRange} (${matchingVersions.length} version${matchingVersions.length > 1 ? "s" : ""}) on ${registry}`
        );

        for (const version of matchingVersions) {
          const versionData = doc.versions[version] as VersionData;
          // Set deprecated to the message, or empty string to un-deprecate.
          // npm uses empty string (not delete) so registries recognise the PUT as a deprecate operation.
          versionData.deprecated = this.message;
        }

        // Strip _attachments to prevent the registry from treating this as a publish
        delete (doc as any)._attachments;

        await npmHttpUtils.put(`${identUrl}`, doc, {
          configuration,
          registry,
          ident,
          otp: this.otp,
          jsonResponse: true,
        });

        const doneAction = this.message ? "Deprecated" : "Un-deprecated";
        for (const version of matchingVersions) {
          report.reportInfo(
            MessageName.UNNAMED,
            `${doneAction} ${name}@${version}`
          );
        }
      }
    );

    return report.exitCode();
  }
}

function parsePackageArg(pkg: string): {
  name: string;
  versionRange?: string;
} {
  const atIndex = pkg.lastIndexOf("@");
  if (atIndex <= 0) {
    return { name: pkg };
  }
  return {
    name: pkg.substring(0, atIndex),
    versionRange: pkg.substring(atIndex + 1),
  };
}

function resolveVersionRange(
  versions: string[],
  range: string
): string[] {
  // Exact version match
  if (versions.includes(range)) {
    return [range];
  }

  // Use semver-like matching for ranges
  // Import semver dynamically since it's available in the Yarn runtime
  try {
    const semver = require("semver");
    return versions.filter((v) => semver.satisfies(v, range));
  } catch {
    // If semver is not available, only support exact matches
    return versions.filter((v) => v === range);
  }
}

interface VersionData {
  deprecated?: string;
  [key: string]: unknown;
}

interface PackageDocument {
  _rev: string;
  _id: string;
  name: string;
  versions: Record<string, unknown>;
  "dist-tags": Record<string, string>;
}
