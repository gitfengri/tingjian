# syntax=docker/dockerfile:1
# Production image for 听见 · AI 智能听写.
# Runtime contains Node.js, FFmpeg and a Python venv with edge-tts.
FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    BIND_HOST=0.0.0.0 \
    EDGE_TTS_PYTHON=/opt/edge/bin/python \
    FFMPEG_PATH=/usr/bin/ffmpeg
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 python3-venv ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY services/edge/requirements.txt /tmp/edge-requirements.txt
RUN python3 -m venv /opt/edge \
    && /opt/edge/bin/pip install --no-cache-dir -r /tmp/edge-requirements.txt \
    && rm -rf /root/.cache
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/scripts ./scripts
COPY --from=build --chown=node:node /app/services/edge/synthesize.py ./services/edge/synthesize.py
RUN mkdir -p .local && chown node:node .local && chmod 700 .local
USER node
EXPOSE 3000
# With APP_ACCESS_TOKEN set, /api/health requires the bearer token.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD node -e "const h=process.env.APP_ACCESS_TOKEN?{authorization:'Bearer '+process.env.APP_ACCESS_TOKEN}:{};fetch('http://127.0.0.1:3000/api/health',{headers:h}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npm", "start"]
