// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import "@equilibria/perennial-v2-payoff/contracts/IPayoffProvider.sol";

contract TestnetContractPayoffProvider is IPayoffProvider {
    function payoff(Fixed6 price) public pure returns (Fixed6) {
        return price.mul(price);
    }
}
