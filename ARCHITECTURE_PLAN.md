# Blockchain-Based Real-Time Chat Platform: Concept & Architecture

## 1. Executive Summary
This project aims to build a decentralized, censorship-resistant messaging platform that rivals the user experience of Web2 giants like Facebook Messenger while ensuring user sovereignty, privacy via end-to-end encryption (E2EE), and permanent data availability via decentralized storage.

**Core Value Props:**
*   **Privacy:** Messages are encrypted; only recipients can decrypt.
*   **Ownership:** Identity is tied to a wallet (e.g., Ethereum address/ENS), not a central server database.
*   **Resilience:** Message history is stored on IPFS/Arweave, making it robust against server shutdowns.

---

## 2. Architecture Overview

### High-Level Stack
*   **Frontend:** React Native (Mobile) + React/Next.js (Web).
*   **Identity Layer:** Smart Contracts (ERC-725/ENS) on a low-cost L2.
*   **Transport Layer (Real-time):**
    *   **P2P Signaling:** Libp2p or Waku (status.im) for decentralized message routing.
    *   **Fallback:** WebSocket relays (like the current starter backend) for performance optimization, but trustless (encrypted payloads only).
*   **Storage Layer:**
    *   **Hot Storage (Inbox):** Local device storage (SQLite/Realm).
    *   **Cold Storage (History):** IPFS (encrypted blobs) or Arweave for permanent archives.
*   **Encryption:** Double Ratchet Algorithm (Signal Protocol) or NaCl (Box) for key exchange.

### System Diagram
```mermaid
graph TD
    UserA[User A (Wallet)] -->|Sign & Encrypt| AppA[Frontend App]
    AppA -->|Real-time Socket/Waku| Relay[Relay Network / Backend]
    Relay -->|Push Notification| AppB[User B Frontend]
    UserA -->|Register Identity| Blockchain[L2 Smart Contract]
    AppA -->|Encrypted Backup| IPFS[IPFS / Decentralized Storage]
    AppB -->|Fetch History| IPFS
```

---

## 3. User Flow

### 3.1 Registration & Login
1.  **Connect Wallet:** User connects via MetaMask/Coinbase Wallet/Rainbow.
2.  **Signature Challenge:** Backend/Contract challenges user to sign a nonce to prove ownership.
3.  **Key Generation:** App generates a local Session Keypair (Encryption Keys). The private key serves as the locally stored secret; the public key is published to the Identity Contract.
4.  **Profile Creation:** User sets an ENS name or nickname (stored on-chain or IPFS).

### 3.2 Contact Management
1.  **Search:** Query the blockchain/indexer for an address or ENS name (e.g., `alice.eth`).
2.  **Add Friend:** Send a "Contact Request" transaction or signed message payload.
3.  **Handshake:** Upon acceptance, both parties exchange session keys to establish an encrypted channel.

### 3.3 Messaging
1.  **Compose:** User types a message.
2.  **Encrypt:** App encrypts text + media using the recipient's public session key (Diffie-Hellman).
3.  **Send:** Encrypted payload is sent to the Relay/Waku network.
4.  **Receive:** Recipient app listens, downloads payload, decrypts with local private key, and displays.

---

## 4. Smart Contract Design

### 4.1 IdentityRegistry.sol
*   **Purpose:** Maps Wallet Address -> Public Encryption Keys & Profile Hash.
*   **Functions:**
    *   `register(bytes32 publicEncryptionKey, string ipfsProfileHash)`
    *   `updateProfile(string newHash)`
    *   `getIdentity(address user) returns (key, hash)`

### 4.2 MessageValidation.sol (Optional/Hybrid)
*   *Note: storing every message on-chain is too expensive.*
*   **Purpose:** Dispute resolution or "Pinning" crucial chats.
*   **Mechanism:** Users can hash a batch of messages (Merkle Root) and commit the root to the chain daily to prove message integrity without revealing content.

### 4.3 AccessControl.sol
*   **Group Chats:** Manages a list of allowed wallet addresses for a Group ID. Only members can fetch the shared group encryption key.

---

## 5. Technology Choices

### Recommended Blockchain Networks
*   **Base (Coinbase L2):** Extremely low gas fees, EVM compatible, easy onboarding.
*   **Polygon PoS / zkEVM:** Mature ecosystem, cheap.
*   **Arbitrum Nova:** Optimized for high-throughput social/gaming data.

### Real-Time Messaging Strategy
*   **Hybrid Approach (Best UX):** Use a standard Socket.IO server (like your current setup) for *instant* delivery notifications, but ensure the server *cannot* read messages (it only sees encrypted blobs).
*   **Decentralized Option:** Switch to **Waku** protocol (used by Status) for fully peer-to-peer message routing, removing the central server entirely.

---

## 6. Frontend Design Ideas

### Style & Aesthetics
*   **Theme:** "Glassmorphism" with easy toggle Dark/Light mode.
*   **Chat Bubble:** Classic messenger style (Blue right/Grey left) but with blockchain metadata (e.g., "Verified signed by 0x123...").
*   **Wallet Integration:** Small "Network Status" indicator (Green dot for connected).
*   **Identicons:** Use Blockies or ENS avatars for user profile pictures.

### Mobile vs. Web
*   **Web:** Sidebar for contacts, main flexible chat area. Responsive for desktop/tablet.
*   **Mobile:** Tab bar navigation (Chats, Contacts, Settings/Wallet). Swipe gestures for reply/delete.

---

## 7. Security Considerations

1.  **Key Management (Critical):**
    *   *Problem:* If a user clears browser cache, they lose their chat history decryption key.
    *   *Solution:* Encrypt the chat private key with the user's Wallet Signature and store the ciphertext on-chain or IPFS. To restore, they just sign a message to decrypt their own backup.
2.  **Forward Secrecy:** Rotate session keys frequently so that if a key is compromised, past messages remain secure.
3.  **Metadata Privacy:** Even if content is encrypted, *who* talks to *whom* is visible. Using a mixnet (like Nym) or simply acceptable centralized relays can mitigate this.

---

## 8. Features Roadmap

### Phase 1: MVP (Current Starter)
*   1-to-1 Text Chat.
*   Wallet Login.
*   Ephemeral messages (server RAM only).

### Phase 2: Persistence & Media
*   IPFS integration for message history.
*   Image/File sharing (encrypted file upload to IPFS).
*   "Saved Messages" (personal notes).

### Phase 3: Advanced Social
*   **Group Chats:** Smart contract based membership.
*   **Voice/Video:** WebRTC signaling over the existing p2p/socket channel (Encrypted streams).
*   **Token Gating:** "You must hold 10 $CHAT tokens to enter this group."

---
