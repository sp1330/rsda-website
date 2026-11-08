FROM alpine:3.19

# Pin PocketBase version for reproducible builds
ARG PB_VERSION=0.23.4

RUN apk add --no-cache ca-certificates wget unzip

# Download and install PocketBase binary
RUN wget -q \
    "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" \
    -O /tmp/pb.zip \
    && unzip -q /tmp/pb.zip -d /pb/ \
    && rm /tmp/pb.zip \
    && chmod +x /pb/pocketbase

# Copy hooks and migrations into the image
# pb_data (database + uploads) must be on a mounted Railway volume at /pb/pb_data
COPY pb_migrations/ /pb/pb_migrations/
COPY pb_hooks/     /pb/pb_hooks/

EXPOSE 8090

# --dir        = where SQLite db and uploads live (must be the Railway volume mount path)
# --hooksDir   = JS hooks directory
# --migrationsDir = migrations directory (auto-run on startup)
# Create superuser from env vars on every start (upsert = create or update)
# Set PB_SUPERUSER_EMAIL and PB_SUPERUSER_PASSWORD in Railway Variables
CMD ["/bin/sh", "-c", \
     "/pb/pocketbase superuser upsert \"$PB_SUPERUSER_EMAIL\" \"$PB_SUPERUSER_PASSWORD\" --dir=/pb/pb_data 2>/dev/null; \
      /pb/pocketbase serve --http=0.0.0.0:8090 --dir=/pb/pb_data --hooksDir=/pb/pb_hooks --migrationsDir=/pb/pb_migrations"]
