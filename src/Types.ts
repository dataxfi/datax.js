import BigNumber from "bignumber.js";
import { TokenList as Tlist, TokenInfo as TInfo } from "@uniswap/token-lists";
import {Config} from "./utils/ConfigHelper"

export interface ConfigHelperConfig extends Config {
    networkId: number
    network: string
    subgraphUri: string
    explorerUri: string
    oceanTokenSymbol: string
    transactionBlockTimeout: number
    transactionConfirmationBlocks: number
    transactionPollingTimeout: number
    gasFeeMultiplier: number
    rbacUri?: string
  }

export type PoolTransactionType = 'swap' | 'join' | 'exit'

export interface IMaxUnstake {
  OCEAN: BigNumber;
  shares: BigNumber;
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
}

export interface ITokenInfo extends TInfo {
  pool: string;
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
    poolAddress: string
    tokens: string[]
  }
  
  export interface IPoolTransaction {
    poolAddress: string
    dtAddress: string
    caller: string
    transactionHash: string
    blockNumber: number
    timestamp: number
    tokenIn?: string
    tokenOut?: string
    tokenAmountIn?: string
    tokenAmountOut?: string
    type: PoolTransactionType
  }




  export interface ITokensToAdd {
    address: string;
    amount: string;
    weight: string;
  }
