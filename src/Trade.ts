import Web3 from "web3";
import Base from "./Base";
import Ocean from "./Ocean";
import { Contract } from "web3-eth-contract";
import adapterABI from "./abi/UniV2AdapterAbi.json";
import { getFairGasPrice } from "./utils";
import { TransactionReceipt } from "web3-core";

export default class Trade extends Base {
  private ocean: Ocean;
  private adapterAddress: string = this.config.default.uniV2AdapterAddress;
  private adapter: Contract;
  private GASLIMIT_DEFAULT = 1000000;

  constructor(web3: Web3, networkId: string, ocean?: Ocean) {
    super(web3, networkId);

    ocean
      ? (this.ocean = ocean)
      : (this.ocean = new Ocean(this.web3, this.networkId));

    this.adapter = this.web3.eth.Conract(adapterABI, this.adapterAddress);
  }

  /**
   * Constract and execute a swap transaction function in a standard way. The 
   * will call estimateGas, then call the transaction. This function assumes the
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
        gasPrice: await getFairGasPrice(this.web3),
      });
    } catch (error) {
      throw new Error(`${errorMessage} : ${error.message}`);
    }
  }

  // should this need deadline?
  // should this need amount in max?
  // TODO: needs pre tx checks
  /**
   * Swap native coin for an exact amount of tokens (not datatokens).
   * 
   * @param amountOut - The exact amount of tokens expected out.
   * @param path - The path between tokens.
   * @param to - The address to be credited with token out.
   * @param refundTo - The address to refund credit with remaining token in.
   * @param senderAddress - The address of the sender.
   * @returns {TransactionReceipt} The receipt from the transaction.
   */
  public async swapETHForExactTokens(
    amountOut: string,
    path: string[],
    to: string,
    refundTo: string,
    senderAddress: string
  ): Promise<TransactionReceipt> {
    return await this.constructTxFunction(
      senderAddress,
      [amountOut, path, to, refundTo],
      this.adapter.methods.swapETHForExactTokens,
      "Failed to swap native coin to exact tokens"
    );
  }

  // should this need deadline?
  // should this need amount in?
  // TODO: needs pre tx checks
  /**
   * Swap an exact amount of native coin for tokens (not datatokens).
   * 
   * @param amountOutMin - The minimum amount of expected tokens out.
   * @param path - The path between tokens.
   * @param to - The address to be credited with token out.
   * @param senderAddress - The address of the sender.
   * @returns
   */
  public async swapExactETHForTokens(
    amountOutMin: string,
    path: string[],
    to: string,
    senderAddress: string
  ): Promise<TransactionReceipt> {
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
  // should this need deadline?
  // TODO: needs pre tx checks
  public async swapTokensForExactETH(
    amountOut: string,
    amountInMax: string,
    path: string[],
    to: string,
    refundTo: string,
    senderAddress: string
  ): Promise<TransactionReceipt> {
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
  // should this need deadline?
  // TODO: needs pre tx checks
  public async swapExactTokensForETH(
    amountIn: string,
    amountOutMin: string,
    path: string[],
    to: string,
    senderAddress: string
  ): Promise<TransactionReceipt> {
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
  // should this need deadline?\
  // TODO: needs pre tx checks
  public async swapExactTokensForTokens(
    amountIn: string,
    amountOutMin: string,
    path: string[],
    to: string,
    senderAddress: string
  ): Promise<TransactionReceipt> {
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
  // TODO: needs pre tx checks
  public async swapTokensForExactTokens(
    amountOut: string,
    amountInMax: string,
    path: string[],
    to: string,
    refundTo: string,
    senderAddress: string
  ): Promise<TransactionReceipt> {
    return await this.constructTxFunction(
      senderAddress,
      [amountOut, amountInMax, path, to, refundTo],
      this.adapter.methods.swapTokensForExactTokens,
      "Failed to swap tokens for exact tokens"
    );
  }
}
