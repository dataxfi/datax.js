import { ConfigHelper } from "./utils/";

export default class Config {
  private web3: any = null;
  private networkId: any = null;
  public default: any = null;

  constructor(web3: any, networkId: string) {
    this.web3 = web3;
    this.networkId = networkId;
    this.default = {
      ...new ConfigHelper().getConfig(this.getNetwork(networkId)),
      ...this.getCustomConfig(networkId),
      ...this.extra,
    };
  }

  /**
   * return network using network id
   * @param networkId
   * @returns
   */
  public getNetwork(networkId: string): string {
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
  };

  private extra = {
    pinataAPIBaseUrl: "https://api.pinata.cloud",
    pinataRestUrl: "https://gateway.pinata.cloud/ipfs",
    maxUint256:
      "115792089237316195423570985008687907853269984665640564039457584007913129639934",
  };

  private getCustomConfig(networkId) {
    return this.custom[networkId];
  }
}
