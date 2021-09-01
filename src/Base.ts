import Config from './Config'

export default class Base {

  public config: any = null
  public web3: any = null
  public networkId: any = null

  constructor(web3: any, networkId: any){
    this.web3 = web3
    this.config = new Config(web3, networkId)
    this.networkId = networkId
  }

}