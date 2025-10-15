import { ethers } from 'ethers';
import { CONTRACT_CONFIG, SEPOLIA_CHAIN_ID } from '../config/contract.js';

// Web3 utilities for Lucky Number dApp
export class Web3Utils {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
  }

  // Check if MetaMask is installed
  isMetaMaskInstalled() {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  }

  // Connect to MetaMask wallet
  async connectWallet() {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
    }

    try {
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Create provider and signer
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      
      // Get connected address
      const address = await this.signer.getAddress();
      
      // Switch to Sepolia network if needed
      await this.switchToSepolia();
      
      // Initialize contract
      this.contract = new ethers.Contract(CONTRACT_CONFIG.address, CONTRACT_CONFIG.abi, this.signer);
      
      return {
        address,
        provider: this.provider,
        signer: this.signer,
        contract: this.contract
      };
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }

  // Switch to Sepolia network
  async switchToSepolia() {
    const chainId = await this.provider.getNetwork().then(network => network.chainId);
    
    if (chainId !== SEPOLIA_CHAIN_ID) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}` }],
        });
      } catch (switchError) {
        // Chain not added to MetaMask
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}`,
                chainName: 'Sepolia Testnet',
                nativeCurrency: {
                  name: 'Ethereum',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                blockExplorerUrls: ['https://sepolia.etherscan.io/'],
              },
            ],
          });
        } else {
          throw switchError;
        }
      }
    }
  }

  // Get ETH balance
  async getBalance(address) {
    if (!this.provider) throw new Error('Provider not initialized');
    const balance = await this.provider.getBalance(address);
    return ethers.formatEther(balance);
  }

  // Place a bet on the contract (simplified - no encryption needed)
  async placeBet(chosenNumber, betAmountEth) {
    if (!this.contract) throw new Error('Contract not initialized');
    
    // Validate chosen number
    if (chosenNumber < 1 || chosenNumber > 10) {
      throw new Error('Chosen number must be between 1 and 10');
    }
    
    // Validate bet amount
    if (betAmountEth <= 0) {
      throw new Error('Bet amount must be greater than 0');
    }
    
    const betAmountWei = ethers.parseEther(betAmountEth.toString());
    
    console.log('Placing bet:', { chosenNumber, betAmountEth });
    
    try {
      // Estimate gas first to catch any revert errors early
      try {
        await this.contract.placeBet.estimateGas(chosenNumber, {
          value: betAmountWei
        });
      } catch (estimateError) {
        console.error('Gas estimation failed:', estimateError);
        if (estimateError.reason) {
          throw new Error(`Transaction would fail: ${estimateError.reason}`);
        }
        throw new Error('Transaction would fail. Please check contract balance and your ETH balance.');
      }
      
      // Place bet on the contract - just pass the number directly!
      const tx = await this.contract.placeBet(chosenNumber, {
        value: betAmountWei,
        gasLimit: 500000 // Increased for FHEVM operations
      });
      
      console.log('Bet transaction sent:', tx.hash);
      return tx;
    } catch (error) {
      console.error('Failed to place bet:', error);
      throw error;
    }
  }


  // Get contract statistics
  async getContractStats() {
    if (!this.contract) throw new Error('Contract not initialized');
    
    try {
      const stats = await this.contract.getStats();
      return {
        gameCounter: Number(stats[0]),
        prizePool: ethers.formatEther(stats[1]),
        totalVolume: ethers.formatEther(stats[2]),
        contractBalance: ethers.formatEther(stats[3])
      };
    } catch (error) {
      console.error('Failed to get contract stats:', error);
      throw error;
    }
  }

  // Get player's game history (encrypted numbers handled gracefully)
  async getPlayerGames(playerAddress) {
    if (!this.contract) throw new Error('Contract not initialized');
    
    try {
      const gameIds = await this.contract.getPlayerGames(playerAddress);
      const games = [];
      
      for (const gameId of gameIds) {
        const game = await this.contract.getGame(gameId);
        
        // Note: chosenNumber and luckyNumber are encrypted (euint8)
        // They will appear as large numbers - we can't display them directly
        // For now, we'll show placeholder values
        games.push({
          id: Number(gameId),
          player: game.player,
          betAmount: ethers.formatEther(game.betAmount),
          chosenNumber: 'encrypted', // Encrypted value
          luckyNumber: 'encrypted',  // Encrypted value
          payout: ethers.formatEther(game.payout),
          timestamp: new Date(Number(game.timestamp) * 1000),
          status: Number(game.status)
        });
      }
      
      return games.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Failed to get player games:', error);
      throw error;
    }
  }

  // Get minimum and maximum bet amounts
  async getBetLimits() {
    if (!this.contract) throw new Error('Contract not initialized');
    
    try {
      const minBet = await this.contract.MIN_BET();
      const maxBet = await this.contract.MAX_BET();
      
      return {
        min: ethers.formatEther(minBet),
        max: ethers.formatEther(maxBet)
      };
    } catch (error) {
      console.error('Failed to get bet limits:', error);
      throw error;
    }
  }

  // Get player's withdrawable balance (returns actual amount in ETH)
  async getWithdrawableBalance(playerAddress) {
    if (!this.contract) throw new Error('Contract not initialized');
    
    try {
      const balance = await this.contract.getWithdrawableBalance(playerAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Failed to get withdrawable balance:', error);
      return '0.0000';
    }
  }

  // Withdraw all available funds
  async withdraw() {
    if (!this.contract) throw new Error('Contract not initialized');
    
    try {
      const tx = await this.contract.withdraw({
        gasLimit: 500000 // Increased for FHEVM operations
      });
      
      console.log('Withdrawal transaction sent:', tx.hash);
      return tx;
    } catch (error) {
      console.error('Failed to withdraw:', error);
      throw error;
    }
  }

  // Withdraw specific amount
  async withdrawAmount(amountEth) {
    if (!this.contract) throw new Error('Contract not initialized');
    
    const amountWei = ethers.parseEther(amountEth.toString());
    
    try {
      const tx = await this.contract.withdrawAmount(amountWei, {
        gasLimit: 500000 // Increased for FHEVM operations
      });
      
      console.log('Withdrawal transaction sent:', tx.hash);
      return tx;
    } catch (error) {
      console.error('Failed to withdraw amount:', error);
      throw error;
    }
  }

  // Listen for game events
  onGameResult(callback) {
    if (!this.contract) throw new Error('Contract not initialized');
    
    // Remove any existing listeners first
    this.contract.removeAllListeners('GameResult');
    
    this.contract.on('GameResult', (gameId, player, chosenNumber, luckyNumber, payout, result, event) => {
      
      callback({
        gameId: Number(gameId),
        player,
        chosenNumber: Number(chosenNumber),
        luckyNumber: Number(luckyNumber),
        payout: ethers.formatEther(payout),
        result,
        transactionHash: event.transactionHash
      });
    });
    
  }

  // Listen for withdrawal events
  onWithdrawal(callback) {
    if (!this.contract) throw new Error('Contract not initialized');
    
    this.contract.on('WithdrawalMade', (player, amount, event) => {
      callback({
        player,
        amount: ethers.formatEther(amount),
        transactionHash: event.transactionHash
      });
    });
  }

  // Stop listening for events
  removeAllListeners() {
    if (this.contract) {
      this.contract.removeAllListeners();
    }
  }

  // Disconnect wallet
  disconnect() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
  }

  // Format address for display
  formatAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  // Format ETH amount for display
  formatEth(amount, decimals = 4) {
    try {
      // Handle null, undefined, or empty values
      if (amount === null || amount === undefined || amount === '') {
        return '0.0000';
      }
      
      // Convert to string for easier handling
      const amountStr = amount.toString();
      
      // If amount is already a string in ETH format, parse it
      if (amountStr.includes('.')) {
        const parsed = parseFloat(amountStr);
        return isNaN(parsed) ? '0.0000' : parsed.toFixed(decimals);
      }
      
      // If amount is in Wei (number or string without decimal), convert to ETH
      const weiAmount = BigInt(amountStr);
      const ethAmount = ethers.formatEther(weiAmount);
      return parseFloat(ethAmount).toFixed(decimals);
    } catch (error) {
      console.error('Error formatting ETH amount:', error, 'Amount:', amount);
      return '0.0000';
    }
  }
}

// Export singleton instance
export const web3Utils = new Web3Utils();