// test/test-cli-dot.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import envPaths from "env-paths";
import { runCLI } from "./test-helpers";
import { APP_SYSTEM_ID } from "../src/constants";

// Helper function to wait for file to exist and be stable
async function waitForFile(
  path: string,
  timeoutMs = 10000,
  intervalMs = 500
): Promise<boolean> {
  const start = Date.now();
  let lastSize = -1;
  let sameCount = 0;
  let attempts = 0;

  while (Date.now() - start < timeoutMs) {
    attempts++;
    if (existsSync(path)) {
      const stats = readFileSync(path).length;
      console.log(`Attempt ${attempts}: File size ${stats} bytes`);

      if (stats === lastSize) {
        sameCount++;
        console.log(`Same size count: ${sameCount}`);
        // If size has been stable for 5 checks, file is fully written
        if (sameCount >= 5) return true;
      } else {
        lastSize = stats;
        sameCount = 0;
      }
    } else {
      console.log(`Attempt ${attempts}: File does not exist yet`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}

describe("CLI: ingest current directory with '.'", () => {
  it("should include files from the current directory and not throw 'No files found'", async () => {
    console.log("Starting test...");
    console.log("Current working directory:", process.cwd());

    const fixturesPath = resolve(__dirname, "fixtures/sample-project");
    console.log("Fixtures path:", fixturesPath);

    // Use absolute path to fixtures
    const { stdout, stderr, exitCode } = await runCLI([
      fixturesPath,
      "--pipe",
      "--no-skip-artifacts",
      "--ignore",
      "false",
      "--verbose",
    ]);

    console.log("CLI command completed");
    console.log("CLI STDOUT:\n", stdout);
    console.log("CLI STDERR:\n", stderr);

    expect(exitCode).toBe(0);
    expect(stdout).not.toContain("No files found or directory is empty");

    // Extract the saved file path from the output
    const savedMatch = stdout.match(/RESULTS_SAVED: (.+\.md)/);
    if (!savedMatch) {
      console.log("Full stdout:", stdout);
      throw new Error("Could not find RESULTS_SAVED marker in output");
    }
    expect(savedMatch).toBeTruthy();

    const [, savedPath] = savedMatch;
    const searchesDir = envPaths(APP_SYSTEM_ID).config;
    const fullPath = resolve(searchesDir, savedPath.split("/").pop()!);

    console.log("Waiting for file to exist:", fullPath);
    const fileExists = await waitForFile(fullPath);
    if (!fileExists) {
      throw new Error(`Timeout waiting for file to exist: ${fullPath}`);
    }
    console.log("File exists, proceeding with read");

    const savedContent = readFileSync(fullPath, "utf8");
    console.log("File content length:", savedContent.length);

    // Now check the actual content of the saved file
    expect(savedContent).toContain("hello.js");
    expect(savedContent).toContain("test.ts");
    expect(savedContent).toContain("Directory Structure");
    expect(savedContent).toContain("Files Content");

    console.log("Test completed successfully");
  }, 30000); // Increased timeout to be extra safe
});
