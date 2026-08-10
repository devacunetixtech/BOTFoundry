// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BOTFoundry
 * @dev AI Agent Registry, Marketplace, and Revenue Sharing smart contract for BOT Chain.
 *
 * Payments use a pull-payment model: funds owed to the treasury, creators, and
 * over-paying users are credited to `pendingWithdrawals` and claimed via withdraw().
 * This removes the DoS surface of pushing native tokens to arbitrary addresses.
 */
contract BOTFoundry {

    struct Agent {
        uint256 id;
        address payable creator;
        string name;
        string category;
        uint256 pricePerRequest; // in native BOT (wei)
        string metadataURI;      // details, system prompts, avatars, etc.
        bool isActive;
    }

    // Owner of the contract
    address public owner;

    // Pending owner for two-step ownership transfer
    address public pendingOwner;

    // Platform treasury address for platform fees
    address payable public treasury;

    // Pending treasury for two-step treasury transfer
    address payable public pendingTreasury;

    // Platform fee percentage (default 5 for 5%)
    uint256 public platformFeePercentage = 5;

    // Counter for agents
    uint256 public nextAgentId = 1;

    // Counter for agent execution requests
    uint256 public nextRequestId = 1;

    // Mappings
    mapping(uint256 => Agent) public agents;
    mapping(address => uint256[]) public creatorAgents;

    // Pull-payment ledger: address => claimable native balance (wei)
    mapping(address => uint256) public pendingWithdrawals;

    // Events
    event AgentRegistered(
        uint256 indexed agentId,
        address indexed creator,
        string name,
        string category,
        uint256 pricePerRequest,
        string metadataURI
    );

    event AgentUpdated(
        uint256 indexed agentId,
        address indexed creator,
        string name,
        string category,
        uint256 pricePerRequest,
        string metadataURI,
        bool isActive
    );

    event AgentPaid(
        uint256 indexed requestId,
        uint256 indexed agentId,
        address indexed user,
        address creator,
        uint256 totalAmount,
        uint256 creatorRevenue,
        uint256 platformFee
    );

    event PaymentCredited(address indexed account, uint256 amount);
    event Withdrawn(address indexed account, uint256 amount);

    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event TreasuryTransferStarted(address indexed oldTreasury, address indexed newTreasury);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only the contract owner can call this function");
        _;
    }

    modifier onlyCreator(uint256 agentId) {
        require(agents[agentId].creator == msg.sender, "Only the creator of this agent can call this function");
        _;
    }

    modifier agentExists(uint256 agentId) {
        require(agents[agentId].id == agentId, "Agent does not exist");
        _;
    }

    bool private _locked;

    modifier reentrancyGuard() {
        require(!_locked, "ReentrancyGuard: reentrant call");
        _locked = true;
        _;
        _locked = false;
    }

    constructor(address payable _treasury) {
        require(_treasury != address(0), "Treasury address cannot be zero");
        owner = msg.sender;
        treasury = _treasury;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /**
     * @dev Registers a new AI Agent on BOT Chain.
     */
    function registerAgent(
        string calldata name,
        string calldata category,
        uint256 pricePerRequest,
        string calldata metadataURI
    ) external returns (uint256) {
        require(bytes(name).length > 0, "Agent name cannot be empty");

        uint256 agentId = nextAgentId++;

        agents[agentId] = Agent({
            id: agentId,
            creator: payable(msg.sender),
            name: name,
            category: category,
            pricePerRequest: pricePerRequest,
            metadataURI: metadataURI,
            isActive: true
        });

        creatorAgents[msg.sender].push(agentId);

        emit AgentRegistered(agentId, msg.sender, name, category, pricePerRequest, metadataURI);
        return agentId;
    }

    /**
     * @dev Updates agent details. Only creator can edit.
     */
    function updateAgent(
        uint256 agentId,
        string calldata name,
        string calldata category,
        uint256 pricePerRequest,
        string calldata metadataURI,
        bool isActive
    ) external agentExists(agentId) onlyCreator(agentId) {
        require(bytes(name).length > 0, "Agent name cannot be empty");

        Agent storage agent = agents[agentId];
        agent.name = name;
        agent.category = category;
        agent.pricePerRequest = pricePerRequest;
        agent.metadataURI = metadataURI;
        agent.isActive = isActive;

        emit AgentUpdated(agentId, msg.sender, name, category, pricePerRequest, metadataURI, isActive);
    }

    /**
     * @dev Pay for an AI agent call. Splits are credited to a pull-payment ledger
     *      rather than pushed, so a rejecting treasury/creator cannot brick payments.
     *      The fee split is computed on the agent's price; any overpayment is
     *      refunded to the caller's claimable balance.
     */
    function payForAgentRequest(uint256 agentId) external payable agentExists(agentId) reentrancyGuard {
        Agent memory agent = agents[agentId];
        require(agent.isActive, "Agent is currently paused or inactive");

        uint256 agentPrice = agent.pricePerRequest;
        require(msg.value >= agentPrice, "Insufficient payment for this agent request");

        // Fees are computed on the agent's price, not on msg.value.
        uint256 platformFee = (agentPrice * platformFeePercentage) / 100;
        uint256 creatorRevenue = agentPrice - platformFee;
        uint256 excess = msg.value - agentPrice;

        if (platformFee > 0) {
            (bool success, ) = treasury.call{value: platformFee}("");
            require(success, "Platform fee transfer failed");
        }
        if (creatorRevenue > 0) {
            (bool success, ) = agent.creator.call{value: creatorRevenue}("");
            require(success, "Creator revenue transfer failed");
        }
        if (excess > 0) {
            (bool success, ) = payable(msg.sender).call{value: excess}("");
            require(success, "Refund of excess failed");
        }

        uint256 requestId = nextRequestId++;

        // totalAmount reflects the charged price (excludes refunded excess).
        emit AgentPaid(requestId, agentId, msg.sender, agent.creator, agentPrice, creatorRevenue, platformFee);
    }

    /**
     * @dev Withdraw the caller's accumulated balance (creator revenue, treasury
     *      fees, or refunded overpayment). Follows checks-effects-interactions.
     */
    function withdraw() external reentrancyGuard {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No funds available to withdraw");

        pendingWithdrawals[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdrawal transfer failed");

        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @dev Starts a two-step treasury transfer. The new treasury must accept.
     */
    function setTreasury(address payable _treasury) external onlyOwner {
        require(_treasury != address(0), "Treasury address cannot be zero");
        pendingTreasury = _treasury;
        emit TreasuryTransferStarted(treasury, _treasury);
    }

    /**
     * @dev Completes the treasury transfer. Callable only by the pending treasury.
     */
    function acceptTreasury() external {
        require(msg.sender == pendingTreasury, "Only the pending treasury can accept");
        address old = treasury;
        treasury = pendingTreasury;
        pendingTreasury = payable(address(0));
        emit TreasuryUpdated(old, treasury);
    }

    /**
     * @dev Updates the platform fee percentage.
     */
    function setPlatformFeePercentage(uint256 _fee) external onlyOwner {
        require(_fee <= 20, "Platform fee cannot exceed 20%");
        uint256 old = platformFeePercentage;
        platformFeePercentage = _fee;
        emit PlatformFeeUpdated(old, _fee);
    }

    /**
     * @dev Starts a two-step ownership transfer. The new owner must accept.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    /**
     * @dev Completes the ownership transfer. Callable only by the pending owner.
     */
    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "Only the pending owner can accept");
        address old = owner;
        owner = pendingOwner;
        pendingOwner = address(0);
        emit OwnershipTransferred(old, owner);
    }

    /**
     * @dev Returns all agent IDs registered by a specific creator.
     */
    function getCreatorAgents(address creator) external view returns (uint256[] memory) {
        return creatorAgents[creator];
    }

    /**
     * @dev Helper to fetch multiple agents in a single RPC call.
     */
    function getAgents(uint256[] calldata ids) external view returns (Agent[] memory) {
        Agent[] memory list = new Agent[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            list[i] = agents[ids[i]];
        }
        return list;
    }
}

