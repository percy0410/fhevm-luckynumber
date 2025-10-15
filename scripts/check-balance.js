const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Checking wallet balance on Sepolia...\n");
    
    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("📝 Wallet address:", deployer.address);
    
    // Get account balance
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log("💰 Balance:", ethers.formatEther(balance), "ETH");
    
    // Check if we have enough for deployment
    const minRequired = ethers.parseEther("0.02"); // ~0.02 ETH should be enough
    if (balance < minRequired) {
        console.log("\n❌ Insufficient balance for deployment!");
        console.log("🚰 Please get Sepolia ETH from:");
        console.log("   - https://sepoliafaucet.com/");
        console.log("   - https://faucets.chain.link/sepolia");
        return;
    }
    
    console.log("✅ Sufficient balance for deployment!");
    console.log("\n🌐 Network:", hre.network.name);
    console.log("🔗 Chain ID:", (await deployer.provider.getNetwork()).chainId);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error checking balance:", error);
        process.exit(1);
    });