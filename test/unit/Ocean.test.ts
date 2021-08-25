import {assert} from 'chai'
import OceanJs from '../../src/Ocean'
import Web3 from 'web3'
import ganache from 'ganache-core'

const web3 = new Web3(ganache.provider() as any)

describe('test ocean pools', () => {
    let oceanInst: any

    before(async() => {
        oceanInst = new OceanJs(web3, 'rinkeby')
    })

    it('testing ', async () => {
            //let tokenList  = await oceanInst.getTokenList('test', 1)
            //console.log(tokenList)
    } )
})