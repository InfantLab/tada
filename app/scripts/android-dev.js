#!/usr/bin/env node
/**
 * Prints the LAN address the Capacitor WebView should point at and the
 * Windows-side commands to wire it up.
 *
 * Plan C workflow (see memory: v0.7.0 Android toolchain decision):
 *
 *   1. WSL devcontainer runs `bun run dev` on port 3000.
 *   2. Phone (on the same Wi-Fi) needs to load the WSL IP.
 *   3. The Windows host runs `cap sync android` + `gradlew installDebug`
 *      with CAP_SERVER_URL pointing at this address, so the installed APK
 *      points to the dev server.
 *   4. Save a file in the devcontainer → HMR pushes to the phone.
 *
 * This script just figures out the right URL and prints copy-pasteable
 * commands. The actual installDebug runs on Windows.
 */

import { execSync } from "node:child_process";
import { networkInterfaces } from "node:os";

const port = process.env.PORT ?? "3000";

function detectLanIp() {
  // Try the WSL-detected ethernet first.
  const ifaces = networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    if (name === "lo" || name.startsWith("docker") || name.startsWith("br-")) continue;
    for (const addr of ifaces[name] ?? []) {
      if (addr.family === "IPv4" && !addr.internal) return addr.address;
    }
  }

  // Fallback: ask ip route.
  try {
    const out = execSync("ip route get 1.1.1.1", { encoding: "utf8" });
    const match = out.match(/src\s+(\d+\.\d+\.\d+\.\d+)/);
    if (match) return match[1];
  } catch {
    // ignore
  }

  return null;
}

const ip = detectLanIp();
if (!ip) {
  console.error("Could not detect a LAN IP. Run `ip addr` and set CAP_SERVER_URL manually.");
  process.exit(1);
}

const url = `http://${ip}:${port}`;

console.log("");
console.log("─ Capacitor Live Reload — Plan C workflow ─────────────────────────");
console.log("");
console.log(`Dev-server URL the phone WebView should load:  ${url}`);
console.log("");
console.log("Step 1. In this devcontainer, in another terminal:");
console.log("");
console.log("    bun run dev");
console.log("");
console.log("Step 2. On Windows (Powershell, in the app/ directory):");
console.log("");
console.log(`    $env:CAP_SERVER_URL = "${url}"`);
console.log("    bunx cap sync android");
console.log("    cd android");
console.log("    ./gradlew installDebug");
console.log("");
console.log("Step 3. Open Ta-Da! on your phone. It will load from the WSL");
console.log("        dev server, with HMR. Save a file here → phone updates.");
console.log("");
console.log("─ Notes ────────────────────────────────────────────────────────────");
console.log("");
console.log("• Phone must be on the same Wi-Fi as the laptop.");
console.log("• WSL2 needs to expose port 3000 to the LAN. If your laptop's");
console.log("  firewall blocks it, run this in elevated Powershell once:");
console.log("");
console.log(`    netsh interface portproxy add v4tov4 listenport=${port} listenaddress=0.0.0.0 connectport=${port} connectaddress=${ip}`);
console.log(`    New-NetFirewallRule -DisplayName "WSL Nuxt dev" -Direction Inbound -Action Allow -Protocol TCP -LocalPort ${port}`);
console.log("");
console.log("• To go back to a self-contained debug APK (no Live Reload),");
console.log("  unset CAP_SERVER_URL before running cap sync.");
console.log("");
