import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../config/env.js";

let prisma;

function databaseClient() {
  const connectionString = env.databaseUrl;
  if (!connectionString || connectionString.includes("YOUR_PASSWORD")) {
    throw Object.assign(new Error("Database URL is not configured"), { code: "DATABASE_NOT_CONFIGURED" });
  }

  let url;
  try {
    url = new URL(connectionString);
  } catch {
    throw Object.assign(new Error("Database URL is invalid"), { code: "DATABASE_NOT_CONFIGURED" });
  }
  if (!["postgresql:", "postgres:"].includes(url.protocol) || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw Object.assign(new Error("Local PostgreSQL URL is required"), { code: "DATABASE_NOT_CONFIGURED" });
  }

  if (!prisma) {
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  }
  return prisma;
}

export async function saveInteraction(record, client = databaseClient()) {
  return client.voiceInteraction.create({
    data: {
      inputFileName: record.inputFileName,
      inputMimeType: record.inputMimeType,
      inputAudio: record.inputAudio,
      inputAudioBytes: record.inputAudio.length,
      transcription: record.transcription,
      aiResponseText: record.aiResponseText,
      responseAudio: record.responseAudio,
      responseMimeType: record.responseMimeType,
      responseAudioBytes: record.responseAudio.length,
    },
    select: { id: true, createdAt: true },
  });
}

export async function listInteractions(client = databaseClient()) {
  return client.voiceInteraction.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      createdAt: true,
      inputFileName: true,
      inputMimeType: true,
      inputAudioBytes: true,
      transcription: true,
      aiResponseText: true,
      responseMimeType: true,
      responseAudioBytes: true,
    },
  });
}

export async function getInteractionAudio(id, kind, client = databaseClient()) {
  return client.voiceInteraction.findUnique({
    where: { id },
    select: kind === "input"
      ? { inputAudio: true, inputMimeType: true }
      : { responseAudio: true, responseMimeType: true },
  });
}
