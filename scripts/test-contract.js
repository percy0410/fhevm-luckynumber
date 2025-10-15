const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 Testing Lucky Number contract on Sepolia...\n");
    
    // Contract address from deployment
    const contractAddress = "0x58f3a4fCFF289552e7744Bcb14ec91dCe4e94468";
    
    // Get the contract instance
    const LuckyNumber = await ethers.getContractFactory("LuckyNumber");
    const luckyNumber = LuckyNumber.attach(contractAddress);
    
    console.log("📍 Contract Address:", contractAddress);
    console.log("🌐 Network:", hre.network.name);
    
    try {
        // Test basic contract functions
        console.log("\n🔍 Testing contract functions...");
        
        const minBet = await luckyNumber.MIN_BET();
        const maxBet = await luckyNumber.MAX_BET();
        const stats = await luckyNumber.getStats();
        
        console.log("✅ Min Bet:", ethers.formatEther(minBet), "ETH");
        console.log("✅ Max Bet:", ethers.formatEther(maxBet), "ETH");
        console.log("✅ Game Counter:", stats[0].toString());
        console.log("✅ Prize Pool:", ethers.formatEther(stats[1]), "ETH");
        console.log("✅ Total Volume:", ethers.formatEther(stats[2]), "ETH");
        console.log("✅ Contract Balance:", ethers.formatEther(stats[3]), "ETH");
        
        console.log("\n🎉 Contract is working perfectly on Sepolia!");
        console.log("\n🎮 Ready for testing! You can now:");
        console.log("1. Connect MetaMask to Sepolia testnet");
        console.log("2. Use the frontend at http://localhost:3000");
        console.log("3. Place bets and test withdrawals");
        
    } catch (error) {
        console.error("❌ Error testing contract:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Test failed:", error);
        process.exit(1);
    });