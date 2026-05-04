import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as tus from 'tus-js-client';

const TOKEN = process.env.HOSTINGER_API_TOKEN;
const DOMAIN = 'pink-albatross-667205.hostingersite.com';
const BASE_URL = 'https://developers.hostinger.com';

if (!TOKEN) throw new Error('HOSTINGER_API_TOKEN is not set');

const archivePath = process.argv[2];
if (!archivePath) throw new Error('Usage: node deploy-hostinger.mjs <archive.zip>');
if (!fs.existsSync(archivePath)) throw new Error(`File not found: ${archivePath}`);

// 1. Get username
const sitesRes = await fetch(`${BASE_URL}/api/hosting/v1/websites?domain=${DOMAIN}`, {
  headers: { Authorization: `Bearer ${TOKEN}` }
});
const sitesData = await sitesRes.json();
const username = sitesData.data[0].username;
console.log('Username:', username);

// 2. Get upload credentials
const credsRes = await fetch(`${BASE_URL}/api/hosting/v1/files/upload-urls`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, domain: DOMAIN })
});
const creds = await credsRes.json();
const { url: uploadUrl, auth_key: authKey, rest_auth_key: restAuthKey } = creds;
console.log('Got upload credentials');

// 3. Upload via TUS
const filename = path.basename(archivePath);
const uploadUrlWithFile = `${uploadUrl.replace(/\/$/, '')}/${filename}?override=true`;
const stats = fs.statSync(archivePath);
const requestHeaders = {
  'X-Auth': authKey,
  'X-Auth-Rest': restAuthKey,
  'upload-length': String(stats.size),
  'upload-offset': '0'
};

// Pre-upload POST
const preRes = await fetch(uploadUrlWithFile, {
  method: 'POST',
  headers: requestHeaders,
});
if (preRes.status !== 201) {
  throw new Error(`Pre-upload failed: ${preRes.status} ${await preRes.text()}`);
}
console.log('Pre-upload OK');

// TUS upload
await new Promise((resolve, reject) => {
  const fileStream = fs.createReadStream(archivePath);
  const upload = new tus.Upload(fileStream, {
    uploadUrl: uploadUrlWithFile,
    retryDelays: [1000, 2000, 4000],
    uploadDataDuringCreation: false,
    chunkSize: 10485760,
    headers: requestHeaders,
    uploadSize: stats.size,
    metadata: { filename },
    onError: (err) => reject(new Error(`Upload error: ${err.message}`)),
    onSuccess: () => { console.log('Upload complete'); resolve(); }
  });
  upload.start();
});

// 4. Trigger deploy
const deployRes = await fetch(`${BASE_URL}/api/hosting/v1/accounts/${username}/websites/${DOMAIN}/deploy`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ archive_path: filename })
});
const deployData = await deployRes.json();
console.log('Deploy triggered:', JSON.stringify(deployData));
