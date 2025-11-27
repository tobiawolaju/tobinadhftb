// Example usage of Monad Swap Library
const monadSwap = require('./monad-swap-lib');

async function main() {
    try {
        // Initialize the library (uses .env file)
        console.log('🚀 Initializing Monad Swap Library...\n');
        const config = monadSwap.initialize();

        console.log('✅ Initialized!');
        console.log(`   Wallet: ${config.walletAddress}`);
        console.log(`   Router: ${config.routerAddress}\n`);

        // Get current balances
        console.log('📊 Current Balances:');
        const balances = await monadSwap.getBalances();
        console.log(`   MON: ${balances.mon}`);
        console.log(`   USDC: ${balances.usdc}\n`);

        // Get current prices
        console.log('💰 Current Prices:');
        const monPrice = await monadSwap.getMONPrice(1);
        const usdcPrice = await monadSwap.getUSDCPrice(1);
        console.log(`   1 MON = ${monPrice} USDC`);
        console.log(`   1 USDC = ${usdcPrice} MON\n`);

        // Example: Swap 0.5 MON to USDC
        console.log('='.repeat(50));
        console.log('Example 1: Swap 0.5 MON to USDC');
        console.log('='.repeat(50));

        const result1 = await monadSwap.MONtoUSDC(0.5, 1, true);
        console.log(`\n✅ Result: ${result1.usdcReceived} USDC received`);
        console.log(`   TX: ${result1.txHash}\n`);

        // Wait a bit
        console.log('⏳ Waiting 5 seconds...\n');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Example: Swap all USDC back to MON
        console.log('='.repeat(50));
        console.log('Example 2: Swap USDC back to MON');
        console.log('='.repeat(50));

        const currentUSDC = await monadSwap.getUSDCBalance();
        const result2 = await monadSwap.USDCtoMON(parseFloat(currentUSDC), 1, true);
        console.log(`\n✅ Result: MON balance now ${result2.monReceived}`);
        console.log(`   TX: ${result2.txHash}\n`);

        // Final balances
        console.log('='.repeat(50));
        console.log('📊 Final Balances:');
        const finalBalances = await monadSwap.getBalances();
        console.log(`   MON: ${finalBalances.mon}`);
        console.log(`   USDC: ${finalBalances.usdc}`);
        console.log('='.repeat(50));

    } catch (error) {
        console.error('\n🔥 Error:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { main };
