// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/BOTFoundry.sol";

contract DeployBOTFoundry is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address treasuryAddress = vm.envAddress("TREASURY_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        BOTFoundry foundry = new BOTFoundry(payable(treasuryAddress));
        
        vm.stopBroadcast();
        
        console.log("BOTFoundry deployed to:", address(foundry));
    }
}
