import http from "k6/http";
import { check } from "k6";

// Security-focused checks against a running Qawi API:
//   1. protected endpoints reject unauthenticated access,
//   2. actuator endpoints beyond health/info are locked down,
//   3. the hardening response headers are present,
//   4. brute-force lockout engages after repeated failures.
//
// Usage:
//   k6 run -e BASE_URL=https://your-host tests/k6/security.js
const BASE_URL = __ENV.BASE_URL || "http://localhost:9000";

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: { checks: ["rate>0.99"] },
};

export default function () {
  // 1) Protected endpoint requires auth.
  const noAuth = http.get(`${BASE_URL}/api/v1/auth/me`);
  check(noAuth, {
    "me without token is 401/403": (r) => r.status === 401 || r.status === 403,
  });

  // 2) Actuator beyond health/info is not public.
  const env = http.get(`${BASE_URL}/actuator/env`);
  check(env, {
    "actuator/env not public": (r) => r.status === 401 || r.status === 403 || r.status === 404,
  });

  // 3) Security headers present on a public endpoint.
  const health = http.get(`${BASE_URL}/actuator/health`);
  check(health, {
    "X-Content-Type-Options nosniff": (r) =>
      (r.headers["X-Content-Type-Options"] || "").toLowerCase() === "nosniff",
    "X-Frame-Options DENY": (r) =>
      (r.headers["X-Frame-Options"] || "").toUpperCase() === "DENY",
    "Content-Security-Policy present": (r) => !!r.headers["Content-Security-Policy"],
  });

  // 4) Brute-force lockout engages after repeated failures for one account.
  const bogus = `k6-bruteforce-${Date.now()}@example.com`;
  let locked = false;
  for (let i = 0; i < 8; i++) {
    const r = http.post(
      `${BASE_URL}/api/v1/auth/login`,
      JSON.stringify({ email: bogus, password: "wrong-password" }),
      { headers: { "Content-Type": "application/json" } },
    );
    if (r.status === 429) {
      locked = true;
      break;
    }
  }
  check(null, {
    "login locks out after repeated failures (429)": () => locked,
  });
}
