"use client";

import { useEffect, useRef, useState } from "react";
import { transcribeAudio } from "@/services/audio.service";
import { generateAIResponse } from "@/services/ai.service";
import { generateSpeech } from "@/services/tts.service";
import { listSavedInteractions, saveInteraction, savedAudioUrl } from "@/services/interaction.service";

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
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedInteraction, setSavedInteraction] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [playbackError, setPlaybackError] = useState("");
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

  useEffect(() => {
    let active = true;
    listSavedInteractions()
      .then((interactions) => {
        if (active) setHistory(interactions);
      })
      .catch((caught) => {
        if (active) setHistoryError(caught.message);
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => { active = false; };
  }, []);

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
    setSaveError("");
    setSavedInteraction(null);

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
    let responseAudio;
    try {
      responseAudio = await generateSpeech(responseText);
      setVoiceAudioUrl(URL.createObjectURL(responseAudio));
    } catch (caught) {
      setVoiceError(caught.message);
      return;
    } finally {
      setVoiceLoading(false);
    }

    setSaving(true);
    try {
      const saved = await saveInteraction(selectedFile, transcribedText, responseText, responseAudio);
      setSavedInteraction(saved);
      try {
        setHistory(await listSavedInteractions());
        setHistoryError("");
      } catch (caught) {
        setHistoryError(caught.message);
      }
    } catch (caught) {
      setSaveError(caught.message);
    } finally {
      setSaving(false);
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
              <span className={`status ${loading || aiLoading || voiceLoading || saving ? "processing" : error || aiError || voiceError || saveError ? "error" : savedInteraction ? "complete" : "ready"}`}>
                {loading || aiLoading || voiceLoading || saving ? "Processing" : error || aiError || voiceError || saveError ? "Error" : savedInteraction ? "Complete" : "Ready"}
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
                disabled={loading || aiLoading || voiceLoading || saving}
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
              {saving ? <p className="empty-state" aria-live="polite">Saving the completed interaction...</p> : null}
              {savedInteraction ? <p className="save-success" aria-live="polite">Interaction saved for review.</p> : null}
              {saveError ? <p className="error-message" role="alert">Audio is ready, but saving failed: {saveError}</p> : null}
            </section>
          </div>
        </div>

        <section className="history-section" aria-labelledby="history-heading">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Saved recordings</p>
              <h2 id="history-heading">Recent interactions</h2>
            </div>
            <span className="status ready">Latest 20</span>
          </div>
          {historyError ? <p className="error-message" role="alert">Could not load saved interactions: {historyError}</p> : null}
          {historyLoading ? <p className="empty-state">Loading saved interactions...</p> : null}
          {!historyLoading && !historyError && history.length === 0 ? <p className="empty-state">No saved interactions yet.</p> : null}
          {playbackError ? <p className="error-message" role="alert">{playbackError}</p> : null}
          <div className="history-list">
            {history.map((item) => (
              <article className="history-item" key={item.id}>
                <div className="history-item-heading">
                  <strong>{item.inputFileName}</strong>
                  <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>
                </div>
                <p><span>Caller:</span> {item.transcription}</p>
                <p><span>AI:</span> {item.aiResponseText}</p>
                <div className="history-players">
                  <div>
                    <span className="field-label">Original audio</span>
                    <audio controls preload="none" src={savedAudioUrl(item.id, "input")}
                      aria-label={`Original audio for ${item.inputFileName}`}
                      onError={() => setPlaybackError("Could not play a saved recording. Check that the backend and database are running.")}
                      onPlay={() => setPlaybackError("")} />
                  </div>
                  <div>
                    <span className="field-label">AI response audio</span>
                    <audio controls preload="none" src={savedAudioUrl(item.id, "response")}
                      aria-label={`AI response audio for ${item.inputFileName}`}
                      onError={() => setPlaybackError("Could not play a saved recording. Check that the backend and database are running.")}
                      onPlay={() => setPlaybackError("")} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}


