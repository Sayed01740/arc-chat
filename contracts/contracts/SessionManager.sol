// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract SessionManager {
    address public owner;
    IERC20 public usdcToken;
    uint256 public hourlyRate = 1000; // 0.001 USDC (assuming 6 decimals)

    event SessionExtended(address indexed user, uint256 timestamp);
    event RateUpdated(uint256 newRate);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _usdcToken) {
        owner = msg.sender;
        usdcToken = IERC20(_usdcToken);
    }

    function setHourlyRate(uint256 _rate) external onlyOwner {
        hourlyRate = _rate;
        emit RateUpdated(_rate);
    }

    function paySessionFee(uint256 amount) external {
        require(amount >= hourlyRate, "Insufficient fee");
        
        // Transfer USDC from user to this contract
        // IMPORTANT: User must Approve this contract address in the USDC contract first!
        // The frontend should handle the approval flow or error message.
        bool success = usdcToken.transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer failed");

        emit SessionExtended(msg.sender, block.timestamp);
    }

    // Allow native currency payment as fallback
    function extendSession() external payable {
        // Assume any positive value is enough for now or set a price
        require(msg.value > 0, "No value sent");
        emit SessionExtended(msg.sender, block.timestamp);
    }

    function withdrawToken() external onlyOwner {
        uint256 bal = usdcToken.balanceOf(address(this));
        require(bal > 0, "No tokens");
        usdcToken.transfer(owner, bal);
    }

    function withdrawNative() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
}
