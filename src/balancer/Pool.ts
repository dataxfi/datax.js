import Web3 from "web3";
import { AbiItem } from "web3-utils/types";
import { TransactionReceipt } from "web3-core";
import { Logger, getFairGasPrice } from "../utils/";
import BigNumber from "bignumber.js";
import jsonpoolABI from "@oceanprotocol/contracts/artifacts/BPool.json";
import defaultDatatokensABI from "@oceanprotocol/contracts/artifacts/DataTokenTemplate.json";
import { PoolFactory } from "./PoolFactory";
import Decimal from "decimal.js";
import { ITokensToAdd } from "../@types/datax-types";
const MaxUint256 =
  "115792089237316195423570985008687907853269984665640564039457584007913129639934";

/**
 * Provides an interface to Balancer BPool & BFactory
 */

export class Pool extends PoolFactory {
  public poolABI: AbiItem | AbiItem[];

  constructor(
    web3: Web3,
    logger: Logger,
    factoryABI: AbiItem | AbiItem[] = null,
    poolABI: AbiItem | AbiItem[] = null,
    factoryAddress: string = null
  ) {
    super(web3, logger, factoryABI, factoryAddress);
    if (poolABI) this.poolABI = poolABI;
    else this.poolABI = jsonpoolABI.abi as AbiItem[];
  }

  /**
   * Creates a new pool
   */
  async createPool(account: string): Promise<TransactionReceipt> {
    return await super.createPool(account);
  }

  /**
   * Setup a new pool by setting datatoken, base token, swap fee and
   * finalizing the pool to make it public.
   *
   * @param {String} account ethereum address to use for sending this transaction
   * @param {String} poolAddress address of new Balancer Pool
   * @param {String} dataToken address of datatoken ERC20 contract
   * @param {String} dataTokenAmount in wei
   * @param {String} dataTokenWeight in wei
   * @param {String} baseToken address of base token ERC20 contract
   * @param {String} baseTokenAmount in wei
   * @param {String} baseTokenWeight in wei
   * @param {String} swapFee in wei
   */
  async setup(
    account: string,
    poolAddress: string,
    dataToken: string,
    dataTokenAmount: string,
    dataTokenWeight: string,
    baseToken: string,
    baseTokenAmount: string,
    baseTokenWeight: string,
    swapFee: string
  ): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress, {
      from: account,
    });
    let result = null;
    const gasLimitDefault = this.GASLIMIT_DEFAULT;
    let estGas;
    try {
      estGas = await pool.methods
        .setup(
          dataToken,
          dataTokenAmount,
          dataTokenWeight,
          baseToken,
          baseTokenAmount,
          baseTokenWeight,
          swapFee
        )
        .estimateGas({ from: account }, (err, estGas) =>
          err ? gasLimitDefault : estGas
        );
    } catch (e) {
      estGas = gasLimitDefault;
    }
    try {
      result = await pool.methods
        .setup(
          dataToken,
          dataTokenAmount,
          dataTokenWeight,
          baseToken,
          baseTokenAmount,
          baseTokenWeight,
          swapFee
        )
        .send({
          from: account,
          gas: estGas,
          gasPrice: await getFairGasPrice(this.web3),
        });
    } catch (e) {
      this.logger.error(`ERROR: Failed to setup a pool: ${e.message}`);
      throw e;
    }
    return result;
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
      const tokenAbi = defaultDatatokensABI.abi as AbiItem[];
      const token = new this.web3.eth.Contract(tokenAbi, tokenAddress);
      const balance = await token.methods.balanceOf(account).call();
      return this.web3.utils.fromWei(balance);
    } catch (e) {
      console.error("ERROR:", e);
      throw e;
    }
  }

  /**
   * Get Alloance for both DataToken and Ocean
   * @param {String } tokenAdress
   * @param {String} owner
   * @param {String} spender
   */
  public async allowance(
    tokenAdress: string,
    owner: string,
    spender: string
  ): Promise<string> {
    const tokenAbi = defaultDatatokensABI.abi as AbiItem[];
    const datatoken = new this.web3.eth.Contract(tokenAbi, tokenAdress, {
      from: spender,
    });
    const trxReceipt = await datatoken.methods.allowance(owner, spender).call();
    return this.web3.utils.fromWei(trxReceipt);
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
    console.log("Pool.ts", tokenAddress, account, spender);

    try {
      const tokenInst = new this.web3.eth.Contract(
        defaultDatatokensABI.abi as AbiItem[],
        tokenAddress
      );
      let allowance = await tokenInst.methods
        .allowance(account, spender)
        .call();
      console.log("Allowance - ", allowance);
      if (new Decimal(this.web3.utils.fromWei(allowance)).gt(amount)) {
        return true;
      }
    } catch (e) {
      console.error("ERROR:", e);
      throw e;
    }
    return false;
  }

  /**
   * Approve spender to spent amount tokens
   * @param {String} account
   * @param {String} tokenAddress
   * @param {String} spender
   * @param {String} amount  (always expressed as wei)
   * @param {String} force  if true, will overwrite any previous allowence. Else, will check if allowence is enough and will not send a transaction if it's not needed
   */
  async approve(
    account: string,
    tokenAddress: string,
    spender: string,
    amount: string,
    force = false
  ): Promise<TransactionReceipt> {
    const minABI = [
      {
        constant: false,
        inputs: [
          {
            name: "_spender",
            type: "address",
          },
          {
            name: "_value",
            type: "uint256",
          },
        ],
        name: "approve",
        outputs: [
          {
            name: "",
            type: "bool",
          },
        ],
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
      },
    ] as AbiItem[];
    const token = new this.web3.eth.Contract(minABI, tokenAddress, {
      from: account,
    });
    if (!force) {
      const currentAllowence = await this.allowance(
        tokenAddress,
        account,
        spender
      );
      if (new Decimal(currentAllowence).greaterThanOrEqualTo(amount)) {
        // we have enough
        return null;
      }
    }
    let result = null;
    const gasLimitDefault = this.GASLIMIT_DEFAULT;
    let estGas;
    try {
      estGas = await token.methods
        .approve(spender, amount)
        .estimateGas({ from: account }, (err, estGas) =>
          err ? gasLimitDefault : estGas
        );
    } catch (e) {
      estGas = gasLimitDefault;
    }

    try {
      result = await token.methods.approve(spender, amount).send({
        from: account,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3),
      });
    } catch (e) {
      this.logger.error(
        `ERROR: Failed to approve spender to spend tokens : ${e.message}`
      );
      throw e;
    }
    return result;
  }

  /**
   * Get user shares of pool tokens
   * @param {String} account
   * @param {String} poolAddress
   * @return {String}
   */
  async sharesBalance(account: string, poolAddress: string): Promise<string> {
    let result = null;
    try {
      const token = new this.web3.eth.Contract(this.poolABI, poolAddress);
      const balance = await token.methods.balanceOf(account).call();
      result = this.web3.utils.fromWei(balance);
    } catch (e) {
      this.logger.error(`ERROR: Failed to get shares of pool : ${e.message}`);
      throw e;
    }
    return result;
  }

  /**
   * Set pool fee
   * @param {String} account
   * @param {String} poolAddress
   * @param {String} fee 0.1=10% fee(max allowed)
   */
  async setSwapFee(
    account: string,
    poolAddress: string,
    fee: string
  ): Promise<TransactionReceipt> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress, {
      from: account,
    });
    let result = null;
    try {
      result = await pool.methods.setSwapFee(this.web3.utils.toWei(fee)).send({
        from: account,
        gas: this.GASLIMIT_DEFAULT,
        gasPrice: await getFairGasPrice(this.web3),
      });
    } catch (e) {
      this.logger.error(`ERROR: Failed to set pool swap fee: ${e.message}`);
      throw e;
    }
    return result;
  }

  /**
   * Finalize a pool
   * @param {String} account
   * @param {String} poolAddress
   */
  async finalize(
    account: string,
    poolAddress: string
  ): Promise<TransactionReceipt> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress, {
      from: account,
    });
    let result = null;
    try {
      result = await pool.methods.finalize().send({
        from: account,
        gas: this.GASLIMIT_DEFAULT,
        gasPrice: await getFairGasPrice(this.web3),
      });
    } catch (e) {
      this.logger.error(`ERROR: Failed to finalize pool: ${e.message}`);
      throw e;
    }
    return result;
  }

  /**
   * Get number of tokens composing this pool
   * @param {String} poolAddress
   * @return {String}
   */
  async getNumTokens(poolAddress: string): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress);
    let result = null;
    try {
      result = await pool.methods.getNumTokens().call();
    } catch (e) {
      this.logger.error(`ERROR: Failed to get number of tokens: ${e.message}`);
      throw e;
    }
    return result;
  }

  /**
   * Get total supply of pool shares
   * @param {String} poolAddress
   * @return {String}
   */
  async getPoolSharesTotalSupply(poolAddress: string): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress);
    let amount = null;
    try {
      const result = await pool.methods.totalSupply().call();
      amount = this.web3.utils.fromWei(result);
    } catch (e) {
      this.logger.error(
        `ERROR: Failed to get total supply of pool shares: ${e.message}`
      );
      throw e;
    }
    return amount;
  }

  /**
   * Get tokens composing this pool
   * @param {String} poolAddress
   * @return {String[]}
   */
  async getCurrentTokens(poolAddress: string): Promise<string[]> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress);
    let result = null;
    try {
      result = await pool.methods.getCurrentTokens().call();
    } catch (e) {
      this.logger.error(
        `ERROR: Failed to get tokens composing this pool: ${e.message}`
      );
      throw e;
    }
    return result;
  }

  /**
   * Get the final tokens composing this pool
   * @param {String} poolAddress
   * @return {String[]}
   */
  async getFinalTokens(poolAddress: string): Promise<string[]> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress);
    let result = null;
    try {
      result = await pool.methods.getFinalTokens().call();
    } catch (e) {
      this.logger.error(
        `ERROR: Failed to get the final tokens composing this pool`
      );
      throw e;
    }
    return result;
  }

  /**
   * Get controller address of this pool
   * @param {String} poolAddress
   * @return {String}
   */
  async getController(poolAddress: string): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress);
    let result = null;
    try {
      result = await pool.methods.getController().call();
    } catch (e) {
      this.logger.error(
        `ERROR: Failed to get pool controller address: ${e.message}`
      );
      throw e;
    }
    return result;
  }

  /**
   * Set controller address of this pool
   * @param {String} account
   * @param {String} poolAddress
   * @param {String} controllerAddress
   * @return {String}
   */
  async setController(
    account: string,
    poolAddress: string,
    controllerAddress: string
  ): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress, {
      from: account,
    });
    let result = null;
    try {
      result = await pool.methods
        .setController(controllerAddress)
        .send({ from: account, gas: this.GASLIMIT_DEFAULT });
    } catch (e) {
      this.logger.error(`ERROR: Failed to set pool controller: ${e.message}`);
      throw e;
    }
    return result;
  }

  /**
   * Get if a token is bounded to a pool
   * @param {String} poolAddress
   * @param {String} token  Address of the token
   * @return {Boolean}
   */
  async isBound(poolAddress: string, token: string): Promise<boolean> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress);
    let result = null;
    try {
      result = await pool.methods.isBound(token).call();
    } catch (e) {
      this.logger.error(`ERROR: Failed to check whether a token \
      bounded to a pool. ${e.message}`);
      throw e;
    }
    return result;
  }

  /**
   * Get how many tokens are in the pool
   * @param {String} poolAddress
   * @param {String} token  Address of the token
   * @return {String}
   */
  async getReserve(poolAddress: string, token: string): Promise<string> {
    let amount = null;
    try {
      const pool = new this.web3.eth.Contract(this.poolABI, poolAddress);
      const result = await pool.methods.getBalance(token).call();
      amount = this.web3.utils.fromWei(result);
    } catch (e) {
      this.logger.error(`ERROR: Failed to get how many tokens \
      are in the pool: ${e.message}`);
      throw e;
    }
    return amount;
  }

  /**
   * Get if a pool is finalized
   * @param {String} poolAddress
   * @return {Boolean}
   */
  async isFinalized(poolAddress: string): Promise<boolean> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress);
    let result = null;
    try {
      result = await pool.methods.isFinalized().call();
    } catch (e) {
      this.logger.error(
        `ERROR: Failed to check whether pool is finalized: ${e.message}`
      );
      throw e;
    }
    return result;
  }

  /**
   * Get pool fee
   * @param {String} poolAddress
   * @return {String} Swap fee. To get the percentage value, substract by 100. E.g. `0.1` represents a 10% swap fee.
   */
  async getSwapFee(poolAddress: string): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress);
    let fee = null;
    try {
      const result = await pool.methods.getSwapFee().call();
      fee = this.web3.utils.fromWei(result);
    } catch (e) {
      this.logger.error(`ERROR: Failed to get pool fee: ${e.message}`);
      throw e;
    }
    return fee;
  }

  /**
   * The normalized weight of a token. The combined normalized weights of all tokens will sum up to 1. (Note: the actual sum may be 1 plus or minus a few wei due to division precision loss)
   * @param {String} poolAddress
   * @param {String} token
   * @return {String}
   */
  async getNormalizedWeight(
    poolAddress: string,
    token: string
  ): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress);
    let weight = null;
    try {
      const result = await pool.methods.getNormalizedWeight(token).call();
      weight = this.web3.utils.fromWei(result);
    } catch (e) {
      this.logger.error(
        `ERROR: Failed to get normalized weight of a token: ${e.message}`
      );
      throw e;
    }
    return weight;
  }

  /**
   * getDenormalizedWeight of a token in pool
   * @param {String} poolAddress
   * @param {String} token
   * @return {String}
   */
  async getDenormalizedWeight(
    poolAddress: string,
    token: string
  ): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress);
    let weight = null;
    try {
      const result = await pool.methods.getDenormalizedWeight(token).call();
      weight = this.web3.utils.fromWei(result);
    } catch (e) {
      this.logger.error(
        "ERROR: Failed to get denormalized weight of a token in pool"
      );
      throw e;
    }
    return weight;
  }

  /**
   * getTotalDenormalizedWeight in pool
   * @param {String} poolAddress
   * @return {String}
   */
  async getTotalDenormalizedWeight(poolAddress: string): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress);
    let weight = null;
    try {
      const result = await pool.methods.getTotalDenormalizedWeight().call();
      weight = this.web3.utils.fromWei(result);
    } catch (e) {
      this.logger.error(
        "ERROR: Failed to get total denormalized weight in pool"
      );
      throw e;
    }
    return weight;
  }

  /**
   * Get Spot Price of swaping tokenIn to tokenOut
   * @param {String} poolAddress
   * @param {String} tokenIn
   * @param {String} tokenOut
   * @return {String}
   */
  async getSpotPrice(
    poolAddress: string,
    tokenIn: string,
    tokenOut: string
  ): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress);
    let price = null;
    try {
      const result = await pool.methods.getSpotPrice(tokenIn, tokenOut).call();
      price = this.web3.utils.fromWei(result);
    } catch (e) {
      this.logger.error(
        "ERROR: Failed to get spot price of swapping tokenIn to tokenOut"
      );
      throw e;
    }
    return price;
  }

  /**
   * Get Spot Price of swaping tokenIn to tokenOut without fees
   * @param {String} poolAddress
   * @param {String} tokenIn
   * @param {String} tokenOut
   * @return {String}
   */
  async getSpotPriceSansFee(
    poolAddress: string,
    tokenIn: string,
    tokenOut: string
  ): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress);
    let price = null;
    try {
      const result = await pool.methods
        .getSpotPriceSansFee(tokenIn, tokenOut)
        .call();
      price = this.web3.utils.fromWei(result);
    } catch (e) {
      this.logger.error("ERROR: Failed to getSpotPriceSansFee");
      throw e;
    }
    return price;
  }

  public async calcSpotPrice(
    poolAddress: string,
    tokenBalanceIn: string,
    tokenWeightIn: string,
    tokenBalanceOut: string,
    tokenWeightOut: string,
    swapFee: string
  ): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress);
    let amount = "0";
    try {
      const result = await pool.methods
        .calcSpotPrice(
          this.web3.utils.toWei(tokenBalanceIn),
          this.web3.utils.toWei(tokenWeightIn),
          this.web3.utils.toWei(tokenBalanceOut),
          this.web3.utils.toWei(tokenWeightOut),
          this.web3.utils.toWei(swapFee)
        )
        .call();
      amount = this.web3.utils.fromWei(result);
    } catch (e) {
      this.logger.error("ERROR: Failed to call calcSpotPrice");
      throw e;
    }
    return amount;
  }

  public async calcInGivenOut(
    poolAddress: string,
    tokenBalanceIn: string,
    tokenWeightIn: string,
    tokenBalanceOut: string,
    tokenWeightOut: string,
    tokenAmountOut: string,
    swapFee: string
  ): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress);
    let amount = null;
    if (new Decimal(tokenAmountOut).gte(tokenBalanceOut)) return null;
    try {
      const result = await pool.methods
        .calcInGivenOut(
          this.web3.utils.toWei(tokenBalanceIn),
          this.web3.utils.toWei(tokenWeightIn),
          this.web3.utils.toWei(tokenBalanceOut),
          this.web3.utils.toWei(tokenWeightOut),
          this.web3.utils.toWei(tokenAmountOut),
          this.web3.utils.toWei(swapFee)
        )
        .call();
      amount = this.web3.utils.fromWei(result);
    } catch (e) {
      this.logger.error("ERROR: Failed to calcInGivenOut");
      throw e;
    }
    return amount;
  }

  public async calcOutGivenIn(
    poolAddress: string,
    tokenBalanceIn: string,
    tokenWeightIn: string,
    tokenBalanceOut: string,
    tokenWeightOut: string,
    tokenAmountIn: string,
    swapFee: string
  ): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress);
    let amount = null;
    try {
      const result = await pool.methods
        .calcOutGivenIn(
          this.web3.utils.toWei(tokenBalanceIn),
          this.web3.utils.toWei(tokenWeightIn),
          this.web3.utils.toWei(tokenBalanceOut),
          this.web3.utils.toWei(tokenWeightOut),
          this.web3.utils.toWei(tokenAmountIn),
          this.web3.utils.toWei(swapFee)
        )
        .call();
      amount = this.web3.utils.fromWei(result);
    } catch (e) {
      this.logger.error("ERROR: Failed to calcOutGivenIn");
      throw e;
    }
    return amount;
  }

  public async calcPoolOutGivenSingleIn(
    poolAddress: string,
    tokenBalanceIn: string,
    tokenWeightIn: string,
    poolSupply: string,
    totalWeight: string,
    tokenAmountIn: string,
    swapFee: string
  ): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress);
    let amount = null;
    try {
      const result = await pool.methods
        .calcPoolOutGivenSingleIn(
          this.web3.utils.toWei(tokenBalanceIn),
          this.web3.utils.toWei(tokenWeightIn),
          this.web3.utils.toWei(poolSupply),
          this.web3.utils.toWei(totalWeight),
          this.web3.utils.toWei(tokenAmountIn),
          this.web3.utils.toWei(swapFee)
        )
        .call();
      amount = this.web3.utils.fromWei(result);
    } catch (e) {
      this.logger.error(
        `ERROR: Failed to calculate PoolOutGivenSingleIn : ${e.message}`
      );
      throw e;
    }
    return amount;
  }

  public async calcSingleInGivenPoolOut(
    poolAddress: string,
    tokenBalanceIn: string,
    tokenWeightIn: string,
    poolSupply: string,
    totalWeight: string,
    poolAmountOut: string,
    swapFee: string
  ): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress);
    let amount = null;
    try {
      const result = await pool.methods
        .calcSingleInGivenPoolOut(
          this.web3.utils.toWei(tokenBalanceIn),
          this.web3.utils.toWei(tokenWeightIn),
          this.web3.utils.toWei(poolSupply),
          this.web3.utils.toWei(totalWeight),
          this.web3.utils.toWei(poolAmountOut),
          this.web3.utils.toWei(swapFee)
        )
        .call();
      amount = this.web3.utils.fromWei(result);
    } catch (e) {
      this.logger.error(
        `ERROR: Failed to calculate SingleInGivenPoolOut : ${e.message}`
      );
      throw e;
    }
    return amount;
  }

  public async calcSingleOutGivenPoolIn(
    poolAddress: string,
    tokenBalanceOut: string,
    tokenWeightOut: string,
    poolSupply: string,
    totalWeight: string,
    poolAmountIn: string,
    swapFee: string
  ): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress);
    let amount = null;
    try {
      const result = await pool.methods
        .calcSingleOutGivenPoolIn(
          this.web3.utils.toWei(tokenBalanceOut),
          this.web3.utils.toWei(tokenWeightOut),
          this.web3.utils.toWei(poolSupply),
          this.web3.utils.toWei(totalWeight),
          this.web3.utils.toWei(poolAmountIn),
          this.web3.utils.toWei(swapFee)
        )
        .call();
      amount = this.web3.utils.fromWei(result);
    } catch (e) {
      this.logger.error(
        `ERROR: Failed to calculate SingleOutGivenPoolIn : ${e.message}`
      );
      throw e;
    }
    return amount;
  }

  public async calcPoolInGivenSingleOut(
    poolAddress: string,
    tokenBalanceOut: string,
    tokenWeightOut: string,
    poolSupply: string,
    totalWeight: string,
    tokenAmountOut: string,
    swapFee: string
  ): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress);
    let amount = null;
    try {
      const result = await pool.methods
        .calcPoolInGivenSingleOut(
          this.web3.utils.toWei(tokenBalanceOut),
          this.web3.utils.toWei(tokenWeightOut),
          this.web3.utils.toWei(poolSupply),
          this.web3.utils.toWei(totalWeight),
          this.web3.utils.toWei(tokenAmountOut),
          this.web3.utils.toWei(swapFee)
        )
        .call();
      amount = this.web3.utils.fromWei(result);
    } catch (e) {
      this.logger.error(
        `ERROR: Failed to calculate PoolInGivenSingleOut : ${e.message}`
      );
      throw e;
    }
    return amount;
  }

  /**
   * Get LOG_SWAP encoded topic
   * @return {String}
   */
  public getSwapEventSignature(): string {
    const abi = this.poolABI as AbiItem[];
    const eventdata = abi.find(function (o) {
      if (o.name === "LOG_SWAP" && o.type === "event") return o;
    });
    const topic = this.web3.eth.abi.encodeEventSignature(eventdata as any);
    return topic;
  }

  /**
   * Get LOG_JOIN encoded topic
   * @return {String}
   */
  public getJoinEventSignature(): string {
    const abi = this.poolABI as AbiItem[];
    const eventdata = abi.find(function (o) {
      if (o.name === "LOG_JOIN" && o.type === "event") return o;
    });
    const topic = this.web3.eth.abi.encodeEventSignature(eventdata as any);
    return topic;
  }

  /**
   * Get LOG_EXIT encoded topic
   * @return {String}
   */
  public getExitEventSignature(): string {
    const abi = this.poolABI as AbiItem[];
    const eventdata = abi.find(function (o) {
      if (o.name === "LOG_EXIT" && o.type === "event") return o;
    });
    const topic = this.web3.eth.abi.encodeEventSignature(eventdata as any);
    return topic;
  }
}
