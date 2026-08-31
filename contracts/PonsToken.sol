// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PonsToken (PONS)
 * @notice ERC-20 Betting Currency for Ponscore Bidding Game System
 * @dev Compatible with EVM & Robinhood Chain (Arbitrum L2)
 */
contract PonsToken {
    string public constant name = "Ponscore Token";
    string public constant symbol = "PONS";
    uint8 public constant decimals = 18;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(uint256 initialSupply) {
        if (initialSupply > 0) {
            _mint(msg.sender, initialSupply);
        }
    }

    function transfer(address to, uint256 value) external returns (bool) {
        require(to != address(0), "PONS: zero address");
        require(balanceOf[msg.sender] >= value, "PONS: insufficient balance");

        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        require(spender != address(0), "PONS: zero address");
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        require(to != address(0), "PONS: zero address");
        require(balanceOf[from] >= value, "PONS: insufficient balance");
        require(allowance[from][msg.sender] >= value, "PONS: insufficient allowance");

        if (allowance[from][msg.sender] != type(uint256).max) {
            allowance[from][msg.sender] -= value;
        }

        balanceOf[from] -= value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);
        return true;
    }

    /**
     * @notice Testnet / Gaming Faucet: Players can request 10,000 PONS for testing
     */
    function faucet(address recipient, uint256 amount) external {
        require(amount <= 50000 * 10**18, "PONS: faucet limit 50k PONS");
        _mint(recipient, amount);
    }

    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "PONS: zero address");
        totalSupply += amount;
        balanceOf[account] += amount;
        emit Transfer(address(0), account, amount);
    }
}
