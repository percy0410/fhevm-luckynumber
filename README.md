# FHEVM Lucky Number dApp

A decentralized lucky number betting game with **FHEVM (Fully Homomorphic Encryption)** privacy by Zama. Players bet on encrypted numbers 1-10 and win based on how close they are to the lucky number.

## 🎯 Features

- **Privacy-Preserving**: Game numbers encrypted using FHEVM
- **Fair Payouts**: 9x for exact match, 30% refund for off-by-1, 20% refund for off-by-2
- **Transparent Withdrawals**: Plaintext withdrawal balances for user convenience
- **Modern Stack**: TypeScript, Hardhat, React + Vite

## 📁 Project Structure

```
fhevm-luckynumber/
├── contracts/           # Smart contract source files
│   └── LuckyNumber.sol  # Main FHEVM game contract
├── deploy/              # Hardhat-deploy scripts
│   └── 01_deploy_luckynumber.ts
├── tasks/               # Hardhat custom tasks
│   ├── accounts.ts
│   └── LuckyNumber.ts
├── test/                # Test files
├── frontend/            # React frontend
├── hardhat.config.ts    # Hardhat configuration
└── package.json         # Dependencies and scripts
```

## 🚀 Quick Start

### Prerequisites

- Node.js: Version 20 or higher
- npm: Version 7.0.0 or higher

### Installation

```bash
# Install dependencies
npm install --legacy-peer-deps

# Install frontend dependencies
cd frontend && npm install
cd ..
```

### Configuration

Set up environment variables using Hardhat vars:

```bash
# Set your mnemonic (12 words)
npx hardhat vars set MNEMONIC

# Set your Infura API key for network access
npx hardhat vars set INFURA_API_KEY

# Optional: Set Etherscan API key for contract verification
npx hardhat vars set ETHERSCAN_API_KEY
```

Or use `.env` file:

```bash
cp .env.example .env
# Edit .env with your values
```

### Compile and Test

```bash
# Compile contracts
npm run compile

# Run tests
npm test

# Generate coverage report
npm run coverage
```

### Deploy

#### Deploy to Local Network

```bash
# Start a local Hardhat node
npm run node

# In another terminal, deploy
npm run deploy:localhost
```

#### Deploy to Sepolia Testnet

```bash
# Deploy to Sepolia
npm run deploy:sepolia

# Verify contract on Etherscan
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

### Run Frontend

```bash
# Start frontend development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

## 📜 Available Scripts

| Script | Description |
| --- | --- |
| `npm run compile` | Compile all contracts |
| `npm run test` | Run all tests |
| `npm run test:sepolia` | Run tests on Sepolia network |
| `npm run coverage` | Generate coverage report |
| `npm run clean` | Clean build artifacts |
| `npm run deploy:localhost` | Deploy to localhost |
| `npm run deploy:sepolia` | Deploy to Sepolia |
| `npm run node` | Start local Hardhat node |
| `npm run dev` | Start frontend dev server |

## 🎲 How to Play

1. **Connect Wallet**: Click "Connect Wallet" and approve MetaMask connection
2. **Choose Number**: Select a number between 1-10
3. **Set Bet Amount**: Adjust bet amount (min: 0.001 ETH, max: 0.005 ETH)
4. **Play**: Click "Play Game" and confirm transaction
5. **Check Result**: View encrypted game result and any winnings
6. **Withdraw**: Withdraw your winnings anytime

## 🔧 Custom Hardhat Tasks

```bash
# Get contract information
npx hardhat luckynumber:info --contract <CONTRACT_ADDRESS>

# Fund the contract
npx hardhat luckynumber:fund --contract <CONTRACT_ADDRESS> --amount 0.1

# List accounts
npx hardhat accounts
```

## 📊 Contract Information

**Deployed on Sepolia**: `0x86f28888E516D4Ff3AC0d1a7B73768440167EC12`

### Payout Structure

- **Exact Match** (difference = 0): Win 9x your bet
- **Off by 1** (difference = 1): Get 30% refund
- **Off by 2** (difference = 2): Get 20% refund
- **Off by 3+**: Bet goes to prize pool

## 🛠️ Technology Stack

- **Smart Contracts**: Solidity 0.8.24, FHEVM by Zama
- **Development**: Hardhat, TypeScript, hardhat-deploy
- **Testing**: Mocha, Chai
- **Frontend**: React, Vite, TailwindCSS, ethers.js v6
- **Privacy**: @fhevm/solidity, @fhevm/hardhat-plugin

## 📚 Documentation

- [FHEVM Documentation](https://docs.zama.ai/protocol)
- [FHEVM Hardhat Setup Guide](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat)
- [Hardhat Documentation](https://hardhat.org/docs)

## 📄 License

MIT License

## 🆘 Support

For issues and questions:
- GitHub Issues: Report bugs or request features
- Zama Discord: [Join the community](https://discord.gg/zama)

---

Built with ❤️ using FHEVM by Zama
