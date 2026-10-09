#!/usr/bin/env bash
# One-time setup: service account for the VM + firewall rule.
# Run by a project owner (IAM changes).
set -euo pipefail
P=digital-gram-sabha
SA=egs-vm-sa@$P.iam.gserviceaccount.com

gcloud iam service-accounts describe "$SA" --project $P >/dev/null 2>&1 \
  || gcloud iam service-accounts create egs-vm-sa --display-name "eGramSabha single VM" --project $P

# Vertex AI (video-mom LLM via metadata-server creds), Speech-to-Text, image pulls, logs/metrics
for r in roles/aiplatform.user roles/speech.client roles/artifactregistry.reader \
         roles/logging.logWriter roles/monitoring.metricWriter; do
  gcloud projects add-iam-policy-binding $P --member "serviceAccount:$SA" --role $r --condition=None --quiet >/dev/null
  echo "granted $r"
done
gcloud storage buckets add-iam-policy-binding gs://digital-gram-sabha-mumbai-storage \
  --member "serviceAccount:$SA" --role roles/storage.objectAdmin >/dev/null
echo "granted bucket objectAdmin"

# Web traffic to VMs tagged egs-web (SSH already allowed via IAP by mumbai-allow-iap-ssh)
gcloud compute firewall-rules describe egs-vm-allow-web --project $P >/dev/null 2>&1 \
  || gcloud compute firewall-rules create egs-vm-allow-web --project $P --network mumbai-vpc \
       --direction INGRESS --allow tcp:80,tcp:443 --source-ranges 0.0.0.0/0 --target-tags egs-web \
       --priority 1000 --description "eGramSabha single VM: HTTP/HTTPS (fronted by Cloudflare)"
echo "prereqs done"
