import fs from 'fs';
import path from 'path';
import { Upload } from 'tus-js-client';

const TOKEN = process.env.HOSTINGER_API_TOKEN;
const DOMAIN = 'pink-albatross-667205.hostingersite.com';
const BASE_URL = 'https://developers.hostinger.com';

if (!TOKEN) throw new Error('HOSTINGER_API_TOKEN secret is not set in GitHub repository settings');

const archivePath = process.argv[2];
if (!archivePath) throw new Error('Usage: node scripts/deploy-hostinger.mjs <archive.zip>');
if (!fs.existsSync(archivePath)) throw new Error(`Archive not found: ${archivePath}`);

async function apiFetch(label, url, options = {}) {
  console.log(`→ ${label}: ${options.method ?? 'GET'} ${url}`);
  const res = await fetch(url, options);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${label} failed (${res.status}): ${text}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// 1. Get hosting account username
const sitesData = await apiFetch('Get websites', `${BASE_URL}/api/hosting/v1/websites?domain=${DOMAIN}`, {
  headers: { Authorization: `Bearer ${TOKEN}` },
});

const username = sitesData?.data?.[0]?.username;
if (!username) throw new Error(`Could not find username in response: ${JSON.stringify(sitesData)}`);
console.log('Username:', username);

// 2. Get upload credentials
const creds = await apiFetch('Get upload credentials', `${BASE_URL}/api/hosting/v1/files/upload-urls`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, domain: DOMAIN }),
});

const { url: uploadUrl, auth_key: authKey, rest_auth_key: restAuthKey } = creds;
if (!uploadUrl || !authKey) throw new Error(`Invalid credentials response: ${JSON.stringify(creds)}`);
console.log('Got upload credentials');

// 3. Upload archive via TUS protocol
const filename = path.basename(archivePath);
const uploadUrlWithFile = `${uploadUrl.replace(/\/$/, '')}/${filename}?override=true`;
const stats = fs.statSync(archivePath);
const headers = {
  'X-Auth': authKey,
  'X-Auth-Rest': restAuthKey,
  'upload-length': String(stats.size),
  'upload-offset': '0',
};

// Create upload slot
const preRes = await fetch(uploadUrlWithFile, { method: 'POST', headers });
if (preRes.status !== 201) {
  throw new Error(`Pre-upload failed (${preRes.status}): ${await preRes.text()}`);
}
console.log('Upload slot created');

// Stream file via TUS
await new Promise((resolve, reject) => {
  const upload = new Upload(fs.createReadStream(archivePath), {
    uploadUrl: uploadUrlWithFile,
    uploadSize: stats.size,
    headers,
    metadata: { filename },
    chunkSize: 10 * 1024 * 1024, // 10 MB
    retryDelays: [1000, 2000, 4000],
    uploadDataDuringCreation: false,
    onError: (err) => reject(new Error(`TUS upload error: ${err.message}`)),
    onProgress: (sent, total) => {
      const pct = Math.round((sent / total) * 100);
      process.stdout.write(`\rUploading... ${pct}%`);
    },
    onSuccess: () => { console.log('\nUpload complete'); resolve(); },
  });
  upload.start();
});

// 4. Trigger deploy
const deployData = await apiFetch(
  'Trigger deploy',
  `${BASE_URL}/api/hosting/v1/accounts/${username}/websites/${DOMAIN}/deploy`,
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ archive_path: filename }),
  }
);

console.log('Deploy triggered:', JSON.stringify(deployData));
console.log('Done!');
