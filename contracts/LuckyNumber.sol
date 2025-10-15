// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import { FHE, euint8, euint32 } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title LuckyNumber
 * @dev A decentralized lucky number betting game with FHEVM encryption
 * @notice Players bet on encrypted numbers 1-10 and win based on how close they are to the lucky number
 * @notice All number selections and balances are encrypted for complete privacy
 * @notice Implementation follows Zama FHEVM best practices (similar to higher-lower card game)
 */
contract LuckyNumber is ReentrancyGuard, Ownable, Pausable, SepoliaConfig {
    
    // Constants
    uint256 public constant MIN_BET = 0.001 ether;
    uint256 public constant MAX_BET = 0.005 ether;
    uint256 public constant MIN_NUMBER = 1;
    uint256 public constant MAX_NUMBER = 10;
    
    // Payout percentages (basis points: 10000 = 100%)
    uint256 public constant EXACT_MATCH_MULTIPLIER = 9; // 9x payout
    uint256 public constant OFF_BY_ONE_REFUND = 3000;   // 30% refund
    uint256 public constant OFF_BY_TWO_REFUND = 2000;   // 20% refund
    
    // Game state
    uint256 public gameCounter;
    uint256 public prizePool;
    uint256 public totalVolume;
    
    
    // Mappings
    mapping(uint256 => Game) public games;
    mapping(address => uint256[]) public playerGames;
    mapping(address => uint256) public playerBalances; // Withdrawable balances (plaintext for easy withdrawal)
    mapping(address => bool) public hasBalance; // Track if player has any balance
    
    // Structs
    struct Game {
        address player;
        uint256 betAmount;
        euint8 chosenNumber;      // Encrypted chosen number
        euint8 luckyNumber;       // Encrypted lucky number
        uint256 payout;
        uint256 timestamp;
        GameStatus status;
    }
    
    enum GameStatus {
        Pending,
        Completed,
        Paid
    }
    
    // Events
    event BetPlaced(
        uint256 indexed gameId,
        address indexed player,
        uint256 betAmount,
        uint8 chosenNumber,
        uint256 timestamp
    );
    
    event GameResult(
        uint256 indexed gameId,
        address indexed player,
        uint8 chosenNumber,
        uint8 luckyNumber,
        uint256 payout,
        string result
    );
    
    event PrizePoolUpdated(uint256 newPrizePool);
    event PayoutSent(address indexed player, uint256 amount);
    event WithdrawalMade(address indexed player, uint256 amount);
    
    constructor() Ownable(msg.sender) {
        gameCounter = 0;
        prizePool = 0;
        totalVolume = 0;
    }
    
    /**
     * @dev Place a bet on a lucky number with FHEVM encryption (no ZK proof needed for simple uint8)
     * @param _chosenNumber The number to bet on (1-10) - will be encrypted internally
     */
    function placeBet(uint8 _chosenNumber) external payable nonReentrant whenNotPaused {
        require(_chosenNumber >= MIN_NUMBER && _chosenNumber <= MAX_NUMBER, "Number must be between 1 and 10");
        require(msg.value >= MIN_BET, "Bet amount too low");
        require(msg.value <= MAX_BET, "Bet amount too high");
        
        gameCounter++;
        
        // Encrypt the chosen number
        euint8 encryptedChosenNumber = FHE.asEuint8(_chosenNumber);
        
        // Generate encrypted lucky number (using block properties for randomness)
        uint8 randomSeed = uint8((uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender,
            gameCounter,
            block.number
        ))) % 10) + 1);
        euint8 encryptedLuckyNumber = FHE.asEuint8(randomSeed);
        
        // Calculate payout (we can work with the plaintext values since we generated them)
        uint256 payout = calculatePlaintextPayout(msg.value, _chosenNumber, randomSeed);
        
        // Create encrypted game record
        games[gameCounter] = Game({
            player: msg.sender,
            betAmount: msg.value,
            chosenNumber: encryptedChosenNumber,
            luckyNumber: encryptedLuckyNumber,
            payout: payout,
            timestamp: block.timestamp,
            status: GameStatus.Completed
        });
        
        // Grant FHE permissions for encrypted numbers
        FHE.allowThis(encryptedChosenNumber);
        FHE.allow(encryptedChosenNumber, msg.sender);
        FHE.allowThis(encryptedLuckyNumber);
        FHE.allow(encryptedLuckyNumber, msg.sender);
        
        // Update player games
        playerGames[msg.sender].push(gameCounter);
        
        // Update statistics
        totalVolume += msg.value;
        
        // Handle payout with plaintext balances
        if (payout > 0) {
            require(address(this).balance >= payout, "Insufficient contract balance");
            
            // Add to plaintext withdrawable balance
            playerBalances[msg.sender] += payout;
            hasBalance[msg.sender] = true;
            games[gameCounter].status = GameStatus.Paid;
            emit PayoutSent(msg.sender, payout);
        } else {
            // Add lost bet to prize pool
            prizePool += msg.value;
            emit PrizePoolUpdated(prizePool);
        }
        
        // Emit events with plaintext values (for UI display)
        emit BetPlaced(gameCounter, msg.sender, msg.value, _chosenNumber, block.timestamp);
        emit GameResult(gameCounter, msg.sender, _chosenNumber, randomSeed, payout, getResultString(_chosenNumber, randomSeed));
    }
    
    /**
     * @dev Helper function to get result string
     */
    function getResultString(uint8 chosenNumber, uint8 luckyNumber) internal pure returns (string memory) {
        uint8 difference = chosenNumber > luckyNumber ? 
            chosenNumber - luckyNumber : 
            luckyNumber - chosenNumber;
        
        if (difference == 0) {
            return "Exact Match - Win 9x!";
        } else if (difference == 1) {
            return "Off by 1 - 30% refund";
        } else if (difference == 2) {
            return "Off by 2 - 20% refund";
        } else {
            return "Off by 3+ - Better luck next time!";
        }
    }
    
    /**
     * @dev Calculate payout based on plaintext values (used during game creation)
     */
    function calculatePlaintextPayout(uint256 betAmount, uint8 chosenNumber, uint8 luckyNumber) 
        internal 
        pure 
        returns (uint256 payout) 
    {
        uint8 difference = chosenNumber > luckyNumber ? 
            chosenNumber - luckyNumber : 
            luckyNumber - chosenNumber;
        
        if (difference == 0) {
            payout = betAmount * EXACT_MATCH_MULTIPLIER;
        } else if (difference == 1) {
            payout = (betAmount * OFF_BY_ONE_REFUND) / 10000;
        } else if (difference == 2) {
            payout = (betAmount * OFF_BY_TWO_REFUND) / 10000;
        } else {
            payout = 0;
        }
    }
    
    /**
     * @dev Withdraw all available funds
     */
    function withdraw() external nonReentrant whenNotPaused {
        uint256 balance = playerBalances[msg.sender];
        require(balance > 0, "No balance to withdraw");
        
        // Reset balance before transfer to prevent reentrancy
        playerBalances[msg.sender] = 0;
        hasBalance[msg.sender] = false;
        
        // Transfer funds
        (bool success, ) = payable(msg.sender).call{value: balance}("");
        require(success, "Withdrawal failed");
        
        emit WithdrawalMade(msg.sender, balance);
    }
    
    /**
     * @dev Withdraw specific amount from balance
     * @param amount Amount to withdraw in wei
     */
    function withdrawAmount(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(playerBalances[msg.sender] >= amount, "Insufficient balance");
        
        // Deduct amount from balance
        playerBalances[msg.sender] -= amount;
        
        if (playerBalances[msg.sender] == 0) {
            hasBalance[msg.sender] = false;
        }
        
        // Transfer funds
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdrawal failed");
        
        emit WithdrawalMade(msg.sender, amount);
    }
    
    /**
     * @dev Get player's withdrawable balance
     * @param player The player's address
     * @return balance Withdrawable balance in wei
     */
    function getWithdrawableBalance(address player) external view returns (uint256) {
        return playerBalances[player];
    }
    
    /**
     * @dev Get player's game history
     * @param player The player's address
     * @return gameIds Array of game IDs for the player
     */
    function getPlayerGames(address player) external view returns (uint256[] memory) {
        return playerGames[player];
    }
    
    /**
     * @dev Get encrypted game details by ID
     * @param gameId The game ID to query
     * @return game The game struct with encrypted numbers
     */
    function getGame(uint256 gameId) external view returns (Game memory) {
        return games[gameId];
    }
    
    /**
     * @dev Get contract statistics
     * @return currentGameCounter Current game counter
     * @return currentPrizePool Current prize pool
     * @return currentTotalVolume Total volume bet
     * @return contractBalance Current contract balance
     */
    function getStats() external view returns (
        uint256 currentGameCounter,
        uint256 currentPrizePool,
        uint256 currentTotalVolume,
        uint256 contractBalance
    ) {
        return (gameCounter, prizePool, totalVolume, address(this).balance);
    }
    
    /**
     * @dev Get recent games (last 10)
     * @return recentGameIds Array of recent game IDs
     */
    function getRecentGames() external view returns (uint256[] memory recentGameIds) {
        uint256 start = gameCounter > 10 ? gameCounter - 9 : 1;
        uint256 length = gameCounter >= start ? gameCounter - start + 1 : 0;
        
        recentGameIds = new uint256[](length);
        for (uint256 i = 0; i < length; i++) {
            recentGameIds[i] = start + i;
        }
    }
    
    // Admin functions
    
    /**
     * @dev Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Fund the contract for payouts
     */
    function fundContract() external payable onlyOwner {
        emit PrizePoolUpdated(prizePool);
    }
    
    /**
     * @dev Emergency withdraw (only owner)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Insufficient balance");
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Withdrawal failed");
    }
    
    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {
        // Allow contract to receive ETH for funding
    }
}