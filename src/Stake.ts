import Base from "./Base";
import BigNumber from "bignumber.js";
import Web3 from "web3";
import stakeRouterAbi from "./abi/StakeRouter.json";
import {
  getFairGasPrice,
  getMaxRemoveLiquidity,
  getMaxAddLiquidity,
} from "./utils/";
import { TransactionReceipt } from "web3-core";
import { Contract } from "web3-eth-contract";
import { AbiItem } from "web3-utils";
import { IStakeInfo } from "./@types/stake";
import { supportedNetworks } from "./@types";
import { Pool } from "./balancer";
import Trade from "./Trade";
import { gql } from "graphql-request";
import { allowance, approve } from "./utils/TokenUtils";
import { Datatoken } from "./tokens";

export default class Stake extends Base {
  private stakeRouterAddress: string;
  private stakeRouter: Contract;
  private GASLIMIT_DEFAULT = 1000000;
  private stakeFailureMessage =
    "ERROR: Failed to pay tokens in order to join the pool";
  private unstakeFailureMessage =
    "ERROR: Failed to pay pool shares into the pool";
  private pool: Pool;
  private trade: Trade;
  private datatoken: Datatoken;

  constructor(web3: Web3, networkId: supportedNetworks) {
    super(web3, networkId);
    this.stakeRouterAddress = this.config.custom.stakeRouterAddress;
    console.dir(this.config);
    this.stakeRouter = new this.web3.eth.Contract(
      stakeRouterAbi as AbiItem[],
      this.stakeRouterAddress
    );

    this.pool = new Pool(this.web3, this.config);
    this.trade = new Trade(web3, networkId);
  }

  public async getAllowance(
    tokenAddress: string,
    account: string,
    spender: string
  ) {
    return await allowance(this.web3, tokenAddress, account, spender);
  }

  /**
   * Gets total supply of pool shares
   * @param poolAddress
   * @returns
   */
  public async getTotalPoolShares(poolAddress: string) {
    return await this.pool.getPoolSharesTotalSupply(poolAddress);
  }

  /**
   * Gets base token of pool
   * @param poolAddress
   * @returns
   */
  public async getBaseToken(poolAddress: string) {
    return await this.pool.getBaseToken(poolAddress);
  }

  /** Get pool details
   * @param {Srting} poolAddress
   * @returns {String[]} - datatoken addresses
   */

  public async getPoolDetails(poolAddress: string): Promise<any> {
    try {
      const query = gql`
        {
          pool(id: "${poolAddress}") {
            id
            baseToken {
              name
              symbol
              id
            }
            datatoken {
              name
              symbol
              id
            }
            baseTokenLiquidity
            datatokenLiquidity
            totalShares
          }
        }
      `;

      const response = await this.config.gqlClient.request(query);
      console.log(response);

      return response.pool;
    } catch (error) {
      throw {
        code: 1000,
        message: "We ran into a problem, please refresh your connection.",
        error,
      };
    }
  }

  /**
   * Helper function for getMaxUnstake
   * @param finalOut - Max amount out converted to final token in the path.
   * @param meta  - [poolAddress, to, refAddress, adapter]
   * @param path - The swap path
   * @param userShareBalance
   * @returns { {tokenOut: string, shares: string, userPerc:string, dataxFee:string, refFee:string} }
   */
  private async calcMaxUnstakeWithFinalAmtOut(
    finalOut: string,
    meta: string[],
    path: string[],
    senderAddress: string,
    refFee: string
  ) {
    const userShareBalance = await this.sharesBalance(senderAddress, meta[0]);

    let userPerc: string;
    let maxTokenOut: string = finalOut;
    let dataxFeeTotal: string;
    let refFeeTotal: string;
    let maxPoolAmountIn: string;
    console.log(
      "max final out",
      finalOut,
      "user share balance",
      userShareBalance
    );

    const {
      poolAmountIn,
      dataxFee,
      refFee: totalRefFee,
    } = await this.calcPoolInGivenTokenOut({
      meta,
      path,
      uints: [finalOut, refFee, "0"],
    });

    dataxFeeTotal = dataxFee;
    refFeeTotal = totalRefFee;
    maxPoolAmountIn = poolAmountIn;
    console.log(poolAmountIn);

    const maxPoolIn = new BigNumber(poolAmountIn);
    if (maxPoolIn.lt(userShareBalance)) {
      console.log("max unstake is less than user balance in shares");
      const shareBalanceBN = new BigNumber(userShareBalance);
      const userPercBN = new BigNumber(maxPoolIn)
        .div(shareBalanceBN)
        .multipliedBy(100);

      userPerc = userPercBN.toString();
    } else {
      console.log("max unstake is greater than user balance in shares");
      const {
        dataxFee,
        refFee: totalRefFee,
        baseAmountOut,
      } = await this.calcTokenOutGivenPoolIn({
        meta,
        path,
        uints: ["0", refFee, userShareBalance],
      });

      userPerc = "100";
      dataxFeeTotal = dataxFee;
      refFeeTotal = totalRefFee;
      maxTokenOut = baseAmountOut;
      maxPoolAmountIn = userShareBalance;
    }

    console.log(
      "maxUnstake",
      maxTokenOut.toString(),
      maxPoolAmountIn.toString(),
      userPerc.toString(),
      refFeeTotal,
      dataxFeeTotal
    );

    const userMaxUnstake = {
      maxTokenOut,
      maxPoolTokensIn: maxPoolAmountIn,
      userPerc,
      dataxFee: dataxFeeTotal,
      refFee: refFeeTotal,
    };

    return userMaxUnstake;
  }

  /**
   * Calculates the max amount a specific user can stake in a pool. If the
   * users shares are less than the max unstake amount, the users shares are
   * returned as the max unstake amount. Unstake amount is converted to the
   * first token in the path.
   *
   * @param meta - [poolAddress, to, refAddress, adapter]
   * @param path - The swap path of token addresses to be used in the transaction
   * path example : ([DAI_Address, ETH_Address, OCEAN_Address])
   * @param senderAddress
   * @param refFee - The base refFee to be used in total refFee calculation
   * @returns { {tokenOut: string, shares: string, userPerc:string, dataxFee:string, refFee:string} }
   *
   * Returns an object containing:
   * maxTokenOut - Tokens received for the max unstake amount
   * maxPoolTokensIn - The max unstake amount of shares
   * userPerc - The percentage of max unstake out of user shares
   * dataxFee - The total dataxFee for max stake removal
   * refFee - The total refFee for max stake removal
   */
  public async getUserMaxUnstake(
    meta: string[],
    path: string[],
    senderAddress: string,
    refFee: string
  ): Promise<{
    maxTokenOut: string;
    maxPoolTokensIn: string;
    userPerc: string;
    dataxFee: string;
    refFee: string;
  }> {
    try {
      const baseToken = path[0];

      console.log("Base token in dataxjs: ", baseToken);
      const baseMaxOut = await getMaxRemoveLiquidity(
        this.pool,
        meta[0],
        baseToken
      );

      console.log("Base max out dataxjs", baseMaxOut.toString());
      if (baseToken.toLowerCase() === path[path.length - 1].toLowerCase()) {
        console.log("Unstaking datattoken calculation");
        //User is unstaking to base token, use base max out
        return await this.calcMaxUnstakeWithFinalAmtOut(
          baseMaxOut.toString(),
          meta,
          path,
          senderAddress,
          refFee
        );
      } else {
        //User is unstaking to a non-base token, get final max out
        const amtsOut = await this.trade.getAmountsOut(
          baseMaxOut.toString(),
          path
        );

        return await this.calcMaxUnstakeWithFinalAmtOut(
          amtsOut[amtsOut.length - 1],
          meta,
          path,
          senderAddress,
          refFee
        );
      }
    } catch (error) {
      throw {
        code: 1000,
        message: "We ran into a problem, please refresh your connection.",
        error,
      };
    }
  }

  /**
   * Gets the max stake amount for a pool. Max stake amount is converted to
   * the first token in the path.
   * @param poolAddress
   * @param path
   * @returns
   */
  public async getMaxUnstakeAmount(
    poolAddress: string,
    path: string[]
  ): Promise<string> {
    const baseAddress = path[path.length - 1];
    const poolMaxIn = await getMaxAddLiquidity(
      this.pool,
      poolAddress,
      baseAddress
    );

    if (path.length === 1) {
      return poolMaxIn.toString();
    }

    const amtsIn = await this.trade.getAmountsIn(poolMaxIn.toString(), path);
    return amtsIn[0];
  }

  /**
   * Gets max stake amount for dataken pool. Stake amount is converted
   * to the first token in the path.
   * @param poolAddress - Address of pool to add stake to
   * @param tokenInAddress - In token address (Any ERC20)
   * @returns max amount in (eth denom)
   */
  public async getMaxStakeAmount(poolAddress: string, path: string[]) {
    try {
      const tokenInAddress = path[path.length - 1];
      const baseToken = await this.getBaseToken(poolAddress);
      console.log("BaseToken:", baseToken);
      const baseMaxIn = await getMaxAddLiquidity(
        this.pool,
        poolAddress,
        baseToken
      );

      console.log("Base max in:", baseMaxIn.toString());
      if (tokenInAddress.toLowerCase() === baseToken.toLowerCase())
        return baseMaxIn.toString();

      const inAmts = await this.trade?.getAmountsIn(baseMaxIn.toString(), path);
      console.log("In amts:", inAmts);

      console.log("Max in for in token:", inAmts[0]);
      if (inAmts) return inAmts[0];
    } catch (error) {
      throw {
        code: 1000,
        message: "We ran into a problem, please refresh your connection.",
        error,
      };
    }
  }

  /**
   * Gets max stake amount for datatoke pool considering the sender balance. If the sender
   * balance is greater than the max stake amount, the user balance is returned. Stake
   * amount is converted to the first token in the path.
   * @param poolAddress
   * @param senderAddress
   * @param path
   * @returns {Promise<string>}
   */
  public async getUserMaxStake(
    poolAddress: string,
    senderAddress: string,
    path: string[]
  ): Promise<string> {
    const userBalance = new BigNumber(
      await this.trade.getBalance(path[path.length - 1], senderAddress)
    );

    const maxPoolAmountIn = new BigNumber(
      await this.getMaxStakeAmount(poolAddress, path)
    );

    let maxStakeAmt: string = maxPoolAmountIn.toString();

    if (userBalance.lt(maxPoolAmountIn)) {
      maxStakeAmt = userBalance.toString();
    }

    if (path.length === 1) {
      return maxStakeAmt;
    }

    const firstAmtInMax = await this.trade.getAmountsIn(maxStakeAmt, path);
    return firstAmtInMax[0];
  }

  /**
   * Get balance of given token address for an account
   * @param tokenAddress
   * @param account
   * @returns
   */
  public async getBalance(tokenAddress: string, account: string) {
    return this.trade.getBalance(tokenAddress, account);
  }

  /**
   * returns pool shares of a given pool for a given account
   * @param poolAddress
   * @param account
   * @returns
   */
  public async sharesBalance(
    account: string,
    poolAddress: string
  ): Promise<string> {
    try {
      return await this.pool.sharesBalance(account, poolAddress);
    } catch (error) {
      throw {
        code: 1000,
        message: "We ran into a problem, please refresh your connection.",
        error,
      };
    }
  }

  /**
   * Conducts preliminary checks to be made before a stake transaction is emitted. Checks wether
   * transaction amount is less than user balance, that the user is approved to spend the
   * transaction amount, and if the max stake/unstake is greater than the transaction amount.
   * @param tokenIn - The base token in address.
   * @param senderAddress - The sender of the transaction.
   * @param amount - The token in amount.
   * @param spender - The contract the transaction will be sent to.
   * @param poolAddress - The datatoken pool being staked in or unstaked from.
   */

  private async preStakeChecks(
    tokenIn: string,
    senderAddress: string,
    amount: string,
    spender: string,
    poolAddress: string,
    isDT: boolean,
    txType: "stake" | "unstake",
    path: string[]
  ) {
    const txAmtBigNum = new BigNumber(amount);

    try {
      let balance: BigNumber;
      if (txType === "stake") {
        console.log(
          "gettin balance of" + tokenIn + "in account" + senderAddress
        );

        balance = new BigNumber(
          await this.trade.getBalance(tokenIn, senderAddress)
        );
      } else {
        balance = new BigNumber(
          await this.sharesBalance(senderAddress, poolAddress)
        );
      }

      if (balance.lt(txAmtBigNum)) {
        throw new Error("Not Enough Balance");
      }
    } catch (error) {
      console.error(error);
      throw new Error("Could not check account balance");
    }

    let isApproved;
    const contractToApprove = this.config.custom.stakeRouterAddress;
    try {
      //check approval limit vs tx amount
      isApproved = new BigNumber(
        await allowance(this.web3, tokenIn, senderAddress, contractToApprove)
      );
    } catch (error) {
      throw new Error("Could not check allowance limit");
    }

    try {
      if (isApproved.lt(txAmtBigNum))
        if (isDT) {
          //approve if not approved
          await this.datatoken.approve(
            tokenIn,
            contractToApprove,
            amount,
            senderAddress
          );
        } else {
          await approve(
            this.web3,
            senderAddress,
            tokenIn,
            contractToApprove,
            amount,
            true
          );
        }
    } catch (error) {
      throw new Error("Could not process approval transaction");
    }

    try {
      //check max stake/unstake vs tx amount

      let max;
      if (txType === "stake") {
        max = new BigNumber(await this.getMaxStakeAmount(poolAddress, path));
      } else {
        max = new BigNumber(
          await getMaxRemoveLiquidity(this.pool, poolAddress, tokenIn)
        );
      }

      if (max.lt(txAmtBigNum))
        throw new Error("Transaction amount is greater than max.");
    } catch (error) {
      throw new Error(`Could not check max ${txType} for pool.`);
    }
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
    errorMessage: string,
    isETH: boolean,
    txType: "stake" | "unstake"
  ): Promise<TransactionReceipt> {
    let estGas;
    const newUints = stakeInfo.uints.map((amt) => this.web3.utils.toWei(amt));
    const newStakeInfo = { ...stakeInfo, uints: newUints };
    const args = isETH
      ? { from: senderAddress, value: newUints[txType === "stake" ? 2 : 0] }
      : { from: senderAddress };

    console.log(newStakeInfo, args);
    try {
      estGas = await stakeFunction(newStakeInfo).estimateGas(
        args,
        (err, estGas) => (err ? this.GASLIMIT_DEFAULT : estGas)
      );
    } catch (error) {
      throw {
        code: 1000,
        message:
          "Gas estimation could not be determined. Aborting due to likey transaction failure.",
        error,
      };
    }

    console.log("Estimated gas price: ", estGas);

    try {
      return await stakeFunction(newStakeInfo).send({
        ...args,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config.default),
      });
    } catch (error) {
      throw {
        code: 1000,
        message: errorMessage,
        error,
      };
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
    console.log("In stake ETH function");
    await this.preStakeChecks(
      stakeInfo.path[0],
      stakeInfo.meta[1],
      stakeInfo.uints[2],
      stakeInfo.meta[3],
      stakeInfo.meta[0],
      false,
      "stake",
      stakeInfo.path
    );

    return await this.constructTxFunction(
      senderAddress,
      stakeInfo,
      this.stakeRouter.methods.stakeETHInDTPool,
      this.stakeFailureMessage,
      true,
      "stake"
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
    console.log("in unstake eth function");
    await this.preStakeChecks(
      stakeInfo.path[0],
      stakeInfo.meta[1],
      stakeInfo.uints[2],
      stakeInfo.meta[3],
      stakeInfo.meta[0],
      false,
      "unstake",
      stakeInfo.path
    );

    return await this.constructTxFunction(
      senderAddress,
      stakeInfo,
      this.stakeRouter.methods.unstakeETHFromDTPool,
      this.unstakeFailureMessage,
      true,
      "unstake"
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
    console.log("In stake token function");
    await this.preStakeChecks(
      stakeInfo.path[0],
      stakeInfo.meta[1],
      stakeInfo.uints[2],
      stakeInfo.meta[3],
      stakeInfo.meta[0],
      false,
      "stake",
      stakeInfo.path
    );

    return await this.constructTxFunction(
      senderAddress,
      stakeInfo,
      this.stakeRouter.methods.stakeTokenInDTPool,
      this.stakeFailureMessage,
      false,
      "stake"
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
    console.log("in unstake ocean function");
    await this.preStakeChecks(
      stakeInfo.path[0],
      stakeInfo.meta[1],
      stakeInfo.uints[2],
      stakeInfo.meta[3],
      stakeInfo.meta[0],
      false,
      "unstake",
      stakeInfo.path
    );

    //TODO: check if path is greater than one for this to be necessary
    const baseAmountOut = await this.trade.getAmountsIn(
      stakeInfo.uints[0],
      stakeInfo.path
    );
    console.log("Base amount out from funciton", baseAmountOut);

    return await this.constructTxFunction(
      senderAddress,
      stakeInfo,
      this.stakeRouter.methods.unstakeTokenFromDTPool,
      this.unstakeFailureMessage,
      false,
      "unstake"
    );
  }

  /**
   * Constructs the standard way to call a calculation function. Converts all amounts in the uint256 array to wei,
   * then calls the passed transaction function with the updated stakeInfo. Built in error handling will pass the
   * provided errorMessage to the thrown error if an error occurs.
   * @param stakeInfo
   * @param calcFunction
   * @param errorMessage
   * @returns { dataxFee: string; poolAmountOut: string; refFee: string } pool amount out and fees in eth denom
   */
  private async constructCalcFunction(
    stakeInfo: IStakeInfo,
    calcFunction: Function,
    errorMessage: string
  ): Promise<{
    dataxFee: string;
    refFee: string;
    return: string;
  }> {
    const fromWei = (amount: string) => this.web3.utils.fromWei(String(amount));
    const toWei = (amount: string) => this.web3.utils.toWei(String(amount));
    const uints = stakeInfo.uints.map(toWei) as [string, string, string];

    const newStakeInfo: IStakeInfo = {
      ...stakeInfo,
      uints,
    };

    console.log(newStakeInfo);
    try {
      const responseInWei = await calcFunction(newStakeInfo).call();
      if (responseInWei) {
        const { poolAmountOut, baseAmountOut, poolAmountIn, dataxFee, refFee } =
          responseInWei;

        //depending on the calcFunction param, only one of these values will be truthy
        const toReturn = poolAmountOut || baseAmountOut || poolAmountIn;

        return {
          return: fromWei(toReturn),
          dataxFee: fromWei(dataxFee),
          refFee: fromWei(refFee),
        };
      }
    } catch (error) {
      throw {
        code: 1000,
        message: errorMessage,
        error,
      };
    }
  }

  /**
   * This is a stake calculation. Calculates the pool amount out for an exact token amount in.
   * @param stakeInfo
   * @returns {{ poolAmountOut, dataxFee, refFee }} { poolAmountOut, dataxFee, refFee }
   */
  public async calcPoolOutGivenTokenIn(stakeInfo: IStakeInfo) {
    const {
      return: poolAmountOut,
      dataxFee,
      refFee,
    } = await this.constructCalcFunction(
      stakeInfo,
      this.stakeRouter.methods.calcPoolOutGivenTokenIn,
      "Failed to calculate pool out given token in"
    );

    return { poolAmountOut, dataxFee, refFee };
  }

  /**
   * This is an unstake calculation. Calculates the pool amount in needed for an exact token amount out.
   * @param stakeInfo
   * @returns {{ poolAmountIn, dataxFee, refFee }} { poolAmountIn, dataxFee, refFee }
   */
  public async calcPoolInGivenTokenOut(stakeInfo: IStakeInfo) {
    const {
      return: poolAmountIn,
      dataxFee,
      refFee,
    } = await this.constructCalcFunction(
      stakeInfo,
      this.stakeRouter.methods.calcPoolInGivenTokenOut,
      "Failed to calculate pool in given token out"
    );

    return { poolAmountIn, dataxFee, refFee };
  }

  /**
   * This is an unstake calculation. Calculates the amount of base token out from an exact pool amount in.
   * @param stakeInfo
   * @param senderAddress - The address which the transaction will be sent from.
   * @returns {{ baseAmountOut, dataxFee, refFee }} {baseAmountOut, dataxFee, refFee}
   */
  public async calcTokenOutGivenPoolIn(stakeInfo: IStakeInfo) {
    const {
      return: baseAmountOut,
      dataxFee,
      refFee,
    } = await this.constructCalcFunction(
      stakeInfo,
      this.stakeRouter.methods.calcTokenOutGivenPoolIn,
      "Failed to calculate token out given pool in"
    );

    return { baseAmountOut, dataxFee, refFee };
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
        gasPrice: await getFairGasPrice(this.web3, this.config.default),
      });
    } catch (error) {
      throw {
        code: 1000,
        message: "Failed to claim refferer fees for this token",
        error,
      };
    }
  }
}
