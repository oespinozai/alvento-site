"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { speechSegments, synthesize } = require("./speech");

test("sentence pauses preserve email addresses and group every mobile digit", () => {
  assert.deepEqual(speechSegments("That's priya@example.com. Is that correct?"), ["That's priya@example.com.", "Is that correct?"]);
  assert.deepEqual(speechSegments("07700900123"), ["zero seven seven zero zero", "nine zero zero", "one two three"]);
  assert.deepEqual(speechSegments("Thank you."), ["Thank you."]);
});

test("synthesized audio contains a real 320ms gap with no global slowdown", async t => {
  const rate = 24000;
  const wav = Buffer.alloc(44 + rate * 2);
  wav.write("RIFF"); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(rate * 2, 40);
  for (let i = 0; i < rate; i++) wav.writeInt16LE(Math.round(10000 * Math.sin(2 * Math.PI * 440 * i / rate)), 44 + 2 * i);
  const requests = [];
  const server = http.createServer(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    requests.push(JSON.parse(Buffer.concat(chunks)));
    res.writeHead(200, { "Content-Type": "audio/wav" }); res.end(wav);
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const audio = await synthesize("Hello. How can I help?", { url: `http://127.0.0.1:${server.address().port}`, format: "wav" });
  assert.deepEqual(requests.map(r => r.input), ["Hello.", "How can I help?"]);
  assert.ok(requests.every(r => r.speed === 1.0));
  let offset = 12;
  while (audio.toString("ascii", offset, offset + 4) !== "data") offset += 8 + audio.readUInt32LE(offset + 4) + (audio.readUInt32LE(offset + 4) % 2);
  const pcm = audio.subarray(offset + 8, offset + 8 + audio.readUInt32LE(offset + 4));
  assert.equal(pcm.length, Math.round(rate * 2 * 2.32));
  assert.ok(pcm.subarray(rate * 2, Math.round(rate * 2 * 1.32)).every(byte => byte === 0));
  assert.ok(pcm.subarray(Math.round(rate * 2 * 1.32)).some(byte => byte !== 0));
});
