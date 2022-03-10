import Web3 from "web3";
import Config from "./Config";
import Base from "./Base";
import { TransactionReceipt } from "web3-core";

const DEFAULT_INTERVAL = 500;

const DEFAULT_BLOCKS_TO_WAIT = 0;

export default class Watcher extends Base {
  constructor(web3: Web3, network: any) {
    super(web3, network);
  }

  /**
   * Check if the transaction was success based on the receipt.
   *
   * @param receipt Transaction receipt
   */
  public isSuccessfulTransaction(receipt: TransactionReceipt): boolean {
    if (receipt.status) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Wait for one or multiple transactions to confirm.
   *
   * @param web3
   * @param txnHash A transaction hash or list of those
   * @param options Wait timers
   * @return Transaction receipt
   */
  public waitTransaction(
    web3: Web3,
    txnHash: string | string[],
    options: {
      interval: number;
      blocksToWait: number;
    } = null
  ): Promise<any> {
    const interval =
      options && options.interval ? options.interval : DEFAULT_INTERVAL;
    const blocksToWait =
      options && options.blocksToWait
        ? options.blocksToWait
        : DEFAULT_BLOCKS_TO_WAIT;
    var transactionReceiptAsync = async function (txnHash, resolve, reject) {
      try {
        var receipt = web3.eth.getTransactionReceipt(txnHash);
        if (!receipt) {
          setTimeout(function () {
            transactionReceiptAsync(txnHash, resolve, reject);
          }, interval);
        } else {
          if (blocksToWait > 0) {
            var resolvedReceipt = await receipt;
            if (!resolvedReceipt || !resolvedReceipt.blockNumber)
              setTimeout(function () {
                transactionReceiptAsync(txnHash, resolve, reject);
              }, interval);
            else {
              try {
                var block = await web3.eth.getBlock(
                  resolvedReceipt.blockNumber
                );
                var current = await web3.eth.getBlock("latest");
                if (current.number - block.number >= blocksToWait) {
                  var txn = await web3.eth.getTransaction(txnHash);
                  if (txn.blockNumber != null) resolve(resolvedReceipt);
                  else
                    reject(
                      new Error(
                        "Transaction with hash: " +
                          txnHash +
                          " ended up in an uncle block."
                      )
                    );
                } else
                  setTimeout(function () {
                    transactionReceiptAsync(txnHash, resolve, reject);
                  }, interval);
              } catch (e) {
                setTimeout(function () {
                  transactionReceiptAsync(txnHash, resolve, reject);
                }, interval);
              }
            }
          } else resolve(receipt);
        }
      } catch (e) {
        reject(e);
      }
    };

    // Resolve multiple transactions once
    if (Array.isArray(txnHash)) {
      var promises = [];
      txnHash.forEach(function (oneTxHash) {
        promises.push(this.waitTransaction(web3, oneTxHash, options));
      });
      return Promise.all(promises);
    } else {
      return new Promise(function (resolve, reject) {
        transactionReceiptAsync(txnHash, resolve, reject);
      });
    }
  }
}
