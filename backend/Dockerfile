# Build from the repository root:  docker build -f backend/Dockerfile .
FROM node:20-bookworm-slim

ARG INSTALL_WHISPERX=false

# ffmpeg + yt-dlp for audio, Chrome Headless Shell dependencies for Remotion
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg python3 python3-pip ca-certificates \
      libnss3 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libgbm1 libasound2 libxrandr2 \
      libxkbcommon0 libxfixes3 libxcomposite1 libxdamage1 libpango-1.0-0 libcairo2 libcups2 fonts-liberation fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/* \
    && pip3 install --no-cache-dir --break-system-packages yt-dlp \
    && if [ "$INSTALL_WHISPERX" = "true" ]; then \
         pip3 install --no-cache-dir --break-system-packages torch torchaudio --index-url https://download.pytorch.org/whl/cpu && \
         pip3 install --no-cache-dir --break-system-packages whisperx; \
       fi

WORKDIR /app

COPY remotion/package*.json remotion/
RUN cd remotion && npm ci --no-audit --no-fund
COPY backend/package*.json backend/
RUN cd backend && npm ci --no-audit --no-fund

COPY remotion remotion
COPY backend backend
RUN cd backend && npm run build && npm prune --omit=dev \
    && cd ../remotion && npx remotion browser ensure

ENV NODE_ENV=production \
    PORT=3001 \
    UPLOAD_DIR=/app/data/uploads \
    RENDER_DIR=/app/data/renders \
    TEMP_DIR=/app/data/temp

EXPOSE 3001
CMD ["node", "backend/dist/index.js"]
