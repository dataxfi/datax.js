import Base from "./Base";
import BigNumber from "bignumber.js";
import Ocean from "./Ocean";
import Web3 from "web3";
import stakeRouterAbi from "./abi/rinkeby/StakeRouter-abi.json";
import { getFairGasPrice } from "./utils/";
import { TransactionReceipt } from "web3-core";
import { Contract } from "web3-eth/node_modules/web3-eth-contract";
import { AbiItem } from "web3-utils";
import { IStakeInfo } from "./@types/stake";
export default class Stake extends Base {
  private ocean: Ocean;
  private stakeRouterAddress: string = this.config.default.stakeRouterAddress;
  private stakeRouter: Contract;
  private GASLIMIT_DEFAULT = 1000000;
  private stakeFailureMessage =
    "ERROR: Failed to pay tokens in order to \
  join the pool";
  private unstakeFailureMessage =
    "ERROR: Failed to pay pool shares into the pool";

  constructor(web3: Web3, networkId: string, ocean?: Ocean) {
    super(web3, networkId);
    ocean
      ? (this.ocean = ocean)
      : (this.ocean = new Ocean(web3, this.networkId));

    this.stakeRouter = new this.web3.eth.Contract(
      stakeRouterAbi as AbiItem[],
      this.stakeRouterAddress
    );
  }

  /**
   * Conducts preliminary checks to be made before a stake transaction is emitted. Checks wether
   * transaction amount is less than user balance, that the user is approved to spend the
   * transaction amount, and if the max stake/unstake is greater than the transaction amount.
   * @param inAddress - The token in address.
   * @param senderAddress - The sender of the transaction.
   * @param amount - The token in amount.
   * @param spender - The contract the transaction will be sent to.
   * @param poolAddress - The datatoken pool being staked in or unstaked from.
   */

  private async preStakeChecks(
    inAddress: string,
    senderAddress: string,
    amount: string,
    spender: string,
    poolAddress: string
  ) {
    const txAmtBigNum = new BigNumber(amount);
    const balance = new BigNumber(
      await this.ocean.getBalance(inAddress, senderAddress)
    );

    if (balance.lt(txAmtBigNum)) {
      throw new Error("ERROR: Not Enough Balance");
    }

    //check approval limit vs tx amount
    const isApproved = await this.ocean.checkIfApproved(
      inAddress,
      senderAddress,
      spender,
      amount
    );

    //approve if not approved
    if (!isApproved)
      try {
        await this.ocean.approve(inAddress, spender, amount, senderAddress);
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
   * Constructs the standard format of calling a stake or unstake transaction function: fist calls
   * estimate gas, then sends the transaction. Built in error handling will pass errorMessage
   * along with the origional error message. This function assumes the
   * transaction will be successful, and does not make any pre tx checks.
   * @param senderAddress - The address which the transaction will be sent from.
   * @param stakeInfo
   * @param stakeFunction - The stake or unstake transaction function to be executed.
   * @param errorMessage - A custom error message to pass into the error thrown if an error occurs.
   * @return {TransactionReceipt} The transaction receipt.
   */

  private async constructTxFunction(
    senderAddress: string,
    stakeInfo: IStakeInfo,
    stakeFunction: Function,
    errorMessage: string
  ): Promise<TransactionReceipt> {
    let estGas;
    const newUints = stakeInfo.uints.map((amt) => this.web3.utils.toWei(amt));
    const newStakeInfo = { ...stakeInfo, uints: newUints };

    try {
      estGas = await stakeFunction(newStakeInfo).estimateGas(
        { from: senderAddress },
        (err, estGas) => (err ? this.GASLIMIT_DEFAULT : estGas)
      );
    } catch (error) {
      estGas = this.GASLIMIT_DEFAULT;
    }

    try {
      return await stakeFunction(newStakeInfo).send({
        from: senderAddress,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3),
      });
    } catch (error) {
      throw new Error(`${errorMessage} : ${error.message}`);
    }
  }

  /**
   * Uses a chains native coin to stake into a datatoken pool. The native coin is internally
   * swapped to the pool's base token, then staked.
   * @param {IStakeInfo} stakeInfo - The stake information for the transaction.
   * @param senderAddress - The address which the transaction will be sent from.
   * @returns {string} - The pool token amount received from the transaction.
   */
  public async stakeETHInDTPool(
    stakeInfo: IStakeInfo,
    senderAddress: string
  ): Promise<TransactionReceipt> {
    // checks balance, approval, and max
    await this.preStakeChecks(
      stakeInfo.path[0],
      stakeInfo.meta[1],
      stakeInfo.uints[2],
      stakeInfo.meta[3],
      stakeInfo.meta[0]
    );

    return await this.constructTxFunction(
      senderAddress,
      stakeInfo,
      this.stakeRouter.methods.stakeETHInDTPool,
      this.stakeFailureMessage
    );
  }

  /**
   * Unstakes from a datatoken pool into a chains native coin. The pool's base token is
   * unstaked then internally swapped to the native coin.
   * @param stakeInfo
   * @param senderAddress - The address which the transaction will be sent from.
   * @returns {string} The token amount received from the transaction.
   */
  public async unstakeETHFromDTPool(
    stakeInfo: IStakeInfo,
    senderAddress: string
  ): Promise<TransactionReceipt> {
    await this.preStakeChecks(
      stakeInfo.path[0],
      stakeInfo.meta[1],
      stakeInfo.uints[0],
      stakeInfo.meta[3],
      stakeInfo.meta[0]
    );

    return await this.constructTxFunction(
      senderAddress,
      stakeInfo,
      this.stakeRouter.methods.unstakeETHFromDTPool,
      this.unstakeFailureMessage
    );
  }

  /**
   *
   * Use any ERC20 token to stake into a datatoken pool. ERC20 tokens are
   * internally swapped to pool base token, then staked.
   * @param stakeInfo
   * @param senderAddress - The address which the transaction will be sent from.
   * @returns {string} The pool token amount received from the transaction.
   */
  public async stakeTokenInDTPool(
    stakeInfo: IStakeInfo,
    senderAddress: string
  ): Promise<TransactionReceipt> {
    await this.preStakeChecks(
      stakeInfo.path[0],
      stakeInfo.meta[1],
      stakeInfo.uints[2],
      stakeInfo.meta[3],
      stakeInfo.meta[0]
    );

    return await this.constructTxFunction(
      senderAddress,
      stakeInfo,
      this.stakeRouter.methods.stakeTokenInDTPool,
      this.stakeFailureMessage
    );
  }

  /**
   * Unstakes from a datatoken pool into any ERC20 token. The pool's base token is
   * unstaked, then internally swapped to desired ERC20 token out.
   * @param stakeInfo
   * @param senderAddress - The address which the transaction will be sent from.
   * @returns {string} The token amount received from the transaction.
   */
  public async unstakeTokenFromDTPool(
    stakeInfo: IStakeInfo,
    senderAddress: string
  ): Promise<TransactionReceipt> {
    await this.preStakeChecks(
      stakeInfo.path[0],
      stakeInfo.meta[1],
      stakeInfo.uints[0],
      stakeInfo.meta[3],
      stakeInfo.meta[0]
    );

    return await this.constructTxFunction(
      senderAddress,
      stakeInfo,
      this.stakeRouter.methods.unstakeTokenFromDTPool,
      this.unstakeFailureMessage
    );
  }

  /**
   * Constructs the standard way to call a calculation function. Converts all amounts in the uint256 array to wei,
   * then calls the passed transaction function with the updated stakeInfo. Built in error handling will pass the
   * provided errorMessage to the thrown error if an error occurs.
   * @param stakeInfo
   * @param calcFunction
   * @param errorMessage
   * @returns
   */
  private async constructCalcFunction(
    stakeInfo: IStakeInfo,
    calcFunction: Function,
    errorMessage: string
  ): Promise<string> {
    const toWei = (amount) => this.web3.utils.toWei(amount);
    const newStakeInfo = {
      ...stakeInfo,
      uint256: [
        toWei(stakeInfo.uints[0]),
        toWei(stakeInfo.uints[1]),
        toWei(stakeInfo.uints[2]),
      ],
    };
    try {
      const resultInWei = await calcFunction(newStakeInfo).call();
      return this.web3.utils.fromWei(resultInWei);
    } catch (error) {
      throw new Error(`${errorMessage}: ${error.message}`);
    }
  }

  /**
   * This is a stake calculation. Calculates the pool amount out for an exact token amount in.
   * @param stakeInfo
   * @returns {string[]} [baseAmountOut, dataxFee, refFee]
   */
  public async calcPoolOutGivenTokenIn(stakeInfo: IStakeInfo) {
    return await this.constructCalcFunction(
      stakeInfo,
      this.stakeRouter.methods.calcPoolOutGivenTokenIn,
      "Failed to calculate pool out given token in"
    );
  }

  /**
   * This is an unstake calculation. Calculates the pool amount in needed for an exact token amount out.
   * @param stakeInfo
   * @returns {string[]} [baseAmountOut, dataxFee, refFee]
   */
  public async calcPoolInGivenTokenOut(stakeInfo: IStakeInfo) {
    return await this.constructCalcFunction(
      stakeInfo,
      this.stakeRouter.methods.calcPoolInGivenTokenOut,
      "Failed to calculate pool in given token out"
    );
  }

  /**
   * This is an unstake calculation. Calculates the amount of token out from an exact pool amount in.
   * @param stakeInfo
   * @param senderAddress - The address which the transaction will be sent from.
   * @returns {string[]} [baseAmountOut, dataxFee, refFee]
   */
  public async calcTokenOutGivenPoolIn(stakeInfo: IStakeInfo) {
    return this.constructCalcFunction(
      stakeInfo,
      this.stakeRouter.methods.calcTokenOutGivenPoolIn,
      "Failed to calculate token out given pool in"
    );
  }

  /**
   * Claim collected referral fees for a particular token. Referrer fees charged by third party dApps in
   * multiple tokens should be collected per token, by calling this function with the token address.
   * @param tokenAddress - The token to claim collected fees for.
   * @param senderAddress - The address which the transaction will be sent from.
   * @returns {string} Claim amount collected for the token passed.
   */
  public async claimRefFees(tokenAddress: string, senderAddress: string) {
    let estGas;
    try {
      estGas = await this.stakeRouter.methods
        .claimRefFees(tokenAddress)
        .estimateGas({ from: senderAddress }, (err, estGas) =>
          err ? this.GASLIMIT_DEFAULT : estGas
        );
    } catch (error) {
      estGas = this.GASLIMIT_DEFAULT;
    }

    try {
      return await this.stakeRouter.methods.claimRefFees(tokenAddress).send({
        from: senderAddress,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3),
      });
    } catch (error) {
      throw new Error(
        `${"Failed to claim refferer fees for this token"} : ${error.message}`
      );
    }
  }
}
