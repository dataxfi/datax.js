import Web3 from "web3";
import "dotenv";
import {
  Config,
  Ocean,
  DataTokens,
  Stake,
  Trade,
  TokenList,
  Watcher,
} from "../src";
import Ganache, { EthereumProvider, Server } from "ganache";
import { WebsocketProvider } from "web3-core";
import { DTContractHandler } from "./DTContractHandler";
import { Contract } from "web3-eth/node_modules/web3-eth-contract/types/index";
import factory from "@oceanprotocol/contracts/artifacts/DTFactory.json";
import datatokensTemplate from "@oceanprotocol/contracts/artifacts/DataTokenTemplate.json";
import bFactory from "@oceanprotocol/contracts/artifacts/BFactory.json";
// import proxy from "../../src/abi/DataxRouter.json";
import bPool from "@oceanprotocol/contracts/artifacts/BPool.json";
// import bToken from "@oceanprotocol/contracts/artifacts/BToken.json";
import { AbiItem } from "web3-utils";
import { BalancerContractHandler } from "./BalancerContractHandler";
import { Logger } from "../src/utils";

/**
 * Sets up instances of classes needed to test datax.js. Every class exported
 * from the library is instantiated and public. 10 accounts and private keys
 * are provided.
 */
export default class TestSetup {
  //Class instances
  public web3: Web3;
  public config: Config;
  public datatokens: DataTokens;
  public ocean: Ocean;
  public stake: Stake;
  public trade: Trade;
  public tokenList: TokenList;
  public watcher: Watcher;

  //local chain variables
  public ganache_provider: EthereumProvider;
  public network_id: "5777";
  public accounts_data: { private_keys: {} };
  public account_addys10: string[];
  public account_keys10: string[];
  public ganache_server: Server<"ethereum">;

  //pools and tokens
  public pool1;
  public pool2;
  public pool3;
  public token1;
  public token2;
  public token3;

  //contracts and contract addresses
  private dtTemplateAddress: string;
  private dtTemplateContract: Contract;
  private dtFactoryAddress: string;
  private dtFactoryContract: Contract;
  private bFactoryContract: Contract;
  private bFactoryAddress: string;

  //stuff needed for minting tokens
  private dtAmount = "10";
  private dtWeight = "3";
  private oceanAmount =
    (parseFloat(this.dtAmount) * (10 - parseFloat(this.dtWeight))) /
    parseFloat(this.dtWeight);
  private fee = "0.01";
  private oceanWeight = "3";

  constructor() {
    this.ganache_server = Ganache.server({
      seed: "asd123",
      account_keys_path: "src/tests/privateKeys.json",
    });

    //spin up local node, set provider and web3
    this.ganache_server.listen(8545, () => {
      console.log("Ganache running at http://localhost:8545");
      this.ganache_provider = this.ganache_server.provider;
      this.web3 = new Web3(
        this.ganache_provider as unknown as WebsocketProvider
      );
    });

    //get accounts
    this.accounts_data = require("./privateKeys.json") as { private_keys: {} };
    this.account_addys10 = Object.keys(this.accounts_data.private_keys);
    this.account_keys10 = Object.values(this.accounts_data.private_keys);

    //create classes
    this.config = new Config(this.web3, this.network_id);
    this.ocean = new Ocean(this.web3, this.network_id);
    this.stake = new Stake(this.web3, this.network_id, this.ocean);
    this.trade = new Trade(this.web3, this.network_id, this.ocean);
    this.watcher = new Watcher(this.web3, this.network_id);
    if (process.env.pinata_API_key && process.env.pinata_API_secret)
      this.tokenList = new TokenList(
        this.web3,
        this.network_id,
        process.env.pinata_API_key,
        process.env.pinata_API_secret
      );

    // this.datatokens = new DataTokens()
  }

  private async shutDownServer() {
    this.ganache_server.close();
  }

  private async deployContract(
    web3: Web3,
    abi: AbiItem[] | AbiItem,
    minter: string,
    options: any
  ): Promise<[string, Contract]> {
    const contract = new web3.eth.Contract(abi);
    const deploy = contract.deploy(options);
    const estGas = await deploy.estimateGas((err, estGas) => {
      if (err) throw err;
      return estGas;
    });

    console.log("ESTIMATED GAS:", estGas);
    const address = await deploy
      .send({
        from: minter,
        gas: estGas + 100000,
        gasPrice: "3000000000",
      })
      .then((contract) => {
        return contract.options.address;
      });

    return [address, contract];
  }

  private async setupTestPool() {

    // setup pool for testing
    // block 19
    await setupPool(
      this.sagkriPoolContract,
      this.accounts[1],
      this.sagkri,
      this.web3.utils.toWei(String(this.dtAmount)),
      this.web3.utils.toWei(String(this.dtWeight)),
      this.oceanTokenAddress,
      this.web3.utils.toWei(String(this.oceanAmount)),
      this.web3.utils.toWei(String(this.oceanWeight)),
      this.web3.utils.toWei(String(this.fee))
    );

    // block 20
    await setupPool(
      this.dazorcPoolContract,
      this.accounts[1],
      this.sagkri,
      this.web3.utils.toWei(String(this.dtAmount)),
      this.web3.utils.toWei(String(this.dtWeight)),
      this.oceanTokenAddress,
      this.web3.utils.toWei(String(this.oceanAmount)),
      this.web3.utils.toWei(String(this.oceanWeight)),
      this.web3.utils.toWei(String(this.fee))
    );
  }

  public async setupLocalSetup() {
    await this.setupLocalServer();
    await this.deployNeededContracts();
    await this.createTokens();
    await this.setupTestPool();
  }

  private async setupPool(
    contract: any,
    acct: string,
    baseAddress: string,
    baseAmt: string,
    baseWeight: string,
    otherAddress: string,
    otherAmt: string,
    otherWeight: string,
    fee: string
  ) {
    const estGas = await contract.methods
      .setup(
        otherAddress,
        otherAmt,
        otherWeight,
        baseAddress,
        baseWeight,
        baseAmt,
        fee
      )
      .estimateGas({ from: acct }, (err: any, estGas: any) => {
        return err ? 10000000 : estGas + 1000;
      });

    const setupTx = await contract.methods
      .setup(
        otherAddress,
        otherAmt,
        otherWeight,
        baseAddress,
        baseWeight,
        baseAmt,
        fee
      )
      .send({ from: acct, gas: estGas });
    return setupTx;
  }

  private async deployDTTemplate() {
    // datatoken template
    const [dtTemplateAddress, dtTemplateContract] = await this.deployContract(
      this.web3,
      datatokensTemplate.abi as AbiItem[],
      this.account_addys10[0],
      {
        data: datatokensTemplate.bytecode,
        arguments: [
          "Template Contract",
          "TEMPLATE",
          this.account_addys10[0],
          1400000000,
          "https://something.nothing.com",
          this.account_addys10[0],
        ],
      }
    );

    this.dtTemplateAddress = dtTemplateAddress;
    this.dtTemplateContract = dtTemplateContract;
  }

  private async deployDTFactory(dtTemplateAddress: string) {
    // datatoken factory
    // block 2
    const [factoryAddress, factoryContract] = await this.deployContract(
      this.web3,
      factory.abi as AbiItem[],
      this.account_addys10[0],
      {
        data: factory.bytecode,
        arguments: [dtTemplateAddress, this.account_addys10[0]],
      }
    );

    this.dtFactoryAddress = factoryAddress;
    this.dtFactoryContract = factoryContract;
  }

  /**
   * Deploys a test pool, returns
   * @param name
   */
  private async deployTestPool() {
    const [address, contract] = await this.deployContract(
      this.web3,
      bPool.abi as AbiItem[],
      this.account_addys10[1],
      {
        data: bPool.bytecode,
      }
    );

    contract.options.address = address;
  }

  private async deployDTBalancerFactory(poolAddress) {
    // datatoken pool balancer factory
    // block 5
    const [balancerFactoryAddress, balancerFactoryContract] =
      await this.deployContract(
        this.web3,
        bFactory.abi as AbiItem[],
        this.account_addys10[0],
        {
          data: bFactory.bytecode,
          arguments: [poolAddress],
        }
      );

    this.bFactoryAddress = balancerFactoryAddress;
    this.bFactoryContract = balancerFactoryContract;
  }

  private async getDataTokensInstance() {
    return new DataTokens(
      this.dtFactoryAddress,
      factory.abi as AbiItem[],
      datatokensTemplate.abi as AbiItem[],
      this.web3 as Web3,
      new Logger()
    );
  }


  private async createTokens(
    datatokenInstance: DataTokens,
    metadataCacheUri: string,
    address: string,
    cap: string,
    name: string,
    symbol: string
  ) {
    // #2 mint tokens
    // create ocean token

    // block 6
    return await datatokenInstance.create(
      metadataCacheUri,
      address,
      cap,
      name,
      symbol
    );
  }

  private async mintTokens(datatokenInstance: Datatokens) {
    // mint / approve tokens for account 2
    await this.datatokenInstance.mint(
      oceanToken,
      this.accounts[0],
      "5000",
      this.accounts[1]
    ); // block 9

    await this.datatoken.mint(SAGRKI, this.accounts[0], "10", this.accounts[1]); // block 13
  }


  // private async 
  // await ocean.approve(oceanToken, this.sagkriPool, "10", this.accounts[1]); // block 15
  // await ocean.approve(SAGRKI, this.sagkriPool, "10", this.accounts[1]); // block 16
  // await ocean.approve(SAGRKI, this.sagkriPool, "10", this.accounts[2]); // block 17
}
