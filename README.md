# 🚀 Neon PostgreSQL to Google Drive Backup Automator

Automate daily (or scheduled) backups of your **Neon PostgreSQL** database directly from your local machine, VPS, Docker container, or GitHub Actions into **Google Drive** with automated retention pruning and Discord/Slack alerts.

---

## 📋 Table of Contents
1. [Prerequisites](#-prerequisites)
2. [Quick Start (3 Minutes)](#-quick-start)
3. [Setting Up Google Drive Service Account](#-google-drive-setup)
4. [Automation Options](#-automation-options)
   - [Option A: Local Crontab (Linux / macOS)](#option-a-local-crontab)
   - [Option B: GitHub Actions (Free Serverless Cloud Cron)](#option-b-github-actions-recommended)
   - [Option C: Docker Container](#option-c-docker-container)
   - [Option D: Node.js / Systemd Service](#option-d-nodejs-service)
5. [Restoring from Backup](#-restoring-from-backup)
6. [Retention & Cleanup](#-retention--cleanup)
7. [Troubleshooting](#-troubleshooting)

---

## 🛠️ Prerequisites

- **Neon PostgreSQL Account** (Connection string with `sslmode=require`)
- **PostgreSQL Client Tools** on your system:
  - Ubuntu/Debian: `sudo apt-get install postgresql-client`
  - macOS: `brew install libpq && brew link --force libpq`
  - Windows: Install PostgreSQL or run via Docker / WSL
- **Node.js >= 18** (for Google Drive uploader)
- **Google Cloud Console Account** (Free tier)

---

## ⚡ Quick Start

1. **Clone or Extract this Repository**:
   ```bash
   cd neon-to-gdrive-backup
   npm install
   ```

2. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your Neon DATABASE_URL and GDRIVE_FOLDER_ID
   nano .env
   ```

3. **Place your Service Account Key**:
   Save your Google Cloud Service Account JSON file as `service-account-key.json` in this directory.

4. **Test Run Manually**:
   ```bash
   chmod +x backup.sh restore.sh
   ./backup.sh
   ```

---

## 🔑 Google Drive Setup (Service Account)

Follow these 5 simple steps to get headless Google Drive upload authorization:

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g. `Neon-Backups`).
3. Enable the **Google Drive API** under **APIs & Services > Library**.
4. Go to **APIs & Services > Credentials** -> **Create Credentials** -> **Service Account**:
   - Name: `neon-backup-bot`
   - Role: `Project > Editor` (or leave default)
   - Click your created service account -> **Keys** tab -> **Add Key** -> **Create new key** (JSON).
   - Save the downloaded file as `service-account-key.json`.
5. **Share Google Drive Folder**:
   - Go to [Google Drive](https://drive.google.com/).
   - Create a folder named `Neon_DB_Backups`.
   - Right-click the folder -> **Share** -> Add the Service Account email address (`xxx@xxx.iam.gserviceaccount.com`) with **Editor** permissions.
   - Copy the Folder ID from the URL (`drive.google.com/drive/folders/<FOLDER_ID>`) and paste into `.env`.

---

## ⏰ Automation Options

### Option A: Local Crontab
To run on your local machine / server:
```bash
crontab -e
```
Add the following line (configured for `0 2 * * *`):
```cron
0 2 * * * /bin/bash -c "cd $(pwd) && ./backup.sh >> ./backups/cron.log 2>&1"
```

### Option B: GitHub Actions (Recommended if your local PC is turned off)
You don't even need to leave your computer running! GitHub Actions can run the cron job on GitHub's cloud runners for free:
1. Push this repository to a private GitHub repository.
2. Go to **Settings > Secrets and variables > Actions > New repository secret**:
   - `NEON_DATABASE_URL`: Your Neon connection string
   - `GDRIVE_FOLDER_ID`: Your Google Drive folder ID
   - `GCP_SERVICE_ACCOUNT_KEY`: Full JSON content of `service-account-key.json`
   - `ALERT_WEBHOOK_URL`: (Optional) Discord/Slack webhook URL
3. The workflow in `.github/workflows/neon-backup-drive.yml` will run automatically every day at `0 2 * * *`!

### Option D: Vercel Web Dashboard & Deployment
1. **Host this Dashboard UI on Vercel**: Connect your GitHub repository to [Vercel](https://vercel.com). Vercel builds the React frontend in seconds.
2. **Cron Jobs**: Since PostgreSQL dumps require native `pg_dump` binaries and disk buffers, use the included **GitHub Actions** (Option B) for the automated 24/7 cloud cron runs while using Vercel for the web management interface.

---

## 🔄 Restoring from Backup

To restore a backup into a new or existing database:
```bash
./restore.sh ./backups/my-neon-project_TIMESTAMP.dump
```

Or directly with `pg_restore`:
```bash
pg_restore --clean --if-exists --no-owner --no-acl -d "postgresql://user:pass@ep-host.neon.tech/neondb?sslmode=require" ./backups/your_file.dump
```

---

## 🛡️ Retention Policy
- **Local files**: Backups older than `7` days are pruned automatically on each run.
- **Drive files**: Can be pruned automatically or managed via Google Drive retention.

---

## 📞 Support & Verification
To verify backup integrity before storing:
```bash
./verify-backup.sh ./backups/latest.dump
```
