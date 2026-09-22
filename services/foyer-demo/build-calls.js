"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { promisify } = require("node:util");
const run = promisify(require("node:child_process").execFile);
const { synthesize } = require("./speech");
const calls = require("./calls.json");

// Default caller voice is by kind (cosette for "sample", marius for
// "handoff"), overridden per track where the caller's name is the opposite
// gender from the default voice.
const CALLER_VOICE_OVERRIDE = { retail: { sample: "marius" } };

async function main() {
  const base = path.resolve(__dirname, "../../case-studies/foyer");
  const requestedTracks = process.argv.slice(2);
  const trackNames = requestedTracks.length ? requestedTracks : Object.keys(calls);
  const work = await fs.mkdtemp(path.join(os.tmpdir(), "foyer-calls-"));
  try {
    for (const track of trackNames) {
      const trackCalls = calls[track];
      if (!trackCalls) throw new Error(`unknown track: ${track}`);
      // The original "practice" track keeps its pre-existing filenames/ids so its
      // already-verified audio and HTML never need touching when adding tracks.
      const prefix = track === "practice" ? "" : `${track}-`;
      for (const [kind, turns] of Object.entries(trackCalls)) {
        const lines = [];
        const files = [];
        let cursor = 0;
        const silence = path.join(work, "gap.wav");
        await run("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", "0.45", "-c:a", "pcm_s16le", silence]);
        for (const [i, [speaker, text]] of turns.entries()) {
          const file = path.join(work, `${track}-${kind}-${i}.wav`);
          const voice = speaker === "foyer" ? "jean" : (CALLER_VOICE_OVERRIDE[track]?.[kind] ?? (kind === "sample" ? "cosette" : "marius"));
          const audio = await synthesize(text, { url: "http://100.97.130.43:8005/v1/audio/speech", voice, format: "wav", timeoutMs: 90000, requestSpacingMs: 2300 });
          await fs.writeFile(file, audio);
          const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file]);
          if (i) { files.push(silence); cursor += 0.45; }
          const duration = Number(stdout.trim());
          lines.push({ line: i, speaker, text, start: +cursor.toFixed(3), end: +(cursor + duration).toFixed(3) });
          cursor += duration;
          files.push(file);
          console.log(`${track}/${kind} ${i + 1}/${turns.length}: ${duration.toFixed(1)}s`);
        }
        const list = path.join(work, "concat.txt");
        await fs.writeFile(list, files.map(f => `file '${f}'`).join("\n"));
        const audioName = kind === "sample" ? `${prefix}sample-call.mp3` : `${prefix}handoff-call.mp3`;
        const timingName = kind === "sample" ? `${prefix}timing.json` : `${prefix}handoff-timing.json`;
        await run("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-c:a", "libmp3lame", "-q:a", "3", path.join(base, "audio", audioName)]);
        await fs.writeFile(path.join(base, "audio", timingName), JSON.stringify({ lines }, null, 2) + "\n");
        const escape = s => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
        const transcript = lines.map(l => `      <div class="line${l.speaker === "caller" ? " caller" : ""}" data-start="${l.start}" data-end="${l.end}">\n        <div class="speaker">${l.speaker === "foyer" ? "Foyer" : "Caller"}</div>\n        <div class="text">${escape(l.text)}</div>\n      </div>`).join("\n");
        const htmlPath = path.join(base, "index.html");
        const html = await fs.readFile(htmlPath, "utf8");
        const id = kind === "sample" ? `transcript${prefix ? "-" + track : ""}` : `transcript2${prefix ? "-" + track : ""}`;
        const pattern = new RegExp(`(<div class="transcript" id="${id}">)[\\s\\S]*?(\\n    </div>\\n  </div>\\n</section>)`);
        if (!pattern.test(html)) throw new Error(`missing ${id}`);
        await fs.writeFile(htmlPath, html.replace(pattern, `$1\n${transcript}$2`));
        console.log(`${track}/${kind}: ${cursor.toFixed(2)}s, audio and transcript updated`);
      }
    }
  } finally {
    await fs.rm(work, { recursive: true, force: true });
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
