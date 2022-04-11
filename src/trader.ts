import { OceanPool, Pool } from "./balancer";
import { DataTokens } from "./Datatokens";
import { Logger,getFairGasPrice } from "./utils";
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
import tradeRouterABI from './abi/traderRouter.json';
import adapterRouterABI from './abi/adapterRouter.json';
import tokenABI from './abi/tokenABI.json';

export default class Trader extends Base {
    private tradeRouter: any = null;
    private adapterRouter: any = null;
    private refFees: any = null;
    private refAddress: any = null;
    private tradeRouterAddress: string = this.config.default.tradeRouterAddress;
    private adapterRouterAddress: string = this.config.default.adapterRouterAddress;
    public GASLIMIT_DEFAULT = 1000000
    public adapterVersion: string = this.config.default.adapterVersion
    
    constructor(web3:any,network:any,deafultRefAddress:string, defaultRefFees:string){
        super(web3, network);
        this.refAddress = deafultRefAddress;
        this.refFees = defaultRefFees;
        this.tradeRouter = this.web3.eth.Contract(
            tradeRouterABI,
            this.tradeRouterAddress
        );
        this.adapterRouter = this.web3.ethContract(
            adapterRouterABI,
            this.adapterRouterAddress
        )
    }
    private splitPath(
        path: string[]
    ): any{
        let length: number = path.length;
        let path1:string[] = path.slice(0,length-1);
        let path2:string = path[length-1]
        return [path1,path2]
    }
    public async checkIfApproved(
        tokenAddress: string, 
        account: string, 
        spender:string, 
        amount: string
    ): Promise<boolean>{
        
        try{
            let tokenInst:any = this.web3.ethContract(
                tokenABI,
                tokenAddress
            )
            tokenInst.methods.allwance(account,spender);
            let allowance = await tokenInst.methods.allowance(account, spender).call();
            if (new Decimal(this.web3.utils.fromWei(allowance)).gt(amount)) {
                return true;
            }
        } catch (e) {
                console.error("ERROR:", e);
                throw e;
        }
        return false;
    }
    public async approve(
        tokenAddress: string,
        account: string,
        spender: string,
        amount: string
    ): Promise<TransactionReceipt> {
        const token = new this.web3.eth.Contract(tokenABI, tokenAddress, {
            from: account
        })
        const gasLimitDefault = this.GASLIMIT_DEFAULT
        let estGas
        try {
            estGas = await token.methods
            .approve(spender, this.web3.utils.toWei(amount))
            .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
        } catch (e) {
            estGas = gasLimitDefault
        }
        const trxReceipt = await token.methods
            .approve(spender, this.web3.utils.toWei(amount))
            .send({
                from: account,
                gas: estGas + 1,
                gasPrice: await getFairGasPrice(this.web3)
            })
        return trxReceipt
    }
        
    /**
         * get current version  number for the contract
         * @returns string
     */
    public async getCurrentVersion(): Promise<string>{
        return await this.tradeRouter.methods.getCurrentVersion.call()
    }
    
    /**
        * get the constant fees being transferred to the collector after the swap.
        * @returns string 
     */
    public async getSwapFees(): Promise<string>{
        return await this.tradeRouter.methods.getSwapFees.call()
    }
    
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
        account: string,
        amountOut: string,
        amountInMax: string,
        path: string[],
        to: string,
        deadline: string,
        isFre: string,
        exhnageId: string,
        source: string,
        refFees?: string,
        refAddress?: string,
    ): Promise<TransactionReceipt>{
        refFees = (typeof refFees === 'undefined') ? this.refFees : refFees;
        refAddress = (typeof refAddress === 'undefined') ? this.refAddress : refAddress;
        
        let dtAddress:string
        [path,dtAddress] = this.splitPath(path)

        let dtAmountOut: any = this.adapterRouter.getAmountsOut(amountInMax,path).call()

        let meta: any = [source, dtAddress, to, refAddress, this.adapterRouterAddress];
        let uints: any = [dtAmountOut, refFees, deadline];
        
        return await this.tradeRouter.swapETHforExactDatatokens({
            meta,
            uints,
            path,
            isFre,
            exhnageId
        }).send({from: account, value: amountInMax})
    }
    

    /**
        @dev Swaps exact amount of ETH (native token) to datatokens
        @param amountIn is the amount of ETH you want to spend.
        @param amountOutMin is the min amount of datatokens you want to receive
        @param path is the address array for the swap path based on liquidity
        @param to is the destination address for receiving destination token
        @param refFees is the referral fees paid to external dapps
        @param refAddress is address where referral fees are paid to
        @param deadline is the max time in sec during which order must be filled  
        @returns 
     */
    public async swapExactETHforDataTokens(
        account: string,
        amountIn: string,
        amountOutMin: string,
        path: string[],
        to: string,
        deadline: string,
        refFees?: string,
        refAddress?: string,
    ): Promise<TransactionReceipt>{
        refFees = (typeof refFees === 'undefined') ? this.refFees : refFees;
        refAddress = (typeof refAddress === 'undefined') ? this.refAddress : refAddress;
        return await this.tradeRouter.swapExactETHforDataTokens(
            amountOutMin, 
            path, 
            to, 
            refFees, 
            refAddress, 
            deadline
        ).send({from: account, value: amountIn})
    }
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
        account: string,
        amountIn: string,
        amountOutMin: string,
        path: string[],
        to: string,
        deadline: string,
        refFees?: string,
        refAddress?: string,
    ): Promise<TransactionReceipt>{
        refFees = (typeof refFees === 'undefined') ? this.refFees : refFees;
        refAddress = (typeof refAddress === 'undefined') ? this.refAddress : refAddress;
        let inputTokenApproved = await this.checkIfApproved(
            path[0],
            account,
            this.tradeRouterAddress,
            amountIn
        )
        if(!inputTokenApproved){
            let approveTx = await this.approve(
                path[0],
                account,
                this.tradeRouterAddress,
                this.web3.utils.toWei(amountIn)
              );
        }
        return await this.tradeRouter.swapExactDatatokensforETH(
            amountIn, 
            amountOutMin, 
            path, 
            to, 
            refFees, 
            refAddress,
            deadline
        ).send({from: account})
    }
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
        account: string,
        amountInMax: string,
        amountOut: string,
        path: string[],
        to: string,
        deadline: string,
        refFees?: string,
        refAddress?: string,
    ): Promise<TransactionReceipt>{
        refFees = (typeof refFees === 'undefined') ? this.refFees : refFees;
        refAddress = (typeof refAddress === 'undefined') ? this.refAddress : refAddress;
        let inputTokenApproved = await this.checkIfApproved(
            path[0],
            account,
            this.tradeRouterAddress,
            amountInMax
        )
        if(!inputTokenApproved){
            let approveTx = await this.approve(
                path[0],
                account,
                this.tradeRouterAddress,
                this.web3.utils.toWei(amountInMax)
              );
        }
        return await this.tradeRouter.swapTokensforExactDatatokens(
            amountOut, 
            amountInMax, 
            path, 
            to, 
            refFees, 
            refAddress,
            deadline
        ).send({from: account})
    }
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
        account: string,
        amountIn: string,
        amountOutMin: string,
        path: string[],
        to: string,
        deadline: string,
        refFees?: string,
        refAddress?: string,
    ): Promise<TransactionReceipt>{
        refFees = (typeof refFees === 'undefined') ? this.refFees : refFees;
        refAddress = (typeof refAddress === 'undefined') ? this.refAddress : refAddress;
        let inputTokenApproved = await this.checkIfApproved(
            path[0],
            account,
            this.tradeRouterAddress,
            amountIn
        )
        if(!inputTokenApproved){
            let approveTx = await this.approve(
                path[0],
                account,
                this.tradeRouterAddress,
                this.web3.utils.toWei(amountIn)
              );
        }
        return await this.tradeRouter.swapExactTokensforDataTokens(
            amountIn, 
            amountOutMin, 
            path, 
            to, 
            refFees, 
            refAddress,
            deadline
        ).send({from: account})
    }
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
        account: string,
        amountIn: string,
        amountOutMin: string,
        path: string[],
        to: string,
        deadline: string,
        refFees?: string,
        refAddress?: string,
    ): Promise<TransactionReceipt>{
        refFees = (typeof refFees === 'undefined') ? this.refFees : refFees;
        refAddress = (typeof refAddress === 'undefined') ? this.refAddress : refAddress;
        let inputTokenApproved = await this.checkIfApproved(
            path[0],
            account,
            this.tradeRouterAddress,
            amountIn
        )
        if(!inputTokenApproved){
            let approveTx = await this.approve(
                path[0],
                account,
                this.tradeRouterAddress,
                this.web3.utils.toWei(amountIn)
              );
        }
        return await this.tradeRouter.swapExactDatatokensforDatatokens(
            amountIn, 
            amountOutMin, 
            path, 
            to, 
            refFees, 
            refAddress,
            deadline
        ).send({from: account})
    }
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
        account: string,
        amountInMax: string,
        amountOut: string,
        path: string[],
        to: string,
        deadline: string,
        refFees?: string,
        refAddress?: string,
    ): Promise<TransactionReceipt>{
        refFees = (typeof refFees === 'undefined') ? this.refFees : refFees;
        refAddress = (typeof refAddress === 'undefined') ? this.refAddress : refAddress;
        let inputTokenApproved = await this.checkIfApproved(
            path[0],
            account,
            this.tradeRouterAddress,
            amountInMax
        )
        if(!inputTokenApproved){
            let approveTx = await this.approve(
                path[0],
                account,
                this.tradeRouterAddress,
                this.web3.utils.toWei(amountInMax)
              );
        }
        return await this.tradeRouter.swapDatatokensforExactDatatokens(
            amountOut, 
            amountInMax, 
            path, 
            to, 
            refFees, 
            refAddress,
            deadline
        ).send({from: account})
    }
    


// UNIV2 ROUTER FUNCTIONS
    /** 
        @dev swaps Exact ETH to Tokens (as DT in tradeRouter).
        @param amountIn amount of ETH you want to spend.
        @param amountOutMin minimum output amount
        @param path array of address of tokens used for swapping.
        @param to destination address for output tokens
        @param deadline transaction deadline
    */
    public async swapExactETHForTokens(
        account: string,
        amountIn: string,
        amountOutMin: string,
        path: string[],
        to: string,
        deadline: string
    ): Promise<TransactionReceipt>{
        return await this.adapterRouter.methods.swapExactETHForTokens(
            amountOutMin,
            path,
            to,
            deadline
        ).send({from: account, value: amountIn})

    }
    /** 
        @dev swaps ETH to Exact  DT amounts  
        @param amountInMax is the max amount of ETH you want to spend
        @param amountOut  is the exact tokens (DT) that you want . 
        @param path  are the array of  token address whose duration is followed for liquidity
        @param to destination address for output tokens
        @param deadline is the transaction  deadline till then amountOut exact tokens are swapped  
        @returns
    */
    public async swapETHtoExactTokens(
        account: string,
        amountInMax: string,
        amountOut: string,
        path: string[],
        to: string,
        deadline: string
    ): Promise<TransactionReceipt>{
        return await this.adapterRouter.methods.swapETHtoExactTokens(
            amountOut,
            path,
            to,
            deadline
        ).send({from: account, value: amountInMax})
    }
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
        account: string,
        amountIn: string,
        amountOutMin: string,
        path: string[],
        to: string,
        deadline: string
    ): Promise<TransactionReceipt>{
        let inputTokenApproved = await this.checkIfApproved(
            path[0],
            account,
            this.adapterRouterAddress,
            amountIn
        )
        if(!inputTokenApproved){
            let approveTx = await this.approve(
                path[0],
                account,
                this.adapterRouterAddress,
                this.web3.utils.toWei(amountIn)
              );
        }
        return await this.adapterRouter.methods.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            to,
            deadline
        ).send({from: account})
    }
    /** 
        @dev swaps Tokens (DT / ERC20) for Exact tokens  (DT / ERC20)
        @param amountInMax maximum input amount
        @param amountOut expected output amount
        @param path path of tokens
        @param to destination address for output tokens
        @param deadline transaction deadline 
        @returns
    */
     public async swapTokensForExactTokens(
        account: string,
        amountInMax: string,
        amountOut: string,
        path: string[],
        to: string,
        deadline: string
    ): Promise<TransactionReceipt>{
        let inputTokenApproved = await this.checkIfApproved(
            path[0],
            account,
            this.adapterRouterAddress,
            amountInMax
        )
        if(!inputTokenApproved){
            let approveTx = await this.approve(
                path[0],
                account,
                this.adapterRouterAddress,
                this.web3.utils.toWei(amountInMax)
              );
        }
        return await this.adapterRouter.methods.swapTokensForExactTokens(
            amountOut,
            amountInMax,
            path,
            to,
            deadline
        ).send({from: account})
    }
