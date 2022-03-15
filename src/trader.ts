import { OceanPool, Pool } from "./balancer";
import { DataTokens } from "./Datatokens";
import { Logger } from "./utils";
import { TransactionReceipt } from "web3-core";
import { AbiItem } from "web3-utils/types";
import { default as DataxRouter } from "./abi/DataxRouter.json";
import datatokensABI from "@oceanprotocol/contracts/artifacts/DataTokenTemplate.json";
import poolABI from "@oceanprotocol/contracts/artifacts/BPool.json";
import BFactoryABI from "@oceanprotocol/contracts/artifacts/BFactory.json";
import Decimal from "decimal.js";
import BigNumber from "bignumber.js";
import DTFactoryABI from "@oceanprotocol/contracts/artifacts/DTFactory.json";
import Base from "./Base";

export default class Trader extends Base {
    constructor(web3:any,network:any){
        super(web3, network)
    }
    /**
         * get current version  number for the contract
         * @returns string
     */
    public async getCurrentVersion(){}
    
    /**
        * get the constant fees being transferred to the collector after the swap.
        * @returns string 
     */
    public async getSwapFees(){}
    
    /**
        @dev Swaps given max amount of ETH (native token) to datatokens
        @param amountOut is the exact amount of datatokens you want to be receive
        @param amountInMax is the max amount of ETH you want to spend
        @param path is the address array for the swap path based on liquidity
        @param to is the destination address for receiving destination token
        @param refFees is the referral fees paid to external dapps
        @param refAddress is the address where referral fees are paid to
        @param deadline is the max time in sec during which order must be filled
        @returns 
     */
    public async swapETHforExactDatatokens(
        amountInMax: string,
        amountOut: string,
        path: string[],
        to: string,
        refFees: string,
        refAddress: string,
        deadline: string,
    ){}

    /**
        @dev Swaps exact amount of ETH (native token) to datatokens
        @param amountOutMin is the min amount of datatokens you want to receive
        @param path is the address array for the swap path based on liquidity
        @param to is the destination address for receiving destination token
        @param refFees is the referral fees paid to external dapps
        @param refAddress is address where referral fees are paid to
        @param deadline is the max time in sec during which order must be filled  
        @returns 
     */
    public async swapExactETHforDataTokens(
        amountOutMin: string,
        path: string[],
        to: string,
        refFees: string,
        refAddress: string,
        deadline: string,
    ){}
    /**
        @dev Swaps given max amount of erc20 tokens to datatokens
        @param amountIn is the exact amount of datatokens you want to spend 
        @param amountOutMin is the min amount of ETH you want to receive
        @param path is the address array for the swap path based on liquidity
        @param to is the destination address for receiving destination token
        @param refFees is the referral fees paid to external dapps
        @param refAddress is address where referral fees are paid to
        @param deadline is the max time in sec during which order must be filled  
        @returns  
     */
    public async swapExactDatatokensforETH(
        amountIn: string,
        amountOutMin: string,
        path: string[],
        to: string,
        refFees: string,
        refAddress: string,
        deadline: string
    ){}
    /**
        @dev Swaps given max amount of erc20 tokens to datatokens
        @param amountOut is the exact amount of Datatokens you want to be receive
        @param amountInMax is the max amount of erc20 tokens you want to spend
        @param path is the address array for the swap path based on liquidity
        @param to is the destination address for receiving destination token
        @param refFees is the referral fees paid to external dapps
        @param refAddress is the address where referral fees are paid to
        @param deadline is the max time in sec during which order must be filled
        @returns  
     */

    public async swapTokensforExactDatatokens(
        amountInMax: string,
        amountOut: string,
        path: string[],
        to: string,
        refFees: string,
        refAddress: string,
        deadline: string
    ){}
     /** 
        @dev Swaps exact amount of erc20 tokens to datatokens
        @param amountIn is the exact amount of erc20 tokens you want to spend 
        @param amountOutMin is the min amount of datatokens you want to receive
        @param path is the address array for the swap path based on liquidity
        @param to is the destination address for receiving destination token
        @param refFees is the referral fees paid to external dapps
        @param refAddress is address where referral fees are paid to
        @param deadline is the max time in sec during which order must be filled
        @returns
    */
    public async swapExactTokensforDataTokens(
        amountIn: string,
        amountOutMin: string,
        path: string[],
        to: string,
        refFees: string,
        refAddress: string,
        deadline: string
    ){}
    /**
        @dev Swaps exact amount of datatokens to erc20 tokens
        @param amountIn is the exact amount of datatokens you want to spend 
        @param amountOutMin is the min amount of erc20 tokens you want to receive
        @param path is the address array for the swap path based on liquidity
        @param to is the destination address for receiving destination token
        @param refFees is the referral fees paid to external dapps
        @param refAddress is address where referral fees are paid to
        @param deadline is the max time in sec during which order must be filled
        @returns
    */
    public async swapExactDatatokensforDatatokens(
        amountIn: string,
        amountOutMin: string,
        path: string[],
        to: string,
        refFees: string,
        refAddress: string,
        deadline: string
    ){}
    /**
        @dev Swaps given max amount of datatokens to exact datatokens
        @param amountInMax is the max amount of datatokens you want to spend
        @param amountOut is the exact amount of datatokens you want to be receive
        @param path is the address array for the swap path based on liquidity
        @param to is the destination address for receiving destination token
        @param refFees is the referral fees paid to external dapps
        @param refAddress is the address where referral fees are paid to
        @param deadline is the max time in sec during which order must be filled
        @returns
    */
    public async swapDatatokensforExactDatatokens(
        amountInMax: string,
        amountOut: string,
        path: string[],
        to: string,
        refFees: string,
        refAddress: string,
        deadline: string
    ){}
    

    /** 
        @dev swaps Exact ETH to Tokens (as DT in tradeRouter).
        @param amountOutMin minimum output amount
        @param path array of address of tokens used for swapping.
        @param to destination address for output tokens
        @param deadline transaction deadline
    */
    public async swapExactETHForTokens(
        amountOutMin: string,
        path: string[],
        to: string,
        deadline: string
    ){}
    /** 
        @dev swaps ETH to Exact  DT amounts  
        @param amountOut  is the exact tokens (DT) that you want . 
        @param path  are the array of  token address whose duration is followed for liquidity
        @param to destination address for output tokens
        @param deadline is the transaction  deadline till then amountOut exact tokens are swapped  
        @returns
    */
    public async swapETHtoExactTokens(
        amountOut: string,
        path: string[],
        to: string,
        deadline: string
    ){}
    /** 
        @dev swaps Exact Tokens (DT/ERC20) for Tokens(DT/ERC20) , 
        @param amountIn exact token input amount
        @param amountOutMin minimum expected output amount
        @param path path of tokens
        @param to destination address for output tokens
        @param deadline transaction deadline 
        @returns
    */
    public async swapExactTokensForTokens(
        amountIn: string,
        amountOutMin: string,
        path: string[],
        to: string,
        deadline: string
    ){}
    /** 
        @dev swaps Tokens (DT / ERC20) for Exact tokens  (DT / ERC20)
        @param amountInMax maximum input amount
        @param amountOut expected output amount
        @param path path of tokens
        @param to destination address for output tokens
        @param deadline transaction deadline 
        * @returns
    */
     public async swapTokensForExactTokens(
        amountInMax: string,
        amountOut: string,
        path: string[],
        to: string,
        deadline: string
    ){}
