import Base from "./Base";

interface IStakeInfo {
  address: string[]; //[pool, to, refAddress, adapterAddress]
  uint256: string[]; //[amountOut/minAmountOut, refFees, amountIn/maxAmountIn]
  path: string[]; // swap path between tokens e.g. USDT -> ETH -> OCEAN
}

export default class Staker extends Base {
  /**
   * Uses a chains native coin to stake into a datatoken pool. The native coin is internally swapped to the pool's base token, then staked.
   * @param stakeInfo
   * @returns {string} The pool token amount received from the transaction.
   */
  public async stakeEthInDTPool(stakeInfo: IStakeInfo) {}

  /**
   * Unstakes from a datatoken pool into a chains native coin. The pool's base token is unstaked then internally swapped to the native coin.
   * @param stakeInfo
   * @returns {string} The token amount received from the transaction.
   */
  public async unstakeEthFromDTPool(stakeInfo: IStakeInfo) {}

  /**
   * Use any ERC20 token to stake into a datatoken pool. ERC20 tokens are internally swapped to pool base token, then staked.
   * @param stakeInfo
   * @returns {string} The pool token amount received from the transaction.
   */
  public async stakeTokenInDTPool(stakeInfo: IStakeInfo) {}

  /**
   * Unstakes from a datatoken pool into any ERC20 token. The pool's base token is unstaked, then internally swapped to desired ERC20 token out.
   * @param stakeInfo
   * @returns {string} The token amount received from the transaction.
   */
  public async unstakeTokenFromDTPool(stakeInfo: IStakeInfo) {}

  /**
   * This is a stake Calculation.
   * Calculates the pool amount out for an exact token amount in.
   * @param stakeInfo
   * @returns {string[]} [baseAmountOut, dataxFee, refFee]
   */
  public async calcPoolOutGivenTokenIn(stakeInfo: IStakeInfo) {}

  /**
   * This is an unstake calculation.
   * Calculates the pool amount in needed for an exact token amount out.
   * @param stakeInfo
   * @returns {string[]} [baseAmountOut, dataxFee, refFee]
   */
  public async calcPoolInGivenTokenOut(stakeInfo: IStakeInfo) {}

  /**
   * This is an unstake calculation.
   * Calculates the amount of token out from an exact pool amount in.
   * @param stakeInfo
   * @returns {string[]} [baseAmountOut, dataxFee, refFee]
   */
  public async calcTokenOutGivenPoolIn(stakeInfo: IStakeInfo) {}

  /**
   * Calculates stake fee
   * @param baseAmount
   * @param feeType
   * @param refFeeRate
   *
   * @returns {string[]} [dataxFee, refFee]
   *
   */
  public async calcFees(
    baseAmount: string,
    feeType: string,
    refFeeRate: string
  ) {}

  /**
   * Claim collected referral fees
   * @param tokenAddress
   * @returns Claim amount
   */
  public async claimRefFees(tokenAddress: string) {}
}
