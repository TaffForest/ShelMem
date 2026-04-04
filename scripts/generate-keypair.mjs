/**
 * Generate a new Ed25519 keypair for Shelby/Aptos testnet
 */
import { Ed25519PrivateKey, Ed25519Account } from '@aptos-labs/ts-sdk';

// Generate a random private key
const privateKey = Ed25519PrivateKey.generate();
const account = new Ed25519Account({ privateKey });

console.log('=== New ShelMem Testnet Keypair ===\n');
console.log('Private Key:', `0x${Buffer.from(privateKey.toUint8Array()).toString('hex')}`);
console.log('Address:    ', account.accountAddress.toString());
console.log('\nAdd to your .env:');
console.log(`SHELBY_ACCOUNT_PRIVATE_KEY=0x${Buffer.from(privateKey.toUint8Array()).toString('hex')}`);
