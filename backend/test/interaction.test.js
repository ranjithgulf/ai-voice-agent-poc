import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import app from "../src/app.js";
import { getInteractionAudio, listInteractions, saveInteraction } from "../src/services/interaction.service.js";

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

function wav() {
  const bytes = Buffer.alloc(44);
  bytes.write("RIFF", 0);
  bytes.write("WAVE", 8);
  return bytes;
}

function form({ input = true, output = true, transcription = "Hello", response = "Hi" } = {}) {
  const body = new FormData();
  if (input) body.append("inputAudio", new Blob([wav()], { type: "audio/wav" }), "input.wav");
  if (output) body.append("responseAudio", new Blob([wav()], { type: "audio/wav" }), "reply.wav");
  body.append("transcription", transcription);
  body.append("aiResponseText", response);
  return body;
}

test("requires both completed audio files and both text results before saving", async () => {
  for (const body of [form({ input: false }), form({ output: false }), form({ transcription: "" }), form({ response: "" })]) {
    const result = await fetch(`${baseUrl}/api/interactions`, { method: "POST", body });
    assert.equal(result.status, 400);
  }
});

test("creates one row containing the original audio, text, response, and generated audio", async () => {
  let calls = 0;
  const record = {
    inputFileName: "input.wav",
    inputMimeType: "audio/wav",
    inputAudio: wav(),
    transcription: "Hello",
    aiResponseText: "Hi",
    responseAudio: wav(),
    responseMimeType: "audio/wav",
  };
  const client = { voiceInteraction: { create: async (query) => {
    calls += 1;
    assert.equal(query.data.inputFileName, record.inputFileName);
    assert.deepEqual(query.data.inputAudio, record.inputAudio);
    assert.equal(query.data.transcription, record.transcription);
    assert.equal(query.data.aiResponseText, record.aiResponseText);
    assert.deepEqual(query.data.responseAudio, record.responseAudio);
    assert.equal(query.data.inputAudioBytes, 44);
    assert.equal(query.data.responseAudioBytes, 44);
    return { id: "test-id", createdAt: new Date() };
  } } };

  const saved = await saveInteraction(record, client);
  assert.equal(saved.id, "test-id");
  assert.equal(calls, 1);
});

test("lists recent interactions without loading binary audio", async () => {
  const client = { voiceInteraction: { findMany: async (query) => {
    assert.equal(query.take, 20);
    assert.deepEqual(query.orderBy, { createdAt: "desc" });
    assert.equal(query.select.inputAudio, undefined);
    assert.equal(query.select.responseAudio, undefined);
    return [{ id: "test-id" }];
  } } };
  assert.deepEqual(await listInteractions(client), [{ id: "test-id" }]);
});

test("loads only the requested audio bytes", async () => {
  const selections = [];
  const client = { voiceInteraction: { findUnique: async (query) => {
    selections.push(query.select);
    return { inputAudio: wav() };
  } } };
  await getInteractionAudio("test-id", "input", client);
  await getInteractionAudio("test-id", "response", client);
  assert.deepEqual(selections, [
    { inputAudio: true, inputMimeType: true },
    { responseAudio: true, responseMimeType: true },
  ]);
});

test("rejects invalid saved audio requests", async () => {
  const response = await fetch(`${baseUrl}/api/interactions/not-an-id/audio/input`);
  assert.equal(response.status, 400);
});
