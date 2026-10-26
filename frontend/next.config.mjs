const nextConfig = {
  experimental: {
    proxyTimeout: 130_000,
  },
  async rewrites() {
    return [
      {
        source: "/api/audio/transcribe",
        destination: `${process.env.BACKEND_URL || "http://localhost:3001"}/api/audio/transcribe`,
      },
      {
        source: "/api/ai/chat",
        destination: `${process.env.BACKEND_URL || "http://localhost:3001"}/api/ai/chat`,
      },
      {
        source: "/api/tts/synthesize",
        destination: `${process.env.BACKEND_URL || "http://localhost:3001"}/api/tts/synthesize`,
      },
    ];
  },
};

export default nextConfig;
