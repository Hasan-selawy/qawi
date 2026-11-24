import { execFileSync } from "node:child_process";

const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0");
const forbidden = tracked.filter((file) =>
  /(^|\/)target\//.test(file) ||
  (/(^|\/)\.env($|\.)/.test(file) && !file.endsWith(".env.example")),
);
if (forbidden.length) {
  console.error("Build output or environment files must not be tracked:\n" + forbidden.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Git hygiene passed: no tracked target/ or private .env files.");
}
