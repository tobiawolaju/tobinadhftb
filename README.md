# Monad Swap Library

A simple JavaScript library for swapping MON and USDC on Monad mainnet using Uniswap V2.

## Features

- ✅ Swap MON (native) ↔ USDC
- ✅ Get real-time prices
- ✅ Check balances
- ✅ Automatic slippage protection
- ✅ Built-in error handling

## Installation

```bash
npm install
```

## Setup

Create a `.env` file:

```env
PRIVATE_KEY=your_private_key_here
MONAD_RPC_URL=https://rpc.monad.xyz
```

## Quick Start

```javascript
const monadSwap = require('./monad-swap-lib');

// Initialize
monadSwap.initialize();

// Swap 5 MON to USDC
const result = await monadSwap.MONtoUSDC(5);
console.log(`Received: ${result.usdcReceived} USDC`);

// Swap 10 USDC to MON
const result2 = await monadSwap.USDCtoMON(10);
console.log(`Received: ${result2.monReceived} MON`);
```

## API Reference

### Initialization

#### `initialize(privateKey?, rpcUrl?)`
Initialize the library. Uses `.env` file if parameters not provided.

```javascript
const config = monadSwap.initialize();
// Returns: { walletAddress, routerAddress, usdcAddress, wmonAddress }
```

### Balance Functions

#### `getMONBalance()`
Get your MON (native token) balance.

```javascript
const balance = await monadSwap.getMONBalance();
// Returns: "22.5" (string, formatted)
```

#### `getUSDCBalance()`
Get your USDC balance.

```javascript
const balance = await monadSwap.getUSDCBalance();
// Returns: "100.5" (string, formatted)
```

#### `getBalances()`
Get both balances at once.

```javascript
const { mon, usdc } = await monadSwap.getBalances();
// Returns: { mon: "22.5", usdc: "100.5" }
```

### Price Functions

#### `getMONPrice(monAmount?)`
Get MON price in USDC.

```javascript
const price = await monadSwap.getMONPrice(1);
// Returns: "0.045" (USDC per 1 MON)

const price10 = await monadSwap.getMONPrice(10);
// Returns: "0.45" (USDC for 10 MON)
```

#### `getUSDCPrice(usdcAmount?)`
Get USDC price in MON.

```javascript
const price = await monadSwap.getUSDCPrice(1);
// Returns: "22.0" (MON per 1 USDC)
```

### Swap Functions

#### `MONtoUSDC(monAmount, slippage?, verbose?)`
Swap MON (native token) for USDC.

**Parameters:**
- `monAmount` (number): Amount of MON to swap
- `slippage` (number, optional): Slippage tolerance % (default: 1)
- `verbose` (boolean, optional): Log detailed output (default: true)

**Returns:**
```javascript
{
  success: true,
  txHash: "0x...",
  usdcReceived: "0.497",
  blockNumber: 38232052
}
```

**Example:**
```javascript
// Swap 11 MON to USDC with 1% slippage
const result = await monadSwap.MONtoUSDC(11, 1, true);

// Swap 5 MON with 2% slippage, quiet mode
const result = await monadSwap.MONtoUSDC(5, 2, false);
```

#### `USDCtoMON(usdcAmount, slippage?, verbose?)`
Swap USDC for MON (native token).

**Parameters:**
- `usdcAmount` (number): Amount of USDC to swap
- `slippage` (number, optional): Slippage tolerance % (default: 1)
- `verbose` (boolean, optional): Log detailed output (default: true)

**Returns:**
```javascript
{
  success: true,
  txHash: "0x...",
  monReceived: "10.92",
  blockNumber: 38232053
}
```

**Example:**
```javascript
// Swap 10 USDC to MON
const result = await monadSwap.USDCtoMON(10);

// Swap all your USDC
const usdcBalance = await monadSwap.getUSDCBalance();
const result = await monadSwap.USDCtoMON(parseFloat(usdcBalance));
```

## Complete Example

```javascript
const monadSwap = require('./monad-swap-lib');

async function tradingBot() {
    // Initialize
    monadSwap.initialize();
    
    // Check balances
    const { mon, usdc } = await monadSwap.getBalances();
    console.log(`MON: ${mon}, USDC: ${usdc}`);
    
    // Check price
    const price = await monadSwap.getMONPrice(1);
    console.log(`1 MON = ${price} USDC`);
    
    // Swap if you have enough MON
    if (parseFloat(mon) >= 5) {
        const result = await monadSwap.MONtoUSDC(5, 1, true);
        console.log(`Swapped! TX: ${result.txHash}`);
    }
}

tradingBot();
```

## Error Handling

All functions throw errors that you should catch:

```javascript
try {
    const result = await monadSwap.MONtoUSDC(100);
} catch (error) {
    if (error.message.includes('Insufficient MON balance')) {
        console.log('Not enough MON!');
    } else {
        console.error('Swap failed:', error.message);
    }
}
```

## Important Notes

⚠️ **Liquidity Warning**: The WMON/USDC pool currently has low liquidity. You may get unfavorable rates. Consider:
- Using smaller amounts for testing
- Checking prices before swapping
- Using 0x Swap API for better aggregated pricing

⚠️ **Gas Fees**: All swaps cost gas in MON. Make sure you have extra MON for gas.

⚠️ **Slippage**: Default is 1%. Increase if transactions fail due to price movement.

## Contract Addresses

- **USDC**: `0x754704bc059f8c67012fed69bc8a327a5aafb603`
- **WMON**: `0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A`
- **Uniswap V2 Router**: `0x4b2ab38dbf28d31d467aa8993f6c2585981d6804`

## Files

- `monad-swap-lib.js` - Main library
- `index.js` - Example usage
- `balance.js` - Simple balance checker
- `bot.js` - Original trading bot (deprecated, use library instead)

## License

ISC
