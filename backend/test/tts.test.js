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

test("sends AI text to Gemini TTS and returns WAV audio", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = env.geminiApiKey;
  env.geminiApiKey = "test-key";
  const wav = Buffer.alloc(44);
  wav.write("RIFF", 0);
  wav.write("WAVE", 8);

  globalThis.fetch = async (url, options) => {
    if (String(url).startsWith(baseUrl)) return originalFetch(url, options);
    assert.equal(String(url), "https://generativelanguage.googleapis.com/v1beta/interactions");
    assert.equal(options.headers["x-goog-api-key"], "test-key");
    const body = JSON.parse(options.body);
    assert.equal(body.model, env.geminiTtsModel);
    assert.equal(body.input[0].content[0].text, "Hello there.");
    assert.deepEqual(body.generation_config.speech_config, [{ voice: env.geminiTtsVoice }]);
    return new Response(JSON.stringify({ steps: [{ type: "model_output", content: [{ type: "audio", data: wav.toString("base64") }] }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const response = await post("Hello there.");
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /audio\/wav/);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), wav);
  } finally {
    globalThis.fetch = originalFetch;
    env.geminiApiKey = originalKey;
  }
});

test("reports Gemini TTS rate limit clearly", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = env.geminiApiKey;
  env.geminiApiKey = "test-key";
  globalThis.fetch = async (url, options) => String(url).startsWith(baseUrl)
    ? originalFetch(url, options)
    : new Response("{}", { status: 429 });

  try {
    const response = await post("Hello there.");
    assert.equal(response.status, 429);
    assert.match((await response.json()).error, /request limit reached/);
  } finally {
    globalThis.fetch = originalFetch;
    env.geminiApiKey = originalKey;
  }
});
