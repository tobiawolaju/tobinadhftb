const monadSwap = require('./monad-swap-lib');

// --- SETTINGS ---
const CHECK_INTERVAL_MS = 5000;          // 5 seconds
const GAS_RESERVE_MON = 0.5;             // Reserved for gas
const MIN_MON_TRADE = 1;                 // Minimum MON to trade
const MIN_USDC_TRADE = 0.01;             // Minimum USDC to trade
const SLIPPAGE_PERCENT = 2;              // Slippage tolerance
const MIN_PROFIT_USDC = 0.02;            // Minimum profit after fees
const COOLDOWN_MS = 15000;               // Cooldown after each trade

// --- STATE ---
let lastBuyPrice = 0;
let inFlight = false;
let lastTradeTime = 0;
let priceHistory = [];

// --- UTILITY ---
function movingAverage(arr, period = 5) {
    const recent = arr.slice(-period);
    return recent.reduce((a, b) => a + b, 0) / recent.length;
}

async function tradeCycle() {
    if (inFlight) return;
    const now = Date.now();
    if (now - lastTradeTime < COOLDOWN_MS) return;

    inFlight = true;
    try {
        // Fetch balances and price
        const { mon: monRaw, usdc: usdcRaw } = await monadSwap.getBalances();
        const monBalance = parseFloat(monRaw);
        const usdcBalance = parseFloat(usdcRaw);
        const monPrice = parseFloat(await monadSwap.getMONPrice(1));

        // Track recent prices for trend analysis
        priceHistory.push(monPrice);
        if (priceHistory.length > 20) priceHistory.shift(); // keep last 20 prices

        const shortMA = movingAverage(priceHistory, 5);
        const longMA = movingAverage(priceHistory, 15);

        console.log(`[${new Date().toISOString()}] MON: ${monBalance.toFixed(4)} | USDC: ${usdcBalance.toFixed(6)} | Price: ${monPrice.toFixed(6)} | MA5: ${shortMA.toFixed(6)} | MA15: ${longMA.toFixed(6)}`);

        // --- SELL CONDITION ---
        if (monBalance > GAS_RESERVE_MON + MIN_MON_TRADE) {
            const tradableMON = monBalance - GAS_RESERVE_MON;
            const expectedUSDC = tradableMON * monPrice;
            const profit = lastBuyPrice ? expectedUSDC - tradableMON * lastBuyPrice : 0;

            // Sell only if profit exceeds threshold AND short-term trend is up
            if (profit >= MIN_PROFIT_USDC && monPrice > shortMA) {
                const { usdcReceived, txHash } = await monadSwap.MONtoUSDC(tradableMON, SLIPPAGE_PERCENT, true);
                console.log(`🔼 Sold ${tradableMON.toFixed(4)} MON → ${usdcReceived.toFixed(6)} USDC | Profit: ${profit.toFixed(6)} | TX: ${txHash.slice(0, 10)}...`);
                lastTradeTime = now;
            }
        }

        // --- BUY CONDITION ---
        else if (usdcBalance > MIN_USDC_TRADE) {
            const expectedMON = usdcBalance / monPrice;

            // Buy only if price dipped below short-term moving average
            if (monPrice < shortMA) {
                const { monReceived, txHash } = await monadSwap.USDCtoMON(usdcBalance, SLIPPAGE_PERCENT, true);
                lastBuyPrice = monPrice;
                console.log(`🔽 Bought ${monReceived.toFixed(4)} MON for ${usdcBalance.toFixed(6)} USDC | TX: ${txHash.slice(0, 10)}...`);
                lastTradeTime = now;
            }
        }

    } catch (err) {
        console.error(`[ERROR] ${err.message}`);
        if (err.message.includes('insufficient balance')) console.error('→ Insufficient gas reserve');
        else if (err.message.includes('execution reverted')) console.error('→ TX reverted (liquidity/price)');
    } finally {
        inFlight = false;
    }
}

async function main() {
    console.log('🚀 Initializing Monad Swap...');
    const { walletAddress, routerAddress } = monadSwap.initialize();
    console.log(`✅ Wallet: ${walletAddress} | Router: ${routerAddress}`);
    console.log(`⚙️ Gas Reserve: ${GAS_RESERVE_MON} MON | Min Profit: ${MIN_PROFIT_USDC} USDC | Interval: ${CHECK_INTERVAL_MS / 1000}s | Slippage: ${SLIPPAGE_PERCENT}% | Cooldown: ${COOLDOWN_MS / 1000}s\n`);

    tradeCycle();
    setInterval(tradeCycle, CHECK_INTERVAL_MS);
}

if (require.main === module) main();

module.exports = { main };
