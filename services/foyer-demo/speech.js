"use strict";

const { mkdtemp, writeFile, readFile, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const run = promisify(execFile);
const { setTimeout: delay } = require("node:timers/promises");

function speechSegments(text) {
  // Speak mobile digits explicitly; a TTS model can otherwise read them as a
  // large number or swallow repeated zeroes. Only the spoken copy is changed.
  const digits = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  text = text.replace(/\b07(?:[ -]?\d){9}\b/g, number => {
    const n = number.replace(/\D/g, "");
    return [n.slice(0, 5), n.slice(5, 8), n.slice(8)].map(group => [...group].map(d => digits[Number(d)]).join(" ")).join("; ");
  });
  // Speak "am"/"pm" as letters; the voice otherwise blends "am" into the word
  // "am" (as in "I am") instead of the initialism (confirmed via word-level
  // ASR timing: unspaced "30am" renders as one 0.54s blob vs. two distinct
  // ~0.2s letter sounds once spelled out).
  text = text.replace(/\b(\d{1,2}(?::\d{2})?)\s*([ap])\.?m\.?\b/gi, (_, time, ap) => `${time} ${ap.toUpperCase()} M`);
  // Speak email addresses letter-by-letter on the local part (the AI can't
  // reliably know how to pronounce an arbitrary name/username as a word —
  // confirmed: "esib" has no unusual spelling pattern and still came out as
  // "seve"), and "at"/"dot" for the rest. This also removes the "." before
  // segmentation, so it can't be mistaken for a sentence boundary.
  const symbolWords = { "+": "plus", "_": "underscore", "-": "dash" };
  text = text.replace(/\b([A-Za-z0-9][A-Za-z0-9.+_-]*)@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)\b/g, (_, local, domain) => {
    const spellLocal = local.split(".").map(seg =>
      [...seg].map(ch => (/\d/.test(ch) ? digits[Number(ch)] : symbolWords[ch] || ch.toUpperCase())).join(" ")
    ).join(" dot ");
    const sayDomain = (s) => s.replace(/\./g, " dot ").replace(/\s+/g, " ").trim();
    return `${spellLocal} at ${sayDomain(domain)}`;
  });
  // Keep dates and decimal numbers intact.
  const sentences = Array.from(new Intl.Segmenter("en-GB", { granularity: "sentence" }).segment(text), s => s.segment.trim());
  const parts = sentences.flatMap(s => s.split(/;\s+|\s+\|\s+/)).filter(Boolean);
  // Bound upstream work without discarding any spoken content.
  return parts.length <= 6 ? parts : [...parts.slice(0, 5), parts.slice(5).join(" ")];
}

async function synthesize(text, { url, voice = "jean", format = "mp3", segments, timeoutMs = 30000, requestSpacingMs = 0 } = {}) {
  const parts = segments || speechSegments(text);
  if (!parts.length) throw new Error("empty speech input");
  const dir = await mkdtemp(join(tmpdir(), "foyer-speech-"));
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    const inputs = [];
    // Sequential requests avoid competing for the shared GPU.
    for (let i = 0; i < parts.length; i++) {
      if (requestSpacingMs) await delay(requestSpacingMs, undefined, { signal });
      const request = () => fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "english-gpu", input: parts[i], voice, response_format: "wav", speed: 1.0 }),
        signal,
      });
      let response = await request();
      if (response.status === 429) {
        const retryAfter = Math.max(1, Math.min(60, Number(response.headers.get("Retry-After")) || 2));
        await response.body?.cancel();
        await delay(retryAfter * 1000, undefined, { signal });
        response = await request();
      }
      if (!response.ok) throw new Error(`tts http ${response.status}`);
      const path = join(dir, `${i}.wav`);
      await writeFile(path, Buffer.from(await response.arrayBuffer()));
      inputs.push("-i", path);
    }
    // Actual silence between thoughts, with normal speaking speed within each.
    const filters = parts.map((_, i) => `[${i}:a]aresample=24000,aformat=sample_fmts=s16:channel_layouts=mono${i < parts.length - 1 ? ",apad=pad_dur=0.32" : ""}[s${i}]`);
    filters.push(parts.map((_, i) => `[s${i}]`).join("") + `concat=n=${parts.length}:v=0:a=1[out]`);
    const output = join(dir, format === "wav" ? "speech.wav" : "speech.mp3");
    await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...inputs, "-filter_complex", filters.join(";"), "-map", "[out]", ...(format === "wav" ? ["-c:a", "pcm_s16le"] : ["-c:a", "libmp3lame", "-q:a", "3"]), output], { timeout: 5000, signal });
    return await readFile(output);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

module.exports = { speechSegments, synthesize };
