#!/bin/bash
# Install on gaia as /usr/local/sbin/ollama-wait-ready.sh (chmod 755).
# Run from ollama.service ExecStartPre (see ollama-gpu-wait.conf). Waits up to 120s for the
# Tailscale IP to exist and the GPU to answer, then lets ollama start. Never fails the unit:
# a stuck wait must not crashloop ollama, so it always exits 0 after logging.
# Why: on 2026-10-14 gaia rebooted, ollama started before tailscale (two bind failures) and
# before the GPU was usable, discovered no CUDA device once, and ran CPU-only for 5 days.
TS_IP=${TS_IP:-100.97.130.43}
TRIES=${TRIES:-60}
for _ in $(seq 1 "$TRIES"); do
  if ip -4 addr show to "$TS_IP" 2>/dev/null | grep -q inet && nvidia-smi -L >/dev/null 2>&1; then
    exit 0
  fi
  sleep 2
done
logger -t ollama-wait-ready "gave up waiting for $TS_IP and/or GPU; starting ollama anyway (check library= in journalctl -u ollama)"
exit 0
