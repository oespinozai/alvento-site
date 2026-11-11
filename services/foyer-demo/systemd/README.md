# ollama drop-ins on gaia (100.97.130.43)

Source copies of the systemd config that ollama, the model server behind the Foyer demo, runs with on gaia. Each file is byte-identical to the installed copy as of 2026-11-11.

| Repo file | Installed on gaia as |
|---|---|
| ollama-capacity.conf | /etc/systemd/system/ollama.service.d/foyer-capacity.conf |
| ollama-gpu-wait.conf | /etc/systemd/system/ollama.service.d/gpu-wait.conf |
| ollama-wait-ready.sh | /usr/local/sbin/ollama-wait-ready.sh (chmod 755) |
| ollama-after-gpu-bind.conf | /etc/systemd/system/ollama.service.d/after-gpu-bind.conf |

After installing: `systemctl daemon-reload && systemctl restart ollama`. Then confirm `journalctl -u ollama | grep "inference compute"` does not show `library=cpu`.

Not in this repo:
- `ollama-after-gpu-bind.conf` depends on gaia's `nvidia-dev-nodes.service`, which runs `/usr/local/sbin/nvidia-bind-gpu.sh`. That is host-wide GPU setup shared with other containers, not Foyer config.
- gaia also has `ollama.service.d/override.conf`, which sets OLLAMA_HOST, OLLAMA_KEEP_ALIVE and OLLAMA_CONTEXT_LENGTH.
