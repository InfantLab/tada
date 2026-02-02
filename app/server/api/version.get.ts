/**
 * GET /api/version
 *
 * Returns app version and build information
 */

import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

export default defineEventHandler(() => {
  // Read version from package.json
  let appVersion = "unknown";
  try {
    const packagePath = join(process.cwd(), "package.json");
    const packageJson = JSON.parse(readFileSync(packagePath, "utf-8"));
    appVersion = packageJson.version;
  } catch (error) {
    console.error("Failed to read package.json version:", error);
  }

  // Get git commit hash
  let gitHash = "unknown";
  let gitShortHash = "unknown";
  try {
    gitHash = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
    gitShortHash = execSync("git rev-parse --short HEAD", {
      encoding: "utf-8",
    }).trim();
  } catch (error) {
    // Git not available or not in a git repository
    console.warn("Git hash not available:", error);
  }

  return {
    version: appVersion,
    gitHash,
    gitShortHash,
    fullVersion: `${appVersion}+${gitShortHash}`,
  };
});
