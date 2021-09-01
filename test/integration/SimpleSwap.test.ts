
require('source-map-support').install()
import {assert} from 'chai'
import { TestContractHandler } from '../TestContractHandler'
import {BalancerContractHandler} from '../BalancerContractHandler'
import { DataTokens, Logger as LoggerInstance, OceanPool } from '@dataxfi/ocean.js'
import { AbiItem } from 'web3-utils/types'
import ganache from 'ganache-core'
import Web3 from 'web3'
import factory from '@oceanprotocol/contracts/artifacts/DTFactory.json'
import datatokensTemplate from '@oceanprotocol/contracts/artifacts/DataTokenTemplate.json'
import bFactory from '@oceanprotocol/contracts/artifacts/BFactory.json'
import proxy from '../../src/abi/DataxRouter.json'
import bPool from '@oceanprotocol/contracts/artifacts/BPool.json'
import bToken from '@oceanprotocol/contracts/artifacts/BToken.json'

const web3 = new Web3(ganache.provider() as any)
import Ocean from '../../src/Ocean'
import Config from '../../src/Config'

describe('Simple flow', () => {
  let tom: string
  let bob: string
  let alice: string
  let DTContracts: TestContractHandler
  let BalancerContracts: BalancerContractHandler
  let datatoken: DataTokens
  let dt1Address: string
  let dt2Address: string
  let oceanAddress: string
  let config: Config
  let ocean: Ocean


  const network = '4'
  const tokenAmount = '100000'
  const blob = 'http://localhost:8030/api/v1/services/consume'
  const dtAmount = '3000'
  const dtWeight = '3'
  const oceanAmount =
    (parseFloat(dtAmount) * (10 - parseFloat(dtWeight))) / parseFloat(dtWeight)
  const fee = '0.01'
  const oceanWeight = 10 - parseInt(dtWeight)
  
  before(async () => {

    config = new Config(web3, network)

     DTContracts = new TestContractHandler(
      factory.abi as AbiItem[],
      datatokensTemplate.abi as AbiItem[],
      datatokensTemplate.bytecode,
      factory.bytecode,
      web3
    )
    await DTContracts.getAccounts()
    tom = DTContracts.accounts[0]
    alice = DTContracts.accounts[1]
    bob = DTContracts.accounts[2]
    await DTContracts.deployContracts(tom)

    //deploy balancer contracts
 
    BalancerContracts = new BalancerContractHandler(
      bFactory.abi as AbiItem[],
      bFactory.bytecode,
      bPool.abi as AbiItem[],
      bPool.bytecode,
      proxy.abi as AbiItem[],
      proxy.bytecode,
      web3
    )


    await BalancerContracts.getAccounts()
    console.log('BALANCER PRE-DEPLOYED')
    await BalancerContracts.SdeployContracts(tom)
    console.log('BALANCER DEPLOYED')
    
    //Ocean token is created
    datatoken = new DataTokens(
      DTContracts.factoryAddress,
      factory.abi as AbiItem[],
      datatokensTemplate.abi as AbiItem[],
      web3,
      LoggerInstance
    )

    oceanAddress = await datatoken.create(blob, tom, '1000000000000000', 'Ocean Token', 'OCEAN')
    ocean = new Ocean(web3, network, BalancerContracts.factoryAddress, oceanAddress)
  
  
    await datatoken.mint(oceanAddress, tom, '1000000000000000')
    
    let bal = await ocean.getBalance(oceanAddress, tom)
    console.log("Tom balance - ", bal)
    // transfer some OCEAN to Alice and Bob
    await datatoken.transfer(oceanAddress, alice, '100000000', tom)
    await datatoken.transfer(oceanAddress, bob, '100000000', tom)
  })
 

  it('Alice & Bob creates a datatoken', async () => {
    // Alice creates a Datatoken
    dt1Address = await datatoken.create(blob, alice, '10000000000', 'DataToken1', 'ALICE')
   
    //Bob creates a datatoken
    dt2Address = await datatoken.create(blob, bob, '10000000000', 'DataToken2', 'BOB')
   
  })

  it('Alice & Bob mints data tokens', async () => {
    //mint to Alice
    await datatoken.mint(dt1Address, alice, tokenAmount)
    //mint ALICE to tom
    await datatoken.mint(dt1Address, alice, tokenAmount, tom)
    
    //mint BOB to tom
    await datatoken.mint(dt2Address, bob, tokenAmount)
    await datatoken.mint(dt2Address, bob, tokenAmount, tom)

    let balance1 = await ocean.getBalance(dt1Address, tom)
    let balance2 = await ocean.getBalance(dt2Address, tom)

    assert(balance1 == tokenAmount, `ERROR, Expected ALICE balance of Tom is ${tokenAmount} & actual balance is ${balance1} `)
    assert(balance2 == tokenAmount, `ERROR, Expected BOB balance of Tom is ${tokenAmount} & actual balance is ${balance2} `)
    
  })


  it('Tom creates a datapool 1 & datapool2', async () => {

    await ocean.approve(dt1Address, BalancerContracts.pool1Address, dtAmount, tom)
    await ocean.approve(oceanAddress, BalancerContracts.pool1Address, String(oceanAmount), tom)

    BalancerContracts.pool1.options.address = BalancerContracts.pool1Address
    
    //setup pool
    const estGas = await BalancerContracts.pool1.methods.setup(
      dt1Address,
      web3.utils.toWei(String(dtAmount)),
      web3.utils.toWei(String(dtWeight)),
      oceanAddress,
      web3.utils.toWei(String(oceanAmount)),
      web3.utils.toWei(String(oceanWeight)),
      web3.utils.toWei(fee)
      ).estimateGas({ from: tom }, (err, estGas) => (err ? 1000000 : estGas))

      const setupTx = await BalancerContracts.pool1.methods.setup(
        dt1Address,
        web3.utils.toWei(String(dtAmount)),
        web3.utils.toWei(String(dtWeight)),
        oceanAddress,
        web3.utils.toWei(String(oceanAmount)),
        web3.utils.toWei(String(oceanWeight)),
        web3.utils.toWei(fee)
        ).send ({
          from: tom,
          gas: estGas + 1
        })

    assert(setupTx.status,  'ERROR: Cannot setup Pool1')


    const isFinalized = await BalancerContracts.pool1.methods.isFinalized().call()
    assert(isFinalized,  'ERROR: Cannot finalise Pool1')

    // Datapool 2
    await ocean.approve(dt2Address, BalancerContracts.pool2Address, dtAmount, tom)
    await ocean.approve(oceanAddress, BalancerContracts.pool2Address, String(oceanAmount), tom)

    BalancerContracts.pool2.options.address = BalancerContracts.pool2Address
    
    //setup pool
    
      const setupPool2Tx = await BalancerContracts.pool2.methods.setup(
        dt2Address,
        web3.utils.toWei(String(dtAmount)),
        web3.utils.toWei(String(dtWeight)),
        oceanAddress,
        web3.utils.toWei(String(oceanAmount)),
        web3.utils.toWei(String(oceanWeight)),
        web3.utils.toWei(fee)
        ).send ({
          from: tom,
          gas: estGas + 1
        })

    assert(setupPool2Tx.status,  'ERROR: Cannot setup Pool2')


    const isPool2Finalized = await BalancerContracts.pool2.methods.isFinalized().call()
    assert(isPool2Finalized,  'ERROR: Cannot finalise Pool2')

 

  })

  it('Bob swaps Ocean for ALICE Dt from Pool1', async () => {
    
    const oceanSpent = '30'
    const dtReceived = await ocean.getDtReceived(BalancerContracts.pool1Address, oceanSpent)
    console.log("DT Received - ", dtReceived)

    let dtBalanceBeforeSwap = await ocean.getBalance(dt1Address, bob)
    console.log('DT BALANCE BEFORE SWAP -' , dtBalanceBeforeSwap)
    let oceanBalanceBeforeSwap = await ocean.getBalance(oceanAddress, bob)
    console.log('OCEAN BALANCE BEFORE SWAP -' , oceanBalanceBeforeSwap)

    let approveTx = await ocean.approve(oceanAddress, BalancerContracts.pool1Address, oceanSpent, bob)
    assert(approveTx.status, "ERROR : Approve tx failed")

    let swapTx = await ocean.swapExactOceanToDt(bob, BalancerContracts.pool1Address, '1', oceanSpent)
    assert(swapTx.status, "ERROR : Swap tx failed")

    let actualReceivedDtBalance = await ocean.getBalance(dt1Address, bob)
    console.log('DT BALANCE AFTER SWAP -' , actualReceivedDtBalance)
    let oceanBalanceAfterSwap = await ocean.getBalance(oceanAddress, bob)
    console.log('OCEAN BALANCE AFTER SWAP -' , oceanBalanceAfterSwap)

    assert(actualReceivedDtBalance >= dtReceived, `ERROR : Received ${actualReceivedDtBalance} dt in swap but expected minimum ${dtReceived}`)
  })

  it('Alice swaps ALICE dt for Ocean from Pool1', async () => {

    const dtSpent = '10'
    const oceanReceived = await ocean.getOceanReceived(BalancerContracts.pool1Address, dtSpent)
    console.log("Ocean Received - ", oceanReceived)

    let dtBalanceBeforeSwap = await ocean.getBalance(dt1Address, alice)
    console.log('ALICE DT BALANCE BEFORE SWAP -' , dtBalanceBeforeSwap)
    let oceanBalanceBeforeSwap = await ocean.getBalance(oceanAddress, alice)
    console.log('OCEAN BALANCE BEFORE SWAP -' , oceanBalanceBeforeSwap)

    let approveTx = await ocean.approve(dt1Address, BalancerContracts.pool1Address, dtSpent, alice)
    assert(approveTx.status, "ERROR : Approve tx failed")

    let swapTx = await ocean.swapExactDtToOcean(alice, BalancerContracts.pool1Address, '1', dtSpent)
    assert(swapTx.status, "ERROR : Swap tx failed")

    let dtBalanceAfterSwap = await ocean.getBalance(dt1Address, alice)
    console.log('DT BALANCE AFTER SWAP -' , dtBalanceAfterSwap)
    let oceanBalanceAfterSwap = await ocean.getBalance(oceanAddress, alice)
    console.log('OCEAN BALANCE AFTER SWAP -' , oceanBalanceAfterSwap)

    assert(oceanBalanceAfterSwap >= oceanBalanceBeforeSwap + oceanReceived, `ERROR : Received ${oceanBalanceAfterSwap} dt in swap but expected minimum ${oceanReceived}`)
  })

  it('Bob swaps BOB for exact amount of ALICE', async() => {

    let bobBeforeSwap = await ocean.getBalance(dt2Address, bob)
    console.log('BOB balance of Bob before swap -' , bobBeforeSwap)
    let aliceBeforeSwap = await ocean.getBalance(dt1Address, bob)
    console.log('ALICE balance of Bob before swap -' , aliceBeforeSwap)

    let outputDtNeeded = '5'
    let inputDtNeeded = await ocean.getDtNeededForExactDt(outputDtNeeded, BalancerContracts.pool2Address, BalancerContracts.pool1Address)
    console.log('Max input Dt - ', inputDtNeeded)
    let dt2 = await ocean.swapDtToExactDt(bob, dt2Address, dt1Address, outputDtNeeded, inputDtNeeded, BalancerContracts.pool2Address, BalancerContracts.pool1Address, BalancerContracts.proxyAddress)
    //console.log(dt2)
    let bobAfterSwap = await ocean.getBalance(dt2Address, bob)
    console.log('BOB balance of Bob after swap -' , bobAfterSwap)
    let aliceAfterSwap = await ocean.getBalance(dt1Address, bob)
    console.log('ALICE balance of Bob after swap -' , aliceAfterSwap)
  })

  it('Bob swaps exact ALICE for minimum amount of BOB', async() => {

    let bobBeforeSwap = await ocean.getBalance(dt2Address, bob)
    console.log('BOB balance of Bob before swap -' , bobBeforeSwap)
    let aliceBeforeSwap = await ocean.getBalance(dt1Address, bob)
    console.log('ALICE balance of Bob before swap -' , aliceBeforeSwap)

    let inputDtAmount = '5'
    let minOutputDtReceived = await ocean.getDtReceivedForExactDt(inputDtAmount, BalancerContracts.pool1Address, BalancerContracts.pool2Address)
    console.log('Min BOB received - ', minOutputDtReceived)
    let dt2 = await ocean.swapExactDtToDt(bob, dt1Address, dt2Address, minOutputDtReceived, inputDtAmount, BalancerContracts.pool1Address, BalancerContracts.pool2Address, BalancerContracts.proxyAddress)
    //console.log(dt2)
    let bobAfterSwap = await ocean.getBalance(dt2Address, bob)
    console.log('BOB balance of Bob after swap -' , bobAfterSwap)
    let aliceAfterSwap = await ocean.getBalance(dt1Address, bob)
    console.log('ALICE balance of Bob after swap -' , aliceAfterSwap)

  })

  
})

