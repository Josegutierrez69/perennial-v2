//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;

import "@equilibria/perennial-v2/contracts/interfaces/IFactory.sol";

interface IVaultDefinition {
    struct MarketDefinition {
        IMarket market;
        uint256 weight; // TODO: more settings?
    }

    error VaultDefinitionInvalidMarketIdError();
    error VaultDefinitionZeroTargetLeverageError();
    error VaultDefinitionNoMarketsError();
    error VaultDefinitionLongAndShortAreSameProductError();
    error VaultInvalidProductError(IMarket product);
    error VaultDefinitionOracleMismatchError();
    error VaultDefinitionWrongPayoffDirectionError(IMarket product);
    error VaultDefinitionMismatchedPayoffDataError();
    error VaultDefinitionAllZeroWeightError();
    error VaultDefinitionMarketsMismatchedWithPreviousImplementationError();

    function asset() external view returns (Token18);
    function totalMarkets() external view returns (uint256);
    function totalWeight() external view returns (uint256);
    function factory() external view returns (IFactory);
    function targetLeverage() external view returns (UFixed18);
    function maxCollateral() external view returns (UFixed18);
    function markets(uint256 marketId) external view returns (MarketDefinition memory);
}