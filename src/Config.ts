import { supportedNetworks } from "./@types";
// eslint-disable-next-line import/no-named-default
import DefaultContractsAddresses from "@oceanprotocol/contracts/addresses/address.json";
import { LoggerInstance } from "./utils";
import Web3 from "web3";
import { GraphQLClient } from "graphql-request";

const configHelperNetworksBase = {
  chainId: null,
  network: "unknown",
  metadataCacheUri: "https://v4.aquarius.oceanprotocol.com",
  nodeUri: "http://127.0.0.1:8545",
  providerUri: "http://127.0.0.1:8030",
  subgraphUri: null,
  explorerUri: null,
  oceanTokenAddress: null,
  oceanTokenSymbol: "OCEAN",
  poolTemplateAddress: null,
  fixedRateExchangeAddress: null,
  dispenserAddress: null,
  startBlock: 0,
  transactionBlockTimeout: 50,
  transactionConfirmationBlocks: 1,
  transactionPollingTimeout: 750,
  gasFeeMultiplier: 1,
};

export default class Config {
  public web3: Web3 = null;
  public networkId: supportedNetworks = null;
  public subgraphURL: string;
  public gqlClient: GraphQLClient


  public extra = {
    pinataAPIBaseUrl: "https://api.pinata.cloud",
    pinataRestUrl: "https://gateway.pinata.cloud/ipfs",
    maxUint256:
      "115792089237316195423570985008687907853269984665640564039457584007913129639934",
  };

  constructor(web3: any, networkId: supportedNetworks) {
    this.web3 = web3;
    this.networkId = networkId;
    const networkName = this.getNetwork(networkId);
    this.subgraphURL = `https://v4.subgraph.${networkName}.oceanprotocol.com/subgraphs/name/oceanprotocol/ocean-subgraph`;
    this.gqlClient = new GraphQLClient(this.subgraphURL)
  }

  /**
   * return network using network id
   * @param networkId
   * @returns
   */
  public getNetwork(networkId: supportedNetworks): string {
    switch (networkId) {
      case "1":
        return "mainnet";
      case "137":
        return "polygon";
      case "4":
        return "rinkeby";
      case "56":
        return "bsc";
      case "246":
        return "energyweb";
      case "1285":
        return "moonriver";
      case "8996":
        return "development";
      default:
        return "unknown";
    }
  }

  /**
   * DataX custom configurations. Will be called with networkId
   */
  public custom = {
    "1": {
      stakeRouterAddress: "",
      uniV2AdapterAddress: "",
      routerAddress: "0x8d41dd706b964408f7702c8b52488023731b6748",
      datatokenList: "Qmc8Dp1U2kW6FJbpUYGr5W6sVyJsQeQzVundT9vooCH6aX",
      tokenList: "https://tokens.uniswap.org/",
      nativeAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    },
    "4": {
      stakeRouterAddress: "0x580DE256179B0F8BEe9A4d882E354967d30a0ef6",
      uniV2AdapterAddress: "0x5B7ca74D5D806Ade232e17656935B65E36dC6F6a",
      routerAddress: "0x0B9376Ae7203657fEab7108cfe83e328e7a99ABf",
      datatokenList: "QmUcsbmbYT6sFTAzsoH1jtgzwi9B3RhBsZzFHjbs6igoQg",
      tokenList:
        "https://raw.githubusercontent.com/Uniswap/default-token-list/main/src/tokens/rinkeby.json",
      nativeAddress: "0xc778417E063141139Fce010982780140Aa0cD5Ab",
    },
    "137": {
      stakeRouterAddress: "",
      uniV2AdapterAddress: "",
      routerAddress: "0xf2E1cf99b69C7c1152EF273217Adb62F5dAe3886",
      datatokenList: "",
      tokenList:
        "https://unpkg.com/quickswap-default-token-list@1.2.26/build/quickswap-default.tokenlist.json",
      nativeAddress: "0x0000000000000000000000000000000000001010",
    },
    "56": {
      stakeRouterAddress: "",
      uniV2AdapterAddress: "",
      routerAddress: "",
      datatokenList: "",
      tokenList: "https://tokens.pancakeswap.finance/pancakeswap-extended.json",
      nativeAddress: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    },
    "1285": {
      stakeRouterAddress: "",
      uniV2AdapterAddress: "",
      routerAddress: "",
      datatokenList: "",
      tokenList:
        "https://raw.githubusercontent.com/solarbeamio/solarbeam-tokenlist/main/solarbeam.tokenlist.json",
      nativeAddress: "0x98878B06940aE243284CA214f92Bb71a2b032B8A",
    },
    "246": {
      stakeRouterAddress: "",
      uniV2AdapterAddress: "",
      routerAddress: "0x44b89BA2796E43aF07aBeF6D3324C8273e64F0dE",
      datatokenList: "",
      tokenList:
        "https://raw.githubusercontent.com/carbonswap/assets/master/carbonswap/Carbonswap_List.json",
      nativeAddress: "0x6b3bd0478DF0eC4984b168Db0E12A539Cc0c83cd",
    },
  }[this.networkId];

  /**
   * Ocean protocol default configurations. Called immediately with networkId.
   */
  public default = {
    ...{
      base: {
        ...configHelperNetworksBase,
      },
      "8996": {
        // barge
        ...configHelperNetworksBase,
        chainId: 8996,
        network: "development",
        metadataCacheUri: "http://127.0.0.1:5000",
        providerUri: "http://172.15.0.4:8030",
      },
      "3": {
        ...configHelperNetworksBase,
        chainId: 3,
        network: "ropsten",
        nodeUri: "https://ropsten.infura.io/v3",
        providerUri: "https://v4.provider.ropsten.oceanprotocol.com",
        subgraphUri: "https://v4.subgraph.ropsten.oceanprotocol.com",
        explorerUri: "https://ropsten.etherscan.io",
        gasFeeMultiplier: 1.1,
      },
      "4": {
        ...configHelperNetworksBase,
        chainId: 4,
        network: "rinkeby",
        nodeUri: "https://rinkeby.infura.io/v3",
        providerUri: "https://v4.provider.rinkeby.oceanprotocol.com",
        subgraphUri: "https://v4.subgraph.rinkeby.oceanprotocol.com",
        explorerUri: "https://rinkeby.etherscan.io",
        gasFeeMultiplier: 1.1,
      },
      "1": {
        ...configHelperNetworksBase,
        chainId: 1,
        network: "mainnet",
        nodeUri: "https://mainnet.infura.io/v3",
        providerUri: "https://v4.provider.mainnet.oceanprotocol.com",
        subgraphUri: "https://v4.subgraph.mainnet.oceanprotocol.com",
        explorerUri: "https://etherscan.io",
        startBlock: 11105459,
        transactionBlockTimeout: 150,
        transactionConfirmationBlocks: 5,
        transactionPollingTimeout: 1750,
        gasFeeMultiplier: 1.05,
      },
      "137": {
        ...configHelperNetworksBase,
        chainId: 137,
        network: "polygon",
        nodeUri: "https://polygon-mainnet.infura.io/v3",
        providerUri: "https://v4.provider.polygon.oceanprotocol.com",
        subgraphUri: "https://v4.subgraph.polygon.oceanprotocol.com",
        explorerUri: "https://polygonscan.com",
        oceanTokenSymbol: "mOCEAN",
      },
      "1287": {
        ...configHelperNetworksBase,
        chainId: 1287,
        network: "moonbase",
        nodeUri: "https://rpc.api.moonbase.moonbeam.network",
        providerUri: "https://v4.provider.moonbase.oceanprotocol.com",
        subgraphUri: "https://v4.subgraph.moonbase.oceanprotocol.com",
        explorerUri: "https://moonbase.moonscan.io/",
        gasFeeMultiplier: 1.1,
      },
      "2021000": {
        ...configHelperNetworksBase,
        chainId: 2021000,
        network: "gaiaxtestnet",
        nodeUri: "https://rpc.gaiaxtestnet.oceanprotocol.com",
        providerUri: "https://v4.provider.gaiaxtestnet.oceanprotocol.com",
        subgraphUri: "https://v4.subgraph.gaiaxtestnet.oceanprotocol.com",
        explorerUri: "https://blockscout.gaiaxtestnet.oceanprotocol.com",
      },
      "80001": {
        ...configHelperNetworksBase,
        chainId: 80001,
        network: "mumbai",
        nodeUri: "https://polygon-mumbai.infura.io/v3",
        providerUri: "https://v4.provider.mumbai.oceanprotocol.com",
        subgraphUri: "https://v4.subgraph.mumbai.oceanprotocol.com",
        explorerUri: "https://mumbai.polygonscan.com",
        gasFeeMultiplier: 1.1,
      },
      "56": {
        ...configHelperNetworksBase,
        chainId: 56,
        network: "bsc",
        nodeUri: "https://bsc-dataseed.binance.org",
        providerUri: "https://v4.provider.bsc.oceanprotocol.com",
        subgraphUri: "https://v4.subgraph.bsc.oceanprotocol.com",
        explorerUri: "https://bscscan.com/",
        gasFeeMultiplier: 1.05,
      },
      "246": {
        ...configHelperNetworksBase,
        chainId: 246,
        network: "energyweb",
        nodeUri: "https://rpc.energyweb.org",
        providerUri: "https://v4.provider.energyweb.oceanprotocol.com",
        subgraphUri: "https://v4.subgraph.energyweb.oceanprotocol.com",
        explorerUri: "https://explorer.energyweb.org",
        gasFeeMultiplier: 1.05,
      },
      "1285": {
        ...configHelperNetworksBase,
        chainId: 1285,
        network: "moonriver",
        nodeUri: "https://moonriver.api.onfinality.io/public",
        providerUri: "https://v4.provider.moonriver.oceanprotocol.com",
        subgraphUri: "https://v4.subgraph.moonriver.oceanprotocol.com",
        explorerUri: "https://moonriver.moonscan.io/",
        gasFeeMultiplier: 1.05,
      },
    }[this.networkId],
    ...this.getAddressesFromEnv(this.networkId),
  };

  /* Load contract addresses from env ADDRESS_FILE (generated by ocean-contracts) */
  public getAddressesFromEnv(network: string, customAddresses?: any) {
    // use the defaults first
    let configAddresses: typeof DefaultContractsAddresses;

    // load from custom addresses structure
    if (customAddresses) {
      try {
        const {
          FixedPrice,
          Dispenser,
          Staking,
          poolTemplate,
          ERC721Factory,
          OPFCommunityFeeCollector,
          Ocean,
          chainId,
          startBlock,
        } = customAddresses[network];
        configAddresses = {
          erc721FactoryAddress: ERC721Factory,
          sideStakingAddress: Staking,
          opfCommunityFeeCollector: OPFCommunityFeeCollector,
          poolTemplateAddress: poolTemplate,
          fixedRateExchangeAddress: FixedPrice,
          dispenserAddress: Dispenser,
          oceanTokenAddress: Ocean,
          chainId: chainId,
          startBlock: startBlock,
          ...(process.env.AQUARIUS_URI && {
            metadataCacheUri: process.env.AQUARIUS_URI,
          }),
        } as unknown as typeof DefaultContractsAddresses;
      } catch (e) {
        // console.error(`ERROR: Could not load local contract address file: ${e.message}`)
        // return null
      }
    } else {
      // no custom addresses structure was passed, trying to load default
      if (DefaultContractsAddresses[network]) {
        const {
          FixedPrice,
          Dispenser,
          Staking,
          poolTemplate,
          OPFCommunityFeeCollector,
          ERC721Factory,
          Ocean,
          chainId,
          startBlock,
        } = DefaultContractsAddresses[network];
        configAddresses = {
          erc721FactoryAddress: ERC721Factory,
          sideStakingAddress: Staking,
          opfCommunityFeeCollector: OPFCommunityFeeCollector,
          poolTemplateAddress: poolTemplate,
          fixedRateExchangeAddress: FixedPrice,
          dispenserAddress: Dispenser,
          oceanTokenAddress: Ocean,
          chainId: chainId,
          startBlock: startBlock,
          ...(process.env.AQUARIUS_URI && {
            metadataCacheUri: process.env.AQUARIUS_URI,
          }),
        } as unknown as typeof DefaultContractsAddresses;
      }
    }
    return configAddresses;
  }
}
