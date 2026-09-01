FROM node:20-alpine

# Install postgresql-client, bash, curl, rclone, and supercronic/cron
RUN apk add --no-cache \
    bash \
    curl \
    postgresql-client \
    openssl \
    tzdata

WORKDIR /app

# Copy package manifests and install
COPY package*.json ./
RUN npm install --production

# Copy application scripts
COPY . .
RUN chmod +x backup.sh restore.sh

# Configure timezone
ENV TZ=UTC
RUN cp /usr/share/zoneinfo/${TZ} /etc/localtime && echo "${TZ}" > /etc/timezone

# Create crontab for scheduled execution
RUN echo "0 2 * * * cd /app && /app/backup.sh >> /app/backups/cron.log 2>&1" > /etc/crontabs/root

# Start cron daemon in foreground and log
CMD ["crond", "-f", "-l", "2"]
