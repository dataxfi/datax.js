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
      routerAddress: "0x8d41dd706b964408f7702c8b52488023731b6748",
      datatokenList: "Qmc8Dp1U2kW6FJbpUYGr5W6sVyJsQeQzVundT9vooCH6aX",
      tokenList: "https://tokens.uniswap.org/",
    },
    "4": {
      routerAddress: "0x0B9376Ae7203657fEab7108cfe83e328e7a99ABf",
      datatokenList: "QmUcsbmbYT6sFTAzsoH1jtgzwi9B3RhBsZzFHjbs6igoQg",
      tokenList:
        "https://raw.githubusercontent.com/Uniswap/default-token-list/main/src/tokens/rinkeby.json",
    },
    "137": {
      routerAddress: "0xf2E1cf99b69C7c1152EF273217Adb62F5dAe3886",
      datatokenList: "",
      tokenList:
        "https://unpkg.com/quickswap-default-token-list@1.2.26/build/quickswap-default.tokenlist.json",
    },
    "56": {
      routerAddress: "",
      datatokenList: "",
      tokenList: "https://tokens.pancakeswap.finance/pancakeswap-extended.json",
    },
    "1285": {
      routerAddress: "",
      datatokenList: "",
      tokenList:
        "https://raw.githubusercontent.com/solarbeamio/solarbeam-tokenlist/main/solarbeam.tokenlist.json",
    },
    "246": {
      routerAddress: "0x44b89BA2796E43aF07aBeF6D3324C8273e64F0dE",
      datatokenList: "",
      tokenList:
        "https://raw.githubusercontent.com/carbonswap/assets/master/carbonswap/Carbonswap_List.json",
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
