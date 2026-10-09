# eGramSabha — single-VM deployment

Replaces the GKE cluster with one `e2-medium` VM running the same Docker images
(frontend, backend, video-mom, MongoDB 6.0) via Docker Compose, behind Caddy.
MongoDB stays self-hosted on the VM's data disk — no Atlas or other external DB.

```
Cloudflare (egramsabha.empowerpanchayat.org, proxied)
   └─> egs-vm  (vm-static-ip-1 = 34.14.161.54)
         caddy :80/:443 ─> frontend (nginx) ─> /api ─> backend ─> mongodb
                                                     └─> video-mom ─> mongodb, Vertex AI, STT
         /data (30 GB disk egs-data): mongodb/ uploads/ video-mom/
```

Run all scripts from this folder on a machine with `gcloud` + `kubectl`,
logged in as a project owner.

## 1. Build and test (no impact on the live site)

| Step | Command |
|---|---|
| Service account + firewall (IAM; owner only) | `./00-prereqs.sh` |
| Create VM + data disk | `./01-create-vm.sh` (wait ~2 min) |
| Copy today's data | `./03-sync-data.sh test` |
| Push config with scheduled jobs OFF | `./02-push-config.sh test` |
| Start | `gcloud compute ssh egs-vm --zone asia-south1-a --tunnel-through-iap --command 'cd /opt/egs && sudo docker compose up -d'` |

**Testing:** the frontend calls `https://egramsabha.empowerpanchayat.org/api`, so
opening the VM by raw IP would talk to the *live* backend. To test the VM, add this
line to your machine's `/etc/hosts`, open the site, accept the self-signed
certificate, and remove the line afterwards:

```
34.14.161.54 egramsabha.empowerpanchayat.org
```

Changes made while testing land only in the VM's copy and are overwritten at cutover.

## 2. Cutover (needs the person with Cloudflare access, ~15 min downtime)

1. `./03-sync-data.sh final` — stops GKE apps, copies the final data.
2. `./02-push-config.sh live` — scheduled jobs ON.
3. Start the stack (same `docker compose up -d` command as above).
4. **Cloudflare** → DNS → `egramsabha` record → change to **A `34.14.161.54`**, keep it **Proxied** (orange cloud).
   SSL/TLS mode must be **Full** or **Flexible** (not "Full (strict)") — it is already
   non-strict today, because the current origin certificate expired on 2026-08-17.
5. Check: log in, open an issue with a photo/audio, open a meeting's agenda/MoM.

**Rollback** (any time before the GKE cluster is deleted):
point the Cloudflare record back to `34.111.82.120`, then

```
kubectl -n production scale sts/mongodb --replicas=1
kubectl -n production scale deploy/backend deploy/video-mom deploy/frontend --replicas=1
```

Writes made on the VM after cutover would not be in GKE — roll back early or not at all.

## 3. Decommission GKE (after ~1 week stable on the VM)

- Delete cluster `gke-mumbai-cluster` (its disks have reclaim policy `Retain`, so they survive; snapshot then delete them).
- Delete Cloud NAT `mumbai-nat`, router `mumbai-router`, release `nat-static-ip` (the VM has its own public IP).
- Release `vm-static-ip-2` (unused).
- Stop the management VM permanently or delete it.

## Operations

- Logs: `sudo docker compose -f /opt/egs/docker-compose.yml logs -f backend`
- Deploy new image: set `BACKEND_TAG=v1.1.7` (etc.) in `/opt/egs/.env`, then `sudo docker compose up -d`
- Backups: add a daily snapshot schedule on disk `egs-data`:
  ```
  gcloud compute resource-policies create snapshot-schedule egs-daily --region asia-south1 --daily-schedule --start-time 20:30 --max-retention-days 14 --storage-location asia-south1
  gcloud compute disks add-resource-policies egs-data --zone asia-south1-a --resource-policies egs-daily
  ```
