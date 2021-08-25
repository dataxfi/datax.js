[![banner](https://pbs.twimg.com/profile_banners/1408084525813481476/1624962873/1500x500)](https://datax.fi)

<h1 align="center">datax.js</h1>

> JavaScript library to swap datasets using any ERC20 token.


## 🏗 Installation

```bash
npm install @dataxfi/datax
```

## 🏄 Quickstart

```ts
import Web3 from 'web3'
import { Ocean, TokenList, Config } from '@dataxfi/datax'

const network = 'mainnet' //["mainnet", "polygon", "rinkeby", "development"]
const web3 = new Web3('your-web3-provider')

const ocean = new Ocean(web3, network)

//now you can use functions in Ocean.ts file

```


## 🏛 License

```
Copyright ((C)) 2021 Ocean Protocol Foundation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```
