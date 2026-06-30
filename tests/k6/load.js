import http from "k6/http";
import { check, sleep } from "k6";

// Smoke + light load test for the Qawi API.
//
// Usage:
//   k6 run -e BASE_URL=https://your-host \
//          -e EMAIL=casey@ironpeak.com -e PASSWORD=*** tests/k6/load.js
//
// Defaults target a locally-running backend with seeded demo credentials.
const BASE_URL = __ENV.BASE_URL || "http://localhost:9000";
const EMAIL = __ENV.EMAIL || "casey@ironpeak.com";
const PASSWORD = __ENV.PASSWORD || "password123";

export const options = {
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800"],
  },
  scenarios: {
    smoke: { executor: "constant-vus", vus: 5, duration: "30s" },
  },
};

export default function () {
  const health = http.get(`${BASE_URL}/actuator/health`);
  check(health, { "health 200": (r) => r.status === 200 });

  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    { headers: { "Content-Type": "application/json" } },
  );
  check(res, {
    "login 200": (r) => r.status === 200,
    "login returns token": (r) => !!r.json("token"),
  });

  const token = res.json("token");
  if (token) {
    const me = http.get(`${BASE_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    check(me, { "me 200": (r) => r.status === 200 });
  }

  sleep(1);
}
