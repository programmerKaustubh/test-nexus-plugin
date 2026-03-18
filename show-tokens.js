#!/usr/bin/env node

/**
 * Helper script to show current connection tokens configured in the extension.
 *
 * Usage:
 *   node show-tokens.js
 *
 * This reads the extension's .env file to display the currently configured
 * tokens. Run this BEFORE `firebase ext:configure` so you know which tokens
 * to keep when adding new ones.
 *
 * The .env file location depends on your extension instance name.
 * Common locations:
 *   extensions/testnexus-crashlytics-alerts.env
 *   extensions/testnexus-crashlytics-alerts-xxxx.env
 */

const fs = require("fs");
const path = require("path");

const extensionsDir = path.join(process.cwd(), "extensions");

if (!fs.existsSync(extensionsDir)) {
  console.log("\nNo 'extensions/' directory found in the current folder.");
  console.log("Run this from your Firebase project root.\n");
  process.exit(1);
}

const envFiles = fs.readdirSync(extensionsDir).filter((f) => f.endsWith(".env") && !f.endsWith(".example"));

if (envFiles.length === 0) {
  console.log("\nNo .env files found in extensions/ directory.");
  console.log("Install the extension first with: firebase ext:install\n");
  process.exit(1);
}

console.log("\n=== Test Nexus Extension Token Configuration ===\n");

for (const envFile of envFiles) {
  const instanceName = envFile.replace(".env", "");
  const content = fs.readFileSync(path.join(extensionsDir, envFile), "utf8");
  const lines = content.split("\n");

  console.log(`Extension: ${instanceName}`);
  console.log("-".repeat(50));

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const [key, ...valueParts] = trimmed.split("=");
    const value = valueParts.join("=");

    if (key === "CONNECTION_TOKEN") {
      // Secret Manager reference — can't show actual value
      if (value.startsWith("projects/")) {
        console.log(`  Tokens: (stored in Secret Manager)`);
        console.log(`  Secret: ${value}`);
        console.log("");
        console.log("  To see the actual token values, run:");
        console.log(`  gcloud secrets versions access latest --secret=${value.split("/secrets/")[1]?.split("/")[0] || "unknown"}`);
      } else {
        // Direct value (local dev)
        const tokens = value.split(",").map((t) => t.trim());
        console.log(`  Tokens configured: ${tokens.length}`);
        tokens.forEach((token, i) => {
          const masked = token.length > 10
            ? `${token.substring(0, 6)}...${token.substring(token.length - 4)}`
            : token;
          console.log(`    ${i + 1}. ${masked}`);
        });
      }
    } else if (key === "APP_IDENTIFIER") {
      console.log(`  App: ${value}`);
    }
  }
  console.log("");
}

console.log("=== How to update tokens ===\n");
console.log("To add a new team member's token:\n");
console.log("  1. Copy the existing tokens (from above or Secret Manager)");
console.log("  2. Run: firebase ext:configure <instance-name> --project=<project-id>");
console.log("  3. When prompted for Connection Token(s), paste ALL tokens:");
console.log("     old_token_1,old_token_2,NEW_TOKEN_HERE");
console.log("  4. Press Enter for all other prompts to keep current settings");
console.log("  5. Deploy: firebase deploy --only extensions --project=<project-id>");
console.log("");
