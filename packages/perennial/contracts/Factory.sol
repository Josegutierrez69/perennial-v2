// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import "@equilibria/root-v2/contracts/UOwnable.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "./interfaces/IFactory.sol";

//TODO: create2 or registration for markets?

/**
 * @title Factory
 * @notice Manages creating new markets and global protocol parameters.
 */
contract Factory is IFactory, UOwnable {
    /// @dev Market implementation address
    address public immutable implementation;

    ProtocolParameterStorage private _parameter;

    /// @dev Protocol pauser address. address(0) defaults to owner(0)
    address private _treasury;

    /// @dev Protocol pauser address. address(0) defaults to owner(0)
    address private _pauser;

    constructor(address implementation_) {
        implementation = implementation_;
    }

    /**
     * @notice Initializes the contract state
     * @dev Must be called atomically as part of the upgradeable proxy deployment to
     *      avoid front-running
     */
    function initialize() external initializer(1) {
        __UOwnable__initialize();
    }

    function updateParameter(ProtocolParameter memory newParameter) public onlyOwner {
        _parameter.store(newParameter);
        emit ParameterUpdated(newParameter);
    }

    /**
     * @notice Updates the treasury of an existing coordinator
     * @dev Must be called by the current owner. Defaults to the coordinator `owner` if set to address(0)
     * @param newTreasury New treasury address
     */
    function updateTreasury(address newTreasury) external onlyOwner {
        _treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    /**
     * @notice Updates the protocol pauser address. Zero address defaults to owner(0)
     * @param newPauser New protocol pauser address
     */
    function updatePauser(address newPauser) public onlyOwner {
        _pauser = newPauser;
        emit PauserUpdated(newPauser);
    }

    /**
     * @notice Creates a new market market with `provider`
     * @return newMarket New market contract address
     */
    function createMarket(
        IMarket.MarketDefinition calldata definition,
        MarketParameter calldata marketParameter
    ) external returns (IMarket newMarket) {
        newMarket = IMarket(address(new BeaconProxy(
            address(this),
            abi.encodeCall(IMarket.initialize, (definition, marketParameter))
        )));
        newMarket.updatePendingOwner(msg.sender);

        emit MarketCreated(newMarket, definition, marketParameter);
    }

    function parameter() public view returns (ProtocolParameter memory) {
        return _parameter.read();
    }

    function treasury() external view returns (address) {
        return _treasury == address(0) ? owner() : _treasury;
    }

    function pauser() public view returns (address) {
        return _pauser == address(0) ? owner() : _pauser;
    }

    /**
     * @notice Updates the protocol paused state
     * @param newPaused New protocol paused state
     */
    function updatePaused(bool newPaused) public {
        if (msg.sender != pauser()) revert FactoryNotPauserError();
        ProtocolParameter memory newParameter = parameter();
        newParameter.paused = newPaused;
        _parameter.store(newParameter);
        emit ParameterUpdated(newParameter);
    }
}
