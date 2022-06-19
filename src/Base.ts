import Web3 from 'web3'
import { supportedNetworks } from './@types'
import Config from './Config'

export default class Base {

  public config: Config = null
  public web3: Web3 = null
  public networkId: supportedNetworks = null

  constructor(web3: any, networkId: supportedNetworks){
    this.web3 = web3
    this.config = new Config(web3, networkId)
    this.networkId = networkId
  }

}