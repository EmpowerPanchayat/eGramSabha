#!/usr/bin/env bash
# Copies compose/Caddy files and the app config + secrets from the live GKE
# cluster to the VM (/opt/egs). Secrets are streamed straight to the VM and
# never written to this machine's disk or printed. The service-account key is
# readable only by root and gid 995 (video-mom's appuser, as fsGroup was on GKE).
#
#   ./02-push-config.sh test   # scheduled jobs OFF (safe to run beside GKE)
#   ./02-push-config.sh live   # scheduled jobs ON  (only at cutover)
set -euo pipefail
MODE=${1:?usage: $0 test|live}
P=digital-gram-sabha; Z=asia-south1-a; VM=egs-vm
DIR=$(cd "$(dirname "$0")" && pwd)
SSH=(gcloud compute ssh $VM --zone $Z --project $P --tunnel-through-iap --command)

gcloud container clusters get-credentials gke-mumbai-cluster --region asia-south1 --project $P >/dev/null 2>&1

python3 - "$MODE" "$DIR" <<'PY' | "${SSH[@]}" 'sudo mkdir -p /opt/egs && sudo tar -x -C /opt/egs && sudo sh -c "chmod 700 /opt/egs/env && chmod 600 /opt/egs/env/* && chown -R root:995 /opt/egs/secrets && chmod 750 /opt/egs/secrets && chmod 640 /opt/egs/secrets/service-account.json && chmod 644 /opt/egs/Caddyfile /opt/egs/docker-compose.yml"'
import base64, io, json, subprocess, sys, tarfile, time
mode, here = sys.argv[1], sys.argv[2]
DOMAIN = "https://egramsabha.empowerpanchayat.org"
CRONS = ["AGENDA_TRANSLATION_CRON", "CHECK_TRANSCRIPTION_STATUS_CRON", "FETCH_SUMMARY_RESULTS_CRON",
         "INITIATE_SUMMARY_CRON", "RETRY_FAILED_SUMMARY_CRON", "RETRY_FAILED_TRANSCRIPTIONS_CRON",
         "RETRY_TRANSCRIPTION_INITIATION_CRON"]
NEVER = "0 0 29 2 *"   # Feb 29th: node-cron rejects impossible dates; next run is 2028

def kget(kind, name):
    out = subprocess.run(["kubectl", "-n", "production", "get", kind, name, "-o", "json"],
                         check=True, capture_output=True).stdout
    data = json.loads(out).get("data") or {}
    return {k: base64.b64decode(v).decode() for k, v in data.items()} if kind == "secret" else data

def envfile(d):
    lines = []
    for k, v in d.items():
        if "\n" in v:
            raise SystemExit(f"multi-line value for {k} cannot go in an env file")
        lines.append(f"{k}={v}")
    return ("\n".join(lines) + "\n").encode()

gsa = kget("secret", "google-sa-secret")
sa_json = gsa.pop("service-account.json").encode()

backend = {**kget("configmap", "backend-config"), **kget("secret", "mongodb-secret"), **gsa}
backend.update(BACKEND_URL=DOMAIN, CORS_ORIGIN=DOMAIN)
for c in CRONS:
    if mode == "test":
        backend[c] = NEVER

videomom = {**kget("configmap", "video-mom-config"), **kget("secret", "video-mom-secret"), **gsa}

m = kget("secret", "mongodb-csi-secret")
mongo = {k: m[k] for k in ("MONGO_INITDB_ROOT_USERNAME", "MONGO_INITDB_ROOT_PASSWORD")}

files = {
    "env/backend.env": envfile(backend),
    "env/video-mom.env": envfile(videomom),
    "env/mongodb.env": envfile(mongo),
    "secrets/service-account.json": sa_json,
    "docker-compose.yml": open(f"{here}/docker-compose.yml", "rb").read(),
    "Caddyfile": open(f"{here}/Caddyfile", "rb").read(),
    "MODE": (mode + "\n").encode(),
}
buf = io.BytesIO()
with tarfile.open(fileobj=buf, mode="w") as tar:
    for d in ("env", "secrets"):
        ti = tarfile.TarInfo(d); ti.type = tarfile.DIRTYPE; ti.mode = 0o700; ti.mtime = time.time()
        tar.addfile(ti)
    for name, content in files.items():
        ti = tarfile.TarInfo(name); ti.size = len(content); ti.mode = 0o600; ti.mtime = time.time()
        tar.addfile(ti, io.BytesIO(content))
sys.stdout.buffer.write(buf.getvalue())
PY
echo "Config pushed to $VM in '$MODE' mode."
