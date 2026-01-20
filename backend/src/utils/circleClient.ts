import axios from 'axios';
import { publicEncrypt, constants, randomUUID } from 'crypto';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') }); // ../../../ because it is in src/utils


const BASE_URL = 'https://api.circle.com/v1/w3s';

export class CircleClient {
    private apiKey: string;
    private entitySecret: string;
    private walletSetId: string;

    constructor() {
        this.apiKey = process.env.CIRCLE_API_KEY || '';
        this.entitySecret = process.env.ENTITY_SECRET || '';
        this.walletSetId = process.env.CIRCLE_WALLET_SET_ID || '';

        if (!this.apiKey || !this.entitySecret || !this.walletSetId) {
            console.warn("⚠️ Circle credentials missing. Circle features will fail.");
        }
    }

    private async getPublicKey() {
        try {
            const response = await axios.get(`${BASE_URL}/config/entity/publicKey`, {
                headers: { Authorization: `Bearer ${this.apiKey}` }
            });
            return response.data.data.publicKey;
        } catch (error: any) {
            console.error('Failed to fetch public key:', error.response?.data || error.message);
            throw error;
        }
    }

    private encryptEntitySecret(publicKey: string) {
        try {
            const entitySecretBuffer = Buffer.from(this.entitySecret, 'hex');
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
            console.error('Encryption failed checking ENTITY_SECRET is valid hex.');
            throw error;
        }
    }

    async createWallet() {
        // 1. Get & Encrypt Secret
        const publicKey = await this.getPublicKey();
        const entitySecretCiphertext = this.encryptEntitySecret(publicKey);

        // 2. Create Wallet
        const idempotencyKey = randomUUID();
        try {
            const response = await axios.post(
                `${BASE_URL}/developer/wallets`,
                {
                    walletSetId: this.walletSetId,
                    blockchains: ['ETH-SEPOLIA'], // Using Sepolia as standard testnet for Circle, could be ARC if supported
                    count: 1,
                    entitySecretCiphertext,
                    idempotencyKey
                },
                {
                    headers: { Authorization: `Bearer ${this.apiKey}` }
                }
            );
            return response.data.data.wallets[0];
        } catch (error: any) {
            console.error('Failed to create wallet:', error.response?.data || error.message);
            throw error;
        }
    }

    async checkWalletBalance(walletId: string) {
        try {
            const response = await axios.get(
                `${BASE_URL}/wallets/${walletId}/balances`,
                {
                    headers: { Authorization: `Bearer ${this.apiKey}` }
                }
            );
            return response.data.data;
        } catch (error: any) {
            console.error('Failed to fetch balance:', error.response?.data || error.message);
            throw error;
        }
    }

    async executeTransfer(walletId: string, tokenId: string, destinationAddress: string, amount: string) {
        // 1. Get & Encrypt Secret
        const publicKey = await this.getPublicKey();
        const entitySecretCiphertext = this.encryptEntitySecret(publicKey);
        const idempotencyKey = randomUUID();

        try {
            const response = await axios.post(
                `${BASE_URL}/developer/transactions/transfer`,
                {
                    walletId,
                    tokenId,
                    destinationAddress,
                    amounts: [amount],
                    feeLevel: "MEDIUM",
                    entitySecretCiphertext,
                    idempotencyKey
                },
                {
                    headers: { Authorization: `Bearer ${this.apiKey}` }
                }
            );
            return response.data.data;
        } catch (error: any) {
            console.error('Failed to execute transfer:', error.response?.data || error.message);
            throw error;
        }
    }
}

export const circleClient = new CircleClient();
