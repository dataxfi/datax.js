require("dotenv").config();
import Base from "./Base";
import { TokenList as TList } from "@uniswap/token-lists";
import axios from "axios";
import nJwt from 'njwt'

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
  public async fetchGlobalTokenList(chainId: number): Promise<TList> {
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
      console.error(`ERROR: ${e.message}`);
      throw Error(`ERROR : ${e.message}`);
    }
  }

  /**
   * fetch list of all Datatokens
   * @returns
   */
  public async fetchDataTokenList(chainId: number): Promise<TList> {
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
      console.error(`ERROR: ${e.message}`);
      throw Error(`ERROR : ${e.message}`);
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
      const aquariusUrl = this.config.defaultConfig.metadataCacheUri;
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
      //let tokenList: TList = await this.prepareDataTokenList(tokens, chainId);

      const pinataResp = await this.pinTokenListToIPFS(listname, tokenList);
      return pinataResp;
    } catch (e) {
      console.error(`ERROR: ${e.message}`);
      throw Error(`ERROR : ${e.message}`);
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
      const aquariusUrl = this.config.defaultConfig.metadataCacheUri;
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

      //let tokenList: TList = await this.prepareGlobalTokenList(tokens, chainId);
      let tokenList: TList = await this.fetchDataTokenList(chainId);

      const pinataResp = await this.pinTokenListToIPFS(listname, tokenList);
      return pinataResp;
    } catch (e) {
      console.error(`ERROR: ${e.message}`);
      throw Error(`ERROR : ${e.message}`);
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
  ): Promise<TList> {
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

      const tokensData = await Promise.all(
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
      console.error(`ERROR: ${e.message}`);
      throw Error(`ERROR : ${e.message}`);
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
  ): Promise<TList> {
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
          address: this.config.defaultConfig.oceanTokenAddress,
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
      console.error(`ERROR: ${e.message}`);
      throw Error(`ERROR : ${e.message}`);
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

  public async fetchPreparedTokenList(
    chainId: number,
    CLIENT_EMAIL : string,
    PRIVATE_KEY: string,
    TOKEN_URI: string,
    SCOPE: string,
    PRIVATE_KEY_ID:string
  ): Promise<TList> {
    try {
     
      const iat = Math.trunc(Date.now() / 1000);
      const exp = Math.trunc(iat + 3600);

      const claims = {
        iss: CLIENT_EMAIL,
        scope: SCOPE,
        aud: TOKEN_URI,
        exp: exp,
        iat: iat,
      };

      const jwt = nJwt.create(claims, PRIVATE_KEY, "RS256");
      jwt.setHeader("kid", PRIVATE_KEY_ID);

      const EnJWT = jwt.compact();

      const {
        data: { access_token },
      } = await axios.post(
        `https://oauth2.googleapis.com/token?grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${EnJWT}`
      );

      const response = await axios.get(
        "https://www.googleapis.com/drive/v3/files?pageSize=10&fields=nextPageToken%2C%20files%28id%2C%20name%29",
        {
          headers: {
            "Accept-Encoding": "gzip",
            "User-Agent": "google-api-nodejs-client/0.7.2 (gzip)",
            Authorization: `Bearer ${access_token}`,
            Accept: "application/json",
          },
        }
      );

      const files = response.data.files;
      const found = files.find((file) => {
        const fileChainId = file.name.replace(/^\D+/g, "");
        return fileChainId == chainId;
      });

      const file = await axios.get(
        `https://www.googleapis.com/drive/v3/files/${found.id}?alt=media`,
        {
          headers: {
            "Accept-Encoding": "gzip",
            "User-Agent": "google-api-nodejs-client/0.7.2 (gzip)",
            Authorization: `Bearer ${access_token}`,
            "x-goog-api-client": "gl-node/16.0.0 auth/7.10.2",
            Accept: "application/json",
          },
        }
      );

      return file.data;
    } catch (e) {
      console.error(e);
      throw Error(`ERROR : ${e.message}`);
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
    list: TList
  ): Promise<string> {
    try {
      let pinata: object = {};
      pinata["pinataMetadata"] = {
        name: listname,
      };
      pinata["pinataContent"] = list;

      const url = `${this.config.default.pinataAPIBaseUrl}/pinning/pinJSONToIPFS`;
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
      console.error(`ERROR: ${e.message}`);
      throw Error(`ERROR : ${e.message}`);
    }
  }
}
