import { createHash } from 'crypto';
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

export class ShelbyStorage {
  private client: ShelbyNodeClient | null = null;
  private account: Ed25519Account | null = null;
  private readonly mock: boolean;
  private readonly apiKey?: string;
  private readonly privateKey?: string;
  private readonly network: 'testnet' | 'shelbynet';

  constructor(opts: {
    apiKey?: string;
    privateKey?: string;
    network?: 'testnet' | 'shelbynet';
    mock?: boolean;
  }) {
    this.mock = opts.mock ?? (process.env.SHELBY_MOCK !== 'false');
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

  async upload(data: Uint8Array, blobName: string): Promise<ShelbyUploadResult> {
    if (this.mock) {
      const contentHash = computeHash(data);
      const shelbyAddress = `shelby://${contentHash}`;
      const proofHash = createHash('sha256')
        .update(shelbyAddress + Date.now())
        .digest('hex');
      return { shelbyAddress, shelbyProof: `0x${proofHash}`, contentHash };
    }

    const contentHash = computeHash(data);
    const client = this.getClient();
    const account = this.getAccount();

    const expirationMicros = (Date.now() + THIRTY_DAYS_MS) * 1000;

    await client.upload({
      signer: account,
      blobData: data,
      blobName,
      expirationMicros,
    });

    const shelbyAddress = `shelby://${account.accountAddress.toString()}/${blobName}`;
    return { shelbyAddress, shelbyProof: shelbyAddress, contentHash };
  }

  async download(shelbyAddress: string): Promise<Uint8Array> {
    if (this.mock) {
      throw new Error('Download not available in mock mode');
    }

    const client = this.getClient();
    const { accountAddress, blobName } = parseShelbyAddress(shelbyAddress);

    const blob = await client.download({ account: accountAddress, blobName });

    const reader = blob.readable.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    // Concatenate chunks
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
