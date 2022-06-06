import Base from "./Base";
import BigNumber from "bignumber.js";
import Ocean from "./Ocean";
import Web3 from "web3";
interface IStakeInfo {
  address: string[]; //[pool, to, refAddress, adapterAddress]
  uint256: string[]; //[amountOut/minAmountOut, refFees, amountIn/maxAmountIn]
  path: string[]; // swap path between tokens e.g. USDT -> ETH -> OCEAN
}

export default class Staker extends Base {
  private ocean: Ocean;

  constructor(web3: Web3, networkId: string, ocean?: Ocean) {
    super(web3, networkId);
    ocean
      ? (this.ocean = ocean)
      : (this.ocean = new Ocean(web3, this.networkId));
  }

  /**
   * Conducts preliminary checks to be made before a stake transaction is emitted. Checks wether transaction amount is less than user balance, that the user is approved to spend the transaction amount, and if the max stake/unstake is greater than the transaction amount.
   * @param inAddress - The token in address.
   * @param account - The account the transaction will be made in behalf of.
   * @param amount - The token in amount.
   * @param spender - The contract the transaction will be sent to.
   * @param poolAddress - The datatoken pool being staked in or unstaked from.
   */

  public async preStakeChecks(
    inAddress: string,
    account: string,
    amount: string,
    spender: string,
    poolAddress: string
  ) {
    const txAmtBigNum = new BigNumber(amount);
    const balance = new BigNumber(
      await this.ocean.getBalance(inAddress, account)
    );

    if (balance.lt(txAmtBigNum)) {
      throw new Error("ERROR: Not Enough Balance");
    }

    //check approval limit vs tx amount
    const isApproved = await this.ocean.checkIfApproved(
      inAddress,
      account,
      spender,
      amount
    );

    //approve if not approved
    if (!isApproved)
      try {
        await this.ocean.approve(inAddress, spender, amount, account);
      } catch (error) {
        throw {
          Code: 1000,
          Message: "Transaction could not be processed.",
          error,
        };
      }

    //check max stake/unstake vs tx amount
    const max = new BigNumber(
      await this.ocean.getMaxStakeAmount(poolAddress, inAddress)
    );

    if (max.lt(txAmtBigNum))
      throw new Error("Transaction amount is greater than max.");
  }

  /**
   * Uses a chains native coin to stake into a datatoken pool. The native coin is internally swapped to the pool's base token, then staked.
   * @param stakeInfo
   * @returns {string} The pool token amount received from the transaction.
   */
  public async stakeEthInDTPool(stakeInfo: IStakeInfo) {
    await this.preStakeChecks(
      stakeInfo.path[0],
      stakeInfo.address[1],
      stakeInfo.uint256[2],
      stakeInfo.address[3],
      stakeInfo.address[0]
    );
  }

  /**
   * Unstakes from a datatoken pool into a chains native coin. The pool's base token is unstaked then internally swapped to the native coin.
   * @param stakeInfo
   * @returns {string} The token amount received from the transaction.
   */
  public async unstakeEthFromDTPool(stakeInfo: IStakeInfo) {
    await this.preStakeChecks(
      stakeInfo.path[0],
      stakeInfo.address[1],
      stakeInfo.uint256[0],
      stakeInfo.address[3],
      stakeInfo.address[0]
    );
  }

  /**
   * Use any ERC20 token to stake into a datatoken pool. ERC20 tokens are internally swapped to pool base token, then staked.
   * @param stakeInfo
   * @returns {string} The pool token amount received from the transaction.
   */
  public async stakeTokenInDTPool(stakeInfo: IStakeInfo) {
    await this.preStakeChecks(
      stakeInfo.path[0],
      stakeInfo.address[1],
      stakeInfo.uint256[2],
      stakeInfo.address[3],
      stakeInfo.address[0]
    );
  }

  /**
   * Unstakes from a datatoken pool into any ERC20 token. The pool's base token is unstaked, then internally swapped to desired ERC20 token out.
   * @param stakeInfo
   * @returns {string} The token amount received from the transaction.
   */
  public async unstakeTokenFromDTPool(stakeInfo: IStakeInfo) {
    await this.preStakeChecks(
      stakeInfo.path[0],
      stakeInfo.address[1],
      stakeInfo.uint256[0],
      stakeInfo.address[3],
      stakeInfo.address[0]
    );
  }

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
   * @returns {string} Claim amount
   */
  public async claimRefFees(tokenAddress: string) {}
}
