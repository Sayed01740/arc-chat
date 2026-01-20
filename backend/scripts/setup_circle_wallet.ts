import axios from 'axios';
import { publicEncrypt, constants } from 'crypto';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars from root
const envPath = path.resolve(__dirname, '../../.env');
console.log(`Loading .env from: ${envPath}`);
const result = dotenv.config({ path: envPath });
if (result.error) {
    console.error("Error loading .env file:", result.error);
}
console.log("CIRCLE_API_KEY length:", process.env.CIRCLE_API_KEY ? process.env.CIRCLE_API_KEY.length : "undefined");
console.log("ENTITY_SECRET length:", process.env.ENTITY_SECRET ? process.env.ENTITY_SECRET.length : "undefined");

const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY;
const ENTITY_SECRET = process.env.ENTITY_SECRET; // This should be the 32-byte hex string
const BASE_URL = 'https://api.circle.com/v1/w3s';

if (!CIRCLE_API_KEY || !ENTITY_SECRET) {
    console.error('❌ Error: CIRCLE_API_KEY and ENTITY_SECRET must be set in your .env file.');
    process.exit(1);
}

async function getPublicKey() {
    try {
        const response = await axios.get(`${BASE_URL}/config/entity/publicKey`, {
            headers: { Authorization: `Bearer ${CIRCLE_API_KEY}` }
        });
        return response.data.data.publicKey;
    } catch (error: any) {
        console.error('Failed to fetch public key:', error.response?.data || error.message);
        throw error;
    }
}

function encryptEntitySecret(entitySecret: string, publicKey: string) {
    try {
        const entitySecretBuffer = Buffer.from(entitySecret, 'hex');
        const encryptedData = publicEncrypt(
            {
                key: publicKey,
                padding: constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256',
            },
            entitySecretBuffer
        );
        return encryptedData.toString('base64');
    } catch (error: any) {
        console.error('Encryption failed. Ensure ENTITY_SECRET is a 32-byte hex string.');
        throw error;
    }
}

async function createWalletSet() {
    console.log('🔄 Fetching Circle Public Key...');
    const publicKey = await getPublicKey();
    console.log('✅ Public Key fetched.');

    console.log('🔄 Encrypting Entity Secret...');
    const entitySecretCiphertext = encryptEntitySecret(ENTITY_SECRET!, publicKey);

    console.log('🔄 Creating Wallet Set...');
    try {
        const idempotencyKey = crypto.randomUUID();
        const response = await axios.post(
            `${BASE_URL}/developer/walletSets`,
            {
                entitySecretCiphertext,
                name: 'Arc Chat User Wallet Set',
                idempotencyKey
            },
            {
                headers: { Authorization: `Bearer ${CIRCLE_API_KEY}` }
            }
        );
        console.log('✅ Wallet Set Created Successfully!');
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error: any) {
        console.error('❌ Failed to create Wallet Set:', error.response?.data || error.message);

        if (error.response?.data?.code === 156016) {
            console.log('\n⚠️  ACTION REQUIRED: Register your Entity Secret ⚠️');
            console.log('It seems your Entity Secret is not registered yet.');
            console.log('1. Go to the Developer-Controlled Wallets Configurator in the Circle Console.');
            console.log('2. Paste the following "Entity Secret Ciphertext" when prompted:');
            console.log('\n' + entitySecretCiphertext + '\n');
            console.log('3. After registering it, run this script again.');
        }
    }
}

createWalletSet();
