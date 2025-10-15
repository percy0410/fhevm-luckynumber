const fs = require('fs');
const path = require('path');

async function main() {
  // Read the compiled contract
  const contractPath = path.join(__dirname, '../artifacts/contracts/LuckyNumber.sol/LuckyNumber.json');
  const contractData = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  
  console.log('Contract ABI:');
  console.log(JSON.stringify(contractData.abi, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
