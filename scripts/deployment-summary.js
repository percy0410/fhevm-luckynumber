#!/usr/bin/env node

console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║                                                                        ║
║          🎉 FHEVM LUCKY NUMBER - DEPLOYMENT SUCCESSFUL! 🎉            ║
║                                                                        ║
╚════════════════════════════════════════════════════════════════════════╝

📍 DEPLOYMENT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Network:              Sepolia Testnet
Contract Address:     0x4A58C5a307A32b4c2ea8Ec3Be4a091c65409e8D7
Deployer Address:     0x63F99552603A453D6db3DB7B0D7dBC7cf124Df28
Transaction Hash:     0x146c1719e9eef9d61be1e11c9985ae1e96c6dc4796da1f4906fe487790b578b0
Contract Balance:     0.1 ETH
Deployment Time:      ${new Date().toISOString()}

🔗 VIEW ON SEPOLIA ETHERSCAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Contract: https://sepolia.etherscan.io/address/0x4A58C5a307A32b4c2ea8Ec3Be4a091c65409e8D7
Transaction: https://sepolia.etherscan.io/tx/0x146c1719e9eef9d61be1e11c9985ae1e96c6dc4796da1f4906fe487790b578b0

📊 CONTRACT CONFIGURATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Min Bet:           0.001 ETH
✅ Max Bet:           0.005 ETH
✅ Number Range:      1-10
✅ FHEVM Enabled:     YES (Encrypted balances & numbers)
✅ Payout Structure:
   - Exact Match:     9x bet
   - Off by 1:        30% refund
   - Off by 2:        20% refund
   - Off by 3+:       Lost to prize pool

🔐 PRIVACY FEATURES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Encrypted chosen numbers (euint8)
✅ Encrypted lucky numbers (euint8)
✅ Encrypted player balances (euint32)
✅ Encrypted player stats (euint32)
✅ FHE permissions system
✅ No on-chain decryption (privacy preserved)

🚀 FRONTEND STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Frontend config updated
✅ Contract ABI updated
✅ Running on: http://localhost:3000
✅ Ready to connect MetaMask

🎮 HOW TO PLAY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Open http://localhost:3000 in your browser
2. Connect MetaMask wallet
3. Make sure you're on Sepolia testnet
4. Get test ETH from faucet if needed:
   - https://sepoliafaucet.com
   - https://www.alchemy.com/faucets/ethereum-sepolia
5. Select a number (1-10)
6. Set bet amount (0.001 - 0.005 ETH)
7. Click "Play Game"
8. See results instantly!
9. Winnings added to encrypted balance
10. Withdraw anytime by entering amount

💡 PRIVACY TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Your chosen numbers are encrypted on-chain
• Your balance is encrypted (shows as "🔒 Encrypted")
• Only you can see your actual balance (with decryption key)
• Other players cannot see your betting patterns
• Game numbers stored as encrypted euint8 values

⚠️  IMPORTANT NOTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• This is on Sepolia TESTNET (not real money!)
• Use test ETH only
• FHEVM operations cost more gas (~500k vs ~300k)
• Balance shown as encrypted - enter amount to withdraw
• Game history shows encrypted numbers for privacy

🛠️  TECHNICAL DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Framework:           FHEVM by Zama
Pattern:             Similar to higher-lower card game
Encryption:          Internal (no client-side encryption needed)
Random Generation:   Block-based (block.timestamp + block.prevrandao)
Withdrawal:          Manual amount entry (encrypted balance)
Gas Limit:           500,000 (FHEVM operations)

📚 USEFUL LINKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FHEVM Docs:          https://docs.zama.ai/fhevm
Sepolia Faucet:      https://sepoliafaucet.com
MetaMask:            https://metamask.io
Your Contract:       https://sepolia.etherscan.io/address/0x4A58C5a307A32b4c2ea8Ec3Be4a091c65409e8D7

╔════════════════════════════════════════════════════════════════════════╗
║                         🎲 HAPPY PLAYING! 🎲                          ║
╚════════════════════════════════════════════════════════════════════════╝
`);
