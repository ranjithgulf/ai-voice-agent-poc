"use client";

import { useEffect, useRef, useState } from "react";
import { transcribeAudio } from "@/services/audio.service";
import { generateAIResponse } from "@/services/ai.service";
import { generateSpeech } from "@/services/tts.service";

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Home() {
  const voicePlayerRef = useRef(null);
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

  useEffect(() => {
    if (!voiceAudioUrl) return;
    voicePlayerRef.current?.play().catch(() => {
      // Browser autoplay may be blocked; the player remains available.
    });
  }, [voiceAudioUrl]);

  async function handleFileChange(event) {
    const selectedFile = event.target.files?.[0] || null;
    event.target.value = "";
    setFile(selectedFile);
    setError("");
    setTranscription("");
    setAiResponse("");
    setAiError("");
    setVoiceAudioUrl("");
    setVoiceError("");

    if (!selectedFile) return;

    setLoading(true);
    let transcribedText;

    try {
      const result = await transcribeAudio(selectedFile);
      transcribedText = result.transcription?.trim();
      if (!transcribedText) throw new Error("No speech was detected in the audio file.");
      setTranscription(transcribedText);
    } catch (caught) {
      setError(caught.message);
      return;
    } finally {
      setLoading(false);
    }

    setAiLoading(true);
    let responseText;
    try {
      const result = await generateAIResponse(transcribedText);
      responseText = result.response?.trim();
      if (!responseText) throw new Error("The local AI returned an empty response.");
      setAiResponse(responseText);
    } catch (caught) {
      setAiError(caught.message);
      return;
    } finally {
      setAiLoading(false);
    }

    setVoiceLoading(true);
    try {
      const audio = await generateSpeech(responseText);
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
              <span className={`status ${loading || aiLoading || voiceLoading ? "processing" : error || aiError || voiceError ? "error" : voiceAudioUrl ? "complete" : "ready"}`}>
                {loading || aiLoading || voiceLoading ? "Processing" : error || aiError || voiceError ? "Error" : voiceAudioUrl ? "Complete" : "Ready"}
              </span>
            </div>

            <div className="transcription-form">
              <label htmlFor="audio" className="file-label">Choose a recording</label>
              <input
                id="audio"
                name="audio"
                type="file"
                accept=".wav,.mp3,.m4a,.ogg,.flac,.webm,audio/*"
                onChange={handleFileChange}
                disabled={loading || aiLoading || voiceLoading}
              />
              <p className="file-hint">WAV, MP3, M4A, OGG, FLAC, or WebM. Max 10 MB. Processing starts when you choose a file.</p>

              <div className="file-details" aria-live="polite">
                <div><span>Name</span><strong>{file?.name || "No file selected"}</strong></div>
                <div><span>Type</span><strong>{file?.type || "Not available"}</strong></div>
                <div><span>Size</span><strong>{file ? formatFileSize(file.size) : "Not available"}</strong></div>
              </div>

              <div className="player-group">
                <span className="field-label">Preview</span>
                <audio controls src={audioUrl || undefined} aria-label="Selected audio preview" />
              </div>

            </div>
          </section>

          <div className="output-sections">
            <section className="output-section" aria-labelledby="transcription-heading" aria-live="polite">
              <div className="section-heading">
                <div>
                  <p className="section-kicker">Step 02</p>
                  <h2 id="transcription-heading">Speech-to-Text</h2>
                </div>
                <span className={`status ${loading ? "processing" : error ? "error" : transcription ? "complete" : "ready"}`}>
                  {loading ? "Processing" : error ? "Error" : transcription ? "Complete" : "Ready"}
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
                <span className={`status ${aiLoading ? "processing" : aiError ? "error" : aiResponse ? "complete" : transcription ? "ready" : "pending"}`}>
                  {aiLoading ? "Processing" : aiError ? "Error" : aiResponse ? "Complete" : transcription ? "Ready" : "Pending"}
                </span>
              </div>
              {aiError ? <p className="error-message" role="alert">{aiError}</p> : null}
              <p className={aiResponse ? "transcription-text" : "empty-state"}>
                {aiLoading ? "Generating response..." : aiResponse || "Waiting for AI processing..."}
              </p>
            </section>

            <section className="output-section" aria-labelledby="voice-heading">
              <div className="section-heading">
                <div>
                  <p className="section-kicker">Step 04</p>
                  <h2 id="voice-heading">Voice Response</h2>
                </div>
                <span className={`status ${voiceLoading ? "processing" : voiceError ? "error" : voiceAudioUrl ? "complete" : aiResponse ? "ready" : "pending"}`}>
                  {voiceLoading ? "Processing" : voiceError ? "Error" : voiceAudioUrl ? "Complete" : aiResponse ? "Ready" : "Pending"}
                </span>
              </div>
              {voiceError ? <p className="error-message" role="alert">{voiceError}</p> : null}
              <p className="empty-state" aria-live="polite">
                {voiceLoading ? "Generating voice response..." : voiceAudioUrl ? "Voice response ready. Press play if your browser blocks automatic playback." : "No audio response generated yet."}
              </p>
              <div className="player-group output-player">
                <audio ref={voicePlayerRef} controls src={voiceAudioUrl || undefined} aria-label="Voice response playback" />
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}


