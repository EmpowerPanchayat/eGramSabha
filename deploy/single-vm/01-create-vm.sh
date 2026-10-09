#!/usr/bin/env bash
# Creates the eGramSabha VM (e2-medium, Debian 12) with a 30 GB data disk
# mounted at /data, Docker installed, and the static IP vm-static-ip-1.
set -euo pipefail
P=digital-gram-sabha; Z=asia-south1-a; VM=egs-vm
SA=egs-vm-sa@$P.iam.gserviceaccount.com
IP=$(gcloud compute addresses describe vm-static-ip-1 --region asia-south1 --project $P --format='value(address)')

gcloud compute disks describe egs-data --zone $Z --project $P >/dev/null 2>&1 \
  || gcloud compute disks create egs-data --zone $Z --size 30GB --type pd-balanced --project $P

gcloud compute instances create $VM --project $P --zone $Z \
  --machine-type e2-medium \
  --image-family debian-12 --image-project debian-cloud \
  --boot-disk-size 20GB --boot-disk-type pd-balanced \
  --disk name=egs-data,device-name=egs-data,mode=rw,auto-delete=no \
  --network mumbai-vpc --subnet mumbai-subnet --address "$IP" \
  --service-account "$SA" --scopes cloud-platform \
  --tags egs-web,allow-iap-ssh \
  --shielded-secure-boot \
  --metadata-from-file startup-script="$(dirname "$0")/vm-startup.sh"

echo "VM $VM created with IP $IP. Wait ~2 min for the startup script, then run 02-push-config.sh."
