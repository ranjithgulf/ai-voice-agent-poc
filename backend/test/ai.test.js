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

function chat(text) {
  return fetch(`${baseUrl}/api/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

test("rejects missing and empty transcription", async () => {
  for (const transcription of [undefined, "", "   ", 23]) {
    const response = await chat(transcription);
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /Transcription text is required/);
  }
});

test("returns JSON for malformed requests", async () => {
  const response = await fetch(`${baseUrl}/api/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{bad json",
  });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /valid JSON/);
});

test("reports missing LM Studio configuration", async () => {
  const originalModel = env.lmStudioModel;
  env.lmStudioModel = "";
  try {
    const response = await chat("Hello");
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /not configured/);
  } finally {
    env.lmStudioModel = originalModel;
  }
});

test("sends the transcription to local LM Studio and returns its answer", async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = env.lmStudioBaseUrl;
  const originalModel = env.lmStudioModel;
  env.lmStudioBaseUrl = "http://127.0.0.1:1235/v1";
  env.lmStudioModel = "test-local-model";

  globalThis.fetch = async (url, options) => {
    if (String(url).startsWith(baseUrl)) return originalFetch(url, options);
    assert.equal(String(url), "http://127.0.0.1:1235/v1/chat/completions");
    const body = JSON.parse(options.body);
    assert.equal(body.model, "test-local-model");
    assert.equal(body.messages[1].content, "Hello");
    assert.equal(body.messages[0].role, "system");
    assert.equal(body.reasoning_effort, "none");
    return new Response(JSON.stringify({ choices: [{ message: { content: "Hello! How can I help?" } }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const response = await chat("Hello");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { response: "Hello! How can I help?" });
  } finally {
    globalThis.fetch = originalFetch;
    env.lmStudioBaseUrl = originalBaseUrl;
    env.lmStudioModel = originalModel;
  }
});

test("reports local model and connection failures", async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = env.lmStudioBaseUrl;
  const originalModel = env.lmStudioModel;
  env.lmStudioBaseUrl = "http://127.0.0.1:1235/v1";
  env.lmStudioModel = "test-local-model";

  try {
    globalThis.fetch = async (url, options) => {
      if (String(url).startsWith(baseUrl)) return originalFetch(url, options);
      return new Response(JSON.stringify({ error: { message: "No model is loaded" } }), { status: 400 });
    };
    let response = await chat("Hello");
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /No model is loaded/);

    globalThis.fetch = async (url, options) => {
      if (String(url).startsWith(baseUrl)) return originalFetch(url, options);
      throw new TypeError("Connection refused");
    };
    response = await chat("Hello");
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /unavailable/);

    globalThis.fetch = async (url, options) => {
      if (String(url).startsWith(baseUrl)) return originalFetch(url, options);
      throw new DOMException("Timed out", "TimeoutError");
    };
    response = await chat("Hello");
    assert.equal(response.status, 504);
    assert.match((await response.json()).error, /too long/);

    globalThis.fetch = async (url, options) => {
      if (String(url).startsWith(baseUrl)) return originalFetch(url, options);
      return new Response(JSON.stringify({ error: { message: "Model not found" } }), { status: 404 });
    };
    response = await chat("Hello");
    assert.equal(response.status, 502);
    assert.match((await response.json()).error, /model was not found/);

    globalThis.fetch = async (url, options) => {
      if (String(url).startsWith(baseUrl)) return originalFetch(url, options);
      return new Response(JSON.stringify({ error: { message: "Failed to load model: engine error" } }), { status: 400 });
    };
    response = await chat("Hello");
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /could not load/);
  } finally {
    globalThis.fetch = originalFetch;
    env.lmStudioBaseUrl = originalBaseUrl;
    env.lmStudioModel = originalModel;
  }
});
