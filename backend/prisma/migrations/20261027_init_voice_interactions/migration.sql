-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "VoiceInteraction" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inputFileName" TEXT NOT NULL,
    "inputMimeType" TEXT NOT NULL,
    "inputAudio" BYTEA NOT NULL,
    "inputAudioBytes" INTEGER NOT NULL,
    "transcription" TEXT NOT NULL,
    "aiResponseText" TEXT NOT NULL,
    "responseAudio" BYTEA NOT NULL,
    "responseMimeType" TEXT NOT NULL,
    "responseAudioBytes" INTEGER NOT NULL,

    CONSTRAINT "VoiceInteraction_pkey" PRIMARY KEY ("id")
);
