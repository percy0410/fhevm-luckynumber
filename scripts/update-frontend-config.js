const fs = require('fs');
const path = require('path');

async function main() {
    // Load the compiled contract artifact
    const artifactPath = path.join(__dirname, '../artifacts/contracts/LuckyNumber.sol/LuckyNumber.json');
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    
    // New contract address from deployment
    const contractAddress = "0x86f28888E516D4Ff3AC0d1a7B73768440167EC12";
    
    // Create the config content
    const configContent = `// Contract configuration - FHEVM Lucky Number on Sepolia
export const CONTRACT_CONFIG = {
  address: "${contractAddress}",
  abi: ${JSON.stringify(artifact.abi, null, 2)}
};

// Sepolia testnet configuration
export const SEPOLIA_CHAIN_ID = 11155111;
`;
    
    // Write to frontend config
    const configPath = path.join(__dirname, '../frontend/src/config/contract.js');
    fs.writeFileSync(configPath, configContent);
    
    console.log('✅ Frontend config updated successfully!');
    console.log('📍 Contract Address:', contractAddress);
    console.log('📄 Config file:', configPath);
    
    // Also update deployment-info.json
    const deploymentInfo = {
        contractAddress: contractAddress,
        network: "sepolia",
        blockNumber: null,
        timestamp: new Date().toISOString(),
        deployer: "0x63F99552603A453D6db3DB7B0D7dBC7cf124Df28",
        txHash: "0x146c1719e9eef9d61be1e11c9985ae1e96c6dc4796da1f4906fe487790b578b0"
    };
    
    const deploymentInfoPath = path.join(__dirname, '../deployment-info.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log('✅ Deployment info updated!');
    console.log('\n🎉 All done! You can now:');
    console.log('1. cd frontend');
    console.log('2. npm run dev');
    console.log('3. Connect your wallet and play!');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
