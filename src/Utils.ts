import { OceanPool, Pool } from "./balancer";
import { DataTokens } from "./Datatokens";
import { Logger } from "./utils/";
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
import {
  ITokensReceived,
  IPoolShare,
  ITokenDetails,
  IMaxExchange,
  IToken,
} from "./Types";
const SLIPPAGE_TOLERANCE = 0.01;

export default class Utils extends Base {
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
        Message: "We ran into a problem, please refresh your page.",
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
        Message: "We ran into a problem, please refresh your page.",
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
        Message: "We ran into a problem, please refresh your page.",
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
   * Get half the DT reserve for a token, used for determining maxExchange for a token pair.
   *
   * @param address
   * @param getOcean
   * @returns Half of the dt reserve
   *
   */

  public async getHalfOfReserve(address: string) {
    try {
      let reserve = await this.oceanPool.getDTReserve(address);
      const maxIn = Number(reserve) / 2;
      return String(maxIn);
    } catch (error) {
      throw {
        Code: 1000,
        Message: "Failed to get max exchange amount.",
        error,
      };
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
    token1: IToken,
    token2: IToken
  ): Promise<BigNumber> {
    try {
      if (amount.isNaN() || amount.eq(0)) {
        return new BigNumber(0);
      }
      // OCEAN to DT where amount is either from sell or buy input
      if (this.isOCEAN(token1.info.address)) {
        if (from) {
          return new BigNumber(
            await this.getDtReceived(token2.info.pool, amount.dp(18).toString())
          );
        } else {
          return new BigNumber(
            await this.getOceanNeeded(
              token2.info.pool,
              amount.dp(18).toString()
            )
          );
        }
      }
      
      // DT to OCEAN where amount is either from sell or buy input
      if (this.isOCEAN(token2.info.address)) {
        if (from) {
          return new BigNumber(
            await this.getOceanReceived(
              token1.info.pool,
              amount.dp(18).toString()
            )
          );
        } else {
          return new BigNumber(
            await this.getDtNeeded(token1.info.pool, amount.dp(18).toString())
          );
        }
      }

      // DT to DT where amount is either from sell or buy input
      if (from) {
        return new BigNumber(
          await this.getDtReceivedForExactDt(
            amount.dp(18).toString(),
            token1.info.pool,
            token2.info.pool
          )
        );
      } else if (token1?.info && token2?.info) {
        return new BigNumber(
          await this.getDtNeededForExactDt(
            amount.dp(18).toString(),
            token1.info.pool,
            token2.info.pool
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
   * Get the max exchange amount for a token pair.
   * @param token1 The token being sold
   * @param token2 The token being bought
   * @param signal An optional abort signal
   * @returns
   * maxPercent: the max percent of a users balance
   * 
   * maxBuy: the max amount of token1 that can be sold
   * 
   * maxSell: the max amount of token2 that can be bought
   * 
   * postExchange: the post exchange of the token pair (1 token1 === X of token2)
   *
   * There are three potential limiters to this function: the users balance of token1,
   * the max exchange for token1, or the max exchange of token2. The absolute least value
   * of either three of the aforementioned values will be the base of the calculations
   * on max buy, sell, and percent.
   */

  public async getMaxExchange(
    token1: IToken,
    token2: IToken,
    signal?: AbortSignal
  ): Promise<IMaxExchange> {
    return new Promise<IMaxExchange>(async (resolve, reject) => {
      signal?.addEventListener("abort", (e) => {
        reject(new Error("aborted"));
      });

      if (token1.balance.lt(0.00001)) {
        resolve({
          maxPercent: new BigNumber(0),
          maxSell: new BigNumber(0),
          maxBuy: new BigNumber(0),
          postExchange: new BigNumber(0),
        });
      }

      let maxBuy: BigNumber;
      let maxSell: BigNumber;
      let maxPercent: BigNumber;
      try {
        if (
          !this.isOCEAN(token1.info.address) &&
          !this.isOCEAN(token2.info.address)
        ) {
          // try {
          // } catch (error) {}
          maxSell = new BigNumber(
            await this.getHalfOfReserve(token1.info.pool)
          ).dp(0);
          console.log("Max Sell", maxSell.toString());

          let DtReceivedForMaxSell: BigNumber = new BigNumber(
            await this.getDtReceivedForExactDt(
              maxSell.toString(),
              token1.info.pool,
              token2.info.pool
            )
          );
          console.log(
            "Dt Received for max sell",
            DtReceivedForMaxSell.toString()
          );
          const oceanNeededForSellResponse = await this.getOceanNeeded(
            token1.info.pool,
            maxSell.toString()
          );
          const oceanNeededForMaxSell = new BigNumber(
            oceanNeededForSellResponse || 0
          );

          maxBuy = new BigNumber(
            await this.getHalfOfReserve(token2.info.pool)
          ).dp(0);
          console.log("Max Buy", maxBuy.toString());
          const oceanNeededForBuyResponse = await this.getOceanNeeded(
            token2.info.pool,
            maxBuy.toString()
          );
          const oceanNeededForMaxBuy = new BigNumber(
            oceanNeededForBuyResponse || 0
          );

          console.log(
            `Ocean needed for max sell: ${oceanNeededForMaxSell} \n Ocean Needed for max buy: ${oceanNeededForMaxBuy}`
          );

          let DtNeededForMaxBuy: BigNumber;
          //limited by buy token
          if (oceanNeededForMaxSell.gt(oceanNeededForMaxBuy)) {
            // If the ocean needed for the maxSell is greater than the ocean needed for the max buy, then the maxSell can be left as is
            // and the maxBuy is set to the the DT received for the max sell
            DtNeededForMaxBuy = new BigNumber(
              await this.getDtNeededForExactDt(
                maxBuy.toString(),
                token1.info.pool,
                token2.info.pool
              )
            );
            maxSell = DtNeededForMaxBuy;
          } else {
            // If the ocean needed for the maxSell is less than the ocean needed for the max buy, then the maxSell needs to be set
            // to the Dt needed for the maxBuy, and the max buy can stay as is
            // limited by sell token
            maxBuy = DtReceivedForMaxSell;
          }
        } else if (this.isOCEAN(token2.info.address)) {
          // DT to OCEAN
          // Max sell is the max amount of DT that can be traded
          maxSell = new BigNumber(
            await this.getHalfOfReserve(token1.info.pool)
          );
          maxSell = new BigNumber(maxSell || 0);
          // Max buy is the amount of OCEAN bought from max sell
          maxBuy = new BigNumber(
            await this.calculateExchange(true, maxSell, token1, token2)
          );
        } else {
          // OCEAN to DT
          // Max buy is the max amount of DT that can be traded
          maxBuy = new BigNumber(await this.getHalfOfReserve(token2.info.pool));
          maxBuy = new BigNumber(maxBuy || 0);
          if (maxBuy.minus(maxBuy.dp(0)).gte(0.05)) {
            maxBuy = maxBuy.dp(0);
          } else {
            maxBuy = maxBuy.minus(0.05);
          }
          //Max sell is the amount of OCEAN sold for maxBuy
          maxSell = await this.calculateExchange(false, maxBuy, token1, token2);
          // console.log("Max Sell:", maxSell.toString());
        }

        //Max percent is the percent of the max sell out of token 1 balance
        //if balance is 0 max percent should be 0
        if (token1.balance?.eq(0)) {
          maxPercent = new BigNumber(0);
        } else {
          maxPercent = maxSell.div(token1.balance).multipliedBy(100);
        }

        //if maxPercent is greater than 100, max buy and sell is determined by the balance of token1
        if (maxPercent.gt(100)) {
          maxPercent = new BigNumber(100);
          if (token1.balance?.dp(5).gt(0.00001)) {
            maxSell = token1.balance.dp(5);
            maxBuy = await this.calculateExchange(
              true,
              maxSell,
              token1,
              token2
            );
          }
        }

        const postExchange = maxBuy.div(maxSell);

        const maxExchange: IMaxExchange = {
          maxPercent,
          maxBuy: maxBuy.dp(5),
          maxSell: maxSell.dp(5),
          postExchange,
        };
        console.log(
          "Max Buy:",
          maxBuy.toString(),
          "Max Sell:",
          maxSell.toString(),
          "Max Percent:",
          maxPercent.toString()
        );

        resolve(maxExchange);
      } catch (error) {
        console.error(error);
      }
    });
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
        Message: "We ran into a problem, please refresh your page.",
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
        Message: "We ran into a problem, please refresh your page.",
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
        Message: "We ran into a problem, please refresh your page.",
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
        Message: "We ran into a problem, please refresh your page.",
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
        Message: "We ran into a problem, please refresh your page.",
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
        Message: "We ran into a problem, please refresh your page.",
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
        Message: "We ran into a problem, please refresh your page.",
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
        Message: "We ran into a problem, please refresh your page.",
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
        Message: "We ran into a problem, please refresh your page.",
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
        Message: "We ran into a problem, please refresh your page.",
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
        Message: "We ran into a problem, please refresh your page.",
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
        Message: "We ran into a problem, please refresh your page.",
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
        Message: "We ran into a problem, please refresh your page.",
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
        Message: "We ran into a problem, please refresh your page.",
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
        Message: "We ran into a problem, please refresh your page.",
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
        Message: "We ran into a problem, please refresh your page.",
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
        Message: "We ran into a problem, please refresh your page.",
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
        Message: "We ran into a problem, please refresh your page.",
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
        Message: "We ran into a problem, please refresh your page.",
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
        Message: "We ran into a problem, please refresh your page.",
        error,
      };
    }
  }
}
