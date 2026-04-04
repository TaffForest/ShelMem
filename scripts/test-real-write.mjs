/**
 * ShelMem Real Testnet Write — stores a memory on actual Shelby network
 * Run: node scripts/test-real-write.mjs
 */

import 'dotenv/config';
import { ShelbyNodeClient } from '@shelby-protocol/sdk/node';
import { Network, Ed25519Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';
import { createHash } from 'crypto';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Setup
const privateKey = process.env.SHELBY_ACCOUNT_PRIVATE_KEY;
const apiKey = process.env.SHELBY_API_KEY;

if (!privateKey) {
  console.error('SHELBY_ACCOUNT_PRIVATE_KEY is required');
  process.exit(1);
}

console.log('=== ShelMem Real Testnet Write ===\n');

// Create client and account
const client = new ShelbyNodeClient({
  network: Network.TESTNET,
  ...(apiKey ? { apiKey } : {}),
});

const account = new Ed25519Account({
  privateKey: new Ed25519PrivateKey(privateKey),
});

console.log('Account:', account.accountAddress.toString());
console.log('Network: testnet');
console.log();

// Prepare memory content
const memory = 'ShelMem first real testnet write. Timestamp: ' + new Date().toISOString();
const bytes = new TextEncoder().encode(memory);
const contentHash = createHash('sha256').update(bytes).digest('hex');
const blobName = `shelmem_test_${Date.now()}`;

console.log('Memory:', memory);
console.log('SHA-256:', contentHash);
console.log('Blob name:', blobName);
console.log();

// Upload to Shelby
console.log('Uploading to Shelby testnet...');
try {
  const expirationMicros = (Date.now() + THIRTY_DAYS_MS) * 1000;

  await client.upload({
    signer: account,
    blobData: bytes,
    blobName,
    expirationMicros,
  });

  const shelbyAddress = `shelby://${account.accountAddress.toString()}/${blobName}`;
  console.log('✓ Upload success!');
  console.log('  Shelby address:', shelbyAddress);
  console.log();

  // Verify by downloading
  console.log('Downloading from Shelby to verify...');
  const blob = await client.download({
    account: account.accountAddress.toString(),
    blobName,
  });

  const reader = blob.readable.getReader();
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const downloaded = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    downloaded.set(chunk, offset);
    offset += chunk.length;
  }

  const downloadedText = new TextDecoder().decode(downloaded);
  const downloadedHash = createHash('sha256').update(downloaded).digest('hex');

  console.log('✓ Download success!');
  console.log('  Content:', downloadedText);
  console.log('  SHA-256:', downloadedHash);
  console.log('  Verified:', contentHash === downloadedHash ? '✓ MATCH' : '✗ MISMATCH');
  console.log();

  // List blobs to see it on the network
  console.log('Listing account blobs...');
  const blobs = await client.coordination.getAccountBlobs({
    account: account.accountAddress,
  });
  console.log(`✓ Found ${(blobs || []).length} blob(s) on account`);
  for (const b of (blobs || [])) {
    console.log(`  - ${b.blobNameSuffix}`);
  }

  console.log('\n=== REAL SHELBY TESTNET WRITE CONFIRMED ===');

} catch (err) {
  console.error('✗ Upload failed:', err.message);
  console.error();
  console.error('Full error:', err);
  process.exit(1);
}
