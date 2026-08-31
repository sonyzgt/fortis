// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title PonspotAirdrop
 * @notice Dedicated on-chain Airdrop Vault contract for PONSPOT token
 * @dev Enforces strictly 1-time claim per wallet address.
 *      Admin funds the pool with PONSPOT tokens via deposit().
 *      Users call claim() directly on-chain with wallet signature.
 */
contract PonspotAirdrop {
    IERC20 public immutable ponspotToken;
    address public owner;
    uint256 public claimReward;

    mapping(address => bool) public hasClaimed;
    uint256 public totalClaimedCount;
    uint256 public totalDistributedPonspot;

    event AirdropClaimed(address indexed recipient, uint256 amount, uint256 timestamp);
    event PoolFunded(address indexed funder, uint256 amount, uint256 newBalance);
    event RewardUpdated(uint256 newReward);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "PonspotAirdrop: caller is not the owner");
        _;
    }

    constructor(address _ponspotToken, uint256 _initialReward) {
        require(_ponspotToken != address(0), "Zero token address");
        ponspotToken = IERC20(_ponspotToken);
        owner = msg.sender;
        claimReward = _initialReward > 0 ? _initialReward : 100 ether;
    }

    /**
     * @notice Claim airdrop directly on-chain (Strictly 1x claim per wallet address)
     */
    function claim() external {
        require(!hasClaimed[msg.sender], "PonspotAirdrop: address already claimed");
        uint256 contractBal = ponspotToken.balanceOf(address(this));
        require(contractBal >= claimReward, "PonspotAirdrop: insufficient vault balance");
        require(claimReward > 0, "PonspotAirdrop: reward is zero");

        hasClaimed[msg.sender] = true;
        totalClaimedCount += 1;
        totalDistributedPonspot += claimReward;

        bool sent = ponspotToken.transfer(msg.sender, claimReward);
        require(sent, "PonspotAirdrop: token transfer failed");

        emit AirdropClaimed(msg.sender, claimReward, block.timestamp);
    }

    /**
     * @notice Admin deposit to fund the airdrop vault
     */
    function deposit(uint256 amount) external {
        require(amount > 0, "PonspotAirdrop: amount must be > 0");
        bool ok = ponspotToken.transferFrom(msg.sender, address(this), amount);
        require(ok, "PonspotAirdrop: transferFrom failed");
        emit PoolFunded(msg.sender, amount, ponspotToken.balanceOf(address(this)));
    }

    /**
     * @notice Admin updates claim reward amount
     */
    function setClaimReward(uint256 newReward) external onlyOwner {
        require(newReward > 0, "PonspotAirdrop: reward must be > 0");
        claimReward = newReward;
        emit RewardUpdated(newReward);
    }

    /**
     * @notice View contract token balance
     */
    function getPoolBalance() external view returns (uint256) {
        return ponspotToken.balanceOf(address(this));
    }

    /**
     * @notice Check if a user address has already claimed
     */
    function hasUserClaimed(address user) external view returns (bool) {
        return hasClaimed[user];
    }

    /**
     * @notice Emergency withdraw remaining tokens (Owner only)
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(amount > 0, "PonspotAirdrop: amount must be > 0");
        uint256 bal = ponspotToken.balanceOf(address(this));
        uint256 withdrawAmt = amount > bal ? bal : amount;
        ponspotToken.transfer(owner, withdrawAmt);
    }

    /**
     * @notice Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
