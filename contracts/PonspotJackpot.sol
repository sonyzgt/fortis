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
 *      Admin can withdraw any ERC20 token from this contract (emergency rescue).
 */
contract PonspotJackpot {
    IERC20 public immutable ponspotToken;
    address public admin;
    address public constant BURN_WALLET = 0x000000000000000000000000000000000000dEaD;
    uint256 public constant BURN_FEE_BPS = 500; // 5% Deflationary Burn

    // Mapping gameId => claimed
    mapping(string => bool) public claimedGames;

    event BetPlaced(string indexed gameId, address indexed player, uint256 amount);
    event WinningsClaimed(string indexed gameId, address indexed winner, uint256 prize, uint256 timestamp);
    event TokensBurned(string indexed gameId, uint256 burnedAmount, uint256 timestamp);
    event AdminWithdraw(address indexed token, address indexed to, uint256 amount);
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Ponspot: caller is not admin");
        _;
    }

    constructor(address _ponspotToken) {
        require(_ponspotToken != address(0), "Zero token address");
        ponspotToken = IERC20(_ponspotToken);
        admin = msg.sender;
    }

    /**
     * @notice Transfer admin rights to a new address
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Zero address");
        emit AdminTransferred(admin, newAdmin);
        admin = newAdmin;
    }

    /**
     * @notice Emergency: Admin can withdraw ANY ERC20 token from this contract
     * @dev Use this to recover tokens that were sent to the contract by mistake
     */
    function adminWithdraw(address tokenAddr, uint256 amount) external onlyAdmin {
        require(tokenAddr != address(0), "Zero token address");
        uint256 bal = IERC20(tokenAddr).balanceOf(address(this));
        uint256 withdrawAmt = amount > bal ? bal : amount;
        require(withdrawAmt > 0, "Nothing to withdraw");
        bool ok = IERC20(tokenAddr).transfer(admin, withdrawAmt);
        require(ok, "Token transfer failed");
        emit AdminWithdraw(tokenAddr, admin, withdrawAmt);
    }

    /**
     * @notice Admin withdraw of native ponspotToken pool funds
     */
    function adminWithdrawPool(uint256 amount) external onlyAdmin {
        uint256 bal = ponspotToken.balanceOf(address(this));
        uint256 withdrawAmt = amount > bal ? bal : amount;
        require(withdrawAmt > 0, "Pool has zero funds");
        bool ok = ponspotToken.transfer(admin, withdrawAmt);
        require(ok, "Token transfer failed");
        emit AdminWithdraw(address(ponspotToken), admin, withdrawAmt);
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
     * @dev Winner receives 95% of prizeAmount, 5% is burned to dead wallet
     */
    function claimWinnings(
        string calldata gameId,
        uint256 prizeAmount
    ) public {
        require(!claimedGames[gameId], "Ponspot: winnings already claimed");
        claimedGames[gameId] = true;

        uint256 contractBal = ponspotToken.balanceOf(address(this));
        uint256 totalPayout = prizeAmount;
        if (totalPayout > contractBal) {
            totalPayout = contractBal;
        }
        require(totalPayout > 0, "Ponspot: pool has zero funds");

        // 5% Deflationary Burn, 95% to winner — split from totalPayout
        uint256 burnAmount = (totalPayout * 500) / 10000;   // 5%
        uint256 winnerAmount = totalPayout - burnAmount;     // 95%

        // Transfer 95% to winner
        bool sent = ponspotToken.transfer(msg.sender, winnerAmount);
        require(sent, "Ponspot: prize transfer failed");

        // Burn 5% to dead wallet
        if (burnAmount > 0) {
            ponspotToken.transfer(BURN_WALLET, burnAmount);
            emit TokensBurned(gameId, burnAmount, block.timestamp);
        }

        emit WinningsClaimed(gameId, msg.sender, winnerAmount, block.timestamp);
    }

    /**
     * @notice Winner Claim with Provably Fair Seed Proof
     * @dev Winner receives 95% of prizeAmount, 5% is burned
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
        uint256 totalPayout = prizeAmount;
        if (totalPayout > contractBal) {
            totalPayout = contractBal;
        }
        require(totalPayout > 0, "Ponspot: pool has zero funds");

        // 5% Deflationary Burn, 95% to winner
        uint256 burnAmount = (totalPayout * 500) / 10000;
        uint256 winnerAmount = totalPayout - burnAmount;

        bool sent = ponspotToken.transfer(msg.sender, winnerAmount);
        require(sent, "Ponspot: prize transfer failed");

        if (burnAmount > 0) {
            ponspotToken.transfer(BURN_WALLET, burnAmount);
            emit TokensBurned(gameId, burnAmount, block.timestamp);
        }

        emit WinningsClaimed(gameId, msg.sender, winnerAmount, block.timestamp);
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
        uint256 totalPayout = prizeAmount;
        if (totalPayout > contractBal) {
            totalPayout = contractBal;
        }
        require(totalPayout > 0, "Ponspot: pool has zero funds");

        // 5% Deflationary Burn, 95% to winner
        uint256 burnAmount = (totalPayout * 500) / 10000;
        uint256 winnerAmount = totalPayout - burnAmount;

        bool sent = ponspotToken.transfer(msg.sender, winnerAmount);
        require(sent, "Ponspot: prize transfer failed");

        if (burnAmount > 0) {
            ponspotToken.transfer(BURN_WALLET, burnAmount);
            emit TokensBurned(gameId, burnAmount, block.timestamp);
        }

        emit WinningsClaimed(gameId, msg.sender, winnerAmount, block.timestamp);
    }

    /**
     * @notice View contract token balance (internal ponspotToken)
     */
    function getPoolBalance() external view returns (uint256) {
        return ponspotToken.balanceOf(address(this));
    }

    /**
     * @notice View balance of ANY token in this contract (for diagnostics)
     */
    function getTokenBalance(address tokenAddr) external view returns (uint256) {
        return IERC20(tokenAddr).balanceOf(address(this));
    }
}
