# ARCchat Architecture & Integration Guide

Welcome to the Developer Documentation for **ARCchat**, a decentralized chat application leveraging the ARC blockchain for settlements and Circle's Programmable Wallets for seamless user onboarding.

## 1. Architecture Overview

ARCchat is a hybrid Web3 application. It uses a centralized backend for performance (message relay, session management) but relies on decentralized infrastructure for identity and payments.

### Components

*   **Frontend (React/Vite)**
    *   **Login**: Handles MetaMask and Circle Wallet creation.
    *   **Chat**: Real-time messaging via Socket.IO, encrypted client-side using TweetNaCl.
    *   **Dashboard**: A user control center for viewing balances and managing chat sessions.
*   **Backend (Node.js/Express)**
    *   **Auth**: Verifies signatures and manages JWT sessions.
    *   **Circle Client**: Interacts with Circle APIs for wallet creation and transfers.
    *   **Socket.IO**: Relays encrypted messages between online users.
    *   **Session Store**: Tracks paid access time (in-memory map for demo purposes).
*   **Blockchain (ARC Testnet)**
    *   **IdentityRegistry**: Stores user public keys (optional).
    *   **Payments**: Uses USDC or Native ARC for hourly access fees.

## 2. Circle API Integration

We use Circle's **Developer-Controlled Wallets** to offer a "Web2-like" onboarding experience for users who don't have a wallet.

### Setup
1.  **API Keys**: Stored in `.env` (`CIRCLE_API_KEY`).
2.  **Entity Secret**: A 32-byte hex string generated securely and registered with Circle.
3.  **Wallet Set**: A collection ID created once to group all app users.

### Key Flows

#### 1. Wallet Creation
*   **Endpoint**: `POST /auth/create-circle`
*   **Process**:
    1.  Frontend requests new wallet.
    2.  Backend calls `circleClient.createWallet()`.
    3.  Circle executes creation on the blockchain.
    4.  Backend returns the new Wallet Address and Wallet ID.
    5.  Frontend generates a local KeyPair for encryption (separate from the blockchain wallet).

#### 2. Payments (Hourly Access)
*   **Endpoint**: `POST /payment/pay-hourly`
*   **Process**:
    1.  User clicks "Extend Session" in Dashboard.
    2.  Backend initiates a transfer using `circleClient.executeTransfer()`.
    3.  **Note**: Requires `ENTITY_SECRET` encryption for security.
    4.  On success, the user's session expiry is extended by 1 hour.

## 3. ARC Blockchain Interaction

The application interacts with the ARC Testnet (Chain ID `5042002`).


### RPC Configuration
*   **Network Name**: Arc Testnet
*   **RPC URL**: `https://rpc.testnet.arc.network`
*   **Currency**: ARC / USDC

## 4. Deployment & Testing

### Prerequisites
*   Node.js v16+
*   Correctly configured `.env` file.

### Running Locally
1.  **Backend**: `npm run dev` (Port 4000)
2.  **Frontend**: `npm run dev` (Port 5173)

### Verification
*   Visit `http://localhost:5173`.
*   Use "Create Circle Wallet" to test the full flow.
*   Check the backend console logs for payment processing details.
