import { OceanPool, Pool } from "./balancer";
import DataTokens from "./Datatokens";
import { Logger } from "./utils/Logger";
import { TransactionReceipt } from "web3-core";
import { AbiItem } from "web3-utils/types";
import { getMaxSwapExactIn, getMaxSwapExactOut } from "./utils/PoolHelpers";
import datatokensABI from "@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json";
import poolABI from "@oceanprotocol/contracts/artifacts/contracts/pools/balancer/BPool.sol/BPool.json";
import BFactoryABI from "@oceanprotocol/contracts/artifacts/contracts/pools/balancer/BFactory.sol/BFactory.json";
import Decimal from "decimal.js";
//Not sure if this is the right DTFactoryABI route
import DTFactoryABI from "@oceanprotocol/contracts/artifacts/contracts/ERC721Factory.sol/ERC721Factory.json";
import Base from "./Base";
import BigNumber from "bignumber.js";

import {
  ITokensReceived,
  IPoolShare,
  ITokenDetails,
} from "./@types/datax-types";
const SLIPPAGE_TOLERANCE = 0.01;

export default class Ocean extends Base {
  private logger: any = null;
  private oceanPool: OceanPool = null;
  private bPool: Pool = null;
  public oceanTokenAddress: string = null;
  private poolFactoryAddress: string = null;

  constructor(
    web3: any,
    network: any,
    poolFactoryAddress?: string,
    oceanTokenAddress?: string
  ) {
    super(web3, network);
    this.logger = new Logger();
    this.poolFactoryAddress = poolFactoryAddress
      ? poolFactoryAddress
      : this.config.default.poolFactoryAddress;
    this.oceanTokenAddress = oceanTokenAddress
      ? oceanTokenAddress
      : this.config.default.oceanTokenAddress;
    this.oceanPool = new OceanPool(
      this.web3,
      this.logger,
      BFactoryABI.abi as AbiItem[],
      poolABI.abi as AbiItem[],
      this.poolFactoryAddress,
      this.oceanTokenAddress
    );
    this.bPool = new Pool(
      this.web3,
      this.logger,
      BFactoryABI.abi as AbiItem[],
      poolABI.abi as AbiItem[],
      this.poolFactoryAddress
    );
  }

  /**
   * returns token balance of a given account
   * @param {String} tokenAddress
   * @param {String} account
   * @returns {String} (in ETH denom)
   */
  public async getBalance(
    tokenAddress: string,
    account: string
  ): Promise<string> {
    try {
      return this.bPool.getBalance(tokenAddress, account);
    } catch (error) {
      throw {
        Code: 1000,
        Message: "We ran into a problem, please refresh your connection.",
        error,
      };
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
  public async checkIfApproved(
    tokenAddress: string,
    account: string,
    spender: string,
    amount: string
  ): Promise<boolean> {
    try {
      return this.bPool.checkIfApproved(tokenAddress, account, spender, amount);
    } catch (error) {
      throw {
        Code: 1000,
        Message: "We ran into a problem, please refresh your connection.",
        error,
      };
    }
  }

  /**
   *
   * @param tokenAddress
   * @param account
   * @param spender
   * @returns user allowance for token
   */
  public async getAllowance(
    tokenAddress: string,
    account: string,
    spender: string
  ): Promise<string> {
    try {
      return this.bPool.allowance(tokenAddress, account, spender);
    } catch (error) {
      throw {
        Code: 1000,
        Message: "We ran into a problem, please refresh your connection.",
        error,
      };
    }
  }

  /**
   * approve spender to spend your tokens
   * @param tokenAddress
   * @param account
   * @param spender
   * @param amount
   */
  public async approve(
    tokenAddress: string,
    spender: string,
    amount: string,
    account: string
  ): Promise<TransactionReceipt> {
    try {
      const datatoken = new DataTokens(
        this.config.default.factoryAddress,
        DTFactoryABI.abi as AbiItem[],
        datatokensABI.abi as AbiItem[],
        this.web3,
        this.logger
      );

      return await datatoken.approve(tokenAddress, spender, amount, account);
    } catch (error) {
      throw { Code: 1000, Message: "Failed to approve token.", error };
    }
  }

  /**
   * Utility function to quickly determine whether a token is or not OCEAN.
   * @param tokenAddress
   * @returns {boolean} true : token is OCEAN | false : token is not OCEAN
   */
  public isOCEAN(tokenAddress: string) {
    return (
      tokenAddress.toLowerCase() ===
      this.config.default.oceanTokenAddress.toLowerCase()
    );
  }

  /**
   * Calculates the exchange for a token pair and given amount.
   * @param from Whether or not this is the token being SOLD.
   * @param amount The amount attempting to being bought or sold.
   * @param token1 The token being sold
   * @param token2 The token being bought
   * @returns The token amount required for or received from a transaction.
   *
   * if(from === true) amount = sell amount
   *
   * if(from === false) amount = buy amount
   */
  public async calculateExchange(
    from: boolean,
    amount: BigNumber,
    tokenInAddress: string,
    tokenOutAddress: string,
    pool1?: string,
    pool2?: string
  ): Promise<BigNumber> {
    try {
      if (amount.isNaN() || amount.eq(0)) {
        return new BigNumber(0);
      }
      // OCEAN to DT where amount is either from sell or buy input
      if (this.isOCEAN(tokenInAddress)) {
        if (from) {
          return new BigNumber(
            await this.getDtReceived(pool1, amount.dp(18).toString())
          );
        } else {
          return new BigNumber(
            await this.getOceanNeeded(pool1, amount.dp(18).toString())
          );
        }
      }

      // DT to OCEAN where amount is either from sell or buy input
      if (this.isOCEAN(tokenOutAddress)) {
        if (from) {
          return new BigNumber(
            await this.getOceanReceived(pool1, amount.dp(18).toString())
          );
        } else {
          return new BigNumber(
            await this.getDtNeeded(pool1, amount.dp(18).toString())
          );
        }
      }

      // DT to DT where amount is either from sell or buy input
      if (from) {
        return new BigNumber(
          await this.getDtReceivedForExactDt(
            amount.dp(18).toString(),
            pool1,
            pool2
          )
        );
      } else if (pool1 && pool2) {
        return new BigNumber(
          await this.getDtNeededForExactDt(
            amount.dp(18).toString(),
            pool1,
            pool2
          )
        );
      }
    } catch (error) {
      console.error(error);
      return new BigNumber(0);
    }
    return new BigNumber(0);
  }

  /**
   * Gets the max in and out for a DT to DT swap. The max token in is weighed against the
   * max token out and the lesser of each max is the limiting value.
   * @param dtIn - An object containing the datatoken address and a poolAddress containing
   * the DtIn.
   * @param dtOut - An object containing the datatoken address and a poolAddress containing
   * the DtOut.
   * @returns - And object containing the maxDtIn and the maxDtOut
   */
  public async getMaxDtToDtExchange(
    dtIn: { tokenAddress: string; poolAddress: string },
    dtOut: { tokenAddress: string; poolAddress: string }
  ): Promise<{ maxDtIn: string; maxDtOut: string }> {
    const maxDtIn = await getMaxSwapExactIn(
      this.bPool,
      dtIn.poolAddress,
      dtIn.tokenAddress
    );
    const maxDtOut = await getMaxSwapExactOut(
      this.bPool,
      dtOut.poolAddress,
      dtOut.tokenAddress
    );

    const maxDtInToOcean = new BigNumber(
      await this.getOceanReceived(dtOut.poolAddress, maxDtIn.toString())
    );
    const maxDtOutInOcean = new BigNumber(
      await this.getOceanReceived(dtOut.poolAddress, maxDtOut.toString())
    );

    /**The lesser value is the max exchange for the DT pair. The other value
     * is the DT received for the max.
     */
    // TODO: getOceanReceived will need to be switched with a new function
    // TODO: from the v2 tradeRouter contract that gets base token received for
    // TODO: a datatoken amount.
    if (maxDtInToOcean.lt(maxDtOutInOcean)) {
      const maxDtOut = await this.getOceanReceived(
        dtOut.poolAddress,
        maxDtInToOcean.toString()
      );
      return { maxDtIn: maxDtIn.toString(), maxDtOut };
    } else {
      const maxDtIn = await this.getOceanReceived(
        dtIn.poolAddress,
        maxDtOutInOcean.toString()
      );
      return { maxDtIn, maxDtOut: maxDtOut.toString() };
    }
  }

  /**
   * This is a generic function that can be used to get the max exchange
   * for a token in a pool. This can't be used for getting the max exchange
   * for DT to DT values, in which case you should use getMaxDtToDtExchange()
   * @param tokenAddress
   * @param poolAddress
   * @retun - An object containing the max amount in and the max amount out.
   */

  public async getMaxExchange(tokenAddress: string, poolAddress: string) {
    const maxIn = await getMaxSwapExactIn(
      this.bPool,
      poolAddress,
      tokenAddress
    );
    const maxOut = await getMaxSwapExactOut(
      this.bPool,
      poolAddress,
      tokenAddress
    );
    return { maxIn, maxOut };
  }

  /**
   * This function will get the max amount in and out of a token pair intended
   * to be swapped. The pool used for swapping each token is needed, and can be
   * the same pool if they share one. It is important to note that the max
   * amount in might equate to be greater than the max amount out, in which case
   * the max amount out should limit the max amount in, and vice versa.
   * @param tokenIn
   * @param tokenOut
   */
  public async getMaxInAndOut(
    tokenIn: { address: string; pool: string },
    tokenOut: { address: string; pool: string }
  ) {
    const maxIn = await getMaxSwapExactIn(
      this.bPool,
      tokenIn.pool,
      tokenIn.address
    );
    const maxOut = await getMaxSwapExactOut(
      this.bPool,
      tokenOut.pool,
      tokenOut.address
    );

    return { maxIn, maxOut };
  }

  /**
   * get Dt price per OCEAN
   * @param poolAddress
   * @returns
   */
  public async getDtPerOcean(poolAddress: string): Promise<string> {
    try {
      return await this.oceanPool.getDTNeeded(poolAddress, "1");
    } catch (error) {
      throw {
        Code: 1000,
        Message: "We ran into a problem, please refresh your connection.",
        error,
      };
    }
  }

  /**
   * get Ocean price per Dt
   * @param poolAddress
   * @returns
   */
  public async getOceanPerDt(poolAddress: string): Promise<string> {
    try {
      return await this.oceanPool.getOceanNeeded(poolAddress, "1");
    } catch (error) {
      throw {
        Code: 1000,
        Message: "We ran into a problem, please refresh your connection.",
        error,
      };
    }
  }

  /**
   * Get Ocean Received
   * @param poolAddress
   * @param dtAmount
   * @returns
   */
  public async getOceanReceived(
    poolAddress: string,
    dtAmount: string
  ): Promise<string> {
    try {
      return await this.oceanPool.getOceanReceived(poolAddress, dtAmount);
    } catch (error) {
      throw {
        Code: 1000,
        Message: "We ran into a problem, please refresh your connection.",
        error,
      };
    }
  }

  /**
   * Calculate how many data token are you going to receive for selling a specific oceanAmount (buying Dt)
   * @param {String} poolAddress
   * @param {String} oceanAmount
   * @return {String[]} - amount of ocean tokens received
   */
  public async getDtReceived(
    poolAddress: string,
    oceanAmount: string
  ): Promise<string> {
    try {
      return await this.oceanPool.getDTReceived(poolAddress, oceanAmount);
    } catch (error) {
      throw {
        Code: 1000,
        Message: "We ran into a problem, please refresh your connection.",
        error,
      };
    }
  }

  /**
   * Calculate how many data token are needed to buy a specific oceanAmount
   * @param {String} poolAddress
   * @param {String} oceanAmountWanted
   * @return {String[]} - amount of datatokens needed
   */
  public async getDtNeeded(
    poolAddress: string,
    oceanAmountWanted: string
  ): Promise<string> {
    try {
      return await this.oceanPool.getDTNeeded(poolAddress, oceanAmountWanted);
    } catch (error) {
      throw {
        Code: 1000,
        Message: "We ran into a problem, please refresh your connection.",
        error,
      };
    }
  }

  /**
   * Calculate how many OCEAN are needed to buy a specific amount of datatokens
   * @param {String} poolAddress
   * @param {String} dtAmountWanted
   * @return {String[]} - amount of Ocean needed
   */
  public async getOceanNeeded(
    poolAddress: string,
    dtAmountWanted: string
  ): Promise<string> {
    try {
      return await this.oceanPool.getOceanNeeded(poolAddress, dtAmountWanted);
    } catch (error) {
      throw {
        Code: 1000,
        Message: "We ran into a problem, please refresh your connection.",
        error,
      };
    }
  }

  /** get pool details
   * @param {Srting} poolAddress
   * @returns {String[]} - datatoken addresses
   */

  public async getPoolDetails(poolAddress: string): Promise<any> {
    try {
      return await this.oceanPool.getPoolDetails(poolAddress);
    } catch (error) {
      throw {
        Code: 1000,
        Message: "We ran into a problem, please refresh your connection.",
        error,
      };
    }
  }

  /**
   * gets token details (NAME & SYMBOL)
   * @param tokenAddress
   * @returns
   */
  public async getTokenDetails(tokenAddress: string): Promise<ITokenDetails> {
    try {
      const datatoken = new DataTokens(
        this.config.default.factoryAddress,
        DTFactoryABI.abi as AbiItem[],
        datatokensABI.abi as AbiItem[],
        this.web3,
        this.logger
      );

      const name = await datatoken.getName(tokenAddress);
      const symbol = await datatoken.getSymbol(tokenAddress);
      return { name: name, symbol: symbol };
    } catch (error) {
      throw {
        Code: 1000,
        Message: "We ran into a problem, please refresh your connection.",
        error,
      };
    }
  }

  /**
   * returns pool shares of a given pool for a given account
   * @param poolAddress
   * @param account
   * @returns
   */
  public async getMyPoolSharesForPool(
    poolAddress: string,
    account: string
  ): Promise<string> {
    try {
      return await this.getBalance(poolAddress, account);
    } catch (error) {
      throw {
        Code: 1000,
        Message: "We ran into a problem, please refresh your connection.",
        error,
      };
    }
  }

  /**
   * returns total shares of a given pool
   * @param poolAddress
   * @returns
   */
  public async getTotalPoolShares(poolAddress: string): Promise<string> {
    try {
      const poolInst = new this.web3.eth.Contract(
        poolABI.abi as AbiItem[],
        poolAddress
      );
      let totalSupply = await poolInst.methods.totalSupply().call();
      return this.web3.utils.fromWei(totalSupply);
    } catch (error) {
      throw {
        Code: 1000,
        Message: "We ran into a problem, please refresh your connection.",
        error,
      };
    }
  }

  /**
   * Returns Datatoken & Ocean amounts received after spending given poolShares
   * @param poolAddress
   * @param account
   * @returns
   */
  public async getTokensRemovedforPoolShares(
    poolAddress: string,
    poolShares: string
  ): Promise<ITokensReceived> {
    try {
      return await this.oceanPool.getTokensRemovedforPoolShares(
        poolAddress,
        poolShares
      );
    } catch (error) {
      throw {
        Code: 1000,
        Message: "We ran into a problem, please refresh your connection.",
        error,
      };
    }
  }

  /**
   * Returns all staked pools for a given account
   * @param account
   * @returns
   */
  public async getAllStakedPools(
    account: string,
    fromBlock: number,
    toBlock: number
  ): Promise<IPoolShare[]> {
    try {
      return await this.oceanPool.getPoolSharesByAddress(
        account,
        fromBlock,
        toBlock
      );
    } catch (error) {
      throw {
        Code: 1000,
        Message: "We ran into a problem, please refresh your connection.",
        error,
      };
    }
  }

  /**
   * returns swap fee for a given pool
   * @param poolAddress
   * @returns
   */
  public async getSwapFee(poolAddress: string): Promise<string> {
    try {
      return await this.oceanPool.getSwapFee(poolAddress);
    } catch (error) {
      throw {
        Code: 1000,
        Message: "We ran into a problem, please refresh your connection.",
        error,
      };
    }
  }

  /**
   * calculates Swap Fee for a given trade
   * @param poolAddress
   * @param tokenInAmount
   * @returns
   */
  public async calculateSwapFee(
    poolAddress: string,
    tokenInAmount: string
  ): Promise<string> {
    try {
      let swapFee = await this.oceanPool.getSwapFee(poolAddress);
      return new Decimal(tokenInAmount).mul(swapFee).toString();
    } catch (error) {
      throw {
        Code: 1000,
        Message: "We ran into a problem, please refresh your connection.",
        error,
      };
    }
  }

  /**
   * Returns input Datatoken amount needed for swapping to exact Datatoken out
   * @param outputDtAmountWanted
   * @param inputPoolAddress
   * @param outputPoolAddress
   * @returns
   */
  public async getDtNeededForExactDt(
    outputDtAmountWanted: string,
    inputPoolAddress: string,
    outputPoolAddress: string
  ): Promise<any> {
    try {
      //calculate OCEAN needed
      const oceanNeeded = await this.oceanPool.getOceanNeeded(
        outputPoolAddress,
        outputDtAmountWanted
      );
      console.log("oceanNeeded - ", oceanNeeded);

      //calculate Input Dt needed
      const inputDtNeeded = await this.oceanPool.getDTNeeded(
        inputPoolAddress,
        oceanNeeded
      );
      console.log("input Dt needed - ", inputDtNeeded);

      return inputDtNeeded;
    } catch (error) {
      throw {
        Code: 1000,
        Message: "We ran into a problem, please refresh your connection.",
        error,
      };
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
    outputPoolAddress: string
  ): Promise<any> {
    try {
      //calculate OCEAN received
      const oceanReceived = await this.oceanPool.getOceanReceived(
        inputPoolAddress,
        inputDtAmount
      );
      console.log("ocean Received - ", oceanReceived);

      //calculate output Dt received
      const outputDtReceived = await this.oceanPool.getDTReceived(
        outputPoolAddress,
        oceanReceived
      );
      console.log("Output Dt Received - ", outputDtReceived);

      return outputDtReceived;
    } catch (error) {
      throw {
        Code: 1000,
        Message: "We ran into a problem, please refresh your connection.",
        error,
      };
    }
  }

  /**
   * Returns max amount of tokens that you can unstake from the pool
   * @param poolAddress
   * @param tokenAddress
   */
  public async getMaxUnstakeAmount(
    poolAddress: string,
    tokenAddress: string
  ): Promise<string> {
    try {
      return this.oceanPool.getMaxRemoveLiquidity(poolAddress, tokenAddress);
    } catch (error) {
      throw {
        Code: 1000,
        Message: "We ran into a problem, please refresh your connection.",
        error,
      };
    }
  }

  /**
   * Returns max amount of tokens that you can stake to the pool
   * @param poolAddress
   * @param tokenAddress
   */
  public async getMaxStakeAmount(
    poolAddress: string,
    tokenAddress: string
  ): Promise<string> {
    try {
      return this.oceanPool.getMaxAddLiquidity(poolAddress, tokenAddress);
    } catch (error) {
      throw {
        Code: 1000,
        Message: "We ran into a problem, please refresh your connection.",
        error,
      };
    }
  }

  /**
   * returns no. of shares needed to unstake given token amount
   * @param poolAddress
   * @param tokenAddress
   * @param tokenAmount
   * @returns
   */
  public async getPoolSharesRequiredToUnstake(
    poolAddress: string,
    tokenAddress: string,
    tokenAmount: string
  ): Promise<string> {
    try {
      return this.oceanPool.calcPoolInGivenSingleOut(
        poolAddress,
        tokenAddress,
        tokenAmount
      );
    } catch (error) {
      throw {
        Code: 1000,
        Message: "We ran into a problem, please refresh your connection.",
        error,
      };
    }
  }

  /**
   * Returns Ocean amount received after spending poolShares
   * @param poolAddress
   * @param poolShares
   * @returns
   */
  public async getOceanRemovedforPoolShares(
    poolAddress: string,
    poolShares: string
  ): Promise<string> {
    try {
      return this.oceanPool.getOceanRemovedforPoolShares(
        poolAddress,
        poolShares
      );
    } catch (error) {
      throw {
        Code: 1000,
        Message: "We ran into a problem, please refresh your connection.",
        error,
      };
    }
  }

  public async getSharesReceivedForTokenIn(
    poolAddress: string,
    tokenInAddress: string,
    tokenInAmount: string
  ) {
    try {
      return await this.oceanPool.calcPoolOutGivenSingleIn(
        poolAddress,
        tokenInAddress,
        tokenInAmount
      );
    } catch (error) {
      throw {
        Code: 1000,
        Message: "We ran into a problem, please refresh your connection.",
        error,
      };
    }
  }
}
