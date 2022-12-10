// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import "@equilibria/perennial-oracle/contracts/interfaces/IOracleProvider.sol";
import "./IProduct.sol";
import "./IController.sol";

/**
 * @title Lens contract to conveniently pull protocol, product, and userproduct data
 * @notice All functions should be called using `callStatic`
 */
interface ILens {
    /// @dev Snapshot of Product information
    struct ProductSnapshot {
        IProduct.ProductDefinition definition;
        Parameter parameter;
        address productAddress;
        Fixed18 rate;
        Fixed18 dailyRate;
        IOracleProvider.OracleVersion latestVersion;
        Fixed18 collateral;
        PrePosition pre;
        Position position;
        Fee fee;
        Position openInterest;
    }

    /// @dev Snapshot of User state for a Product
    struct UserProductSnapshot {
        address productAddress;
        address userAddress;
        Fixed18 collateral;
        UFixed18 maintenance;
        Fixed18 pre;
        Fixed18 position;
        bool liquidatable;
        bool liquidating;
        Fixed18 openInterest;
        Fixed18 exposure;
    }

    // Protocol Values
    function controller() external view returns (IController);

    // Snapshot Functions for batch values
    function snapshots(IProduct[] calldata productAddresses) external returns (ProductSnapshot[] memory);
    function snapshot(IProduct product) external returns (ProductSnapshot memory);
    function snapshots(address account, IProduct[] calldata productAddresses) external returns (UserProductSnapshot[] memory);
    function snapshot(address account, IProduct product) external returns (UserProductSnapshot memory);

    // Product Values
    function name(IProduct product) external view returns (string memory);
    function symbol(IProduct product) external view returns (string memory);
    function token(IProduct product) external view returns (Token18);
    function definition(IProduct product) external view returns (IProduct.ProductDefinition memory);
    function parameter(IProduct product) external view returns (Parameter memory);
    function collateral(IProduct product) external returns (Fixed18);
    function pre(IProduct product) external returns (PrePosition memory);
    function fees(IProduct product) external returns (Fee memory);
    function position(IProduct product) external returns (Position memory);
    function globalPosition(IProduct product) external returns (PrePosition memory, Position memory);
    function latestVersion(IProduct product) external returns (IOracleProvider.OracleVersion memory);
    function atVersions(IProduct product, uint[] memory versions) external returns (IOracleProvider.OracleVersion[] memory);
    function rate(IProduct product) external returns (Fixed18);
    function openInterest(IProduct product) external returns (Position memory);
    function dailyRate(IProduct product) external returns (Fixed18);

    // UserProduct Values
    function collateral(address account, IProduct product) external returns (Fixed18);
    function maintenance(address account, IProduct product) external returns (UFixed18);
    function maintenanceNext(address account, IProduct product) external returns (UFixed18);
    function liquidatable(address account, IProduct product) external returns (bool);
    function liquidating(address account, IProduct product) external returns (bool);
    function pre(address account, IProduct product) external returns (Fixed18);
    function position(address account, IProduct product) external returns (Fixed18);
    function userPosition(address account, IProduct product) external returns (Fixed18, Fixed18);
    function openInterest(address account, IProduct product) external returns (Fixed18);
    function exposure(address account, IProduct product) external returns (Fixed18);
    function maintenanceRequired(
        address account,
        IProduct product,
        Fixed18 positionSize
    ) external returns (UFixed18);
}