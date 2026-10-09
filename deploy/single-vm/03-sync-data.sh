#!/usr/bin/env bash
# Copies MongoDB, uploads and video-mom data from the GKE disks to the VM.
# Works from snapshots of the live disks; the GKE disks are never modified.
#
#   ./03-sync-data.sh test    # GKE keeps running; VM gets a point-in-time copy
#   ./03-sync-data.sh final   # CUTOVER: stops GKE apps first so no writes are lost
set -euo pipefail
MODE=${1:?usage: $0 test|final}
P=digital-gram-sabha; Z=asia-south1-a; VM=egs-vm
TS=$(date +%Y%m%d-%H%M)
SSH=(gcloud compute ssh $VM --zone $Z --project $P --tunnel-through-iap --command)

# source GKE disk -> folder under /data/egs on the VM
PAIRS="mongodb:mongodb-zonal-a uploads:pvc-8577d960-63eb-4e8f-87f5-b2457584927c video-mom:video-mom-zonal-a"

if [ "$MODE" = final ]; then
  echo ">> Stopping GKE apps (MongoDB shuts down cleanly)"
  gcloud container clusters get-credentials gke-mumbai-cluster --region asia-south1 --project $P >/dev/null 2>&1
  kubectl -n production scale deploy/backend deploy/video-mom deploy/frontend --replicas=0
  kubectl -n production scale sts/mongodb --replicas=0
  kubectl -n production wait --for=delete pod -l app=mongodb --timeout=180s || true
fi

echo ">> Stopping VM stack"
"${SSH[@]}" 'cd /opt/egs 2>/dev/null && sudo docker compose down || true'

for pair in $PAIRS; do
  name=${pair%%:*}; disk=${pair#*:}; snap=egs-sync-$name-$TS; tmp=egs-sync-$name
  echo ">> $name: snapshot $disk -> $snap"
  gcloud compute snapshots create $snap --source-disk $disk --source-disk-zone $Z --storage-location asia-south1 --project $P --quiet
  gcloud compute disks create $tmp --zone $Z --source-snapshot $snap --type pd-balanced --project $P --quiet
  gcloud compute instances attach-disk $VM --zone $Z --disk $tmp --device-name $tmp --project $P
  "${SSH[@]}" "set -e
    sudo mkdir -p /mnt/$tmp
    sudo mount /dev/disk/by-id/google-$tmp /mnt/$tmp
    sudo rsync -aH --delete --exclude lost+found /mnt/$tmp/ /data/egs/$name/
    sudo du -sh /data/egs/$name
    sudo umount /mnt/$tmp"
  gcloud compute instances detach-disk $VM --zone $Z --disk $tmp --project $P
  gcloud compute disks delete $tmp --zone $Z --project $P --quiet   # throwaway copy; snapshot $snap is kept
done

echo ">> Data synced ($MODE). Snapshots kept: egs-sync-*-$TS"
if [ "$MODE" = final ]; then
  echo ">> Next: ./02-push-config.sh live && start the stack, then switch DNS."
fi
