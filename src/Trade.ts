import Web3 from "web3";
import Base from "./Base";
import { Contract } from "web3-eth-contract";
import { TransactionReceipt } from "web3-core";
import BigNumber from "bignumber.js";
import { AbiItem, Unit } from "web3-utils";
import adapterABI from "./abi/UniV2Adapter.json";
import {
  getFairGasPrice,
  getMaxSwapExactIn,
  getMaxSwapExactOut,
  units,
} from "./utils/";
import { supportedNetworks } from "./@types";
import { Datatoken } from "./tokens";
import { Pool } from "./balancer";
import Config from "./Config";
import { allowance, approve, balance, decimals } from "./utils/TokenUtils";

export default class Trade extends Base {
  private adapterAddress: string;
  private adapter: Contract;
  private GASLIMIT_DEFAULT = 1000000;
  private datatoken: Datatoken;
  private pool: Pool;

  constructor(web3: Web3, networkId: supportedNetworks) {
    super(web3, networkId);
    this.adapterAddress = this.config.custom.uniV2AdapterAddress;
    this.datatoken = new Datatoken(this.web3, this.networkId);
    this.pool = new Pool(web3, this.config);

    this.adapter = new this.web3.eth.Contract(
      adapterABI as AbiItem[],
      this.adapterAddress
    );
  }

  public async approve(
    tokenAddress: string,
    senderAddress: string,
    amountIn: string,
    spender: string,
    isDT: boolean,
    decimals: number = 18
  ) {
    try {
      if (isDT) {
        return await this.datatoken.approve(
          tokenAddress,
          spender,
          amountIn,
          senderAddress
        );
      } else {
        return await approve(
          this.web3,
          senderAddress,
          tokenAddress,
          spender,
          amountIn,
          true,
          decimals
        );
      }
    } catch (error) {
      const code = error.code === 4001 ? 4001 : 1000;
      throw {
        code,
        error,
        message: "Failed to approve tokens.",
      };
    }
  }

  /**
   * This is a generic function that can be used to get the max exchange
   * for a token in a pool. This can't be used for getting the max exchange
   * for DT to DT values, in which case you should use getMaxDtToDtExchange()
   * @param tokenAddress
   * @param poolAddress
   * @retun - An object containing the max amount in and the max amount out.
   */

  public async getMaxExchange(tokenAddress: string, poolAddress: string) {
    const maxIn = await getMaxSwapExactIn(this.pool, poolAddress, tokenAddress);
    const maxOut = await getMaxSwapExactOut(
      this.pool,
      poolAddress,
      tokenAddress
    );
    return { maxIn, maxOut };
  }

  /**
   * Gets the max in and out for a DT to DT swap. The max token in is weighed against the
   * max token out and the lesser of each max is the limiting value.
   * @param dtIn - An object containing the datatoken address and a poolAddress containing
   * the DtIn.
   * @param dtOut - An object containing the datatoken address and a poolAddress containing
   * the DtOut.
   * @returns - And object containing the maxDtIn and the maxDtOut
   */
  public async getMaxDtToDtExchange(
    dtIn: { tokenAddress: string; poolAddress: string },
    dtOut: { tokenAddress: string; poolAddress: string }
  ): Promise<{ maxDtIn: string; maxDtOut: string }> {
    const maxDtIn = await getMaxSwapExactIn(
      this.pool,
      dtIn.poolAddress,
      dtIn.tokenAddress
    );
    const maxDtOut = await getMaxSwapExactOut(
      this.pool,
      dtOut.poolAddress,
      dtOut.tokenAddress
    );

    // TODO: getOceanReceived will need to be switched with a new function
    // TODO: from the v2 tradeRouter contract that gets base token received for
    // TODO: a datatoken amount.
    const maxDtInToOcean = new BigNumber(
      0
      // await this.getOceanReceived(dtOut.poolAddress, maxDtIn.toString())
    );
    const maxDtOutInOcean = new BigNumber(
      0
      // await this.getOceanReceived(dtOut.poolAddress, maxDtOut.toString())
    );

    /**The lesser value is the max exchange for the DT pair. The other value
     * is the DT received for the max.
     */
    if (maxDtInToOcean.lt(maxDtOutInOcean)) {
      const maxDtOut = "0";
      // await this.getOceanReceived(
      //   dtOut.poolAddress,
      //   maxDtInToOcean.toString()
      // );
      return { maxDtIn: maxDtIn.toString(), maxDtOut };
    } else {
      const maxDtIn = "0";
      // await this.getOceanReceived(
      //   dtIn.poolAddress,
      //   maxDtOutInOcean.toString()
      // );
      return { maxDtIn, maxDtOut: maxDtOut.toString() };
    }
  }

  /**
   * This function will get the max amount in and out of a token pair intended
   * to be swapped. The pool used for swapping each token is needed, and can be
   * the same pool if they share one. It is important to note that the max
   * amount in might equate to be greater than the max amount out, in which case
   * the max amount out should limit the max amount in, and vice versa.
   * @param tokenIn
   * @param tokenOut
   */
  public async getMaxInAndOut(
    tokenIn: { address: string; pool: string },
    tokenOut: { address: string; pool: string }
  ) {
    //TODO: integrate swap path to get max in/out in base token to token in
    const maxIn = await getMaxSwapExactIn(
      this.pool,
      tokenIn.pool,
      tokenIn.address
    );
    const maxOut = await getMaxSwapExactOut(
      this.pool,
      tokenOut.pool,
      tokenOut.address
    );

    return { maxIn, maxOut };
  }

  public async getSpotPrice(
    poolAddress: string,
    tokenIn: string,
    tokenOut: string
  ) {
    let swapMarketFee: string;
    try {
      swapMarketFee = await this.pool.getMarketFee(poolAddress);
    } catch (error) {
      throw {
        Code: 1000,
        Message: "An error occurred, please refresh your connection.",
        error,
      };
    }

    try {
      return await this.pool.getSpotPrice(
        poolAddress,
        tokenIn,
        tokenOut,
        swapMarketFee
      );
    } catch (error) {
      throw {
        Code: 1000,
        Message: "An error occurred, please refresh your connection.",
        error,
      };
    }
  }

  /**
   * Returns swap fee for a given pool
   * @param poolAddress
   * @returns
   */
  public async getSwapFee(poolAddress: string): Promise<string> {
    try {
      return await this.pool.getSwapFee(poolAddress);
    } catch (error) {
      throw {
        Code: 1000,
        Message: "An error occurred, please refresh your connection.",
        error,
      };
    }
  }

  /**
   * calculates Swap Fee for a given trade
   * @param poolAddress
   * @param tokenInAmount
   * @returns
   */
  public async calculateSwapFee(
    poolAddress: string,
    tokenInAmount: string
  ): Promise<string> {
    try {
      let swapFee = await this.pool.getSwapFee(poolAddress);
      return new BigNumber(tokenInAmount).multipliedBy(swapFee).toString();
    } catch (error) {
      throw {
        Code: 1000,
        Message: "An error occurred, please refresh your connection.",
        error,
      };
    }
  }

  /**
   * Returns token balance of a given account
   * @param {String} tokenAddress
   * @param {String} account
   * @returns {String} (in ETH denom)
   */
  public async getBalance(
    tokenAddress: string,
    account: string,
    isDT: boolean,
    tokenDecimals?: number
  ): Promise<string> {
    try {
      if (isDT) {
        return await this.datatoken.balance(tokenAddress, account);
      } else {
        if (!tokenDecimals)
          tokenDecimals = await decimals(this.web3, tokenAddress);
        return await balance(this.web3, tokenAddress, account, tokenDecimals);
      }
    } catch (error) {
      throw {
        Code: 1000,
        Message: "An error occurred, please refresh your connection.",
        error,
      };
    }
  }

  /**
   * Conducts preliminary checks to be made before a swap transaction is emitted. Checks wether
   * transaction amount is less than user balance and that the user is approved to spend the
   * transaction amount. Route mapping should filter out pools without enough liquidity rendering
   * max exchange checks unecessary when the swap path is predetermined.
   * @param inAddress - The token in address.
   * @param tokenOut - The token out address.
   * @param senderAddress - The sender of the transaction.
   * @param amount - The token in amount.
   * @param spender - The contract the transaction will be sent to.
   */

  private async preSwapChecks(
    tokenIn: string,
    senderAddress: string,
    amountIn: string,
    amountOut: string,
    spender: string,
    isDT: boolean
  ) {
    const inBigNum = new BigNumber(amountIn);
    const outBigNum = new BigNumber(amountOut);
    const balance = new BigNumber(
      await this.getBalance(tokenIn, senderAddress, false)
    );

    if (balance.lt(inBigNum)) {
      throw new Error("ERROR: Not Enough Balance");
    }

    let isApproved;
    try {
      //check approval limit vs tx amount
      isApproved = new BigNumber(
        await allowance(this.web3, tokenIn, senderAddress, spender)
      );
    } catch (error) {
      throw new Error("Could not check allowance limit");
    }

    try {
      if (isApproved.lt(inBigNum))
        await this.approve(tokenIn, spender, amountIn, senderAddress, isDT);
    } catch (error) {
      throw new Error("Could not process approval transaction");
    }
  }

  /**
   * Construct and execute a swap transaction function in a standard way. Will
   * call estimateGas, then call the transaction. This function assumes the
   * transaction will be successful, and does not make any pre tx checks. Built in
   * error handling will pass errorMessage along with the origional error message.
   *
   * @param senderAddress - Sender of the transaction.
   * @param params - Params to spread into transaction function. The
   * params in the array need to be in the exact order as the transaction
   * function requires them to be.
   * @param swapFunction - The transaction function to call.
   * @param errorMessage - An error message to return on failure.
   * @returns {TransactionReceipt} The receipt from the transaction.
   */
  private async constructTxFunction(
    senderAddress: string,
    params: any[],
    swapFunction: Function,
    errorMessage: string
  ): Promise<TransactionReceipt> {
    let estGas;
    //TODO: Add to wei conversion with correct token decimals
    try {
      estGas = await swapFunction(...params).estimateGas(
        { from: senderAddress },
        (err, estGas) => (err ? this.GASLIMIT_DEFAULT : estGas)
      );
    } catch (error) {
      estGas = this.GASLIMIT_DEFAULT;
    }

    try {
      return await swapFunction(...params).send({
        from: senderAddress,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config.default),
      });
    } catch (error) {
      throw new Error(`${errorMessage} : ${error.message}`);
    }
  }

  /**
   * Swap native coin for an exact amount of tokens (not datatokens).
   *
   * @param maxAmountIn - The max amount of native coin to be spent.
   * @param amountOut - The exact amount of tokens expected out.
   * @param path - The path between tokens.
   * @param to - The address to be credited with token out.
   * @param refundTo - The address to refund credit with remaining token in.
   * @param senderAddress - The address of the sender.
   * @returns {TransactionReceipt} The receipt from the transaction.
   */
  public async swapETHForExactTokens(
    maxAmountIn: string,
    amountOut: string,
    path: string[],
    to: string,
    refundTo: string,
    senderAddress: string
  ): Promise<TransactionReceipt> {
    await this.preSwapChecks(
      path[0],
      senderAddress,
      maxAmountIn,
      amountOut,
      this.adapterAddress,
      false
    );

    return await this.constructTxFunction(
      senderAddress,
      [amountOut, path, to, refundTo],
      this.adapter.methods.swapETHForExactTokens,
      "Failed to swap native coin to exact tokens"
    );
  }

  /**
   * Swap an exact amount of native coin for tokens (not datatokens).
   *
   * @param amountIn - The exact amount of tokens to be spent.
   * @param amountOutMin - The minimum amount of expected tokens out.
   * @param path - The path between tokens.
   * @param to - The address to be credited with token out.
   * @param senderAddress - The address of the sender.
   * @returns
   */
  public async swapExactETHForTokens(
    amountIn: string,
    amountOutMin: string,
    path: string[],
    to: string,
    senderAddress: string
  ): Promise<TransactionReceipt> {
    await this.preSwapChecks(
      path[0],
      senderAddress,
      amountIn,
      amountOutMin,
      this.adapterAddress,
      false
    );
    return await this.constructTxFunction(
      senderAddress,
      [amountOutMin, path, to],
      this.adapter.methods.swapExactETHForTokens,
      "Failed to swap exact native coin for tokens"
    );
  }

  /**
   * Swap tokens for an exact amount of native coin.
   *
   * @param amountOut - The exact amount of tokens expected out.
   * @param amountInMax - The max amount of token in to be spent.
   * @param path - The path between tokens.
   * @param to - The address to be credited with token out.
   * @param refundTo - The address to refund credit with remaining token in.
   * @param senderAddress - The address of the sender.
   * @returns
   */
  public async swapTokensForExactETH(
    amountOut: string,
    amountInMax: string,
    path: string[],
    to: string,
    refundTo: string,
    senderAddress: string
  ): Promise<TransactionReceipt> {
    await this.preSwapChecks(
      path[0],
      senderAddress,
      amountInMax,
      amountOut,
      this.adapterAddress,
      false
    );
    return await this.constructTxFunction(
      senderAddress,
      [amountOut, amountInMax, path, to, refundTo],
      this.adapter.methods.swapTokensForExactETH,
      "Failed to swap tokens for exact native coin"
    );
  }

  /**
   * Swap an exact amount of tokens for native coin.
   *
   * @param amountIn - The exact amount of token in to be spent.
   * @param amountOutMin - The minimum amount of token out expected.
   * @param path - The path between tokens.
   * @param to - The address to be credited with token out.
   * @param senderAddress - The address of the sender.
   * @returns
   */
  public async swapExactTokensForETH(
    amountIn: string,
    amountOutMin: string,
    path: string[],
    to: string,
    senderAddress: string
  ): Promise<TransactionReceipt> {
    await this.preSwapChecks(
      path[0],
      senderAddress,
      amountIn,
      amountOutMin,
      this.adapterAddress,
      false
    );
    return await this.constructTxFunction(
      senderAddress,
      [amountIn, amountOutMin, path, to],
      this.adapter.methods.swapExactTokensForETH,
      "Failed to swap exact tokens for native coin"
    );
  }

  /**
   * Swap an exact amount of tokens for tokens.
   *
   * @param amountIn - The exact amount of token in to be spent.
   * @param amountOutMin - The minimum amount of token out expected.
   * @param path - The path between tokens.
   * @param to - The address to be credited with token out.
   * @param senderAddress - The address of the sender.
   * @returns
   */
  public async swapExactTokensForTokens(
    amountIn: string,
    amountOutMin: string,
    path: string[],
    to: string,
    senderAddress: string
  ): Promise<TransactionReceipt> {
    await this.preSwapChecks(
      path[0],
      senderAddress,
      amountIn,
      amountOutMin,
      this.adapterAddress,
      false
    );
    return await this.constructTxFunction(
      senderAddress,
      [amountIn, amountOutMin, path, to],
      this.adapter.methods.swapExactTokensForTokens,
      "Failed to swap exact tokens for tokens"
    );
  }

  /**
   * Swap tokens for an exact amount of tokens.
   *
   * @param amountOut - The exact amount of tokens expected out.
   * @param amountInMax - The max amount of token in to be spent.
   * @param path - The path between tokens.
   * @param to - The address to be credited with token out.
   * @param refundTo The address to refund credit with remaining token in.
   * @param senderAddress - The address of the sender.
   * @returns
   */
  public async swapTokensForExactTokens(
    amountOut: string,
    amountInMax: string,
    path: string[],
    to: string,
    refundTo: string,
    senderAddress: string
  ): Promise<TransactionReceipt> {
    await this.preSwapChecks(
      path[0],
      senderAddress,
      amountInMax,
      amountOut,
      this.adapterAddress,
      false
    );
    return await this.constructTxFunction(
      senderAddress,
      [amountOut, amountInMax, path, to, refundTo],
      this.adapter.methods.swapTokensForExactTokens,
      "Failed to swap tokens for exact tokens"
    );
  }

  private fromWei = (amount: string, unit: Unit = "ether") =>
    this.web3.utils.fromWei(amount, unit);
  private toWei = (amount: string, unit: Unit = "ether") =>
    this.web3.utils.toWei(amount, unit);

  /**
   * Given an input asset amount and an array of token addresses, calculates all subsequent maximum output token amounts.
   * @param amountIn - will be converted to wei
   * @param path - each value in respective wei conversion
   */
  public async getAmountsOut(
    amountIn: string,
    path: string[]
  ): Promise<string[]> {
    const tokenInDecimals = await decimals(this.web3, path[0]);
    const amountToWei = this.toWei(amountIn, units[tokenInDecimals]);
    console.log("Call to getAmountsOut with", amountToWei, tokenInDecimals, units[tokenInDecimals])
    const amountsOutInWei = await this.adapter.methods
      .getAmountsOut(amountToWei, path)
      .call();

    const promises = amountsOutInWei.map(async (amt: string, index: number) => {
      const tokenDecimals = await decimals(this.web3, path[index]);
      console.log(path[index], tokenDecimals);
      return this.fromWei(amt, units[tokenDecimals]);
    });

    const amtsResolved = await Promise.all(promises);
    console.log(amtsResolved)
    return amtsResolved;
  }

  /**
   * Given an output asset amount and an array of token addresses, calculates all preceding minimum input token amounts.
   * @param amountOut - will be converted to wei
   * @param path - each value in respective wei conversion
   */
  public async getAmountsIn(
    amountOut: string,
    path: string[]
  ): Promise<string[]> {
    const tokenOutDecimals = await decimals(this.web3, path[path.length - 1]);
    const amountToWei = this.toWei(amountOut, units[tokenOutDecimals]);
    const amountsInInWei = await this.adapter.methods
      .getAmountsIn(amountToWei, path)
      .call();

    const promises: Promise<string>[] = amountsInInWei.map(
      async (amt: string, index: number) => {
        const tokenDecimals = await decimals(this.web3, path[index]);
        return this.fromWei(amt, units[tokenDecimals]);
      }
    );

    const amtsResolved = await Promise.all(promises);
    return amtsResolved;
  }

  //TODO: make duplicate getAmountsInWei and getAmountsOutWei
}
