# 3CX AI Voice Agent POC

This phase runs a local voice pipeline: audio upload → Speaches speech-to-text → LM Studio Qwen response → Speaches text-to-speech → browser audio playback. The Next.js frontend and Express backend run separately.

## Local services

Start Speaches at `http://127.0.0.1:8000` and LM Studio at `http://127.0.0.1:1235/v1`. The backend reads these settings from its ignored `.env` file:

```env
PORT=3001
LM_STUDIO_BASE_URL=http://127.0.0.1:1235/v1
LM_STUDIO_MODEL=qwen3.5-4b-3d-coder
LM_STUDIO_SYSTEM_PROMPT=You are a helpful voice assistant. Respond naturally and concisely in conversational language. Avoid markdown and lists unless needed.
SPEACHES_BASE_URL=http://127.0.0.1:8000
SPEACHES_STT_MODEL=Systran/faster-whisper-tiny.en
SPEACHES_TTS_MODEL=speaches-ai/piper-en_US-amy-low
SPEACHES_TTS_VOICE=amy
```

The two Speaches models are small English language models suitable for the development laptop. Download them once through the Speaches model API if they are missing:

```powershell
Invoke-WebRequest -Method Post http://127.0.0.1:8000/v1/models/Systran/faster-whisper-tiny.en
Invoke-WebRequest -Method Post http://127.0.0.1:8000/v1/models/speaches-ai/piper-en_US-amy-low
```

Verify installation with `http://127.0.0.1:8000/v1/models`. If LM Studio cannot load Qwen on this machine, run:

```powershell
lms load qwen3.5-4b-3d-coder --gpu off --context-length 2048 --no-speculative-draft-mtp
```

## Backend

```powershell
cd backend
npm install
npm run dev
```

Express listens on port 3001. `POST /api/audio/transcribe` accepts multipart audio; `POST /api/ai/chat` accepts `{ "text": "..." }` and returns `{ "response": "..." }`; `POST /api/tts/synthesize` accepts `{ "text": "..." }` and returns WAV audio. The backend keeps all model URLs private to the server and does not save uploaded audio.

## Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. Choose a WAV, MP3, M4A, OGG, FLAC, or WebM file up to 10 MB and click **Transcribe Audio**. After the transcription appears, click **Generate AI Response**. The response text appears while speech is generated automatically; play the result in the Voice Response section. If speech generation fails, use **Generate Voice Response** to retry.

The frontend uses one Axios client and Next.js proxies `/api` requests to Express. Set `BACKEND_URL` on the frontend only if Express runs somewhere other than port 3001. 3CX and live streaming are future phases.