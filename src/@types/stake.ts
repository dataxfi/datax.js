/** IStakeInfo parameters
 *
 * stakeInfo.address - An array of all the addresses relevant to the transaction to be made.
 *
 * address[0] = pool - The pool address involved in the transaction.
 *
 * address[1] = to - The account to be credited with the output of the transaction.
 *
 * address[2] = refAddress - The address to associate collected refferer fees with. These
 * fees can then be collected by this address when calling claimRefFees() from this address.
 *
 * address[3] = adapterAddress - The address of the adapter contract to be called in the
 * transaction. This is the address in which token approval will be made to.
 *
 * stakeInfo.uint256 - An array of all the numerical amounts relevent to the transaction to
 * be made.
 *
 * uint256[0] = amountOut/minAmountOut - The amount to come out of the transaction. This value
 * is considered minAmountOut when slippage is to be applied to the token out, and amountOut
 * when slippage is applied the token in.
 *
 * uint256[1] = refFees - This fee charged by the third pary dApp using datax.js, collected
 * in the base token of the stake pool involved in the stake transaction.
 *
 * uint256[2] = amountIn/maxAmountIn - The amount going into the transaction. This value is
 * considered maxAmountIn when slippage is applied to the amount in, and amountIn when slippage
 * is applied to the amount out.
 *
 * stakeInfo.path - An array of the path in which the token should be swapped to get to the
 * desired destination token. If using an extraneous token to add stake to a pool, the path is
 * comprised of all the token addresses to be swapped through ending with the token that can be
 * directly staked.
 *
 * A hypothetical path example to stake USDT into a datatoken/OCEAN pool:
 *
 * [USDT,WETH,OCEAN]
 *
 * Signifying in order to use USDT to stake into a pool, it must first be swapped to WETH, then
 * to OCEAN, then OCEAN can be staked into the datatoken/OCEAN pool. There are utilities available
 * that search for paths between tokens.
 */

export interface IStakeInfo {
  meta: [string, string, string, string]; //[pool, to, refAddress, adapterAddress]
  uints: [string, string, string]; //[amountOut/minAmountOut, refFees, amountIn/maxAmountIn]
  path: string[]; // swap path between tokens e.g. USDT -> ETH -> OCEAN
}
