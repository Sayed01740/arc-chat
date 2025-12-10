import nacl from 'tweetnacl';
import util from 'tweetnacl-util';

export function decodeBase64(s: string) { return util.decodeBase64(s); }
export function encodeBase64(b: Uint8Array) { return util.encodeBase64(b); }

// encrypt plaintext string using recipient's publicKey (base64) and sender's secretKey (base64)
export async function encryptForRecipient(senderSecretBase64: string, recipPublicBase64: string, plaintext: string) {
    const senderSecret = decodeBase64(senderSecretBase64);
    const recipPub = decodeBase64(recipPublicBase64);
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const messageUint8 = util.decodeUTF8(plaintext);
    const boxed = nacl.box(messageUint8, nonce, recipPub, senderSecret);
    const combined = new Uint8Array(nonce.length + boxed.length);
    combined.set(nonce);
    combined.set(boxed, nonce.length);
    return encodeBase64(combined);
}

export async function decryptWithSecretKey(secretBase64: string, senderPublicBase64: string, ciphertextBase64: string) {
    const secret = decodeBase64(secretBase64);
    const senderPub = decodeBase64(senderPublicBase64);
    const combined = decodeBase64(ciphertextBase64);
    const nonce = combined.slice(0, nacl.box.nonceLength);
    const boxed = combined.slice(nacl.box.nonceLength);
    const message = nacl.box.open(boxed, nonce, senderPub, secret);
    if (!message) throw new Error('decryption failed');
    return util.encodeUTF8(message);
}
