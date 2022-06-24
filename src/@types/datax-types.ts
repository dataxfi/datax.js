import BigNumber from "bignumber.js";
import { TokenList as Tlist, TokenInfo as TInfo } from "@uniswap/token-lists";
import { Config } from "../models";

export interface ConfigHelperConfig extends Config {
  networkId: number;
  network: string;
  subgraphUri: string;
  explorerUri: string;
  oceanTokenSymbol: string;
  transactionBlockTimeout: number;
  transactionConfirmationBlocks: number;
  transactionPollingTimeout: number;
  gasFeeMultiplier: number;
  rbacUri?: string;
}

export type PoolTransactionType = "swap" | "join" | "exit";

export type supportedNetworks =
  | "1"
  | "4"
  | "56"
  | "137"
  | "246"
  | "1285"
  | "8996";

export interface IMaxUnstake {
  maxTokenOut: BigNumber;
  maxPoolTokensIn: BigNumber;
  userPerc: BigNumber;
}

export interface IMaxExchange {
  maxBuy: BigNumber;
  maxSell: BigNumber;
  maxPercent: BigNumber;
  postExchange: BigNumber;
}

export interface ITokensReceived {
  dtAmount: string;
  oceanAmount: string;
}

export interface IPoolShare {
  poolAddress: string;
  shares: string;
  did: string;
}

export interface ISwap {
  poolAddress: string;
  tokenInAddress: string;
  tokenOutAddress: string;
  swapAmount: string; // tokenInAmount / tokenOutAmount
  limitReturnAmount: string; // minAmountOut / maxAmountIn
  maxPrice: string;
}

export interface ITokenDetails {
  name: string;
  symbol: string;
  id: string;
}

export interface ITokenInfo extends TInfo {
  pools: { id: string }[];
  did: string;
  isFRE:boolean
}

export interface ITList extends Tlist {
  tokens: ITokenInfo[];
}

export interface IToken {
  balance: BigNumber;
  value: BigNumber;
  info: ITokenInfo | null;
  loading: boolean;
  percentage: BigNumber;
  allowance?: BigNumber;
}

export interface IPoolDetails {
  id: string;
  datatoken: ITokenDetails;
  baseToken: ITokenDetails;
  baseTokenLiquidity: string;
  datatokenLiquidity: string;
  totalShares: string;
}

export interface IPoolTransaction {
  poolAddress: string;
  dtAddress: string;
  caller: string;
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
  tokenIn?: string;
  tokenOut?: string;
  tokenAmountIn?: string;
  tokenAmountOut?: string;
  type: PoolTransactionType;
}

export interface ITokensToAdd {
  address: string;
  amount: string;
  weight: string;
}
