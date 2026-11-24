import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const input = path.resolve("qawi-backend/target/openapi.json");
const output = path.resolve("lib/api-spec/openapi.json");
const contract = JSON.parse(fs.readFileSync(input, "utf8"));
assert.ok(Object.keys(contract.paths).length > 100, "Expected the real Spring API, not a stub");
assert.ok(contract.paths["/api/v1/attendance/me/operations"], "Missing attendance operation contract");
assert.ok(contract.paths["/api/v1/privacy/me"], "Missing privacy contract");
contract.servers = [{ url: "/" }];
const ids = new Set();
for (const [url, methods] of Object.entries(contract.paths)) {
  for (const [method, operation] of Object.entries(methods)) {
    if (!["get", "post", "put", "patch", "delete", "head", "options"].includes(method)) continue;
    assert.ok(operation.operationId && !ids.has(operation.operationId), `Duplicate operation ID at ${url}`);
    ids.add(operation.operationId);
    assert.ok(!(operation.parameters || []).some((parameter) => ["ud", "userDetails", "principal"].includes(parameter.name)),
      `Authentication principal leaked into contract: ${url}`);
    if (url.startsWith("/api/v1/nutrition/plans")) operation.deprecated = true;
  }
}
function sorted(value) {
  if (Array.isArray(value)) return value.map(sorted);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sorted(value[key])]));
  return value;
}
const serialized = JSON.stringify(sorted(contract), null, 2) + "\n";
if (process.argv.includes("--check")) {
  assert.equal(fs.readFileSync(output, "utf8"), serialized, "Spring contract changed. Export and regenerate clients.");
} else {
  fs.writeFileSync(output, serialized);
}
console.log(`Spring contract verified: ${Object.keys(contract.paths).length} paths, ${ids.size} operations.`);
