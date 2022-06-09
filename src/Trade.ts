import Web3 from "web3";
import Base from "./Base";
import Ocean from "./Ocean";
import { Contract } from "web3-eth-contract";
import adapterABI from "./abi/UniV2AdapterAbi.json";

export default class Trade extends Base {
  private ocean: Ocean;
  private adapterAddress: string = this.config.default.uniV2AdapterAddress;
  private adapter: Contract;

  constructor(web3: Web3, networkId: string, ocean?: Ocean) {
    super(web3, networkId);

    ocean
      ? (this.ocean = ocean)
      : (this.ocean = new Ocean(this.web3, this.networkId));

    this.adapter = this.web3.eth.Conract(adapterABI, this.adapterAddress);
  }

  // should this need deadline?
  // should this need amount in max?
  public swapETHtoExactTokens(
    amountOut: string,
    path: string[],
    to: string,
    refundTo: string
  ) {}

  // should this need deadline?
  // should this need amount in?
  public swapExactETHForTokens(
    amountOutMin: string,
    path: string[],
    to: string
  ) {}

  // should this need deadline?
  public swapTokensForExactETH(
    amountInMax: string,
    amountOut: string,
    path: string[],
    to: string,
    refundTo: string
  ) {}

  // should this need deadline?
  public swapExactTokensForETH(
    amountIn: string,
    amountOutMin: string,
    path: string[],
    to: string
  ) {}

  // should this need deadline?\
  public swapExactTokensForTokens(
    amountIn: string,
    amountOutMin: string,
    path: string[],
    to: string
  ) {}

  public swapTokensForExactTokens(
    amountInMax: string,
    amountOut: string,
    path: string[],
    to: string,
    refundTo: string
  ) {}
}
