#!/bin/bash
set -e
DEV=/dev/disk/by-id/google-egs-data
blkid $DEV >/dev/null 2>&1 || mkfs.ext4 -m 0 -F $DEV
mkdir -p /data
grep -q " /data " /etc/fstab || echo "$DEV /data ext4 defaults,nofail 0 2" >> /etc/fstab
mountpoint -q /data || mount /data
mkdir -p /data/egs/mongodb /data/egs/uploads /data/egs/video-mom /opt/egs
command -v rsync >/dev/null || (apt-get update -y && apt-get install -y rsync)
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
fi
gcloud auth configure-docker asia-south1-docker.pkg.dev --quiet
# Start the stack on boot once it has been configured
[ -f /opt/egs/docker-compose.yml ] && [ -f /opt/egs/env/backend.env ] && (cd /opt/egs && docker compose up -d) || true
