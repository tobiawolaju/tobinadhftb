# Monad Trading Bot Skeleton

This is a simple, secure skeleton for a trading bot designed for EVM-compatible blockchains like Monad. It provides a basic framework for connecting to a blockchain, managing a wallet, and implementing custom trading logic.

**IMPORTANT: This bot is currently configured to use a test network. It is not ready for mainnet trading.**

## Security Warning

**NEVER commit your private key to Git or share it with anyone.** This bot is designed to load your private key from a `.env` file, which is included in the `.gitignore` to prevent accidental public exposure.

- **DO NOT** hardcode your private key anywhere in the code.
- **DO NOT** share your `.env` file.
- **ALWAYS** double-check that `.env` is listed in your `.gitignore` file.

Failure to follow these rules will likely result in the **complete and irreversible loss of your funds**.

## Setup

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Create a `.env` file:**
    Create a file named `.env` in the root of the project and add the following variables:

    ```
    # Your wallet's private key (DO NOT share this)
    PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE

    # A URL for a blockchain node (e.g., from Infura, Alchemy, or a local node)
    # For a testnet, like Sepolia:
    SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_API_KEY
    ```

3.  **Replace placeholders:**
    - Replace `YOUR_PRIVATE_KEY_HERE` with your wallet's private key.
    - Replace `https://sepolia.infura.io/v3/YOUR_INFURA_API_KEY` with a valid RPC URL from a node provider like Infura or Alchemy.

## Running the Bot

Once set up, you can start the bot with:

```bash
node bot.js
```
