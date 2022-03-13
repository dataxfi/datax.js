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
        * @params account
        * @params amountInMax
        * @params amountOut
        * @params path
        * @params refFees
        * @params refAddress
        * @params deadline
        * @returns 
     */
    public async swapETHforExactDatatokens(
        account: string,
        amountInMax: string,
        amountOut: string,
        path: string[],
        refFees: string,
        refAddress: string,
        deadline: string,
    ){}

    /**
        * @params account
        * @params amountOutMin
        * @params path
        * @params refFees
        * @params refAddress
        * @params deadline  
        * @returns 
     */
    public async swapExactETHforDataTokens(
        account: string,
        amountOutMin: string,
        path: string[],
        refFees: string,
        refAddress: string,
        deadline: string,
    ){}
    /**
        * @params account
        * @params amountIn
        * @params amountOutMin
        * @params path
        * @params refFees
        * @params refAddress
        * @params deadline  
        * @returns  
     */
    public async swapExactDatatokensforETH(
        account: string,
        amountIn: string,
        amountOutMin: string,
        path: string[],
        refFees: string,
        refAddress: string,
        deadline: string
    ){}
    /**
        * @params account
        * @params amountInMax
        * @params amountOut
        * @params path
        * @params refFees
        * @params refAddress
        * @params deadline
        * @returns  
     */

    public async swapTokensforExactDatatokens(
        account: string,
        amountInMax: string,
        amountOut: string,
        path: string[],
        refFees: string,
        refAddress: string,
        deadline: string
    ){}
    /**
         * Swaps exact no. of datatokens to Ocean tokens
         * @param account
         * @param amountIn
         * @param amountOutMin
         * @param path
         * @param refFees
         * @param refAddress
         * @param deadline
         * @returns
    */
    public async swapExactTokensforDataTokens(
        account: string,
        amountIn: string,
        amountOutMin: string,
        refFees: string,
        refAddress: string,
        deadline: string
    ){}
    /**
         * Swaps exact no. of datatokens to Ocean tokens
         * @param account
         * @param amountIn
         * @param amountOutMin
         * @param path
         * @param refFees
         * @param refAddress
         * @param deadline
         * @returns
    */
    public async swapExactDatatokensforDatatokens(
        account: string,
        amountIn: string,
        amountOutMin: string,
        refFees: string,
        refAddress: string,
        deadline: string
    ){}
    /**
         * Swaps exact no. of datatokens to Ocean tokens
         * @param account
         * @param amountInMax
         * @param amountOut
         * @param path
         * @param refFees
         * @param refAddress
         * @param deadline
         * @returns
    */
    public async swapDatatokensforExactDatatokens(
        account: string,
        amountInMax: string,
        amountOut: string,
        refFees: string,
        refAddress: string,
        deadline: string
    ){}
    

    /** 
        * @param amountOutMin 
        * @param path
        * @param to 
        * @param deadline 
        * @returns
    */
    public async swapExactETHForTokens(
        amountOutMin: string,
        path: string,
        to: string,
        deadline: string
    ){}
    /** 
        * @param amountOut  
        * @param path
        * @param to 
        * @param deadline 
        * @returns
    */
    public async swapETHtoExactTokens(
        amountOut: string,
        path: string,
        to: string,
        deadline: string
    ){}
    /** 
        * @param amountIn 
        * @param amountOut  
        * @param path
        * @param to 
        * @param deadline 
        * @returns
    */
    public async swapExactTokensForTokens(
        amountIn: string,
        amountOutMin: string,
        path: string,
        to: string,
        deadline: string
    ){}
    /** 
        * @param amountInMax
        * @param amountOut
        * @param path
        * @param to 
        * @param deadline 
        * @returns
    */
     public async swapTokensForExactTokens(
        amountInMax: string,
        amountOut: string,
        path: string,
        to: string,
        deadline: string
    ){}
