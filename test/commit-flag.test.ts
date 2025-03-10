// test/commit-flag.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { runCLI, isOnMainBranch } from "./test-helpers";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";

// Only run these tests on main branch
if (isOnMainBranch()) {
  describe("CLI --commit", () => {
    const repoPath = resolve(__dirname, "fixtures/branch-fixture");
    let firstCommitSha: string;

    beforeEach(() => {
      // Clean up any existing directory
      rmSync(repoPath, { recursive: true, force: true });

      // Create test directory and files
      mkdirSync(repoPath, { recursive: true });
      writeFileSync(resolve(repoPath, "main.js"), "console.log('main')");

      // Initialize git repo and create branches
      execSync("git init", { cwd: repoPath });
      try {
        // Attempt to create the "main" branch
        execSync("git checkout -b main", { cwd: repoPath });
      } catch {
        // If the "main" branch already exists in a worktree, check it out instead
        execSync("git checkout main", { cwd: repoPath });
      }
      execSync("git add main.js", { cwd: repoPath });
      execSync(
        'git -c user.name="Test" -c user.email="test@example.com" commit -m "Initial commit"',
        { cwd: repoPath }
      );

      // Store the first commit SHA
      firstCommitSha = execSync("git rev-parse HEAD", { cwd: repoPath })
        .toString()
        .trim();

      // Remove main.js before creating feature branch
      rmSync(resolve(repoPath, "main.js"));
      execSync("git rm main.js", { cwd: repoPath });
      execSync(
        'git -c user.name="Test" -c user.email="test@example.com" commit -m "Remove main.js"',
        { cwd: repoPath }
      );

      // Create feature branch with its own file
      execSync("git checkout -b some-feature-branch", { cwd: repoPath });
      writeFileSync(resolve(repoPath, "feature.js"), "console.log('feature')");
      execSync("git add feature.js", { cwd: repoPath });
      execSync(
        'git -c user.name="Test" -c user.email="test@example.com" commit -m "Feature commit"',
        { cwd: repoPath }
      );
    });

    it("checks out the specified commit SHA after cloning", async () => {
      const { stdout, exitCode } = await runCLI([
        "--repo",
        repoPath,
        "--commit",
        firstCommitSha,
        "--pipe",
      ]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Checked out commit");
      expect(stdout).toMatch(new RegExp(`Commit: ${firstCommitSha}`, "i"));
      expect(stdout).toContain("main.js"); // File from first commit
      expect(stdout).not.toContain("feature.js"); // File from second commit
    });
  });
} else {
  describe.skip("CLI --commit (skipped: not on main branch)", () => {
    it("placeholder test", () => {
      expect(true).toBe(true);
    });
  });
}
