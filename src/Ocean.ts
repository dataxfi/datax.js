import {DataTokens, Logger, OceanPool } from '@dataxfi/ocean.js'
import { TransactionReceipt } from 'web3-core'
import { AbiItem } from 'web3-utils/types'
import {default as ExchangeRouter} from './abi/ExchangeRouter.json'
import datatokensABI from '@oceanprotocol/contracts/artifacts/DataTokenTemplate.json'
import poolABI from '@oceanprotocol/contracts/artifacts/BPool.json'
import BFactoryABI from '@oceanprotocol/contracts/artifacts/BFactory.json'
import Decimal from 'decimal.js'
import BigNumber from 'bignumber.js'
import DTFactoryABI from '@oceanprotocol/contracts/artifacts/DTFactory.json'
import Base from './Base'

const APPROXIMATION = 0.999

export interface TokensReceived {
    dtAmount: string
    oceanAmount: string
  }

export interface PoolShare {
    poolAddress: string
    shares: string
    did: string
}

export interface Swap {
    poolAddress: string
    tokenInAddress: string
    tokenOutAddress: string
    swapAmount: string  // tokenInAmount / tokenOutAmount
    limitReturnAmount: string  // minAmountOut / maxAmountIn
    maxPrice: string
}
  
export default class Ocean extends Base{

    private logger: any = null
    private oceanPool: OceanPool = null
    private oceanTokenAddress: string = null
    private poolFactoryAddress: string = null
  
    constructor(web3: any, network: any, poolFactoryAddress?:string, oceanTokenAddress?:string){
      super(web3, network)
      this.logger = Logger
      this.poolFactoryAddress = poolFactoryAddress ? poolFactoryAddress : this.config.defaultConfig.poolFactoryAddress
      this.oceanTokenAddress = oceanTokenAddress ? oceanTokenAddress : this.config.defaultConfig.oceanTokenAddress
      this.oceanPool = new OceanPool(this.web3,
        this.logger,
        BFactoryABI.abi as AbiItem[],
        poolABI.abi as AbiItem[],
        this.poolFactoryAddress,
        this.oceanTokenAddress
        )
    }




/**
  * returns token balance of a given account
  * @param {String} tokenAddress
  * @param {String} account 
  * @returns {String} (in ETH denom)
  */
 public async getBalance(tokenAddress: string, account: string): Promise<string> {
   try {
    const datatoken = new DataTokens(
    this.config.defaultConfig.factoryAddress,
    DTFactoryABI.abi as AbiItem[],
    datatokensABI.abi as AbiItem[],
    this.web3,
    this.logger
  );

  let balance =  await datatoken.balance(tokenAddress, account)
  return balance
  } catch (e) {
      console.error(`ERROR: ${e.message}`)
      throw new Error(`ERROR: ${e.message}`)
  }
}



 /**
  * check if token spend allowance is approved for a given spender accounts
  * @param {String} tokenAddress 
  * @param {String} account 
  * @param {String} spender 
  * @param {String} amount 
  * @returns {Boolean}
  */
  public async checkIfApproved(tokenAddress: string, account: string, spender: string, amount: string): Promise<boolean> {
    try {
        const tokenInst  = new this.web3.eth.Contract(datatokensABI.abi as AbiItem[], tokenAddress)
        let allowance = await tokenInst.methods.allowance(account, spender).call()
        console.log('Allowance - ', Number(this.web3.utils.fromWei(allowance)))
        if(new Decimal(this.web3.utils.fromWei(allowance)).gt(amount)){
            return true
        } 
    } catch (e) {
        console.error(`ERROR: ${e.message}`)
        throw new Error(`ERROR: ${e.message}`)
    }
        return false
 }

   /**
  * approve spender to spend your tokens
  * @param tokenAddress 
  * @param account 
  * @param spender 
  * @param amount 
  */
    public async approve(tokenAddress: string , spender: string, amount: string, account: string): Promise<TransactionReceipt> {
      try {
        const datatoken = new DataTokens(
         this.config.defaultConfig.factoryAddress,
         DTFactoryABI.abi as AbiItem[],
         datatokensABI.abi as AbiItem[],
         this.web3,
         this.logger
       );
     
       return await datatoken.approve(tokenAddress, spender, amount, account)
      } catch (e) {
        console.error(`ERROR: ${e.message}`)
        throw new Error(`ERROR: ${e.message}`)
      }
     }
  
     
/**
 * get DT price per OCEAN
 * @param poolAddress 
 * @returns 
 */
public async getDTPerOCEAN(poolAddress: string): Promise<string> {
    return await this.oceanPool.getDTNeeded(poolAddress, '1')
    
}


/**
 * get OCEAN price per DT
 * @param poolAddress 
 * @returns 
 */
public async getOCEANPerDT(poolAddress: string): Promise<string> {
    return await this.oceanPool.getOceanNeeded(poolAddress, '1')
}

/**
   * Get Ocean Received
   * @param poolAddress 
   * @param dtAmount 
   * @returns 
   */
 public async getOceanReceived(poolAddress: string, dtAmount: string): Promise<string> {
  return await this.oceanPool.getOceanReceived(poolAddress, dtAmount)
}

/**
   * Calculate how many data token are you going to receive for selling a specific oceanAmount (buying DT)
   * @param {String} poolAddress
   * @param {String} oceanAmount
   * @return {String[]} - amount of ocean tokens received
   */
 public async getDTReceived(poolAddress: string, oceanAmount: string): Promise<string> {
    return await this.oceanPool.getDTReceived(poolAddress, oceanAmount)

}


/**
 * stake OCEAN tokens in a pool
 * @param account 
 * @param poolAddress 
 * @param amount 
 */
public async stakeOcean(account: string, poolAddress: string, amount: string): Promise<TransactionReceipt> {
    return await this.oceanPool.addOceanLiquidity(account, poolAddress, amount)
}

/**
 * unstake OCEAN tokens from pool
 * @param account 
 * @param poolAddress 
 * @param amount 
 * @param maximumPoolShares 
 * @returns 
 */
public async unstakeOcean(account: string, poolAddress: string, amount: string, maximumPoolShares: string): Promise<TransactionReceipt> {
    return await this.oceanPool.removeOceanLiquidity(account, poolAddress, amount, maximumPoolShares)
}

/**
 * returns pool shares of a given pool for a given account
 * @param poolAddress 
 * @param account 
 * @returns 
 */
public async getMyPoolSharesForPool(poolAddress: string, account: string): Promise<string> {
    return await this.getBalance(poolAddress, account)
}

/**
 * returns total shares of a given pool
 * @param poolAddress 
 * @returns 
 */
public async getTotalPoolShares(poolAddress: string): Promise<string> {
  try {
    const poolInst  = new this.web3.eth.Contract(poolABI.abi as AbiItem[], poolAddress)
    let totalSupply = await poolInst.methods.totalSupply().call()
    return this.web3.utils.fromWei(totalSupply)
  } catch (e) {
    console.error(`ERROR: ${e.message}`)
    throw new Error(`ERROR: ${e.message}`)
  } 
}

/**
 * Returns Datatoken & Ocean amounts received after spending given poolShares
 * @param poolAddress 
 * @param account 
 * @returns 
 */
 public async getTokensRemovedforPoolShares(poolAddress: string, poolShares: string): Promise<TokensReceived> {
    return await this.oceanPool.getTokensRemovedforPoolShares(poolAddress, poolShares)
}

/**
 * Returns all staked pools for a given account
 * @param account 
 * @returns 
 */
public async getAllStakedPools(account: string): Promise<PoolShare[]> {
    return await this.oceanPool.getPoolSharesByAddress(account)
}

/**
 * returns swap fee for a given pool
 * @param poolAddress 
 * @returns 
 */
public async getSwapFee(poolAddress: string){
    return await this.oceanPool.getSwapFee(poolAddress)
}

/**
 * calculates Swap Fee for a given trade
 * @param poolAddress 
 * @param tokenInAmount 
 * @returns 
 */
public async calculateSwapFee(poolAddress: string, tokenInAmount: string): Promise<string> {
    try {
    let swapFee = await this.oceanPool.getSwapFee(poolAddress)
    return new Decimal(tokenInAmount).mul(swapFee).toString()
    } catch (e) {
      console.error(`ERROR: ${e.message}`)
      throw new Error(`ERROR: ${e.message}`)
    } 
}

/**
 * swaps Ocean tokens to exact no. of datatokens
 * @param account 
 * @param poolAddress 
 * @param dtAmountWanted 
 * @param maxOceanAmount 
 * @returns 
 */
public async swapOceanToExactDt(account: string, poolAddress: string, dtAmountWanted: string, maxOceanAmount: string):Promise<TransactionReceipt> {
    return await this.oceanPool.buyDT(account, poolAddress, dtAmountWanted, maxOceanAmount)
}

/**
 * swaps exact no. of Ocean tokens to datatokens
 * @param account ]
 * @param poolAddress 
 * @param minimumdtAmountWanted 
 * @param OceanAmount 
 * @returns 
 */
public async swapExactOceanToDt(account: string, poolAddress: string, minimumdtAmountWanted: string, OceanAmount: string): Promise<TransactionReceipt> {
    return await this.oceanPool.buyDTWithExactOcean(account, poolAddress, minimumdtAmountWanted, OceanAmount)
}

/**
 * Swaps exact no. of datatokens to Ocean tokens
 * @param account 
 * @param poolAddress 
 * @param minimumOceanAmountWanted 
 * @param maxDTAmount 
 * @returns 
 */
public async swapExactDtToOcean(account: string, poolAddress: string, minimumOceanAmountWanted: string, maxDTAmount: string):Promise<TransactionReceipt> {
  return await this.oceanPool.sellDT(account, poolAddress, maxDTAmount, minimumOceanAmountWanted)
}

/**
 * swaps datatokens to exact no. of Ocean tokens
 * @param account 
 * @param poolAddress 
 * @param oceanAmountWanted 
 * @param dtAmount 
 * @returns 
 */
public async swapDtToExactOcean(account: string, poolAddress: string, oceanAmountWanted: string, dtAmount: string):Promise<TransactionReceipt> {
  try {
    let dtNeeded = await this.oceanPool.getDTNeeded(poolAddress, oceanAmountWanted)
    return await this.oceanPool.sellDT(account, poolAddress, dtNeeded, oceanAmountWanted)
  } catch (e) {
    console.error(`ERROR: ${e.message}`)
    throw new Error(`ERROR: ${e.message}`)
  } 
}

/**
 * Returns input Datatoken amount needed for swapping to exact Datatoken out
 * @param outputDTAmountWanted 
 * @param inputPoolAddress 
 * @param outputPoolAddress 
 * @returns 
 */
public async getDtNeededForExactDt(
    outputDTAmountWanted: string,
    inputPoolAddress: string,
    outputPoolAddress: string,
): Promise<any> {

  try {
   //calculate OCEAN needed
  const oceanNeeded = await this.oceanPool.getOceanNeeded(outputPoolAddress, outputDTAmountWanted)
  console.log('oceanNeeded - ', oceanNeeded)

  //calculate Input Dt needed
  const inputDtNeeded = await this.oceanPool.getDTNeeded(inputPoolAddress, oceanNeeded)
  console.log('input Dt needed - ', inputDtNeeded)

  return inputDtNeeded

  } catch (e) {
    console.error(`ERROR: ${e.message}`)
    throw new Error(`ERROR: ${e.message} `)
  } 
}

/**
 * Swaps input Datatoken for exact output Datatoken
 * @param account 
 * @param inputDTAddress 
 * @param outputDTAddress 
 * @param outputDTAmountWanted 
 * @param maxInputDTAmount 
 * @param inputPoolAddress 
 * @param outputPoolAddress 
 * @param proxyAddress 
 * @returns 
 */
public async swapDtToExactDt(
    account: string,
    inputDTAddress: string,
    outputDTAddress: string,
    outputDTAmountWanted: string,
    maxInputDTAmount: string,
    inputPoolAddress: string,
    outputPoolAddress: string,
    proxyAddress?: string,
  ): Promise<any> {

    try {
    
    proxyAddress = proxyAddress ? proxyAddress : this.config.exchangeRouter[this.network]

    //calculate OCEAN received
    const oceanReceived = await this.oceanPool.getOceanReceived(inputPoolAddress, maxInputDTAmount)
    console.log('oceanReceived - ', oceanReceived)
  
    // calculate Output DT received
    const outputDTReceived = await this.oceanPool.getDTReceived(outputPoolAddress, oceanReceived)
    console.log('outputDTReceived - ', outputDTReceived)
    
    if(new Decimal(outputDTReceived).lt(Number(outputDTAmountWanted) * APPROXIMATION)){
      throw new Error(`ERROR: not getting needed outputDT amount. Amount received - ${outputDTReceived}`)
    }
  
    //prepare swap route
    const swaps = 
      [{
        pool: inputPoolAddress,
        tokenIn: inputDTAddress,
        tokenOut: this.oceanTokenAddress,
        limitReturnAmount: this.web3.utils.toWei(maxInputDTAmount),
        swapAmount: this.web3.utils.toWei(oceanReceived),
        maxPrice: this.config.config.maxUint256
      },
      {
        pool: outputPoolAddress,
        tokenIn: this.oceanTokenAddress,
        tokenOut: outputDTAddress,
        limitReturnAmount: this.web3.utils.toWei(oceanReceived),
        swapAmount: this.web3.utils.toWei(outputDTAmountWanted),
        maxPrice: this.config.config.maxUint256
      }]

  
  //check allowance
    let inputDTApproved = await this.checkIfApproved(inputDTAddress, account, proxyAddress, maxInputDTAmount)
    if(!inputDTApproved){
        let approveAmt = maxInputDTAmount
        let approveTx = await this.approve(inputDTAddress, proxyAddress, this.web3.utils.toWei(maxInputDTAmount), account)
    }

    let oceanApproved = await this.checkIfApproved(this.oceanTokenAddress, account, proxyAddress, oceanReceived)
    if(!oceanApproved){
        let approveTx = await this.approve(this.oceanTokenAddress, proxyAddress, this.web3.utils.toWei(oceanReceived) , account)
    }

    //swap
    const proxyInst  = new this.web3.eth.Contract(ExchangeRouter.abi as AbiItem[], proxyAddress)
    let estGas = await proxyInst.methods.swapDtToExactDt(swaps, inputDTAddress, outputDTAddress, this.web3.utils.toWei(maxInputDTAmount)).estimateGas({from: account})
    console.log('Gas needed - ', estGas)
    let totalAmountOut = await proxyInst.methods.swapDtToExactDt(swaps, inputDTAddress, outputDTAddress, this.web3.utils.toWei(maxInputDTAmount)).send({from: account, gas: 1000000})
    return totalAmountOut

    } catch (e) {
      console.error(`ERROR: ${e.message}`)
      throw new Error(`ERROR: ${e.message}`)
    } 
  }
  
  /**
   * Returns output datatokens received for exact input datatokens
   * @param inputDtAmount 
   * @param inputPoolAddress 
   * @param outputPoolAddress 
   * @returns 
   */
  public async getDtReceivedForExactDt(
    inputDtAmount: string,
    inputPoolAddress: string,
    outputPoolAddress: string,
): Promise<any> {

  try {
  //calculate OCEAN received
  const oceanReceived = await this.oceanPool.getOceanReceived(inputPoolAddress, inputDtAmount)
  console.log('ocean Received - ', oceanReceived)

  //calculate output Dt received
  const outputDtReceived = await this.oceanPool.getDTReceived(outputPoolAddress, oceanReceived)
  console.log('Output Dt Received - ', outputDtReceived)

  return outputDtReceived
  } catch (e) {
    console.error(`ERROR: ${e.message}`)
    throw new Error(`ERROR: ${e.message}`)
  } 
}

/**
 * Swaps exact input datatoken for minumum amount output datatoken
 * @param account 
 * @param inputDtAddress 
 * @param outputDtAddress 
 * @param minOutputDtAmount 
 * @param inputDtAmount 
 * @param inputPoolAddress 
 * @param outputPoolAddress 
 * @param proxyAddress 
 * @returns 
 */
public async swapExactDtToDt(
    account: string,
    inputDtAddress: string,
    outputDtAddress: string,
    minOutputDtAmount: string,
    inputDtAmount: string,
    inputPoolAddress: string,
    outputPoolAddress: string,
    proxyAddress?: string,
  ): Promise<any> {
    
    try {
    proxyAddress = proxyAddress ? proxyAddress : this.config.exchangeRouter[this.network]

    //calculate OCEAN received
    const oceanReceived = await this.oceanPool.getOceanReceived(inputPoolAddress, inputDtAmount)
    console.log('oceanReceived - ', oceanReceived)
  
    // calculate Output DT received
    const outputDtReceived = await this.oceanPool.getDTReceived(outputPoolAddress, oceanReceived)
    console.log('outputDTReceived - ', outputDtReceived)
    
    if(new Decimal(outputDtReceived).lt(Number(minOutputDtAmount) * APPROXIMATION)){
      throw new Error(`ERROR: not getting needed outputDT amount. Amount received - ${outputDtReceived}`)
    }
  
    //prepare swap route
    const swaps = [
      [{
        pool: inputPoolAddress,
        tokenIn: inputDtAddress,
        tokenOut: this.oceanTokenAddress,
        limitReturnAmount: this.web3.utils.toWei(oceanReceived),
        swapAmount: this.web3.utils.toWei(inputDtAmount),
        maxPrice: this.config.config.maxUint256
      },
      {
        pool: outputPoolAddress,
        tokenIn: this.oceanTokenAddress,
        tokenOut: outputDtAddress,
        limitReturnAmount: this.web3.utils.toWei(minOutputDtAmount),
        swapAmount: this.web3.utils.toWei(oceanReceived),
        maxPrice: this.config.config.maxUint256
      }]
    ]

  
  //check allowance
    let inputDtApproved = await this.checkIfApproved(inputDtAddress, account, proxyAddress, inputDtAmount)
  
    if(!inputDtApproved){
        let approveAmt = inputDtAmount
        let approveTx = await this.approve(inputDtAddress, proxyAddress, this.web3.utils.toWei(inputDtAmount), account)
    }

    let oceanApproved = await this.checkIfApproved(this.oceanTokenAddress, account, proxyAddress, oceanReceived)
  
    if(!oceanApproved){
        let approveTx = await this.approve(this.oceanTokenAddress, proxyAddress, this.web3.utils.toWei(oceanReceived) , account)
    }

    //swap
    const proxyInst  = new this.web3.eth.Contract(ExchangeRouter.abi as AbiItem[], proxyAddress)
    let estGas = await proxyInst.methods.swapExactDtToDt(swaps, inputDtAddress, outputDtAddress, this.web3.utils.toWei(inputDtAmount), this.web3.utils.toWei(minOutputDtAmount)).estimateGas({from: account})
    console.log('Gas needed - ', estGas)
    let totalAmountOut = await proxyInst.methods.swapExactDtToDt(swaps, inputDtAddress, outputDtAddress, this.web3.utils.toWei(inputDtAmount), this.web3.utils.toWei(minOutputDtAmount)).send({from: account, gas: estGas ? estGas : 1000000})
    return totalAmountOut

    } catch (e) {
      console.error(`ERROR: ${e.message}`)
      throw new Error(`ERROR: ${e.message}`)
    } 
  }
  




/*
getPriceImpact(string fromTokenAddress, string toTokenAddress, string fromTokenAmount, string minToTokenAmountReceived) returns (string priceImpact)
 

//TODO
public async getPoolSharesAfterLiquidity(poolAddress: string, account: string, suppliedOCEAN: string, suppliedDT: string): Promise<string> {

}

*/


}