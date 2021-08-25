import { ConfigHelper } from '@dataxfi/ocean.js'


export default class Config {

  private web3: any = null
  private network: any = null
  public defaultConfig: any = null


  constructor(web3: any, network: string) {
    this.web3 = web3
    this.network = network
    this.defaultConfig = new ConfigHelper().getConfig(this.network)
  }


  public config = {
    ...this.defaultConfig,
    exchangeRouter: {
      'kovan': '',
      'rinkeby' : '',
      'mainnet' : '',
      'polygon' : ''
    },
    datatokenList : {
      'mainnet' : 'Qmc8Dp1U2kW6FJbpUYGr5W6sVyJsQeQzVundT9vooCH6aX',
      'rinkeby' : 'datatokenlist-rinkeby',
      'polygon' : 'datatokenlist-polygon',
    },
    tokenList : {
      'rinkeby' : 'tokenlist-rinkeby',
      'mainnet' : 'QmQi1sNZVP52urWq4TzLWx9dPRWNrvR4CUFgCEsocGkj5X',
      'polygon': 'tokenlist-polygon'
    },
    pinataAPIBaseUrl : 'https://api.pinata.cloud',
    pinataRestUrl: 'https://gateway.pinata.cloud/ipfs',
    maxUint256 :
  '115792089237316195423570985008687907853269984665640564039457584007913129639934'
  }
  
  
}

