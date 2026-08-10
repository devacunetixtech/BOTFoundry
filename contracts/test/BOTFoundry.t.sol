// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {BOTFoundry} from "../src/BOTFoundry.sol";

/// @dev A contract that rejects all incoming native transfers, used to prove
///      the pull-payment model cannot be bricked by a rejecting party.
contract RejectingReceiver {
    receive() external payable {
        revert("I reject native tokens");
    }
}

contract MockFoundry is BOTFoundry {
    constructor(address payable _treasury) BOTFoundry(_treasury) {}
    function forceCredit(address account, uint256 amount) external {
        pendingWithdrawals[account] += amount;
    }
}

contract BOTFoundryTest is Test {
    BOTFoundry internal foundry;

    address internal owner = address(this);
    address payable internal treasury = payable(makeAddr("treasury"));
    address payable internal creator = payable(makeAddr("creator"));
    address payable internal user = payable(makeAddr("user"));

    uint256 internal constant PRICE = 1 ether;

    event AgentPaid(
        uint256 indexed requestId,
        uint256 indexed agentId,
        address indexed user,
        address creator,
        uint256 totalAmount,
        uint256 creatorRevenue,
        uint256 platformFee
    );

    function setUp() public {
        foundry = new BOTFoundry(treasury);
        vm.deal(user, 100 ether);
    }

    function _registerAgent() internal returns (uint256) {
        vm.prank(creator);
        return foundry.registerAgent("Solidity Guard", "audit", PRICE, "ipfs://meta");
    }
}
contract BOTFoundryPaymentTest is BOTFoundryTest {
    // ----- Registration -----

    function test_RegisterAgent_AssignsSequentialIds() public {
        uint256 id1 = _registerAgent();
        uint256 id2 = _registerAgent();
        assertEq(id1, 1);
        assertEq(id2, 2);
    }

    function test_RegisterAgent_RevertsOnEmptyName() public {
        vm.prank(creator);
        vm.expectRevert("Agent name cannot be empty");
        foundry.registerAgent("", "audit", PRICE, "ipfs://meta");
    }

    // ----- Payment credits the pull-payment ledger -----

    function test_Pay_CreditsCreatorAndTreasury() public {
        uint256 id = _registerAgent();

        uint256 treasuryBalanceBefore = treasury.balance;
        uint256 creatorBalanceBefore = creator.balance;

        vm.prank(user);
        foundry.payForAgentRequest{value: PRICE}(id);

        uint256 expectedFee = (PRICE * 5) / 100; // 5% default
        uint256 expectedRevenue = PRICE - expectedFee;

        assertEq(treasury.balance, treasuryBalanceBefore + expectedFee);
        assertEq(creator.balance, creatorBalanceBefore + expectedRevenue);
    }

    function test_Pay_RevertsOnInsufficientPayment() public {
        uint256 id = _registerAgent();
        vm.prank(user);
        vm.expectRevert("Insufficient payment for this agent request");
        foundry.payForAgentRequest{value: PRICE - 1}(id);
    }

    function test_Pay_RevertsWhenAgentMissing() public {
        vm.prank(user);
        vm.expectRevert("Agent does not exist");
        foundry.payForAgentRequest{value: PRICE}(999);
    }

    function test_Pay_RevertsWhenAgentInactive() public {
        uint256 id = _registerAgent();
        vm.prank(creator);
        foundry.updateAgent(id, "Solidity Guard", "audit", PRICE, "ipfs://meta", false);

        vm.prank(user);
        vm.expectRevert("Agent is currently paused or inactive");
        foundry.payForAgentRequest{value: PRICE}(id);
    }

    function test_Pay_EmitsAgentPaidWithChargedPrice() public {
        uint256 id = _registerAgent();
        uint256 expectedFee = (PRICE * 5) / 100;
        uint256 expectedRevenue = PRICE - expectedFee;

        vm.expectEmit(true, true, true, true);
        emit AgentPaid(1, id, user, creator, PRICE, expectedRevenue, expectedFee);

        vm.prank(user);
        foundry.payForAgentRequest{value: PRICE}(id);
    }

    // ----- SWC-02: overpayment refund -----

    function test_Pay_RefundsOverpaymentToLedger() public {
        uint256 id = _registerAgent();
        uint256 sent = PRICE + 9 ether;

        uint256 userBalanceBefore = user.balance;
        uint256 treasuryBalanceBefore = treasury.balance;
        uint256 creatorBalanceBefore = creator.balance;

        vm.prank(user);
        foundry.payForAgentRequest{value: sent}(id);

        uint256 expectedFee = (PRICE * 5) / 100;
        uint256 expectedRevenue = PRICE - expectedFee;

        // Fees still computed on PRICE, not on the full sent amount.
        assertEq(treasury.balance, treasuryBalanceBefore + expectedFee);
        assertEq(creator.balance, creatorBalanceBefore + expectedRevenue);
        // The 9 ether excess is refunded immediately to the user.
        assertEq(user.balance, userBalanceBefore - PRICE);
    }

    function test_Pay_FreeAgentCreditsNothing() public {
        vm.prank(creator);
        uint256 id = foundry.registerAgent("Free Bot", "chat", 0, "ipfs://meta");

        uint256 treasuryBalanceBefore = treasury.balance;
        uint256 creatorBalanceBefore = creator.balance;

        vm.prank(user);
        foundry.payForAgentRequest{value: 0}(id);

        assertEq(treasury.balance, treasuryBalanceBefore);
        assertEq(creator.balance, creatorBalanceBefore);
    }
}
contract BOTFoundryWithdrawTest is BOTFoundryTest {
    // ----- Withdrawal -----

    function test_Withdraw_TransfersAndZeroesBalance() public {
        MockFoundry f = new MockFoundry(treasury);
        f.forceCredit(creator, PRICE);
        vm.deal(address(f), PRICE);

        uint256 balanceBefore = creator.balance;
        vm.prank(creator);
        f.withdraw();

        assertEq(creator.balance, balanceBefore + PRICE);
        assertEq(f.pendingWithdrawals(creator), 0);
    }

    function test_Withdraw_RevertsWhenNothingOwed() public {
        vm.prank(creator);
        vm.expectRevert("No funds available to withdraw");
        foundry.withdraw();
    }

    function test_Withdraw_CannotDoubleClaim() public {
        MockFoundry f = new MockFoundry(treasury);
        f.forceCredit(creator, PRICE);
        vm.deal(address(f), PRICE);

        vm.prank(creator);
        f.withdraw();

        vm.prank(creator);
        vm.expectRevert("No funds available to withdraw");
        f.withdraw();
    }

    // ----- SWC-01: Direct failure on Rejecting Receivers -----

    function test_RejectingCreator_BricksPayments() public {
        // Creator is a contract that rejects native tokens.
        RejectingReceiver badCreator = new RejectingReceiver();
        vm.prank(address(badCreator));
        uint256 id = foundry.registerAgent("Bad", "audit", PRICE, "ipfs://meta");

        // Payment reverts because the direct transfer to the bad creator fails
        vm.prank(user);
        vm.expectRevert("Creator revenue transfer failed");
        foundry.payForAgentRequest{value: PRICE}(id);
    }

    function test_RejectingTreasury_BricksPayments() public {
        RejectingReceiver badTreasury = new RejectingReceiver();
        BOTFoundry f = new BOTFoundry(payable(address(badTreasury)));

        vm.prank(creator);
        uint256 id = f.registerAgent("Guard", "audit", PRICE, "ipfs://meta");

        // Payment reverts because the direct transfer to the treasury fails
        vm.prank(user);
        vm.expectRevert("Platform fee transfer failed");
        f.payForAgentRequest{value: PRICE}(id);
    }
}

contract BOTFoundryGovernanceTest is BOTFoundryTest {
    // ----- SWC-03: two-step ownership -----

    function test_TransferOwnership_IsTwoStep() public {
        address newOwner = makeAddr("newOwner");

        foundry.transferOwnership(newOwner);
        // Ownership has NOT changed yet.
        assertEq(foundry.owner(), owner);
        assertEq(foundry.pendingOwner(), newOwner);

        vm.prank(newOwner);
        foundry.acceptOwnership();
        assertEq(foundry.owner(), newOwner);
        assertEq(foundry.pendingOwner(), address(0));
    }

    function test_AcceptOwnership_OnlyPendingOwner() public {
        address newOwner = makeAddr("newOwner");
        foundry.transferOwnership(newOwner);

        vm.prank(user);
        vm.expectRevert("Only the pending owner can accept");
        foundry.acceptOwnership();
    }

    function test_TransferOwnership_OnlyOwner() public {
        vm.prank(user);
        vm.expectRevert("Only the contract owner can call this function");
        foundry.transferOwnership(user);
    }

    // ----- SWC-03: two-step treasury -----

    function test_SetTreasury_IsTwoStep() public {
        address payable newTreasury = payable(makeAddr("newTreasury"));

        foundry.setTreasury(newTreasury);
        assertEq(foundry.treasury(), treasury);
        assertEq(foundry.pendingTreasury(), newTreasury);

        vm.prank(newTreasury);
        foundry.acceptTreasury();
        assertEq(foundry.treasury(), newTreasury);
        assertEq(foundry.pendingTreasury(), address(0));
    }

    function test_SetPlatformFee_CapsAt20() public {
        vm.expectRevert("Platform fee cannot exceed 20%");
        foundry.setPlatformFeePercentage(21);

        foundry.setPlatformFeePercentage(20);
        assertEq(foundry.platformFeePercentage(), 20);
    }
}


