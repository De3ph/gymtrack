# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM golang:1.25-alpine AS builder
WORKDIR /src

# Cache module downloads
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build all binaries
COPY . .

# The one-shot commands (migrate, db-roles, create-admin, seed) ship in the same
# image as the server so a deploy platform can override the start command
# instead of needing a separate image per job.
ENV CGO_ENABLED=0 GOOS=linux GOARCH=amd64
RUN go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server && \
    go build -trimpath -ldflags="-s -w" -o /out/migrate ./cmd/migrate && \
    go build -trimpath -ldflags="-s -w" -o /out/db-roles ./cmd/db-roles && \
    go build -trimpath -ldflags="-s -w" -o /out/create-admin ./cmd/create-admin && \
    go build -trimpath -ldflags="-s -w" -o /out/seed ./cmd/seed

# ---- Runtime stage ----
FROM alpine:3.21 AS runtime
RUN apk add --no-cache ca-certificates tzdata wget && \
    addgroup -S -g 10001 gymtrack && \
    adduser -S -u 10001 -G gymtrack gymtrack
WORKDIR /app
COPY --from=builder /out/server /app/server
COPY --from=builder /out/migrate /app/migrate
COPY --from=builder /out/db-roles /app/db-roles
COPY --from=builder /out/create-admin /app/create-admin
COPY --from=builder /out/seed /app/seed

ENV GIN_MODE=release

USER gymtrack:gymtrack
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:${PORT:-8080}/readyz || exit 1

CMD ["/app/server"]