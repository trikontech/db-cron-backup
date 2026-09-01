/**
 * Standalone Google Drive Uploader CLI & Module
 * Usage: node uploader.js <filePath> [folderId] [serviceAccountKeyFile]
 */
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

export async function uploadToGoogleDrive(filePath, folderId, serviceAccountKeyFile) {
  const targetFolderId = folderId || process.env.GDRIVE_FOLDER_ID;
  const keyFile = serviceAccountKeyFile || process.env.SERVICE_ACCOUNT_KEY_FILE || './service-account-key.json';

  if (!filePath) {
    throw new Error('File path is required for Google Drive upload.');
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`Backup file does not exist at ${filePath}`);
  }

  if (!fs.existsSync(keyFile)) {
    throw new Error(`Service account key file not found at ${keyFile}`);
  }

  const filename = path.basename(filePath);
  
  const auth = new google.auth.GoogleAuth({
    keyFile: keyFile,
    scopes: ['https://www.googleapis.com/auth/drive.file']
  });

  const drive = google.drive({ version: 'v3', auth });

  console.log(`[uploader] Uploading ${filename} to Google Drive (Folder ID: ${targetFolderId || 'Root'})...`);

  const media = {
    mimeType: 'application/octet-stream',
    body: fs.createReadStream(filePath)
  };

  const response = await drive.files.create({
    requestBody: {
      name: filename,
      parents: targetFolderId ? [targetFolderId] : []
    },
    media: media,
    fields: 'id, name, webViewLink, size'
  });

  console.log(`[uploader] ✓ Successfully uploaded to Google Drive! File ID: ${response.data.id}`);
  if (response.data.webViewLink) {
    console.log(`[uploader] Link: ${response.data.webViewLink}`);
  }

  return response.data;
}

// Run as CLI if invoked directly
if (process.argv[1] && (process.argv[1].endsWith('uploader.js') || process.argv[1].endsWith('uploader'))) {
  const filePath = process.argv[2];
  const folderId = process.argv[3];
  const keyFile = process.argv[4];

  uploadToGoogleDrive(filePath, folderId, keyFile).catch((err) => {
    console.error('[uploader] ❌ Google Drive upload failed:', err.message);
    process.exit(1);
  });
}
