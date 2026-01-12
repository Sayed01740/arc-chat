# Arc Chat: Decentralized Real-Time Messaging

> **A censorship-resistant, privacy-first messaging platform combining the speed of Web2 with the sovereignty of Web3.**

---

## 📖 Introduction

**Arc Chat** is a next-generation messaging platform designed to rival the user experience of centralized giants like Messenger whilst ensuring complete user sovereignty. By leveraging blockchain technology for identity and decentralized storage for data, Arc Chat ensures that:
- **Messages are End-to-End Encrypted (E2EE):** Only you and the recipient can read them.
- **You Own Your Identity:** Your account is tied to your wallet (SIWE/ENS), not a corporate database.
- **History is Permanent:** Message history is secured via decentralized storage (IPFS/Arweave), making it resilient to server shutdowns.

## ✨ Key Features

- **🔒 End-to-End Encryption:** Uses the Double Ratchet Algorithm / NaCl to ensure secure communication.
- **🆔 Wallet-Based Identity:** No passwords. Login with Metamask, Coinbase Wallet, or Rainbow.
- **⚡ Real-Time Performance:** Hybrid transport layer using WebSockets for instant delivery with a trustless payload design.
- **💾 Decentralized Architecture:**  Planned integration with IPFS/Arweave for censorship-resistant message archiving.
- **📱 Responsive Design:** Built for both Desktop and Mobile web experiences.

## 🏗 System Architecture

The system is built on a modular architecture separating identity, transport, and storage:

```mermaid
graph TD
    UserA[User A (Wallet)] -->|1. Sign & Encrypt| AppA[Frontend App]
    AppA -->|2. Real-time Socket| Relay[Relay Network / Backend]
    Relay -->|3. Push Notification| AppB[User B Frontend]
    UserA -->|4. Register Identity| Blockchain[L2 Smart Contract]
    AppA -->|5. Encrypted Backup| Storage[IPFS / Decentralized Storage]
    AppB -->|6. Fetch History| Storage
```

### Core Layers
1.  **Frontend**: React (Vite) + TailwindCSS for a modern, responsive UI.
2.  **Identity Contract**: Solidity smart contracts on Base L2 to map wallet addresses to public encryption keys.
3.  **Transport Relay**: A lightweight Node.js/Socket.IO server that routes *encrypted* blobs between users. It cannot decrypt messages.
4.  **Storage**: (In Progress) IPFS/Arweave integration for cold storage of message history.

## 🛠 Technology Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React, Vite, TailwindCSS, Ethers.js, TweetNaCl |
| **Backend** | Node.js, Express, Socket.IO |
| **Blockchain** | Hardhat, Solidity, Base (Coinbase L2) |
| **Methods** | JSON-RPC, WebSocket, REST |

## 🚀 Getting Started

Follow these steps to set up the project locally.

### Prerequisites
- **Node.js** (v16+ recommended)
- **npm** (v7+ for workspace support)
- **MetaMask** (or any Web3 wallet extension)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/adnan911/arc-chat.git
    cd arc-chat
    ```

2.  **Install dependencies:**
    We use npm workspaces to manage dependencies for all packages at once.
    ```bash
    npm run bootstrap
    ```

3.  **Configure Environment Variables:**
    Copy the example configuration and fill in your details.
    ```bash
    cp .env.example .env
    ```
    *Required keys: messaging secrets, optional deployment keys.*

### Running the Application

4.  **Start the Backend & Frontend concurrently:**
    ```bash
    npm start
    ```
    *Individual commands:*
    *   Backend: `npm --prefix backend run dev` (Runs on port 4000)
    *   Frontend: `npm --prefix frontend run dev` (Runs on port 5173)

5.  **Smart Contracts (Optional):**
    To deploy contracts to a local Hardhat network:
    ```bash
    npm --prefix contracts run deploy:local
    ```

## 📂 Project Structure

```text
arc-chat/
├── backend/          # Express + Socket.IO relay server
├── contracts/        # Solidity contracts & Hardhat config
├── frontend/         # React application
├── ARCHITECTURE_PLAN.md # Detailed technical specifications
├── package.json      # Root configuration & workspaces
└── README.md         # Project documentation
```

## 🗺 Roadmap

- [x] **Phase 1: MVP** - 1-to-1 Chat, Wallet Login, Ephemeral Messaging.
- [ ] **Phase 2: Persistence** - IPFS integration for history and media sharing.
- [ ] **Phase 3: Advanced Social** - Group chats, Token gating, Voice/Video.

## 📄 License

This project is licensed under the MIT License.
