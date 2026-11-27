FROM golang:1.25-bookworm AS gno-builder
ENV GOTOOLCHAIN=auto
RUN git clone --depth 1 --branch v1.8.0-rc.1 https://github.com/gnolang/gno.git /tmp/gno \
    && cd /tmp/gno/gno.land \
    && go build -o /usr/local/bin/gnokey ./cmd/gnokey

FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=gno-builder /usr/local/bin/gnokey /usr/local/bin/gnokey
WORKDIR /app
COPY relayer/server.js /app/server.js
COPY relayer/entrypoint.sh /app/entrypoint.sh
RUN sed -i 's/\r$//' /app/entrypoint.sh && chmod +x /app/entrypoint.sh
ENV HOST=0.0.0.0
ENV PORT=8787
ENV GNOKEY_BIN=/usr/local/bin/gnokey
ENV VEIL_RELAYER_KEY=veil-relayer
ENV VEIL_RELAYER_STATE_FILE=/data/relayer_state.json
EXPOSE 8787
ENTRYPOINT ["/app/entrypoint.sh"]
