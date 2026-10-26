"use client";

import { useEffect, useState } from "react";
import { transcribeAudio } from "@/services/audio.service";
import { generateAIResponse } from "@/services/ai.service";
import { generateSpeech } from "@/services/tts.service";

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Home() {
  const [file, setFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [transcription, setTranscription] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiError, setAiError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [voiceAudioUrl, setVoiceAudioUrl] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!file) {
      setAudioUrl("");
      return;
    }

    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => () => {
    if (voiceAudioUrl) URL.revokeObjectURL(voiceAudioUrl);
  }, [voiceAudioUrl]);

  function handleFileChange(event) {
    setFile(event.target.files?.[0] || null);
    setError("");
    setTranscription("");
    setAiResponse("");
    setAiError("");
    setVoiceAudioUrl("");
    setVoiceError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setTranscription("");
    setAiResponse("");
    setAiError("");
    setVoiceAudioUrl("");
    setVoiceError("");

    if (!file) {
      setError("Select an audio file to transcribe.");
      return;
    }

    setLoading(true);

    try {
      const result = await transcribeAudio(file);
      setTranscription(result.transcription);
    } catch (caught) {
      setError(caught.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateResponse() {
    if (!transcription.trim()) {
      setAiError("Transcribe an audio file first.");
      return;
    }

    setAiLoading(true);
    setAiError("");
    setAiResponse("");
    setVoiceAudioUrl("");
    setVoiceError("");

    let responseText;
    try {
      const result = await generateAIResponse(transcription);
      responseText = result.response;
      setAiResponse(responseText);
    } catch (caught) {
      setAiError(caught.message);
      return;
    } finally {
      setAiLoading(false);
    }

    await handleGenerateSpeech(responseText);
  }

  async function handleGenerateSpeech(text = aiResponse) {
    if (!text.trim()) return;
    setVoiceLoading(true);
    setVoiceError("");
    setVoiceAudioUrl("");
    try {
      const audio = await generateSpeech(text);
      setVoiceAudioUrl(URL.createObjectURL(audio));
    } catch (caught) {
      setVoiceError(caught.message);
    } finally {
      setVoiceLoading(false);
    }
  }

  return (
    <>
      <header className="app-header">
        <div className="header-inner">
          <div>
            <p className="eyebrow">3CX / POC Workspace</p>
            <h1>AI Voice Agent</h1>
          </div>
          <span className="header-tag">Audio test</span>
        </div>
      </header>

      <main className="workspace">
        <section className="workflow" aria-label="Voice agent workflow">
          <div className="workflow-step current"><span className="step-number">01</span><span>Audio input</span></div>
          <div className="workflow-step current"><span className="step-number">02</span><span>Speech-to-text</span></div>
          <div className="workflow-step current"><span className="step-number">03</span><span>AI response</span></div>
          <div className="workflow-step current"><span className="step-number">04</span><span>Voice response</span></div>
        </section>

        <div className="dashboard">
          <section className="input-section" aria-labelledby="audio-heading">
            <div className="section-heading">
              <div>
                <p className="section-kicker">Input</p>
                <h2 id="audio-heading">Audio file</h2>
              </div>
              <span className="status ready">Ready</span>
            </div>

            <form onSubmit={handleSubmit} className="transcription-form">
              <label htmlFor="audio" className="file-label">Choose a recording</label>
              <input
                id="audio"
                name="audio"
                type="file"
                accept=".wav,.mp3,.m4a,.ogg,.flac,.webm,audio/*"
                onChange={handleFileChange}
                disabled={loading || aiLoading || voiceLoading}
              />
              <p className="file-hint">WAV, MP3, M4A, OGG, FLAC, or WebM. Max 10 MB.</p>

              <div className="file-details" aria-live="polite">
                <div><span>Name</span><strong>{file?.name || "No file selected"}</strong></div>
                <div><span>Type</span><strong>{file?.type || "Not available"}</strong></div>
                <div><span>Size</span><strong>{file ? formatFileSize(file.size) : "Not available"}</strong></div>
              </div>

              <div className="player-group">
                <span className="field-label">Preview</span>
                <audio controls src={audioUrl || undefined} aria-label="Selected audio preview" />
              </div>

              <button type="submit" disabled={loading || aiLoading || voiceLoading}>
                {loading ? "Transcribing..." : "Transcribe Audio"}
              </button>
            </form>
          </section>

          <div className="output-sections">
            <section className="output-section" aria-labelledby="transcription-heading" aria-live="polite">
              <div className="section-heading">
                <div>
                  <p className="section-kicker">Step 02</p>
                  <h2 id="transcription-heading">Speech-to-Text</h2>
                </div>
                <span className={`status ${loading ? "processing" : transcription ? "complete" : "ready"}`}>
                  {loading ? "Processing" : transcription ? "Complete" : "Ready"}
                </span>
              </div>
              {error ? <p className="error-message" role="alert">{error}</p> : null}
              <p className={transcription ? "transcription-text" : "empty-state"}>
                {loading ? "Processing audio..." : transcription || "No transcription yet."}
              </p>
            </section>

            <section className="output-section" aria-labelledby="ai-heading" aria-live="polite">
              <div className="section-heading">
                <div>
                  <p className="section-kicker">Step 03</p>
                  <h2 id="ai-heading">AI Response</h2>
                </div>
                <span className={`status ${aiLoading ? "processing" : aiResponse ? "complete" : transcription ? "ready" : "pending"}`}>
                  {aiLoading ? "Processing" : aiResponse ? "Complete" : transcription ? "Ready" : "Pending"}
                </span>
              </div>
              {aiError ? <p className="error-message" role="alert">{aiError}</p> : null}
              <p className={aiResponse ? "transcription-text" : "empty-state"}>
                {aiLoading ? "Generating response..." : aiResponse || "Waiting for AI processing..."}
              </p>
              <button
                type="button"
                className="ai-button"
                onClick={handleGenerateResponse}
                disabled={!transcription || loading || aiLoading || voiceLoading}
              >
                {aiLoading ? "Generating..." : "Generate AI Response"}
              </button>
            </section>

            <section className="output-section" aria-labelledby="voice-heading">
              <div className="section-heading">
                <div>
                  <p className="section-kicker">Step 04</p>
                  <h2 id="voice-heading">Voice Response</h2>
                </div>
                <span className={`status ${voiceLoading ? "processing" : voiceAudioUrl ? "complete" : aiResponse ? "ready" : "pending"}`}>
                  {voiceLoading ? "Processing" : voiceAudioUrl ? "Complete" : aiResponse ? "Ready" : "Pending"}
                </span>
              </div>
              {voiceError ? <p className="error-message" role="alert">{voiceError}</p> : null}
              <p className="empty-state" aria-live="polite">
                {voiceLoading ? "Generating voice response..." : voiceAudioUrl ? "Voice response ready to play." : "No audio response generated yet."}
              </p>
              <div className="player-group output-player">
                <audio controls src={voiceAudioUrl || undefined} aria-label="Voice response playback" />
              </div>
              {aiResponse && !voiceLoading && !voiceAudioUrl ? (
                <button type="button" className="ai-button" onClick={() => handleGenerateSpeech()}>
                  Generate Voice Response
                </button>
              ) : null}
            </section>
          </div>
        </div>
      </main>
    </>
  );
}


