#!/usr/bin/env node

import { execSync } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import https from "node:https";
import http from "node:http";

const REGISTRY = "https://registry.npmjs.org";
const SCOPE = "@verdaccio";

// Known mapping: plugin short name -> npm package name + bundle path inside the package
const KNOWN_PLUGINS: Record<string, { package: string; bundle: string }> = {
  "npm-ping": {
    package: `${SCOPE}/yarn-plugin-npm-ping`,
    bundle: "bundles/@yarnpkg/plugin-npm-ping.js",
  },
  "npm-login": {
    package: `${SCOPE}/yarn-plugin-npm-login`,
    bundle: "bundles/@yarnpkg/plugin-npm-login.js",
  },
};

function fetch(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        if (res.headers.location) {
          return fetch(res.headers.location).then(resolve, reject);
        }
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

async function resolvePackage(packageName: string, version?: string): Promise<{ version: string; tarballUrl: string }> {
  const url = `${REGISTRY}/${packageName}`;
  const data = JSON.parse((await fetch(url)).toString());

  const resolvedVersion = version ?? data["dist-tags"]?.latest;
  if (!resolvedVersion) {
    throw new Error(`Could not resolve latest version for ${packageName}`);
  }

  const versionData = data.versions?.[resolvedVersion];
  if (!versionData) {
    throw new Error(`Version ${resolvedVersion} not found for ${packageName}`);
  }

  const tarballUrl = versionData.dist?.tarball;
  if (!tarballUrl) {
    throw new Error(`No tarball URL found for ${packageName}@${resolvedVersion}`);
  }

  return { version: resolvedVersion, tarballUrl };
}

async function extractBundleFromTarball(tarballUrl: string, bundlePath: string): Promise<string> {
  const tarball = await fetch(tarballUrl);

  const tmpDir = mkdtempSync(join(tmpdir(), "yarn-import-"));
  const tarballPath = join(tmpDir, "package.tgz");
  writeFileSync(tarballPath, tarball);

  execSync(`tar xzf ${tarballPath} -C ${tmpDir}`, { stdio: "ignore" });

  const bundleFile = join(tmpDir, "package", bundlePath);
  return bundleFile;
}

function printUsage(): void {
  console.log(`
Usage: yarn dlx @verdaccio/yarn-import <plugin-name> [version]

Available plugins:
${Object.keys(KNOWN_PLUGINS).map((name) => `  - ${name}`).join("\n")}

Examples:
  yarn dlx @verdaccio/yarn-import npm-ping
  yarn dlx @verdaccio/yarn-import npm-ping 0.0.1
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    printUsage();
    process.exit(0);
  }

  const pluginName = args[0];
  const version = args[1];

  const plugin = KNOWN_PLUGINS[pluginName];
  if (!plugin) {
    console.error(`Unknown plugin: ${pluginName}\n`);
    console.error(`Available plugins: ${Object.keys(KNOWN_PLUGINS).join(", ")}`);
    process.exit(1);
  }

  const resolved = await resolvePackage(plugin.package, version);
  console.log(`Importing ${plugin.package}@${resolved.version}...`);

  const bundlePath = await extractBundleFromTarball(resolved.tarballUrl, plugin.bundle);

  try {
    execSync(`yarn plugin import ${bundlePath}`, { stdio: "inherit" });
    console.log(`\nPlugin ${pluginName} imported successfully!`);
  } finally {
    // Clean up temp directory
    const tmpDir = join(bundlePath, "..", "..");
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
