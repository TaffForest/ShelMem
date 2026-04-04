import { createHash, createHmac, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { ShelbyNodeClient } from '@shelby-protocol/sdk/node';
import { Network, Ed25519Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export interface ShelbyUploadResult {
  shelbyAddress: string;
  shelbyProof: string;
  contentHash: string;
}

export function computeHash(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

// --- AES-256-GCM encryption ---

function deriveEncryptionKey(privateKey: string): Buffer {
  return createHmac('sha256', 'ShelMem-v1').update(privateKey).digest();
}

function encryptData(plaintext: Uint8Array, key: Buffer): Uint8Array {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: [IV 12B] [AuthTag 16B] [Ciphertext]
  return new Uint8Array(Buffer.concat([iv, authTag, ciphertext]));
}

function decryptData(encrypted: Uint8Array, key: Buffer): Uint8Array {
  const buf = Buffer.from(encrypted);
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return new Uint8Array(Buffer.concat([decipher.update(ciphertext), decipher.final()]));
}

// --- Storage class ---

export class ShelbyStorage {
  private client: ShelbyNodeClient | null = null;
  private account: Ed25519Account | null = null;
  private encryptionKey: Buffer | null = null;
  private readonly mock: boolean;
  private readonly encrypt: boolean;
  private readonly apiKey?: string;
  private readonly privateKey?: string;
  private readonly network: 'testnet' | 'shelbynet';

  constructor(opts: {
    apiKey?: string;
    privateKey?: string;
    network?: 'testnet' | 'shelbynet';
    mock?: boolean;
    encrypt?: boolean;
  }) {
    this.mock = opts.mock ?? (process.env.SHELBY_MOCK !== 'false');
    this.encrypt = opts.encrypt ?? false;
    this.apiKey = opts.apiKey ?? process.env.SHELBY_API_KEY;
    this.privateKey = opts.privateKey ?? process.env.SHELBY_ACCOUNT_PRIVATE_KEY;
    this.network = opts.network ?? (process.env.SHELBY_NETWORK as 'testnet' | 'shelbynet') ?? 'shelbynet';
  }

  private getClient(): ShelbyNodeClient {
    if (!this.client) {
      const network = this.network === 'testnet' ? Network.TESTNET : Network.SHELBYNET;
      this.client = new ShelbyNodeClient({
        network,
        ...(this.apiKey ? { apiKey: this.apiKey } : {}),
      });
    }
    return this.client;
  }

  private getAccount(): Ed25519Account {
    if (!this.account) {
      if (!this.privateKey) {
        throw new Error('aptosPrivateKey is required when mock=false');
      }
      this.account = new Ed25519Account({
        privateKey: new Ed25519PrivateKey(this.privateKey),
      });
    }
    return this.account;
  }

  private getEncryptionKey(): Buffer {
    if (!this.encryptionKey) {
      if (!this.privateKey) {
        throw new Error('aptosPrivateKey is required for encryption');
      }
      this.encryptionKey = deriveEncryptionKey(this.privateKey);
    }
    return this.encryptionKey;
  }

  async upload(data: Uint8Array, blobName: string): Promise<ShelbyUploadResult> {
    // Hash plaintext BEFORE encryption
    const contentHash = computeHash(data);

    if (this.mock) {
      const shelbyAddress = `shelby://${contentHash}`;
      const proofHash = createHash('sha256')
        .update(shelbyAddress + Date.now())
        .digest('hex');
      return { shelbyAddress, shelbyProof: `0x${proofHash}`, contentHash };
    }

    // Encrypt if enabled
    let uploadData = data;
    if (this.encrypt) {
      uploadData = encryptData(data, this.getEncryptionKey());
    }

    const client = this.getClient();
    const account = this.getAccount();
    const expirationMicros = (Date.now() + THIRTY_DAYS_MS) * 1000;

    await client.upload({
      signer: account,
      blobData: uploadData,
      blobName,
      expirationMicros,
    });

    const shelbyAddress = `shelby://${account.accountAddress.toString()}/${blobName}`;
    return { shelbyAddress, shelbyProof: shelbyAddress, contentHash };
  }

  async download(shelbyAddress: string, retries = 1): Promise<Uint8Array> {
    if (this.mock) {
      throw new Error('Download not available in mock mode');
    }

    const client = this.getClient();
    const { accountAddress, blobName } = parseShelbyAddress(shelbyAddress);

    let result = await this.downloadOnce(client, accountAddress, blobName);

    // Retry once after delay if empty (Shelby propagation delay)
    if (result.length === 0 && retries > 0) {
      await new Promise(r => setTimeout(r, 2000));
      result = await this.downloadOnce(client, accountAddress, blobName);
    }

    // Decrypt if enabled
    if (this.encrypt) {
      return decryptData(result, this.getEncryptionKey());
    }

    return result;
  }

  private async downloadOnce(client: ShelbyNodeClient, accountAddress: string, blobName: string): Promise<Uint8Array> {
    const blob = await client.download({ account: accountAddress, blobName });

    const reader = blob.readable.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }
}

function parseShelbyAddress(address: string): { accountAddress: string; blobName: string } {
  const stripped = address.replace('shelby://', '');
  const slashIdx = stripped.indexOf('/');
  if (slashIdx === -1) {
    throw new Error(`Invalid shelby address format: ${address}`);
  }
  return {
    accountAddress: stripped.slice(0, slashIdx),
    blobName: stripped.slice(slashIdx + 1),
  };
}
