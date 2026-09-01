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
    scopes: ['https://www.googleapis.com/auth/drive']
  });

  const drive = google.drive({ version: 'v3', auth });

  console.log(`[uploader] Uploading ${filename} to Google Drive (Folder ID: ${targetFolderId || 'Root'})...`);

  const media = {
    mimeType: 'application/octet-stream',
    body: fs.createReadStream(filePath)
  };

  try {
    const response = await drive.files.create({
      requestBody: {
        name: filename,
        parents: targetFolderId ? [targetFolderId] : []
      },
      media: media,
      supportsAllDrives: true,
      fields: 'id, name, webViewLink, size'
    });

    console.log(`[uploader] ✓ Successfully uploaded to Google Drive! File ID: ${response.data.id}`);
    if (response.data.webViewLink) {
      console.log(`[uploader] Link: ${response.data.webViewLink}`);
    }

    return response.data;
  } catch (err) {
    if (err.message && err.message.includes('File not found')) {
      console.error(`\n[uploader] ❌ Google Drive Error: Folder ID "${targetFolderId}" was not found or is inaccessible.`);
      console.error(`👉 Solution: Share your Google Drive folder with the Service Account email:`);
      try {
        const keyData = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
        if (keyData.client_email) {
          console.error(`   Email: ${keyData.client_email}`);
        }
      } catch (e) {}
      console.error(`   Give it "Editor" permissions in Google Drive.\n`);
    }
    throw err;
  }
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
