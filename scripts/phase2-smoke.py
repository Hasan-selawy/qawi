"""Exercise Phase 2 only against a qawi_drill_* database and a loopback application."""
from decimal import Decimal
import json
import os
import re
import subprocess
import socket
import time
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import uuid


def sql(statement):
    result = subprocess.run(["psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-c", statement],
                            text=True, capture_output=True, check=True)
    return result.stdout.strip()


TOKENS = {}
DRILL_PASSWORD = "qawi-drill-only-password"
# Public test fixture only; never used by production account provisioning.
DRILL_HASH = "$2a$10$kwCz191pEy2zT0U3GMxHMOsZDHDsUZfJKuh8T2t/9HnR/nm9w22py"


def token(email):
    if email not in TOKENS:
        base = os.environ.get("QAWI_SMOKE_URL", "http://127.0.0.1:19042")
        request = urllib.request.Request(base + "/api/v1/auth/login", method="POST",
            headers={"Content-Type": "application/json"},
            data=json.dumps({"email": email, "password": DRILL_PASSWORD}).encode())
        with urllib.request.urlopen(request, timeout=20) as response:
            TOKENS[email] = json.load(response)["token"]
    return TOKENS[email]


def main():
    database = os.environ.get("PGDATABASE", "")
    base = os.environ.get("QAWI_SMOKE_URL", "http://127.0.0.1:19042")
    destination = urllib.parse.urlparse(base)
    assert re.fullmatch(r"qawi_drill_[a-z0-9_]+", database), "Only disposable drill databases are allowed"
    assert destination.hostname in {"127.0.0.1", "localhost"}, "Only loopback applications are allowed"

    def request(method, path, expected, email=None, body=None):
        headers = {"Content-Type": "application/json"}
        if email:
            headers["Authorization"] = "Bearer " + token(email)
        outgoing = urllib.request.Request(base + path, method=method, headers=headers,
                                         data=json.dumps(body).encode() if body is not None else None)
        try:
            response = urllib.request.urlopen(outgoing, timeout=40)
        except urllib.error.HTTPError as error:
            response = error
        content = response.read().decode()
        assert response.status == expected, (method, path, response.status, expected, content)
        return json.loads(content, parse_float=Decimal) if content else None, response.headers

    gym, foreign_gym = str(uuid.uuid4()), str(uuid.uuid4())
    for gym_id in [gym, foreign_gym]:
        sql("insert into gyms (id,name,subscription_plan,created_at,nutrition_enabled,push_notifications_enabled,"
            "custom_branding_enabled,class_booking_enabled,analytics_advanced_enabled) values "
            f"('{gym_id}','Drill fixture','PRO',now(),true,false,false,true,false)")
    people = {}
    for label, role, gym_id in [("member", "MEMBER", gym), ("admin", "GYM_ADMIN", gym),
                                ("foreign", "GYM_ADMIN", foreign_gym), ("super", "SUPER_ADMIN", None)]:
        user_id = str(uuid.uuid4())
        email = user_id + "@drill.invalid"
        gym_value = "NULL" if gym_id is None else f"'{gym_id}'"
        sql("insert into users (id,name,email,password,role,gym_id,is_active,self_training_enabled,created_at) values "
            f"('{user_id}','Drill fixture','{email}','{DRILL_HASH}','{role}',{gym_value},true,false,now())")
        people[label] = (user_id, email)
    member, member_email = people["member"]
    measurement, enrollment = str(uuid.uuid4()), str(uuid.uuid4())
    sql("insert into body_measurements (id,member_id,recorded_by,weight,recorded_at) values "
        f"('{measurement}','{member}','{member}',75.125,now())")
    sql("insert into biometric_enrollments (id,gym_id,member_id,device_serial,device_user_id,template_type,enrolled_at,is_active) values "
        f"('{enrollment}','{gym}','{member}','DRILL-ONLY','42','UNKNOWN',now(),true)")

    request("GET", "/actuator/health", 200)
    request("GET", "/v3/api-docs", 401)
    request("GET", "/actuator/metrics", 403, member_email)
    request("GET", "/actuator/metrics", 200, people["super"][1])
    request("POST", "/api/v1/zkteco/adms", 403, people["admin"][1], {})
    exported, headers = request("GET", "/api/v1/privacy/me", 200, member_email)
    assert headers["Cache-Control"] == "no-store"
    assert len(exported["measurements"]) == 1 and exported["measurements"][0]["id"] == measurement

    operation = {"idempotencyKey": str(uuid.uuid4()), "operation": "CHECKIN",
                 "occurredAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - 86400))}
    first, _ = request("POST", "/api/v1/attendance/me/operations", 200, member_email, operation)
    replay, _ = request("POST", "/api/v1/attendance/me/operations", 200, member_email, operation)
    assert replay == first
    request("POST", "/api/v1/attendance/me/operations", 409, member_email, {**operation, "operation": "CHECKOUT"})
    request("POST", "/api/v1/nutrition/v3/log", 400, member_email,
            {"memberId": member, "rawInput": "Drill", "calories": -1})
    request("POST", "/api/v1/nutrition/v3/log", 403, member_email,
            {"memberId": member, "rawInput": "Drill", "calories": 100})
    tier, _ = request("POST", "/api/v1/super/platform-tiers", 201, people["super"][1],
                      {"name": "Drill decimal", "price1m": 12.345})
    assert tier["price1m"] == Decimal("12.345")
    request("POST", "/api/v1/super/platform-tiers", 400, people["super"][1],
            {"name": "Invalid precision", "price1m": 12.3456})

    receipt, _ = request("DELETE", "/api/v1/privacy/me", 200, member_email,
                         {"measurements": True, "biometrics": True})
    assert receipt["measurementsDeleted"] == 1 and receipt["deviceErasurePending"]
    job = receipt["deviceErasureJobIds"][0]
    request("POST", f"/api/v1/privacy/device-erasures/{job}/confirm", 404, people["foreign"][1], {"confirmed": True})
    request("POST", f"/api/v1/privacy/device-erasures/{job}/confirm", 204, people["admin"][1], {"confirmed": True})
    exported, _ = request("GET", "/api/v1/privacy/me", 200, member_email)
    assert not exported["measurements"] and not exported["biometricEnrollments"] and not exported["pendingDeviceErasures"]
    assert sql(f"select count(*) from biometric_erasure_jobs where id='{job}' and member_id is null and device_serial is null and device_user_id is null") == "1"
    print("Restored-app smoke passed: health, protected metrics/docs, disabled ADMS, decimal money, canonical nutrition validation/workflow, timestamped idempotent attendance, private export/erase and tenant-scoped device confirmation.")


def with_local_app(jar):
    """Start and stop the packaged app for CI; never connect it to a non-drill database."""
    assert re.fullmatch(r"qawi_drill_[a-z0-9_]+", os.environ.get("PGDATABASE", "")), "Drill database required"
    try:
        with socket.socket() as probe:
            if hasattr(socket, "SO_EXCLUSIVEADDRUSE"):
                probe.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
            probe.bind(("127.0.0.1", 19042))
    except OSError as error:
        raise RuntimeError("Smoke-test port is unavailable; refusing to use an unrelated application") from error
    environment = dict(os.environ)
    environment.update({
        "SPRING_DATASOURCE_URL": f"jdbc:postgresql://{os.environ.get('PGHOST', 'localhost')}:{os.environ.get('PGPORT', '5432')}/{os.environ['PGDATABASE']}",
        "SPRING_DATASOURCE_USERNAME": os.environ["PGUSER"],
        "SPRING_DATASOURCE_PASSWORD": os.environ.get("PGPASSWORD", ""),
        "JWT_SECRET": "13f44eadbccb707cafe82409ba7c09379da3aa268696e4e9e9e2023d1ec922cb5",
        "SPRING_PROFILES_ACTIVE": "prod", "QAWI_SEED_ENABLED": "false",
        "QAWI_RETENTION_ENABLED": "false", "QAWI_NOTIFICATIONS_JOBS_ENABLED": "false", "SENTRY_DSN": "",
    })
    os.environ["QAWI_SMOKE_URL"] = "http://127.0.0.1:19042"
    executable = os.path.join(os.environ["JAVA_HOME"], "bin", "java.exe" if os.name == "nt" else "java") if "JAVA_HOME" in os.environ else "java"
    with tempfile.NamedTemporaryFile(prefix="qawi-restore-app-", suffix=".log", delete=False) as log:
        process = subprocess.Popen([executable, "-jar", jar, "--server.port=19042", "--server.address=127.0.0.1",
                                    "--spring.profiles.active=prod", "--qawi.observability.sentry-dsn=",
                                    "--qawi.seed.enabled=false", "--qawi.privacy.retention.enabled=false",
                                    "--qawi.notifications.jobs.enabled=false"],
                                   env=environment, stdout=log, stderr=subprocess.STDOUT,
                                   creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
        try:
            deadline = time.monotonic() + 120
            while time.monotonic() < deadline:
                if process.poll() is not None:
                    raise RuntimeError(f"Restored application exited; inspect {log.name}")
                try:
                    if urllib.request.urlopen("http://127.0.0.1:19042/actuator/health", timeout=2).status == 200:
                        break
                except (OSError, urllib.error.URLError):
                    pass
                time.sleep(1)
            else:
                raise RuntimeError(f"Restored application did not become healthy; inspect {log.name}")
            main()
        finally:
            process.terminate()
            try:
                process.wait(timeout=15)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start-app", help="Packaged JAR to start against the restored drill database")
    arguments = parser.parse_args()
    if arguments.start_app:
        with_local_app(arguments.start_app)
    else:
        main()
