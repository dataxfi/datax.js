import Base from "./Base";
import BigNumber from "bignumber.js";
import Web3 from "web3";
import stakeRouterAbi from "./abi/StakeRouter.json";
import stakeCalcAbi from "./abi/StakeCalc.json"
import {
  getFairGasPrice,
  getMaxRemoveLiquidity,
  getMaxAddLiquidity,
  units,
} from "./utils/";
import { TransactionReceipt } from "web3-core";
import { Contract } from "web3-eth-contract";
import { AbiItem, Unit } from "web3-utils";
import { IStakeInfo } from "./@types/stake";
import { supportedNetworks } from "./@types";
import { Pool } from "./balancer";
import Trade from "./Trade";
import { allowance, approve, decimals } from "./utils/TokenUtils";
import { Datatoken } from "./tokens";

export default class Stake extends Base {
  private stakeRouterAddress: string;
  private stakeRouter: Contract;
  private stakeCalcAddress:string
  private stakeCalc: Contract;
  private GASLIMIT_DEFAULT = 1000000;
  private failureMessage =
    "An error occured while processing your transaction. The transaction might still be processed, check your wallet.";

  private pool: Pool;
  private trade: Trade;
  private datatoken: Datatoken;

  constructor(web3: Web3, networkId: supportedNetworks) {
    super(web3, networkId);
    this.stakeRouterAddress = this.config.custom.stakeRouterAddress;
    this.stakeRouter = new this.web3.eth.Contract(
      stakeRouterAbi.abi as AbiItem[],
      this.stakeRouterAddress
    );

    this.stakeCalcAddress = this.config.custom.stakeCalcAddress
    this.stakeCalc = new this.web3.eth.Contract(
      stakeCalcAbi.abi as AbiItem[], 
      this.stakeCalcAddress
    )

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

  public async getDatatoken(poolAddress: string) {
    return await this.pool.getDatatoken(poolAddress);
  }

  /**
   * Get reserve of a token in a pool.
   * @param poolAddress
   * @param token
   * @param tokenDecimals
   * @returns
   */
  public async getReserve(
    poolAddress: string,
    token: string,
    tokenDecimals?: number
  ) {
    if (!tokenDecimals) tokenDecimals = await decimals(this.web3, token);
    return await this.pool.getReserve(poolAddress, token, tokenDecimals);
  }

  public fromWei = (amount: string, unit: Unit = "ether") =>
    this.web3.utils.fromWei(String(amount), unit);

  public toWei = (amount: string, unit: Unit = "ether") =>
    this.web3.utils.toWei(String(amount), unit);

  /**
   * Returns uints array defined in stakeInfo type converted to wei in the
   * appropriate decimals, and the unit for the last token in the path.
   * @param uints
   * @param path
   * @param txType
   * @returns
   */
  public async convertUintsToWei(
    uints: string[],
    path: string[],
    txType?: "in" | "out"
  ): Promise<[string[], Unit]> {
    const lastIndexInPath = path.length - 1;
    const tokenInDecimals = await decimals(this.web3, path[0]);
    const tokenInUnits = units[tokenInDecimals];

    const tokenOutDecimals = await decimals(this.web3, path[lastIndexInPath]);
    const tokenOutUnits = units[tokenOutDecimals];

    let returnUnit: Unit;
    switch (txType) {
      case "in":
        returnUnit = tokenInUnits;
        break;
      case "out":
        returnUnit = tokenOutUnits;
        break;
      default:
        returnUnit = "ether";
        break;
    }

    const newUints = uints.map((amt, index) => {
      switch (index) {
        case 0:
          return this.toWei(amt, tokenInUnits);
        case lastIndexInPath:
          return this.toWei(amt, tokenOutUnits);
        default:
          return this.toWei(amt);
      }
    });

    return [newUints, returnUnit];
  }

  /**
   * Helper function for getMaxUnstake
   * @param maxShareAmountIn - Max amount out converted to final token in the path.
   * @param meta  - [poolAddress, to, refAddress, adapter]
   * @param path - The swap path
   * @param userShareBalance
   * @returns { {tokenOut: string, shares: string, userPerc:string, dataxFee:string, refFee:string} }
   */
  private async calcMaxUnstakeWithFinalAmtOut(
    maxShareAmountIn: string,
    meta: string[],
    path: string[],
    senderAddress: string,
    refFee: string
  ) {
    const userShareBalance = await this.sharesBalance(senderAddress, meta[0]);

    let userPerc: string;
    let maxTokenOut: string;
    let dataxFeeTotal: string;
    let refFeeTotal: string;
    console.log(
      "max shares out",
      maxShareAmountIn,
      "user share balance",
      userShareBalance
    );

    if (new BigNumber(userShareBalance).lt(new BigNumber(maxShareAmountIn))) {
      maxShareAmountIn = userShareBalance;
      userPerc = "100";
    } else {
      const shareBalanceBN = new BigNumber(userShareBalance);
      const userPercBN = new BigNumber(maxShareAmountIn)
        .div(shareBalanceBN)
        .multipliedBy(100);
      userPerc = userPercBN.toString();
    }

    maxShareAmountIn = new BigNumber(maxShareAmountIn).dp(5).toString()
    const {
      baseAmountOut,
      dataxFee,
      refFee: totalRefFee,
    } = await this.calcTokenOutGivenPoolIn({
      meta,
      path,
      uints: [maxShareAmountIn, refFee, "0"],
    });

    dataxFeeTotal = dataxFee;
    refFeeTotal = totalRefFee;
    maxTokenOut = baseAmountOut;

    console.log(
      "maxUnstake",
      maxTokenOut,
      maxShareAmountIn,
      userPerc,
      refFeeTotal,
      dataxFeeTotal
    );

    const userMaxUnstake = {
      maxTokenOut,
      maxPoolTokensIn: maxShareAmountIn,
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

      const maxShareAmountOut = await getMaxRemoveLiquidity(
        this.pool,
        meta[0],
        baseToken
      );

      if (baseToken.toLowerCase() === path[path.length - 1].toLowerCase()) {
        //User is unstaking to base token, use base max out
        return await this.calcMaxUnstakeWithFinalAmtOut(
          maxShareAmountOut.toString(),
          meta,
          path,
          senderAddress,
          refFee
        );
      } else {
        //User is unstaking to a non-base token, get final max out
        // const amtsOut = await this.trade.getAmountsOut(
        //   baseMaxOut.toString(),
        //   path
        // );

        return await this.calcMaxUnstakeWithFinalAmtOut(
          maxShareAmountOut.toString(),
          meta,
          path,
          senderAddress,
          refFee
        );
      }
    } catch (error) {
      throw {
        code: 1000,
        message: "An error occurred, please refresh your connection.",
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
      const tokenInAddress = path[0];
      const baseToken = await this.getBaseToken(poolAddress);
      console.log("BaseToken:", baseToken);
      const baseMaxIn = (
        await getMaxAddLiquidity(this.pool, poolAddress, baseToken)
      ).dp(5);

      console.log("Base max in:", baseMaxIn.toString());
      if (tokenInAddress.toLowerCase() === baseToken.toLowerCase())
        return baseMaxIn.toString();

      console.log("Getting in amounts with path:", path);
      const inAmts = await this.trade?.getAmountsIn(baseMaxIn.toString(), path);
      console.log("In amts:", inAmts);

      console.log("Max in for in token:", inAmts[0]);
      if (inAmts) return inAmts[0];
    } catch (error) {
      throw {
        code: 1000,
        message: "An error occurred, please refresh your connection.",
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
    path: string[],
    usingETH: boolean
  ): Promise<string> {
    const balance = usingETH
      ? await this.trade.getBalance(senderAddress, false)
      : await this.trade.getBalance(senderAddress, false, path[0]);

    const userBalanceBN = new BigNumber(balance);

    const maxPoolAmountIn = new BigNumber(
      await this.getMaxStakeAmount(poolAddress, path)
    );

    let maxStakeAmt: string = maxPoolAmountIn.toString();

    if (userBalanceBN.lt(maxPoolAmountIn)) {
      maxStakeAmt = userBalanceBN.toString();
    }

    return maxStakeAmt;
  }

  /**
   * Get balance of given token address for an account
   * @param tokenAddress
   * @param account
   * @returns
   */
  public async getBalance(
    account: string,
    isDT: boolean,
    tokenAddress?: string,
    decimals?: number
  ) {
    return this.trade.getBalance(account, isDT, tokenAddress, decimals);
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
        message: "An error occurred, please refresh your connection.",
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
    path: string[],
    isETH: boolean
  ) {
    const txAmtBigNum = new BigNumber(amount);

    try {
      let balanceBN: BigNumber;
      if (txType === "stake") {
        console.log(
          "gettin balance of" + tokenIn + "in account" + senderAddress
        );

        const tokenAddress = isETH ? null : tokenIn;

        balanceBN = new BigNumber(
          await this.trade.getBalance(senderAddress, false, tokenAddress)
        );
      } else {
        const balance = await this.sharesBalance(senderAddress, poolAddress);
        // const balance = this.web3.utils.fromWei(balanceWei);
        console.log(
          "Shares balance: ",
          balance,
          "Transaction Amount: ",
          amount
        );
        balanceBN = new BigNumber(balance);
      }

      if (balanceBN.lt(txAmtBigNum)) {
        throw new Error("Not Enough Balance");
      }
    } catch (error) {
      console.error(error);
      throw new Error("Could not check account balance");
    }

    if (!isETH) {
      let allowanceLimit;
      const contractToApprove = this.config.custom.stakeRouterAddress;
      const tokenToAllow = txType === "unstake" ? poolAddress : tokenIn;
      try {
        //check approval limit vs tx amount
        allowanceLimit = new BigNumber(
          await allowance(
            this.web3,
            tokenToAllow,
            senderAddress,
            contractToApprove
          )
        );
      } catch (error) {
        console.error(error);
        throw new Error("Could not check allowance limit");
      }

      console.log(
        "Allownce: ",
        allowanceLimit.toString(),
        "Transaction Amount:",
        amount
      );
      try {
        if (allowanceLimit.lt(txAmtBigNum)) {
          this.trade.approve(
            tokenToAllow,
            senderAddress,
            amount,
            contractToApprove,
            isDT
          );
        }
      } catch (error) {
        console.error(error);
        throw new Error("Could not process approval transaction");
      }
    }
    try {
      //check max stake/unstake vs tx amount

      let max;
      if (txType === "stake") {
        max = new BigNumber(await this.getMaxStakeAmount(poolAddress, path));
      } else {
        const baseAddress = await this.getBaseToken(poolAddress);
        max = new BigNumber(
          await getMaxRemoveLiquidity(this.pool, poolAddress, baseAddress)
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

    const [newUints] = await this.convertUintsToWei(
      stakeInfo.uints,
      stakeInfo.path
    );

    const newStakeInfo = { ...stakeInfo, uints: newUints };
    const args = isETH && txType !== 'unstake'
      ? { from: senderAddress, value: newUints[txType === "stake" ? 0 : 2] }
      : { from: senderAddress };

    console.log(
      "StakeInfo Sent From Datax.js",
      newStakeInfo,
      "Args send to From Datax.js",
      args
    );
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
      const code = error.code === 4001 ? 4001 : 1000;
      throw {
        code,
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
    await this.preStakeChecks(
      senderAddress,
      senderAddress,
      stakeInfo.uints[0],
      this.config.custom.stakeRouterAddress,
      stakeInfo.meta[0],
      false,
      "stake",
      stakeInfo.path,
      true
    );

    return await this.constructTxFunction(
      senderAddress,
      stakeInfo,
      this.stakeRouter.methods.stakeETHInDTPool,
      this.failureMessage,
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
    await this.preStakeChecks(
      stakeInfo.meta[0],
      senderAddress,
      stakeInfo.uints[0],
      this.config.custom.stakeRouterAddress,
      stakeInfo.meta[0],
      false,
      "unstake",
      stakeInfo.path,
      true
    );

    return await this.constructTxFunction(
      senderAddress,
      stakeInfo,
      this.stakeRouter.methods.unstakeETHFromDTPool,
      this.failureMessage,
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
      senderAddress,
      stakeInfo.uints[0],
      this.config.custom.stakeRouterAddress,
      stakeInfo.meta[0],
      false,
      "stake",
      stakeInfo.path,
      false
    );

    return await this.constructTxFunction(
      senderAddress,
      stakeInfo,
      this.stakeRouter.methods.stakeTokenInDTPool,
      this.failureMessage,
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
    await this.preStakeChecks(
      stakeInfo.path[0],
      senderAddress,
      stakeInfo.uints[0],
      this.config.custom.stakeRouterAddress,
      stakeInfo.meta[0],
      false,
      "unstake",
      stakeInfo.path,
      false
    );

    return await this.constructTxFunction(
      senderAddress,
      stakeInfo,
      this.stakeRouter.methods.unstakeTokenFromDTPool,
      this.failureMessage,
      false,
      "unstake"
    );
  }

  /**
   * Constructs the standard way to call a calculation function. Converts all amounts in the uint256 array to wei,
   * then calls the passed transaction function with the updated stakeInfo. Built in error handling will pass the
   * provided errorMessage to the thrown error if an error occurs.
   * @param stakeInfo - stakeInfo to be used in tx function
   * @param calcFunction - calculation function to be called
   * @param errorMessage - message in the case of failure
   * @param IN - whether calculating in or not
   * @returns { dataxFee: string; poolAmountOut: string; refFee: string } pool amount out and fees in eth denom
   */

  private async constructCalcFunction(
    stakeInfo: IStakeInfo,
    calcFunction: Function,
    errorMessage: string,
    IN: "in" | "out",
    senderAddress?: string
  ): Promise<{
    dataxFee: string;
    refFee: string;
    return: string;
  }> {
    const [uints, returnUnit] = await this.convertUintsToWei(
      stakeInfo.uints,
      stakeInfo.path,
      IN
    );

    const newStakeInfo: IStakeInfo = {
      ...stakeInfo,
      uints,
    };

    try {
      const responseInWei = await calcFunction(newStakeInfo).call();
      if (responseInWei) {
        const { poolAmountOut, baseAmountOut, poolAmountIn, dataxFee, refFee } =
          responseInWei;

        //depending on the calcFunction param, only one of these values will be truthy
        const toReturn = poolAmountOut || baseAmountOut || poolAmountIn;

        return {
          return: this.fromWei(toReturn, returnUnit),
          dataxFee: this.fromWei(dataxFee),
          refFee: this.fromWei(refFee),
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
  public async calcPoolOutGivenTokenIn(
    stakeInfo: IStakeInfo,
    senderAddress?: string
  ) {
    console.log("Stake info in calcPoolOutGivenTokenIn datax.js", stakeInfo);

    const {
      return: poolAmountOut,
      dataxFee,
      refFee,
    } = await this.constructCalcFunction(
      stakeInfo,
      this.stakeCalc.methods.calcPoolOutGivenTokenIn,
      "Failed to calculate pool out given token in",
      "out",
      senderAddress
    );

    return { poolAmountOut, dataxFee, refFee };
  }

  /**
   * This is an unstake calculation. Calculates the pool amount in needed for an exact token amount out.
   * @param stakeInfo
   * @returns {{ poolAmountIn, dataxFee, refFee }} { poolAmountIn, dataxFee, refFee }
   */
  public async calcPoolInGivenTokenOut(
    stakeInfo: IStakeInfo,
    senderAddress?: string
  ) {
    console.log("Stake info in calcPoolInGivenTokenOut datax.js", stakeInfo);

    const {
      return: poolAmountIn,
      dataxFee,
      refFee,
    } = await this.constructCalcFunction(
      stakeInfo,
      this.stakeCalc.methods.calcPoolInGivenTokenOut,
      "Failed to calculate pool in given token out",
      "in",
      senderAddress
    );

    return { poolAmountIn, dataxFee, refFee };
  }

  /**
   * This is an unstake calculation. Calculates the amount of base token out from an exact pool amount in.
   * @param stakeInfo
   * @param senderAddress - The address which the transaction will be sent from.
   * @returns {{ baseAmountOut, dataxFee, refFee }} {baseAmountOut, dataxFee, refFee}
   */
  public async calcTokenOutGivenPoolIn(
    stakeInfo: IStakeInfo,
    senderAddress?: string
  ) {
    console.log("Stake info in calcTokenOutGivenPoolIn datax.js", stakeInfo);

    const {
      return: baseAmountOut,
      dataxFee,
      refFee,
    } = await this.constructCalcFunction(
      stakeInfo,
      this.stakeCalc.methods.calcTokenOutGivenPoolIn,
      "Failed to calculate token out given pool in",
      "out",
      senderAddress
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
