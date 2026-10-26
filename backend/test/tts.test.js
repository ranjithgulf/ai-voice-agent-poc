import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import app from "../src/app.js";
import { env } from "../src/config/env.js";

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

function post(text) {
  return fetch(`${baseUrl}/api/tts/synthesize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

test("rejects missing or empty speech text", async () => {
  for (const text of [undefined, "", "  "]) {
    const response = await post(text);
    assert.equal(response.status, 400);
  }
});

test("sends AI text to Speaches TTS and returns WAV audio", async () => {
  const originalFetch = globalThis.fetch;
  const originalBase = env.speachesBaseUrl;
  const originalModel = env.speachesTtsModel;
  const originalVoice = env.speachesTtsVoice;
  env.speachesBaseUrl = "http://127.0.0.1:8000";
  env.speachesTtsModel = "test-tts-model";
  env.speachesTtsVoice = "test-voice";
  const wav = Buffer.alloc(44);
  wav.write("RIFF", 0);
  wav.write("WAVE", 8);

  globalThis.fetch = async (url, options) => {
    if (String(url).startsWith(baseUrl)) return originalFetch(url, options);
    assert.equal(String(url), "http://127.0.0.1:8000/v1/audio/speech");
    const body = JSON.parse(options.body);
    assert.equal(body.model, "test-tts-model");
    assert.equal(body.input, "Hello there.");
    assert.equal(body.voice, "test-voice");
    assert.equal(body.response_format, "wav");
    return new Response(wav, {
      status: 200,
      headers: { "Content-Type": "audio/wav" },
    });
  };

  try {
    const response = await post("Hello there.");
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /audio\/wav/);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), wav);
  } finally {
    globalThis.fetch = originalFetch;
    env.speachesBaseUrl = originalBase;
    env.speachesTtsModel = originalModel;
    env.speachesTtsVoice = originalVoice;
  }
});

test("reports Speaches TTS model failure clearly", async () => {
  const originalFetch = globalThis.fetch;
  const originalBase = env.speachesBaseUrl;
  const originalModel = env.speachesTtsModel;
  const originalVoice = env.speachesTtsVoice;
  env.speachesBaseUrl = "http://127.0.0.1:8000";
  env.speachesTtsModel = "test-tts-model";
  env.speachesTtsVoice = "test-voice";
  globalThis.fetch = async (url, options) => String(url).startsWith(baseUrl)
    ? originalFetch(url, options)
    : new Response("{}", { status: 404 });

  try {
    const response = await post("Hello there.");
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /model is not installed/);
  } finally {
    globalThis.fetch = originalFetch;
    env.speachesBaseUrl = originalBase;
    env.speachesTtsModel = originalModel;
    env.speachesTtsVoice = originalVoice;
  }
});
