// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract IdentityRegistry {
    mapping(address => bytes) public publicKey;

    event IdentityRegistered(address indexed wallet, bytes publicKey, uint256 timestamp);

    function registerIdentity(bytes calldata _pubKey) external {
        publicKey[msg.sender] = _pubKey;
        emit IdentityRegistered(msg.sender, _pubKey, block.timestamp);
    }

    function getPublicKey(address _wallet) external view returns (bytes memory) {
        return publicKey[_wallet];
    }
}
