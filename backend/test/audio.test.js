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

function upload(bytes, filename, type) {
  const form = new FormData();
  form.append("audio", new Blob([bytes], { type }), filename);
  return form;
}

test("rejects missing, empty, unsupported, and oversized audio", async () => {
  const cases = [
    [new FormData(), 400],
    [upload(new Uint8Array(), "empty.wav", "audio/wav"), 400],
    [upload("not audio", "notes.txt", "text/plain"), 415],
    [upload(new Uint8Array(10 * 1024 * 1024 + 1), "large.wav", "audio/wav"), 413],
  ];

  for (const [body, expectedStatus] of cases) {
    const response = await fetch(`${baseUrl}/api/audio/transcribe`, { method: "POST", body });
    assert.equal(response.status, expectedStatus);
    assert.ok((await response.json()).error);
  }
});

test("returns Gemini transcription and sends audio inline", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = env.geminiApiKey;
  env.geminiApiKey = "test-key";

  globalThis.fetch = async (url, options) => {
    if (String(url).startsWith(baseUrl)) {
      return originalFetch(url, options);
    }

    assert.match(String(url), /generativelanguage\.googleapis\.com/);
    assert.equal(options.headers["x-goog-api-key"], "test-key");
    const body = JSON.parse(options.body);
    assert.equal(body.contents[0].parts[1].inlineData.mimeType, "audio/wav");
    assert.equal(body.contents[0].parts[1].inlineData.data, Buffer.from("sample audio").toString("base64"));
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "Hello there." }] } }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const response = await fetch(`${baseUrl}/api/audio/transcribe`, {
      method: "POST",
      body: upload("sample audio", "sample.wav", "audio/wav"),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { transcription: "Hello there." });
  } finally {
    globalThis.fetch = originalFetch;
    env.geminiApiKey = originalKey;
  }
});

test("reports Gemini overload and rate limits clearly", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = env.geminiApiKey;
  env.geminiApiKey = "test-key";

  try {
    for (const [upstreamStatus, expectedStatus, message] of [
      [503, 503, /temporarily overloaded/],
      [429, 429, /request limit reached/],
    ]) {
      globalThis.fetch = async (url, options) => {
        if (String(url).startsWith(baseUrl)) return originalFetch(url, options);
        return new Response("{}", { status: upstreamStatus });
      };

      const response = await fetch(`${baseUrl}/api/audio/transcribe`, {
        method: "POST",
        body: upload("sample audio", "sample.wav", "audio/wav"),
      });
      assert.equal(response.status, expectedStatus);
      assert.match((await response.json()).error, message);
    }
  } finally {
    globalThis.fetch = originalFetch;
    env.geminiApiKey = originalKey;
  }
});
