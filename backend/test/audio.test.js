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

test("returns Speaches transcription and uploads audio as multipart form data", async () => {
  const originalFetch = globalThis.fetch;
  const originalBase = env.speachesBaseUrl;
  const originalModel = env.speachesSttModel;
  env.speachesBaseUrl = "http://127.0.0.1:8000";
  env.speachesSttModel = "test-stt-model";

  globalThis.fetch = async (url, options) => {
    if (String(url).startsWith(baseUrl)) {
      return originalFetch(url, options);
    }

    assert.equal(String(url), "http://127.0.0.1:8000/v1/audio/transcriptions");
    assert.equal(options.body.get("model"), "test-stt-model");
    const file = options.body.get("file");
    assert.equal(file.name, "sample.wav");
    assert.equal(file.type, "audio/wav");
    assert.equal(Buffer.from(await file.arrayBuffer()).toString(), "sample audio");
    return new Response(JSON.stringify({ text: "Hello there." }), {
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
    env.speachesBaseUrl = originalBase;
    env.speachesSttModel = originalModel;
  }
});

test("reports Speaches model and connection failures clearly", async () => {
  const originalFetch = globalThis.fetch;
  const originalBase = env.speachesBaseUrl;
  const originalModel = env.speachesSttModel;
  env.speachesBaseUrl = "http://127.0.0.1:8000";
  env.speachesSttModel = "test-stt-model";

  try {
    for (const [upstreamStatus, expectedStatus, message] of [
      [404, 503, /model is not installed/],
      [500, 502, /could not transcribe/],
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

    globalThis.fetch = async (url, options) => {
      if (String(url).startsWith(baseUrl)) return originalFetch(url, options);
      throw new TypeError("Connection refused");
    };
    const response = await fetch(`${baseUrl}/api/audio/transcribe`, {
      method: "POST",
      body: upload("sample audio", "sample.wav", "audio/wav"),
    });
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /Speaches is unavailable/);
  } finally {
    globalThis.fetch = originalFetch;
    env.speachesBaseUrl = originalBase;
    env.speachesSttModel = originalModel;
  }
});
