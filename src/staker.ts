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
    /* 
        get current version of the contract
    */
    public async getCurrentVersion(){}
    /** takes  the  token amount from any supported ERC20 <> DT lp pair and stakes it to the base pair.
        @param dtpoolAddress address of dtpool where user wants to stake token 
        @param tokenAmountsOut is the amount of exact dataToken that you want to be staked in the balancer pool (excl the fees).
        @param path is the array of the address array for swap from the given user input token <> underlying DT <> baseToken.
        @param datatoken is the address of the datatoken (H20/OCEAN) that you want to stake in datapool.
        @param deadline is the  max timeline in which the order must be filled .
        @param refStakingAddress consist of  the address of the collector contract of the third party service provider.
        @param refStakingFees is the fee value that we extract from the provider 
    */
   public async StakeERC20toDT(
       dtpoolAddress: string,
       tokenAmountsOut: string,
       path: string[],
       datatoken: string,
       deadline: string,
       refStakingAddress: string,
       refStakingFees: string
   ){}

   /**  takes the given amount of ETH from user and stakes into the corresponding basetoken datapool
        @param dtpoolAddress address of dtpool where user wants to stake token 
        @param amountDTOut is the  dataTokens that you want to stake finally in pool.
        @param path stores the address in array followed by the swap and stake operation .
        @param datatoken is the address of the datatoken (H20/OCEAN) that you want to stake in datapool.
        @param deadline is the  max timeline in which the order must be filled .
        @param refStakingAddress is the address of the third party that will be paying the fees
        @param refStakingFees is the fees being extracted by the specific address for the staking operation.
    */

    public async StakeETHtoDT(
        dtpoolAddress: string,
        amountDTOut: string,
        path: string[],
        datatoken: string,
        deadline: string,
        refStakingAddress: string,
        refStakingFees: string
    ){}
    /** allows to stake any data token holded by the user into the specific basetoken of the given pools hosted by dataX.
        @param dtpoolAddress address of datapool
        @param amountDTOut defines  the  amount of the staked basedtoken of the pool .
        @param amountDTMaxIn defines the max amount of the input datatokens that you want to  swap
        @param path is the array  of addresses followed by swap and stake operation according to the available  liquidity 
        @param deadline transaction deadline
        @param refStakingAddress is the address of the third party that will be paying the fees
        @param refStakingFees is the fees being extracted from the specific address for the staking operation.
    */
   public async StakeDTtoDT(
        dtpoolAddress: string,
        amountDTOut: string,
        amountDTMaxIn: string,
        path: string[],
        datatoken: string,
        deadline: string,
        refStakingAddress: string,
        refStakingFees: string
   ){}

   /** allows to unstake the baseToken from the given dataPools and return the user the given ERC20 token 
        @param dtpoolAddress is the address of the dataPool in which user wants to unstake DT.
        @param poolAmountIn  is the amount of   the dataToken that user wants to unstake.  
        @param amountOutMin  is the min amount of resulting unstaked  baseToken  that user wants to return. 
        @param path is the array  of addresses followed by swap and stake operation according to the available  liquidity 
        @param datatoken is the address to the datatoken.
        @param to is the destination address which will receive corresponding unstaked rewards after unstaking and swap.
        @param deadline is the timestemp before which the txn with amountOutMin should be transactioned.
        @param refUnstakingAddress  is the address of the third party that will be paying the fees for unstaking.
        @param refUnstakingFees is the fees being extracted from the specific address for the Unstaking operation.
    */
    public async UnstakeDTtoERC20(
        dtpoolAddress: string,
        poolAmountIn: string,
        amountOutMin: string,
        path: string[],
        datatoken: string,
        to: string,
        deadline: string,
        refStakingAddress: string,
        refStakingFees: string
    ){}
    /** allows to unstake the DT (Data/H20) from the given dataPools and return the user in the resulting ETH
        @param dtpoolAddress is the address of datapool token that you want to  unstake from .
        @param poolAmountIn is the amount of the BaseTokens that you want to unstake to  ETH 
        @param amountOutMin is the corresponding  amount of the minimum  baseTokens  tokens that user wants.
        @param path is the array  of addresses followed by swap and stake operation according to the available  liquidity 
        @param to is the destination address receiving the given swapped tokens .
        @param deadline is the timestemp before which the txn with amountOutMin should be transactioned.
        @param refUnstakingAddress  is the address of the third party that will be paying the fees for unstaking.
        @param refUnstakingFees is the fees being extracted from the specific address for the Unstaking operation.
    */
    public async UnstakeDTtoETH(
        dtpoolAddress: string,
        poolAmountIn: string,
        amountOutMin: string,
        path: string[],
        to: string,
        deadline: string,
        refStakingAddress: string,
        refStakingFees: string
    ){}
    /** allows unstaking of the DT from datapool (ocean/H20) to other dataTokens .
        @param dtpoolAddress is the address of datapool token that you want to  develop.
        @param poolAmountIn is the amount of the BaseTokens that you want to unstake to  ETH. 
        @param amountOutMin is the corresponding  amount of the minimum  baseTokens  tokens that user wants.
        @param path is the array  of addresses followed by swap and stake operation according to the available  liquidity .
        @param to is the destination address receiving the given swapped tokens .
        @param deadline is the timestemp before which the txn with amountOutMin should be transactioned.
        @param refUnstakingAddress is the address of the  third party that will be paying the fees for unstaking.
        @param refUnstakingFees is the fees being extracted from the specific address for the Unstaking operation.
    */
    public async UnstakeDTtoDT(
        dtpoolAddress: string,
        poolAmountIn: string,
        amountOutMin: string,
        path: string[],
        to: string,
        deadline: string,
        refStakingAddress: string,
        refStakingFees: string
    ){}