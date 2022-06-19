require("dotenv").config();
import Base from "./Base";
import { ITokenInfo, ITList} from "./@types/datax-types";
import axios from "axios";


export default class TokenList extends Base {
  private pinataApiKey: string;
  private pinataSecretKey: string;

  constructor(
    web3: any,
    networkId: any,
    pinataAPIKey: string,
    pinataSecretKey: string
  ) {
    super(web3, networkId);
    this.pinataApiKey = pinataAPIKey;
    this.pinataSecretKey = pinataSecretKey;
  }

  /**
   * fetch global token list with all ERC20 tokens + Datatokens
   * @returns
   */
  public async fetchGlobalTokenList(chainId: number): Promise<ITList> {
    try {
      let apiResp = await axios(
        `https://gateway.pinata.cloud/ipfs/${
          this.config.custom[String(chainId)].tokenList
        }`
      );
      console.log(apiResp);
      const tokenList = apiResp.data;
      console.log(tokenList);
      return tokenList;
    } catch (e) {
      throw {
        Code: 2000,
        Message: "Failed to fetch token list.",
        Error: e,
      };
    }
  }

  /**
   * fetch list of all Datatokens
   * @returns
   */
  public async fetchDataTokenList(chainId: number): Promise<ITList> {
    try {
      let apiResp = await axios(
        `https://gateway.pinata.cloud/ipfs/${
          this.config.custom[String(chainId)].datatokenList
        }`
      );
      console.log(apiResp);
      const tokenList = apiResp.data;
      console.log(tokenList);
      return tokenList;
    } catch (e) {
      throw {
        Code: 2000,
        Message: "Failed to fetch data token list.",
        Error: e,
      };
    }
  }

  /**
   * publish datatoken list to IPFS
   * @param listname
   * @param chainId
   * @returns
   */
  public async publishDataTokenList(
    listname: string,
    chainId: number
  ): Promise<any> {
    try {
      const aquariusUrl = this.config.default.metadataCacheUri;
      let resp = await axios(aquariusUrl + "/api/v1/aquarius/assets/ddo");
      let ddos = resp.data;

      let tokens = await Promise.all(
        ddos
          .filter((ddo) =>
            ddo.isInPurgatory != "true" && ddo.price.pools.length ? true : false
          )
          .map((ddo) => {
            console.log(ddo);
            const { address, name, symbol, decimals } = ddo.dataTokenInfo;
            const pool = ddo.price.pools[0];
            return {
              chainId,
              address,
              name,
              symbol,
              decimals,
              pool,
            };
          })
      );

      let tokenList = await this.fetchDataTokenList(chainId);
      // console.log(fetchedList)
      //let tokenList: ITList = await this.prepareDataTokenList(tokens, chainId);

      const pinataResp = await this.pinTokenListToIPFS(listname, tokenList);
      return pinataResp;
    } catch (e) {
      throw {
        Code: 2000,
        Message: "Failed to publish token list.",
        Error: e,
      };
    }
  }

  /**
   * publish ERC20 tokenlist to IPFS
   * @param listname
   * @param chainId
   * @returns
   */
  public async publishGlobalTokenList(
    listname: string,
    chainId: number
  ): Promise<any> {
    try {
      const aquariusUrl = this.config.default.metadataCacheUri;
      let resp = await axios(aquariusUrl + "/api/v1/aquarius/assets/ddo");
      let ddos = resp.data;

      let tokens = await Promise.all(
        ddos
          .filter((ddo) =>
            ddo.isInPurgatory != "true" && ddo.price.pools.length ? true : false
          )
          .map((ddo) => {
            console.log(ddo);
            const { address, name, symbol, decimals } = ddo.dataTokenInfo;
            const pool = ddo.price.pools[0];
            return {
              chainId,
              address,
              name,
              symbol,
              decimals,
              pool,
            };
          })
      );

      //let tokenList: ITList = await this.prepareGlobalTokenList(tokens, chainId);
      let tokenList: ITList = await this.fetchDataTokenList(chainId);

      const pinataResp = await this.pinTokenListToIPFS(listname, tokenList);
      return pinataResp;
    } catch (e) {
      console.error(`ERROR: ${e.message}`);
      throw {
        Code: 2000,
        Message: "Failed to publish token list.",
        Error: e,
      };
    }
  }

  /**
   * prepare global token list (ERC20 + datatokens) to be published
   * @param tokens
   * @returns
   */
  private async prepareGlobalTokenList(
    tokens: any,
    chainId: any
  ): Promise<ITList> {
    try {
      let listTemplate = {
        name: "Datax",
        logoURI:
          "https://gateway.pinata.cloud/ipfs/QmadC9khFWskmycuhrH1H3bzqzhjJbSnxAt1XCbhVMkdiY",
        keywords: ["datatokens", "erc20", "oceanprotocol", "datax", "1inch"],
        tags: {
          datatokens: {
            name: "Datatokens",
            description:
              "Ocean Protocol's Datatokens that represent access rights to underlying data and AI services",
          },
          "1inch": {
            name: "1inch Finance",
            description: "Tokens listed on 1inch.finance",
          },
        },
        timestamp: "",
        tokens: [],
        version: {
          major: 1,
          minor: 0,
          patch: 0,
        },
      };

      const tokensData: ITokenInfo[] = await Promise.all(
        tokens.map((token) => {
          const { chainId, address, symbol, name, pool } = token;
          return {
            chainId,
            address,
            symbol,
            name,
            pool,
            decimals: 18,
            logoURI:
              "https://gateway.pinata.cloud/ipfs/QmPQ13zfryc9ERuJVj7pvjCfnqJ45Km4LE5oPcFvS1SMDg/datatoken.png",
            tags: ["datatoken"],
          };
        })
      );

      //if ethereum mainnet
      if (chainId == 1) {
        // fetch 1inch list
        let resp = await axios("https://tokens.1inch.eth.link/");

        const oneInchTokens = resp.data["tokens"].slice();
        listTemplate.tokens = [...oneInchTokens, ...tokensData];
      } else {
        listTemplate.tokens = [...tokensData];
      }

      listTemplate.timestamp = new Date()
        .toISOString()
        .replace(/.\d+[A-Z]$/, "+00:00");
      console.log(listTemplate.timestamp);

      return listTemplate;
    } catch (e) {
      throw {
        Code: 2000,
        Message: "Failed to prepare token list.",
        Error: e,
      };
    }
  }

  /**
   * prepare datatokens list (OCEAN + datatokens) to be published
   * @param tokens
   * @returns
   */
  private async prepareDataTokenList(
    tokens: any,
    chainId: any
  ): Promise<ITList> {
    try {
      let listTemplate = {
        name: "Datax",
        logoURI:
          "https://gateway.pinata.cloud/ipfs/QmadC9khFWskmycuhrH1H3bzqzhjJbSnxAt1XCbhVMkdiY",
        keywords: ["datatokens", "oceanprotocol", "datax"],
        tags: {
          datatokens: {
            name: "Datatokens",
            description:
              "Ocean Protocol's Datatokens that represent access rights to underlying data and AI services",
          },
        },
        timestamp: "",
        tokens: [],
        version: {
          major: 1,
          minor: 0,
          patch: 0,
        },
      };

      const tokensData = await Promise.all(
        tokens.map((token) => {
          const { chainId, address, symbol, name, pool } = token;
          return {
            chainId,
            address,
            symbol,
            pool,
            name,
            decimals: 18,
            logoURI:
              "https://gateway.pinata.cloud/ipfs/QmPQ13zfryc9ERuJVj7pvjCfnqJ45Km4LE5oPcFvS1SMDg/datatoken.png",
            tags: ["datatoken"],
          };
        })
      );

      // fetch 1inch list
      let oceantoken = [
        {
          chainId,
          address: this.config.default.oceanTokenAddress,
          symbol: "OCEAN",
          name: "Ocean Token",
          decimals: 18,
          logoURI:
            "https://gateway.pinata.cloud/ipfs/QmY22NH4w9ErikFyhMXj9uBHn2EnuKtDptTnb7wV6pDsaY",
          tags: ["oceantoken"],
        },
      ];

      listTemplate.tokens = [...tokensData, ...oceantoken];

      listTemplate.timestamp = new Date()
        .toISOString()
        .replace(/.\d+[A-Z]$/, "+00:00");

      return listTemplate;
    } catch (e) {
      throw { Code: 2000, Message: "Failed to prepare token list.", Error: e };
    }
  }
  /**
   * Fetch a prepared datatoken list from google drive
   *  This function will be used instead of prepareDateTokenList, the schema is the same for each of their responses.
   *  This funciton uses axios which means it will function in dataxjs via the dapp without dep issues
   *
   * @returns
   * Datatoken list to be published
   * (OCEAN + datatokens)
   *
   *
   */

  public async fetchPreparedTokenList(chainId: number): Promise<ITList> {
    try {
      const file = await axios.get(
        `https://raw.githubusercontent.com/dataxfi/scripts/master/TokenListsV4/chain${chainId}.json`
      );

      return file.data;
    } catch (e) {
      throw { Code: 2000, Message: "Failed to fetch token list.", Error: e };
    }
  }

  /**
   * pin token list to IPFS
   * @param listname
   * @param list
   * @returns
   */
  private async pinTokenListToIPFS(
    listname: string,
    list: ITList
  ): Promise<string> {
    try {
      let pinata: object = {};
      pinata["pinataMetadata"] = {
        name: listname,
      };
      pinata["pinataContent"] = list;

      const url = `${this.config.extra.pinataAPIBaseUrl}/pinning/pinJSONToIPFS`;
      let resp = await axios.post(url, pinata, {
        headers: {
          pinata_api_key: this.pinataApiKey,
          pinata_secret_api_key: this.pinataSecretKey,
        },
      });

      const hash = resp.data;
      console.log(hash);
      return hash;
    } catch (e) {
      throw { Code: 2000, Message: "Failed to post token list.", Error: e };
    }
  }
}
