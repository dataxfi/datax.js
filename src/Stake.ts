import Base from "./Base";
import BigNumber from "bignumber.js";
import Web3 from "web3";
import stakeRouterAbi from "./abi/rinkeby/StakeRouter-abi.json";
import {
  getFairGasPrice,
  getMaxRemoveLiquidity,
  getMaxAddLiquidity,
} from "./utils/";
import { TransactionReceipt } from "web3-core";
import { Contract } from "web3-eth-contract";
import { AbiItem } from "web3-utils";
import { IStakeInfo } from "./@types/stake";
import { supportedNetworks } from "./@types";
import { Pool } from "./balancer";
import Trade from "./Trade";
import poolABI from "@oceanprotocol/contracts/artifacts/contracts/pools/balancer/BPool.sol/BPool.json";
import { gql } from "graphql-request";
import { allowance, approve } from "./utils/TokenUtils";
import { Datatoken } from "./tokens";

export default class Stake extends Base {
  private stakeRouterAddress: string = this.config.custom.stakeRouterAddress;
  private stakeRouter: Contract;
  private GASLIMIT_DEFAULT = 1000000;
  private stakeFailureMessage =
    "ERROR: Failed to pay tokens in order to join the pool";
  private unstakeFailureMessage =
    "ERROR: Failed to pay pool shares into the pool";
  private pool: Pool;
  private trade: Trade;
  private datatoken: Datatoken;

  constructor(web3: Web3, networkId: supportedNetworks) {
    super(web3, networkId);

    this.stakeRouter = new this.web3.eth.Contract(
      stakeRouterAbi as AbiItem[],
      this.stakeRouterAddress
    );

    this.pool = new Pool(this.web3, this.networkId);
    this.trade = new Trade(web3, networkId);
  }

  /** get pool details
   * @param {Srting} poolAddress
   * @returns {String[]} - datatoken addresses
   */

  public async getPoolDetails(poolAddress: string): Promise<any> {
    try {
      const query = gql`
          {
            pool(id: ${poolAddress}) {
              baseToken {
                name
                symbol
              }
              datatoken {
                name
                symbol
              }
            }
          }
        `;

      const {
        data: {
          pool: { datatoken, baseToken },
        },
      } = await this.config.gqlClient.request(query);

      return { datatoken, baseToken };
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
      return (
        await getMaxRemoveLiquidity(this.pool, poolAddress, tokenAddress)
      ).toString();
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
      return await this.pool.sharesBalance(poolAddress, account);
    } catch (error) {
      throw {
        Code: 1000,
        Message: "We ran into a problem, please refresh your connection.",
        error,
      };
    }
  }

  /**
   * Conducts preliminary checks to be made before a stake transaction is emitted. Checks wether
   * transaction amount is less than user balance, that the user is approved to spend the
   * transaction amount, and if the max stake/unstake is greater than the transaction amount.
   * @param tokenIn - The base token in address.
   * @param senderAddress - The sender of the transaction.
   * @param amount - The token in amount.
   * @param spender - The contract the transaction will be sent to.
   * @param poolAddress - The datatoken pool being staked in or unstaked from.
   */

  private async preStakeChecks(
    tokenIn: string,
    senderAddress: string,
    amount: string,
    spender: string,
    poolAddress: string,
    isDT: boolean,
    txType: "stake" | "unstake"
  ) {
    const txAmtBigNum = new BigNumber(amount);

    try {
      let balance: BigNumber;
      if (txType === "stake") {
        balance = new BigNumber(
          await this.trade.getBalance(tokenIn, senderAddress)
        );
      } else {
        balance = new BigNumber(
          await this.getMyPoolSharesForPool(poolAddress, senderAddress)
        );
      }

      if (balance.lt(txAmtBigNum)) {
        throw new Error("Not Enough Balance");
      }
    } catch (error) {
      throw new Error("Could not check account balance");
    }

    let isApproved;
    try {
      //check approval limit vs tx amount
      isApproved = new BigNumber(
        await allowance(this.web3, tokenIn, senderAddress, spender)
      );
    } catch (error) {
      throw new Error("Could not check allowance limit");
    }

    try {
      if (isApproved.lt(txAmtBigNum))
        if (isDT) {
          //approve if not approved
          await this.datatoken.approve(tokenIn, spender, amount, senderAddress);
        } else {
          await approve(
            this.web3,
            senderAddress,
            tokenIn,
            spender,
            amount,
            true
          );
        }
    } catch (error) {
      throw new Error("Could not process approval transaction");
    }

    try {
      //check max stake/unstake vs tx amount

      let max;
      if (txType === "stake") {
        max = new BigNumber(
          await getMaxAddLiquidity(this.pool, poolAddress, tokenIn)
        );
      } else {
        max = new BigNumber(
          await getMaxRemoveLiquidity(this.pool, poolAddress, tokenIn)
        );
      }

      if (max.lt(txAmtBigNum))
        throw new Error("Transaction amount is greater than max.");
    } catch (error) {
      throw new Error(`Could not check max ${txType} for pool.`);
    }
  }

  /**
   * Constructs the standard format of calling a stake or unstake transaction function: fist calls
   * estimate gas, then sends the transaction. Built in error handling will pass errorMessage
   * along with the origional error message. This function assumes the
   * transaction will be successful, and does not make any pre tx checks.
   * @param senderAddress - The address which the transaction will be sent from.
   * @param stakeInfo
   * @param stakeFunction - The stake or unstake transaction function to be executed.
   * @param errorMessage - A custom error message to pass into the error thrown if an error occurs.
   * @return {TransactionReceipt} The transaction receipt.
   */

  private async constructTxFunction(
    senderAddress: string,
    stakeInfo: IStakeInfo,
    stakeFunction: Function,
    errorMessage: string
  ): Promise<TransactionReceipt> {
    let estGas;
    const newUints = stakeInfo.uints.map((amt) => this.web3.utils.toWei(amt));
    const newStakeInfo = { ...stakeInfo, uints: newUints };

    console.log(newStakeInfo);
    try {
      estGas = await stakeFunction(newStakeInfo).estimateGas(
        { from: senderAddress },
        (err, estGas) => (err ? this.GASLIMIT_DEFAULT : estGas)
      );
    } catch (error) {
      console.error(error);
      estGas = this.GASLIMIT_DEFAULT;
    }

    try {
      return await stakeFunction(newStakeInfo).send({
        from: senderAddress,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config.default),
      });
    } catch (error) {
      throw new Error(`${errorMessage} : ${error.message}`);
    }
  }

  /**
   * Uses a chains native coin to stake into a datatoken pool. The native coin is internally
   * swapped to the pool's base token, then staked.
   * @param {IStakeInfo} stakeInfo - The stake information for the transaction.
   * @param senderAddress - The address which the transaction will be sent from.
   * @returns {string} - The pool token amount received from the transaction.
   */
  public async stakeETHInDTPool(
    stakeInfo: IStakeInfo,
    senderAddress: string
  ): Promise<TransactionReceipt> {
    // checks balance, approval, and max
    await this.preStakeChecks(
      stakeInfo.path[0],
      stakeInfo.meta[1],
      stakeInfo.uints[2],
      stakeInfo.meta[3],
      stakeInfo.meta[0],
      false,
      "stake"
    );

    return await this.constructTxFunction(
      senderAddress,
      stakeInfo,
      this.stakeRouter.methods.stakeETHInDTPool,
      this.stakeFailureMessage
    );
  }

  /**
   * Unstakes from a datatoken pool into a chains native coin. The pool's base token is
   * unstaked then internally swapped to the native coin.
   * @param stakeInfo
   * @param senderAddress - The address which the transaction will be sent from.
   * @returns {string} The token amount received from the transaction.
   */
  public async unstakeETHFromDTPool(
    stakeInfo: IStakeInfo,
    senderAddress: string
  ): Promise<TransactionReceipt> {
    await this.preStakeChecks(
      stakeInfo.path[0],
      stakeInfo.meta[1],
      stakeInfo.uints[0],
      stakeInfo.meta[3],
      stakeInfo.meta[0],
      false,
      "unstake"
    );

    return await this.constructTxFunction(
      senderAddress,
      stakeInfo,
      this.stakeRouter.methods.unstakeETHFromDTPool,
      this.unstakeFailureMessage
    );
  }

  /**
   *
   * Use any ERC20 token to stake into a datatoken pool. ERC20 tokens are
   * internally swapped to pool base token, then staked.
   * @param stakeInfo
   * @param senderAddress - The address which the transaction will be sent from.
   * @returns {string} The pool token amount received from the transaction.
   */
  public async stakeTokenInDTPool(
    stakeInfo: IStakeInfo,
    senderAddress: string
  ): Promise<TransactionReceipt> {
    await this.preStakeChecks(
      stakeInfo.path[0],
      stakeInfo.meta[1],
      stakeInfo.uints[2],
      stakeInfo.meta[3],
      stakeInfo.meta[0],
      false,
      "stake"
    );

    return await this.constructTxFunction(
      senderAddress,
      stakeInfo,
      this.stakeRouter.methods.stakeTokenInDTPool,
      this.stakeFailureMessage
    );
  }

  /**
   * Unstakes from a datatoken pool into any ERC20 token. The pool's base token is
   * unstaked, then internally swapped to desired ERC20 token out.
   * @param stakeInfo
   * @param senderAddress - The address which the transaction will be sent from.
   * @returns {string} The token amount received from the transaction.
   */
  public async unstakeTokenFromDTPool(
    stakeInfo: IStakeInfo,
    senderAddress: string
  ): Promise<TransactionReceipt> {
    await this.preStakeChecks(
      stakeInfo.path[0],
      stakeInfo.meta[1],
      stakeInfo.uints[0],
      stakeInfo.meta[3],
      stakeInfo.meta[0],
      false,
      "unstake"
    );

    return await this.constructTxFunction(
      senderAddress,
      stakeInfo,
      this.stakeRouter.methods.unstakeTokenFromDTPool,
      this.unstakeFailureMessage
    );
  }

  /**
   * Constructs the standard way to call a calculation function. Converts all amounts in the uint256 array to wei,
   * then calls the passed transaction function with the updated stakeInfo. Built in error handling will pass the
   * provided errorMessage to the thrown error if an error occurs.
   * @param stakeInfo
   * @param calcFunction
   * @param errorMessage
   * @returns
   */
  private async constructCalcFunction(
    stakeInfo: IStakeInfo,
    calcFunction: Function,
    errorMessage: string
  ): Promise<{ dataxFee: string; poolAmountOut: string; refFee: string }> {
    const toWei = (amount: string) => this.web3.utils.toWei(amount);
    const uints = stakeInfo.uints.map(toWei) as [string, string, string];

    const newStakeInfo: IStakeInfo = {
      ...stakeInfo,
      uints,
    };

    try {
      return await calcFunction(newStakeInfo).call();
    } catch (error) {
      throw new Error(`${errorMessage}: ${error.message}`);
    }
  }

  /**
   * This is a stake calculation. Calculates the pool amount out for an exact token amount in.
   * @param stakeInfo
   * @returns {string[]} [baseAmountOut, dataxFee, refFee]
   */
  public async calcPoolOutGivenTokenIn(stakeInfo: IStakeInfo) {
    return await this.constructCalcFunction(
      stakeInfo,
      this.stakeRouter.methods.calcPoolOutGivenTokenIn,
      "Failed to calculate pool out given token in"
    );
  }

  /**
   * This is an unstake calculation. Calculates the pool amount in needed for an exact token amount out.
   * @param stakeInfo
   * @returns {string[]} [baseAmountOut, dataxFee, refFee]
   */
  public async calcPoolInGivenTokenOut(stakeInfo: IStakeInfo) {
    return await this.constructCalcFunction(
      stakeInfo,
      this.stakeRouter.methods.calcPoolInGivenTokenOut,
      "Failed to calculate pool in given token out"
    );
  }

  /**
   * This is an unstake calculation. Calculates the amount of token out from an exact pool amount in.
   * @param stakeInfo
   * @param senderAddress - The address which the transaction will be sent from.
   * @returns {string[]} [baseAmountOut, dataxFee, refFee]
   */
  public async calcTokenOutGivenPoolIn(stakeInfo: IStakeInfo) {
    return this.constructCalcFunction(
      stakeInfo,
      this.stakeRouter.methods.calcTokenOutGivenPoolIn,
      "Failed to calculate token out given pool in"
    );
  }

  /**
   * Claim collected referral fees for a particular token. Referrer fees charged by third party dApps in
   * multiple tokens should be collected per token, by calling this function with the token address.
   * @param tokenAddress - The token to claim collected fees for.
   * @param senderAddress - The address which the transaction will be sent from.
   * @returns {string} Claim amount collected for the token passed.
   */
  public async claimRefFees(tokenAddress: string, senderAddress: string) {
    let estGas;
    try {
      estGas = await this.stakeRouter.methods
        .claimRefFees(tokenAddress)
        .estimateGas({ from: senderAddress }, (err, estGas) =>
          err ? this.GASLIMIT_DEFAULT : estGas
        );
    } catch (error) {
      estGas = this.GASLIMIT_DEFAULT;
    }

    try {
      return await this.stakeRouter.methods.claimRefFees(tokenAddress).send({
        from: senderAddress,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config.default),
      });
    } catch (error) {
      throw new Error(
        `${"Failed to claim refferer fees for this token"} : ${error.message}`
      );
    }
  }
}
