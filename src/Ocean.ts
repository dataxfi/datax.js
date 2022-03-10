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
import { ITokensReceived, IPoolShare, ITokenDetails } from "./Types";
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
   * Get the DT or OCEAN reserve for a pool.
   *
   * @param address
   * @param getOcean
   * @returns DT: the max exchange based on the DT amount or OCEAN: the entire ocean reserve in a pool.
   *
   */

  public async getMaxExchange(address: string, getOcean: boolean = false) {
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

  // public async getMaxExchange(
  //   signal?: AbortSignal,
  //   token1Balance?: BigNumber | null
  // ): Promise<IMaxExchange> {
  //   const balance = token1Balance ? token1Balance : token1?.balance;
  //   return new Promise<IMaxExchange>(async (resolve, reject) => {
  //     signal?.addEventListener("abort", (e) => {
  //       reject(new Error("aborted"));
  //     });

  //     if (balance.lt(0.00001)) {
  //       console.log("REsolveing 0");

  //       resolve({
  //         maxPercent: new BigNumber(100),
  //         maxSell: new BigNumber(0),
  //         maxBuy: new BigNumber(0),
  //         postExchange: new BigNumber(0),
  //       });
  //     }

  //     let maxBuy: BigNumber;
  //     let maxSell: BigNumber;
  //     let maxPercent: BigNumber;
  //     try {
  //       if (
  //         ocean &&
  //         token1?.info &&
  //         token2?.info &&
  //         !isOCEAN(token1.info.address, ocean) &&
  //         !isOCEAN(token2.info.address, ocean)
  //       ) {
  //         // try {
  //         // } catch (error) {}
  //         maxSell = new BigNumber(
  //           await ocean?.getMaxExchange(token1.info.pool)
  //         ).dp(0);
  //         console.log("Max Sell", maxSell.toString());

  //         let DtReceivedForMaxSell: BigNumber = new BigNumber(
  //           await ocean?.getDtReceivedForExactDt(
  //             maxSell.toString(),
  //             token1.info.pool,
  //             token2.info.pool
  //           )
  //         );
  //         console.log(
  //           "Dt Received for max sell",
  //           DtReceivedForMaxSell.toString()
  //         );
  //         const oceanNeededForSellResponse = await ocean?.getOceanNeeded(
  //           token1.info.pool,
  //           maxSell.toString()
  //         );
  //         const oceanNeededForMaxSell = new BigNumber(
  //           oceanNeededForSellResponse || 0
  //         );

  //         maxBuy = new BigNumber(
  //           await ocean?.getMaxExchange(token2.info.pool)
  //         ).dp(0);
  //         console.log("Max Buy", maxBuy.toString());
  //         const oceanNeededForBuyResponse = await ocean?.getOceanNeeded(
  //           token2.info.pool,
  //           maxBuy.toString()
  //         );
  //         const oceanNeededForMaxBuy = new BigNumber(
  //           oceanNeededForBuyResponse || 0
  //         );

  //         console.log(
  //           `Ocean needed for max sell: ${oceanNeededForMaxSell} \n Ocean Needed for max buy: ${oceanNeededForMaxBuy}`
  //         );

  //         let DtNeededForMaxBuy: BigNumber;
  //         //limited by buy token
  //         if (oceanNeededForMaxSell.gt(oceanNeededForMaxBuy)) {
  //           // If the ocean needed for the maxSell is greater than the ocean needed for the max buy, then the maxSell can be left as is
  //           // and the maxBuy is set to the the DT received for the max sell
  //           DtNeededForMaxBuy = new BigNumber(
  //             await ocean?.getDtNeededForExactDt(
  //               maxBuy.toString(),
  //               token1.info.pool,
  //               token2.info.pool
  //             )
  //           );
  //           maxSell = DtNeededForMaxBuy;
  //         } else {
  //           // If the ocean needed for the maxSell is less than the ocean needed for the max buy, then the maxSell needs to be set
  //           // to the Dt needed for the maxBuy, and the max buy can stay as is
  //           // limited by sell token
  //           maxBuy = DtReceivedForMaxSell;
  //         }
  //       } else if (
  //         ocean &&
  //         token1?.info &&
  //         token2?.info &&
  //         isOCEAN(token2.info.address, ocean)
  //       ) {
  //         // DT to OCEAN
  //         // Max sell is the max amount of DT that can be traded
  //         maxSell = new BigNumber(
  //           await ocean?.getMaxExchange(token1.info.pool)
  //         );
  //         maxSell = new BigNumber(maxSell || 0);
  //         // console.log("Exact max sell:", maxSell.toString());
  //         // Max buy is the amount of OCEAN bought from max sell
  //         maxBuy = new BigNumber(await calculateExchange(true, maxSell));
  //       } else if (ocean && token1?.info && token2?.info) {
  //         // OCEAN to DT
  //         // Max buy is the max amount of DT that can be traded
  //         maxBuy = new BigNumber(await ocean?.getMaxExchange(token2.info.pool));
  //         maxBuy = new BigNumber(maxBuy || 0);
  //         // console.log("Exact max buy:", maxBuy.toString());
  //         if (maxBuy.minus(maxBuy.dp(0)).gte(0.05)) {
  //           maxBuy = maxBuy.dp(0);
  //         } else {
  //           maxBuy = maxBuy.minus(0.05);
  //         }
  //         //Max sell is the amount of OCEAN sold for maxBuy
  //         maxSell = await calculateExchange(false, maxBuy);
  //         // console.log("Max Sell:", maxSell.toString());
  //       } else {
  //         maxPercent = new BigNumber(100);
  //         maxBuy = new BigNumber(18e10);
  //         maxSell = new BigNumber(18e10);
  //       }

  //       //Max percent is the percent of the max sell out of token 1 balance
  //       //if balance is 0 max percent should be 0
  //       if (balance?.eq(0)) {
  //         maxPercent = new BigNumber(0);
  //       } else {
  //         // console.log("Max Sell:", maxSell.toString());
  //         maxPercent = maxSell.div(balance).multipliedBy(100);
  //       }

  //       //if maxPercent is greater than 100, max buy and sell is determined by the balance of token1
  //       // console.log("Max percent", Number(maxPercent));

  //       if (maxPercent.gt(100)) {
  //         maxPercent = new BigNumber(100);
  //         if (balance?.dp(5).gt(0.00001)) {
  //           maxSell = balance.dp(5);
  //           maxBuy = await calculateExchange(true, maxSell);
  //         }
  //       }

  //       const postExchange = maxBuy.div(maxSell);

  //       const maxExchange: IMaxExchange = {
  //         maxPercent,
  //         maxBuy: maxBuy.dp(5),
  //         maxSell: maxSell.dp(5),
  //         postExchange,
  //       };
  //       console.log(
  //         "Max Buy:",
  //         maxBuy.toString(),
  //         "Max Sell:",
  //         maxSell.toString(),
  //         "Max Percent:",
  //         maxPercent.toString()
  //       );

  //       resolve(maxExchange);
  //     } catch (error) {
  //       console.error(error);
  //     }
  //     //This is here to not restict the user from attempting a trade if the max exchange could not be determined.
  //     resolve({
  //       maxPercent: new BigNumber(100),
  //       maxBuy: new BigNumber(18e10),
  //       maxSell: new BigNumber(18e10),
  //       postExchange: new BigNumber(0.01234),
  //     });
  //   });
  // }

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
   * stake OCEAN tokens in a pool
   * @param account
   * @param poolAddress
   * @param amount
   */
  public async stakeOcean(
    account: string,
    poolAddress: string,
    amount: string
  ): Promise<TransactionReceipt> {
    try {
      return await this.oceanPool.addOceanLiquidity(
        account,
        poolAddress,
        amount
      );
    } catch (error) {
      throw {
        Code: 1000,
        Message: "Transaction could not be processed.",
        error,
      };
    }
  }

  /**
   * unstake OCEAN tokens from pool
   * @param account
   * @param poolAddress
   * @param amount
   * @param maximumPoolShares
   * @returns
   */
  public async unstakeOcean(
    account: string,
    poolAddress: string,
    amount: string,
    maximumPoolShares: string
  ): Promise<TransactionReceipt> {
    try {
      return await this.oceanPool.removeOceanLiquidity(
        account,
        poolAddress,
        amount,
        maximumPoolShares
      );
    } catch (error) {
      throw {
        Code: 1000,
        Message: "Transaction could not be processed.",
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
   * swaps Ocean tokens to exact no. of datatokens
   * @param account
   * @param poolAddress
   * @param dtAmountWanted
   * @param maxOceanAmount
   * @returns
   */
  public async swapOceanToExactDt(
    account: string,
    poolAddress: string,
    dtAmountWanted: string,
    maxOceanAmount: string,
    slippage: string
  ): Promise<TransactionReceipt> {
    try {
      let maxOceanAmountSpentWithSlippage = new Decimal(maxOceanAmount)
        .add(new Decimal(maxOceanAmount).mul(slippage))
        .toString();
      console.log(
        "Max Ocean Amount spent with Slippage - ",
        maxOceanAmountSpentWithSlippage
      );
      return await this.oceanPool.buyDT(
        account,
        poolAddress,
        dtAmountWanted,
        maxOceanAmountSpentWithSlippage
      );
    } catch (error) {
      throw {
        Code: 1000,
        Message: "Transaction could not be processed.",
        error,
      };
    }
  }

  /**
   * swaps exact no. of Ocean tokens to datatokens
   * @param account ]
   * @param poolAddress
   * @param minimumdtAmountWanted
   * @param OceanAmount
   * @returns
   */
  public async swapExactOceanToDt(
    account: string,
    poolAddress: string,
    minimumdtAmountWanted: string,
    OceanAmount: string,
    slippage: string
  ): Promise<TransactionReceipt> {
    try {
      let mindtAmountWantedWithSlippage = new Decimal(minimumdtAmountWanted)
        .sub(new Decimal(minimumdtAmountWanted).mul(slippage))
        .toString();
      console.log(
        "Min DT Amount received after Slippage - ",
        mindtAmountWantedWithSlippage
      );

      return await this.oceanPool.buyDTWithExactOcean(
        account,
        poolAddress,
        mindtAmountWantedWithSlippage,
        OceanAmount
      );
    } catch (error) {
      throw {
        Code: 1000,
        Message: "Transaction could not be processed.",
        error,
      };
    }
  }

  /**
   * Swaps exact no. of datatokens to Ocean tokens
   * @param account
   * @param poolAddress
   * @param minimumOceanAmountWanted
   * @param dtAmount
   * @param slippage
   * @returns
   */
  public async swapExactDtToOcean(
    account: string,
    poolAddress: string,
    minimumOceanAmountWanted: string,
    dtAmount: string,
    slippage: string
  ): Promise<TransactionReceipt> {
    try {
      let minOceanAmountWantedWithSlippage = new Decimal(
        minimumOceanAmountWanted
      )
        .sub(new Decimal(minimumOceanAmountWanted).mul(slippage))
        .toString();
      console.log(
        "Min Ocean Amount received after Slippage - ",
        minOceanAmountWantedWithSlippage
      );

      return await this.oceanPool.sellDT(
        account,
        poolAddress,
        dtAmount,
        minOceanAmountWantedWithSlippage
      );
    } catch (error) {
      throw {
        Code: 1000,
        Message: "Transaction could not be processed.",
        error,
      };
    }
  }

  /**
   * swaps datatokens to exact no. of Ocean tokens
   * @param account
   * @param poolAddress
   * @param oceanAmountWanted
   * @param maxDtAmount
   * @param slippage
   * @returns
   */
  public async swapDtToExactOcean(
    account: string,
    poolAddress: string,
    oceanAmountWanted: string,
    maxDtAmount: string,
    slippage: string
  ): Promise<TransactionReceipt> {
    try {
      let maxDTAmountWithSlippage = new Decimal(maxDtAmount)
        .add(new Decimal(maxDtAmount).mul(slippage))
        .toString();
      console.log(
        "Max DT Amount spent With Slippage - ",
        maxDTAmountWithSlippage
      );
      return await this.oceanPool.sellDT(
        account,
        poolAddress,
        maxDTAmountWithSlippage,
        oceanAmountWanted
      );
    } catch (error) {
      throw {
        Code: 1000,
        Message: "Transaction could not be processed.",
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
   * Swaps input Datatoken for exact output Datatoken
   * @param account
   * @param inputDtAddress
   * @param outputDtAddress
   * @param outputDtAmountWanted
   * @param maxInputDtAmount
   * @param inputPoolAddress
   * @param outputPoolAddress
   * @param routerAddress
   * @returns
   */
  public async swapDtToExactDt(
    account: string,
    inputDtAddress: string,
    outputDtAddress: string,
    outputDtAmountWanted: string,
    maxInputDtAmount: string,
    inputPoolAddress: string,
    outputPoolAddress: string,
    routerAddress?: string,
    slippageInPercent?: string
  ): Promise<any> {
    try {
      routerAddress = routerAddress
        ? routerAddress
        : this.config.default.routerAddress;

      //calculate OCEAN received
      const oceanReceived = await this.oceanPool.getOceanReceived(
        inputPoolAddress,
        maxInputDtAmount
      );
      console.log("oceanReceived - ", oceanReceived);

      // calculate Output Dt received
      const outputDtReceived = await this.oceanPool.getDTReceived(
        outputPoolAddress,
        oceanReceived
      );
      console.log("outputDtReceived - ", outputDtReceived);

      const slippage = slippageInPercent
        ? new Decimal(slippageInPercent)
        : new Decimal(SLIPPAGE_TOLERANCE);
      const isSlippageOkay = new Decimal(outputDtReceived).lt(
        new Decimal(outputDtAmountWanted).sub(
          new Decimal(outputDtAmountWanted).mul(slippage)
        )
      );

      if (isSlippageOkay) {
        throw new Error(
          `ERROR: not getting needed outputDt amount. Amount received - ${outputDtReceived}`
        );
      }

      let maxInputDtAmountWithSlippage = new Decimal(maxInputDtAmount)
        .add(new Decimal(maxInputDtAmount).mul(slippage))
        .toString();
      console.log(
        "Max Input DT Amount with Slippage - ",
        maxInputDtAmountWithSlippage
      );

      //prepare swap route
      const swaps = [
        {
          pool: inputPoolAddress,
          tokenIn: inputDtAddress,
          tokenOut: this.oceanTokenAddress,
          limitReturnAmount: this.web3.utils.toWei(
            maxInputDtAmountWithSlippage
          ),
          swapAmount: this.web3.utils.toWei(oceanReceived),
          maxPrice: this.config.default.maxUint256,
        },
        {
          pool: outputPoolAddress,
          tokenIn: this.oceanTokenAddress,
          tokenOut: outputDtAddress,
          limitReturnAmount: this.web3.utils.toWei(oceanReceived),
          swapAmount: this.web3.utils.toWei(outputDtAmountWanted),
          maxPrice: this.config.default.maxUint256,
        },
      ];

      //check allowance
      let inputDtApproved = await this.checkIfApproved(
        inputDtAddress,
        account,
        routerAddress,
        maxInputDtAmountWithSlippage
      );
      if (!inputDtApproved) {
        let approveTx = await this.approve(
          inputDtAddress,
          routerAddress,
          this.web3.utils.toWei(maxInputDtAmountWithSlippage),
          account
        );
      }

      let oceanApproved = await this.checkIfApproved(
        this.oceanTokenAddress,
        account,
        routerAddress,
        oceanReceived
      );
      if (!oceanApproved) {
        let approveTx = await this.approve(
          this.oceanTokenAddress,
          routerAddress,
          this.web3.utils.toWei(oceanReceived),
          account
        );
      }

      //swap
      const proxyInst = new this.web3.eth.Contract(
        DataxRouter.abi as AbiItem[],
        routerAddress
      );
      let estGas = await proxyInst.methods
        .swapDtToExactDt(
          swaps,
          inputDtAddress,
          outputDtAddress,
          this.web3.utils.toWei(maxInputDtAmountWithSlippage)
        )
        .estimateGas({ from: account });
      console.log("Gas needed - ", estGas);
      let totalAmountOut = await proxyInst.methods
        .swapDtToExactDt(
          swaps,
          inputDtAddress,
          outputDtAddress,
          this.web3.utils.toWei(maxInputDtAmountWithSlippage)
        )
        .send({ from: account, gas: 1000000 });
      return totalAmountOut;
    } catch (error) {
      throw {
        Code: 1000,
        Message: "Transaction could not be processed.",
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
   * Swaps exact input datatoken for minumum amount output datatoken
   * @param account
   * @param inputDtAddress
   * @param outputDtAddress
   * @param minOutputDtAmount
   * @param inputDtAmount
   * @param inputPoolAddress
   * @param outputPoolAddress
   * @param routerAddress
   * @param slippageInPercent
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
    routerAddress?: string,
    slippageInPercent?: string
  ): Promise<any> {
    try {
      routerAddress = routerAddress
        ? routerAddress
        : this.config.default.routerAddress;

      //calculate OCEAN received
      const oceanReceived = await this.oceanPool.getOceanReceived(
        inputPoolAddress,
        inputDtAmount
      );
      console.log("oceanReceived - ", oceanReceived);

      // calculate Output Dt received
      const outputDtReceived = await this.oceanPool.getDTReceived(
        outputPoolAddress,
        oceanReceived
      );
      console.log("outputDtReceived - ", outputDtReceived);

      const slippage = slippageInPercent
        ? new Decimal(slippageInPercent)
        : new Decimal(SLIPPAGE_TOLERANCE);
      const isSlippageOkay = new Decimal(outputDtReceived).lt(
        new Decimal(minOutputDtAmount).sub(
          new Decimal(minOutputDtAmount).mul(slippage)
        )
      );

      if (isSlippageOkay) {
        throw new Error(
          `ERROR: not getting needed outputDt amount. Amount received - ${outputDtReceived}`
        );
      }

      let minOutputDtReceivedWithSlippage = new Decimal(minOutputDtAmount)
        .sub(new Decimal(minOutputDtAmount).mul(slippage))
        .toString();
      console.log(
        "Min DT Received With Slippage - ",
        minOutputDtReceivedWithSlippage
      );
      //prepare swap route
      const swaps = [
        [
          {
            pool: inputPoolAddress,
            tokenIn: inputDtAddress,
            tokenOut: this.oceanTokenAddress,
            limitReturnAmount: this.web3.utils.toWei(oceanReceived),
            swapAmount: this.web3.utils.toWei(inputDtAmount),
            maxPrice: this.config.default.maxUint256,
          },
          {
            pool: outputPoolAddress,
            tokenIn: this.oceanTokenAddress,
            tokenOut: outputDtAddress,
            limitReturnAmount: this.web3.utils.toWei(
              minOutputDtReceivedWithSlippage
            ),
            swapAmount: this.web3.utils.toWei(oceanReceived),
            maxPrice: this.config.default.maxUint256,
          },
        ],
      ];

      //check allowance
      let inputDtApproved = await this.checkIfApproved(
        inputDtAddress,
        account,
        routerAddress,
        inputDtAmount
      );

      if (!inputDtApproved) {
        let approveAmt = inputDtAmount;
        let approveTx = await this.approve(
          inputDtAddress,
          routerAddress,
          this.web3.utils.toWei(inputDtAmount),
          account
        );
      }

      /*let oceanApproved = await this.checkIfApproved(
        this.oceanTokenAddress,
        account,
        routerAddress,
        oceanReceived
      );

      if (!oceanApproved) {
        let approveTx = await this.approve(
          this.oceanTokenAddress,
          routerAddress,
          this.web3.utils.toWei(oceanReceived),
          account
        );
      }*/

      //swap
      const proxyInst = new this.web3.eth.Contract(
        DataxRouter.abi as AbiItem[],
        routerAddress
      );
      let estGas = await proxyInst.methods
        .swapExactDtToDt(
          swaps,
          inputDtAddress,
          outputDtAddress,
          this.web3.utils.toWei(inputDtAmount),
          this.web3.utils.toWei(minOutputDtReceivedWithSlippage)
        )
        .estimateGas({ from: account });
      console.log("Gas needed - ", estGas);
      let totalAmountOut = await proxyInst.methods
        .swapExactDtToDt(
          swaps,
          inputDtAddress,
          outputDtAddress,
          this.web3.utils.toWei(inputDtAmount),
          this.web3.utils.toWei(minOutputDtReceivedWithSlippage)
        )
        .send({ from: account, gas: estGas ? estGas : 1000000 });
      return totalAmountOut;
    } catch (error) {
      throw {
        Code: 1000,
        Message: "Transaction could not be processed.",
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
