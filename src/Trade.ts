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
