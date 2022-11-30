// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;

import "@equilibria/root/number/types/UFixed18.sol";
import "@equilibria/root/curve/types/JumpRateUtilizationCurve.sol";
import "../product/types/Parameter.sol";

interface IParamProvider {
    event ParameterUpdated(Parameter newParameter);
    event JumpRateUtilizationCurveUpdated(JumpRateUtilizationCurve newUtilizationCurve);
    
    function parameter() external view returns (Parameter memory);
    function updateParameter(Parameter memory parameter) external;
    function utilizationCurve() external view returns (JumpRateUtilizationCurve memory);
    function updateUtilizationCurve(JumpRateUtilizationCurve memory newUtilizationCurve) external;
}
