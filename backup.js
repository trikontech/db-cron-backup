/**
 * Neon DB to Google Drive Automated Backup Daemon & CLI
 * Uses pg_dump + googleapis service account
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_secret123@ep-cool-fog-123456.us-east-2.aws.neon.tech/neondb?sslmode=require';
const GDRIVE_FOLDER_ID = process.env.GDRIVE_FOLDER_ID || '1AbCdEfGhIjKlMnOpQrStUvWxYz12345';
const LOCAL_BACKUP_DIR = process.env.LOCAL_BACKUP_DIR || './backups';
const RETENTION_DAYS_LOCAL = parseInt(process.env.RETENTION_DAYS_LOCAL || '7', 10);
const SERVICE_ACCOUNT_KEY_FILE = process.env.SERVICE_ACCOUNT_KEY_FILE || './service-account-key.json';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://discord.com/api/webhooks/123456789/abcdefghijk';

async function sendAlert(title, message) {
  if (!WEBHOOK_URL) return;
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `**${title}**\n${message}\n*Timestamp:* ${new Date().toISOString()}`
      })
    });
  } catch (err) {
    console.error('Failed to send webhook notification:', err.message);
  }
}

async function uploadToGoogleDrive(filePath, filename) {
  if (!fs.existsSync(SERVICE_ACCOUNT_KEY_FILE)) {
    throw new Error(`Service account key file not found at ${SERVICE_ACCOUNT_KEY_FILE}. Please follow README to generate it.`);
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_KEY_FILE,
    scopes: ['https://www.googleapis.com/auth/drive.file']
  });

  const drive = google.drive({ version: 'v3', auth });

  console.log(`[GDRIVE] Uploading ${filename} to Google Drive folder: ${GDRIVE_FOLDER_ID}...`);

  const media = {
    mimeType: 'application/octet-stream',
    body: fs.createReadStream(filePath)
  };

  const response = await drive.files.create({
    requestBody: {
      name: filename,
      parents: GDRIVE_FOLDER_ID ? [GDRIVE_FOLDER_ID] : []
    },
    media: media,
    fields: 'id, name, webViewLink, size'
  });

  console.log(`[GDRIVE] ✓ Upload complete! File ID: ${response.data.id}`);
  return response.data;
}

export async function runBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `my-neon-project_${timestamp}.dump`;
  
  if (!fs.existsSync(LOCAL_BACKUP_DIR)) {
    fs.mkdirSync(LOCAL_BACKUP_DIR, { recursive: true });
  }

  const localFilePath = path.join(LOCAL_BACKUP_DIR, filename);

  console.log(`\n[BACKUP] Starting backup for Neon DB: ${new Date().toISOString()}`);
  const startTime = Date.now();

  try {
    console.log('[PG_DUMP] Running pg_dump...');
    execSync(`pg_dump "${DATABASE_URL}" -Fc --no-owner --no-acl -f "${localFilePath}"`, { stdio: 'inherit' });

    const stats = fs.statSync(localFilePath);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`[PG_DUMP] ✓ Local dump completed: ${filename} (${sizeMb} MB in ${duration}s)`);

    // Upload to Google Drive
    const driveFile = await uploadToGoogleDrive(localFilePath, filename);

    // Retention Cleanup
    console.log(`[CLEANUP] Pruning local backups older than ${RETENTION_DAYS_LOCAL} days...`);
    const files = fs.readdirSync(LOCAL_BACKUP_DIR);
    const now = Date.now();
    const cutoff = RETENTION_DAYS_LOCAL * 24 * 60 * 60 * 1000;

    for (const f of files) {
      const full = path.join(LOCAL_BACKUP_DIR, f);
      const s = fs.statSync(full);
      if (now - s.mtimeMs > cutoff && (f.endsWith('.dump') || f.endsWith('.sql') || f.endsWith('.sql.gz'))) {
        fs.unlinkSync(full);
        console.log(`[CLEANUP] Deleted old backup: ${f}`);
      }
    }

    

    console.log('[BACKUP] ✓ Entire backup pipeline completed successfully!\n');
    return { success: true, filename, sizeMb, driveFile };
  } catch (error) {
    console.error('[ERROR] Backup pipeline failed:', error.message);
    await sendAlert('🚨 Neon DB Backup Failed', `Error: ${error.message}`);
    throw error;
  }
}

// Run immediately if called directly
if (process.argv[1] && process.argv[1].endsWith('backup.js')) {
  runBackup().catch(() => process.exit(1));
}
