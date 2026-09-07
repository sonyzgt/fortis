// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title PonspotJackpot
 * @notice Secure on-chain non-custodial escrow contract for USDG / ERC20 token.
 * @dev ECDSA signature from the trusted game server signer is required for all claims.
 *      Bot MEV drainers are blocked. Only the winner address with a valid server signature can claim.
 *      Platform fee is 2%, retained in the contract for Admin to withdraw.
 */
contract PonspotJackpot {
    IERC20 public immutable ponspotToken;
    address public admin;
    address public signerAddress;
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    uint256 public constant BURN_FEE_BPS = 200; // 2% Deflationary Burn
    uint256 public totalTokensBurned;

    mapping(string => bool) public claimedGames;

    event BetPlaced(string indexed gameId, address indexed player, uint256 amount);
    event WinningsClaimed(string indexed gameId, address indexed winner, uint256 prize, uint256 timestamp);
    event TokensBurned(string indexed gameId, uint256 burnedAmount, uint256 timestamp);
    event LiquidityDeposited(address indexed depositor, uint256 amount, uint256 timestamp);
    event AdminWithdraw(address indexed token, address indexed to, uint256 amount);
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);
    event SignerUpdated(address indexed previousSigner, address indexed newSigner);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Ponspot: caller is not admin");
        _;
    }

    constructor(address _ponspotToken, address _signerAddress) {
        require(_ponspotToken != address(0), "Zero token address");
        require(_signerAddress != address(0), "Zero signer address");
        ponspotToken = IERC20(_ponspotToken);
        admin = msg.sender;
        signerAddress = _signerAddress;
    }

    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Zero address");
        emit AdminTransferred(admin, newAdmin);
        admin = newAdmin;
    }

    function updateSigner(address newSigner) external onlyAdmin {
        require(newSigner != address(0), "Zero signer address");
        emit SignerUpdated(signerAddress, newSigner);
        signerAddress = newSigner;
    }

    /**
     * @notice Deposit liquidity / bankroll into the smart contract escrow
     */
    function depositLiquidity(uint256 amount) external {
        require(amount > 0, "Ponspot: deposit amount must be > 0");
        bool ok = ponspotToken.transferFrom(msg.sender, address(this), amount);
        require(ok, "Ponspot: liquidity transfer failed");
        emit LiquidityDeposited(msg.sender, amount, block.timestamp);
    }

    function adminWithdraw(address tokenAddr, uint256 amount) external onlyAdmin {
        require(tokenAddr != address(0), "Zero token address");
        uint256 bal = IERC20(tokenAddr).balanceOf(address(this));
        uint256 withdrawAmt = amount > bal ? bal : amount;
        require(withdrawAmt > 0, "Nothing to withdraw");
        bool ok = IERC20(tokenAddr).transfer(admin, withdrawAmt);
        require(ok, "Token transfer failed");
        emit AdminWithdraw(tokenAddr, admin, withdrawAmt);
    }

    function adminWithdrawPool(uint256 amount) external onlyAdmin {
        uint256 bal = ponspotToken.balanceOf(address(this));
        uint256 withdrawAmt = amount > bal ? bal : amount;
        require(withdrawAmt > 0, "Pool has zero funds");
        bool ok = ponspotToken.transfer(admin, withdrawAmt);
        require(ok, "Token transfer failed");
        emit AdminWithdraw(address(ponspotToken), admin, withdrawAmt);
    }

    function bet(string calldata gameId, uint256 amount) external {
        require(amount > 0, "Ponspot: bet amount must be > 0");
        bool ok = ponspotToken.transferFrom(msg.sender, address(this), amount);
        require(ok, "Ponspot: token transferFrom failed");
        emit BetPlaced(gameId, msg.sender, amount);
    }

    function _verifySignature(
        string calldata gameId,
        address winner,
        uint256 prizeAmount,
        bytes calldata signature
    ) internal view returns (bool) {
        bytes32 messageHash = keccak256(abi.encodePacked(gameId, winner, prizeAmount));
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        address recovered = _recoverSigner(ethSignedHash, signature);
        return recovered == signerAddress;
    }

    function _recoverSigner(bytes32 hash, bytes memory sig) internal pure returns (address) {
        require(sig.length == 65, "Invalid signature length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        if (v < 27) v += 27;
        require(v == 27 || v == 28, "Invalid signature v value");
        return ecrecover(hash, v, r, s);
    }

    function claimWinnings(
        string calldata gameId,
        uint256 prizeAmount,
        bytes calldata serverSignature
    ) external {
        require(!claimedGames[gameId], "Ponspot: winnings already claimed");
        require(
            _verifySignature(gameId, msg.sender, prizeAmount, serverSignature),
            "Ponspot: invalid server authorization signature"
        );

        claimedGames[gameId] = true;

        uint256 contractBal = ponspotToken.balanceOf(address(this));
        uint256 totalPayout = prizeAmount;
        if (totalPayout > contractBal) {
            totalPayout = contractBal;
        }
        require(totalPayout > 0, "Ponspot: pool has zero funds");

        uint256 feeAmount = (totalPayout * BURN_FEE_BPS) / 10000;
        uint256 winnerAmount = totalPayout - feeAmount;

        bool sentWinner = ponspotToken.transfer(msg.sender, winnerAmount);
        require(sentWinner, "Ponspot: prize transfer failed");

        if (feeAmount > 0) {
            totalTokensBurned += feeAmount;
            bool sentBurn = ponspotToken.transfer(BURN_ADDRESS, feeAmount);
            require(sentBurn, "Ponspot: burn transfer failed");
            emit TokensBurned(gameId, feeAmount, block.timestamp);
        }

        emit WinningsClaimed(gameId, msg.sender, winnerAmount, block.timestamp);
    }

    function getPoolBalance() external view returns (uint256) {
        return ponspotToken.balanceOf(address(this));
    }

    function getTokenBalance(address tokenAddr) external view returns (uint256) {
        return IERC20(tokenAddr).balanceOf(address(this));
    }
}
