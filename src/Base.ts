import Config from './config'

export default class Base {

  public config: any = null
  public web3: any = null
  public network: any = null

  constructor(web3: any, network: any){
    this.web3 = web3
    this.config = new Config(web3, network)
    this.network = network
  }

}