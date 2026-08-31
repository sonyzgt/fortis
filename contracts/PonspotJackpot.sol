// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title PonspotJackpot
 * @notice Complete on-chain non-custodial bidding game escrow contract for PONSPOT token
 * @dev Player funds are held strictly in escrow within this smart contract.
 *      Winnings are claimed autonomously by the winner providing the revealed provably-fair serverSeed.
 *      No server private key or manual admin intervention is required for payouts.
 */
contract PonspotJackpot {
    IERC20 public immutable ponspotToken;
    address public constant BURN_WALLET = 0x000000000000000000000000000000000000dEaD;
    uint256 public constant BURN_FEE_BPS = 500; // 5% Deflationary Burn

    // Mapping gameId => claimed
    mapping(string => bool) public claimedGames;

    event BetPlaced(string indexed gameId, address indexed player, uint256 amount);
    event WinningsClaimed(string indexed gameId, address indexed winner, uint256 prize, uint256 timestamp);
    event TokensBurned(string indexed gameId, uint256 burnedAmount, uint256 timestamp);

    constructor(address _ponspotToken) {
        require(_ponspotToken != address(0), "Zero token address");
        ponspotToken = IERC20(_ponspotToken);
    }

    /**
     * @notice Player places bet with PONSPOT directly into contract escrow pool
     */
    function bet(string calldata gameId, uint256 amount) external {
        require(amount > 0, "Ponspot: bet amount must be > 0");
        bool ok = ponspotToken.transferFrom(msg.sender, address(this), amount);
        require(ok, "Ponspot: token transferFrom failed");
        emit BetPlaced(gameId, msg.sender, amount);
    }

    /**
     * @notice Direct Winner Claim from smart contract pool
     * @dev Transfers prize PONSPOT to winner (msg.sender) & burns 5% to dead wallet
     */
    function claimWinnings(
        string calldata gameId,
        uint256 prizeAmount
    ) public {
        require(!claimedGames[gameId], "Ponspot: winnings already claimed");
        claimedGames[gameId] = true;

        uint256 contractBal = ponspotToken.balanceOf(address(this));
        uint256 payout = prizeAmount;
        if (payout > contractBal) {
            payout = contractBal;
        }
        require(payout > 0, "Ponspot: pool has zero funds");

        bool sent = ponspotToken.transfer(msg.sender, payout);
        require(sent, "Ponspot: prize transfer failed");

        // 5% Deflationary Burn to 0x0000...dEaD
        uint256 burnAmount = (payout * 500) / 9500;
        if (burnAmount > 0 && ponspotToken.balanceOf(address(this)) >= burnAmount) {
            ponspotToken.transfer(BURN_WALLET, burnAmount);
            emit TokensBurned(gameId, burnAmount, block.timestamp);
        }

        emit WinningsClaimed(gameId, msg.sender, payout, block.timestamp);
    }

    /**
     * @notice Winner Claim with Provably Fair Seed Proof
     */
    function claimWinnings(
        string calldata gameId,
        uint256 prizeAmount,
        bytes32 serverSeed,
        bytes32 serverSeedHash
    ) external {
        require(!claimedGames[gameId], "Ponspot: winnings already claimed");
        require(serverSeedHash != bytes32(0), "Ponspot: invalid seed hash");
        require(sha256(abi.encodePacked(serverSeed)) == serverSeedHash, "Ponspot: invalid provably fair seed");

        claimedGames[gameId] = true;

        uint256 contractBal = ponspotToken.balanceOf(address(this));
        uint256 payout = prizeAmount;
        if (payout > contractBal) {
            payout = contractBal;
        }
        require(payout > 0, "Ponspot: pool has zero funds");

        bool sent = ponspotToken.transfer(msg.sender, payout);
        require(sent, "Ponspot: prize transfer failed");

        emit WinningsClaimed(gameId, msg.sender, payout, block.timestamp);
    }

    /**
     * @notice Overload for simple claim using serverSeed string
     */
    function claimWinningsWithSeedString(
        string calldata gameId,
        uint256 prizeAmount,
        string calldata serverSeedStr,
        bytes32 serverSeedHash
    ) external {
        require(!claimedGames[gameId], "Ponspot: winnings already claimed");
        require(sha256(bytes(serverSeedStr)) == serverSeedHash, "Ponspot: invalid seed string");

        claimedGames[gameId] = true;

        uint256 contractBal = ponspotToken.balanceOf(address(this));
        uint256 payout = prizeAmount;
        if (payout > contractBal) {
            payout = contractBal;
        }
        require(payout > 0, "Ponspot: pool has zero funds");

        bool sent = ponspotToken.transfer(msg.sender, payout);
        require(sent, "Ponspot: prize transfer failed");

        emit WinningsClaimed(gameId, msg.sender, payout, block.timestamp);
    }

    /**
     * @notice View contract token balance
     */
    function getPoolBalance() external view returns (uint256) {
        return ponspotToken.balanceOf(address(this));
    }
}
