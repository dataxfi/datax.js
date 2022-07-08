import Web3 from "web3"
import stakeRouterABI from "../src/abi/rinkeby/StakeRouter-abi.json"
export default class StakeContractHandler{
    

    private web3: Web3
    public stakeRouterABI: JSON
    public stakeRouterAddress: string

    constructor(web3:Web3){
        this.web3 = web3
        this.stakeRouterABI = JSON
    }

    private async deployStakeRouter(){
        
    }

}