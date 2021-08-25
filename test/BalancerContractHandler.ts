import Web3 from 'web3'
import { AbiItem } from 'web3-utils/types'
import { Contract } from 'web3-eth-contract'

export class BalancerContractHandler {
  public factory: Contract
  public pool1: Contract
  public pool2: Contract
  public accounts: string[]
  public poolBytecode: string
  public factoryBytecode: string
  public factoryAddress: string
  public pool1Address: string
  public pool2Address: string
  public proxy: Contract
  public proxyBytecode: string
  public proxyAddress: string
  public web3: Web3

  constructor(
    factoryABI: AbiItem | AbiItem[],
    factoryBytecode: string,
    poolABI: AbiItem | AbiItem[],
    poolBytecode: string,
    proxyABI: AbiItem | AbiItem[],
    proxyBytecode: string,
    web3: Web3
  ) {
    this.web3 = web3
    this.factory = new this.web3.eth.Contract(factoryABI)
    this.factoryBytecode = factoryBytecode
    this.pool1 = new this.web3.eth.Contract(poolABI)
    this.pool2 = new this.web3.eth.Contract(poolABI)
    this.poolBytecode = poolBytecode
    this.proxy = new this.web3.eth.Contract(proxyABI)
    this.proxyBytecode = proxyBytecode
  }

  public async getAccounts(): Promise<string[]> {
    this.accounts = await this.web3.eth.getAccounts()
    return this.accounts
  }

  public async deployContracts(minter: string) {
    const estGas = await this.factory
      .deploy({
        data: this.factoryBytecode,
        arguments: []
      })
      .estimateGas(function (err, estGas) {
        if (err) console.log('DeployContracts: ' + err)
        return estGas
      })

    // deploy the contract and get it's address
    this.factoryAddress = await this.factory
      .deploy({
        data: this.factoryBytecode,
        arguments: []
      })
      .send({
        from: minter,
        gas: estGas + 1,
        gasPrice: '3000000000'
      })
      .then(function (contract) {
        return contract.options.address
      })
  }

  public async SdeployContracts(minter: string) {
    let estGas
    estGas = await this.pool1
      .deploy({
        data: this.poolBytecode,
        arguments: []
      })
      .estimateGas(function (err, estGas) {
        if (err) console.log('Pool deploy estimate gas: ' + err)
        return estGas
      })
    // deploy the pool1 contract and get it's address
    this.pool1Address = await this.pool1
      .deploy({
        data: this.poolBytecode,
        arguments: []
      })
      .send({
        from: minter,
        gas: estGas + 1,
        gasPrice: '3000000000'
      })
      .then(function (contract) {
        return contract.options.address
      })

      // deploy the pool2 contract and get it's address
    this.pool2Address = await this.pool2
    .deploy({
      data: this.poolBytecode,
      arguments: []
    })
    .send({
      from: minter,
      gas: estGas + 1,
      gasPrice: '3000000000'
    })
    .then(function (contract) {
      return contract.options.address
    })
    
    //deploy proxy contract
    estGas = await this.proxy
      .deploy({
        data: this.proxyBytecode,
        arguments: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2']
      })
      .estimateGas(function (err, estGas) {
        if (err) console.log('Proxy deploy estimate gas: ' + err)
        return estGas
      })
    // deploy the proxy contract and get it's address
    this.proxyAddress = await this.proxy
      .deploy({
        data: this.proxyBytecode,
        arguments: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2']
      })
      .send({
        from: minter,
        gas: estGas + 1,
        gasPrice: '3000000000'
      })
      .then(function (contract) {
        return contract.options.address
      })


    // deploy the factory contract 
    estGas = await this.factory
      .deploy({
        data: this.factoryBytecode,
        arguments: [this.pool1Address]
      })
      .estimateGas(function (err, estGas) {
        if (err) console.log('DeployContracts: ' + err)
        return estGas
      })
    // and get it's address
    this.factoryAddress = await this.factory
      .deploy({
        data: this.factoryBytecode,
        arguments: [this.pool1Address]
      })
      .send({
        from: minter,
        gas: estGas + 1,
        gasPrice: '3000000000'
      })
      .then(function (contract) {
        return contract.options.address
      })
  }
}
