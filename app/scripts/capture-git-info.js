#!/usr/bin/env node
/**
 * Captures git information and writes it to a file
 * This runs before the Nuxt build to include git hash in the build
 */

import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  // Try to get git hash
  const gitHash = execSync("git rev-parse HEAD", {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "ignore"],
  }).trim();

  const gitShortHash = execSync("git rev-parse --short HEAD", {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "ignore"],
  }).trim();

  // Write to .env file that Nuxt will read
  const envContent = `GIT_HASH=${gitHash}
GIT_SHORT_HASH=${gitShortHash}
`;

  writeFileSync(join(__dirname, "../.env.build"), envContent);
  console.log(`✓ Git info captured: ${gitShortHash}`);
} catch (error) {
  // Git not available, write unknown
  const envContent = `GIT_HASH=unknown
GIT_SHORT_HASH=unknown
`;
  writeFileSync(join(__dirname, "../.env.build"), envContent);
  console.log("⚠ Git not available, using 'unknown' for hash");
}
