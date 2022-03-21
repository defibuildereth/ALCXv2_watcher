import dotenv from 'dotenv';
import axios from 'axios';
import Bottleneck from "bottleneck";
import fetch from 'node-fetch';
import { Response } from 'node-fetch';

dotenv.config()

const blockNumber = 14427977

let webhook = process.env.WEBHOOK
let etherscanAPI = process.env.ETHERSCAN

const limiter = new Bottleneck({
    maxConcurrent: 1,
    minTime: 500
});

const pollApi = async function (blockNumber) {

    console.log(blockNumber)
    let apiQueries = []
    apiQueries.push(fetch(`https://api.etherscan.io/api?module=account&action=txlist&address=0x5C6374a2ac4EBC38DeA0Fc1F8716e5Ea1AdD94dd&startblock=${blockNumber}&endblock=99999999&page=1&offset=200&sort=desc&apikey=${etherscanAPI}`))
    apiQueries.push(fetch(`https://api.etherscan.io/api?module=account&action=txlist&address=0x062Bf725dC4cDF947aa79Ca2aaCCD4F385b13b5c&startblock=${blockNumber}&endblock=99999999&page=1&offset=200&sort=desc&apikey=${etherscanAPI}`))

    await Promise.all(apiQueries)
        .then(res => {
            processResponse(res, blockNumber)
        })
}

const processResponse = async function (something, blockNumber) {
    let resArray = []
    let blockNumbers = []
    for (let i = 0; i < something.length; i++) {
        await something[i].json()
            .then(r => {
                // console.log(r.result.length);
                resArray.push(r.result)
                // console.log(r.result);
                // for (let i = 0; i < r.result; i++) {
                //     console.log(r.result[i])
                // }
            })
    }
    for (let i = 0; i < resArray.length; i++) {
        // console.log('res:',resArray[i])

        let thisArray = resArray[i]
        for (let i = 0; i < thisArray.length; i++) {
            limiter.schedule(() => {
                pingWebhook(thisArray[i])
            })
            blockNumbers.push(Number(thisArray[i].blockNumber))
        }
    }
    // console.log('BlockNumbers: ', blockNumbers)

    if (!blockNumbers.length) {
        // console.log('calling with blockNumber: ', blockNumber)
        setTimeout(function () {
            pollApi(blockNumber);
        }, 6000);
    } else {
        blockNumber = Math.max(...blockNumbers)
        // console.log('calling with blockNumber: ', blockNumber)
        setTimeout(function () {
            pollApi(blockNumber+1);
        }, 6000);
    }


}

const pingWebhook = async function (tx) {

    let contract;
    let type;

    let input = tx.input.slice(0, 10)
    // console.log(`https://etherscan.io/tx/${tx.hash}`)

    if (input == "0xbdfa9bae") {
        type = "deposit";
    } else if (input == "0x94bf804d") {
        type = "mint"
    } else if (input == "0x0710285c") {
        type = "self-liquidation"
    }

    if (tx.to.slice(-4,) == "3b5c") {
        contract = "alETH"
    } else if (tx.to.slice(-4,) == "94dd") {
        contract = "alUSD"
    }

    let payload = {
        "username": "Alchemix v2 Watcher",
        "content": "",
        "embeds": [
            {
                "author": {
                    "name": "Alchemix Discord Bot",
                    "url": "https://alchemix.fi/"
                },
                "title": `New ${type} from ${tx.from}`,
                "url": `https://etherscan.io/address/${tx.from}`,

                "color": 65310,
                "fields": [
                    {
                        "name": `Contract`,
                        "value": `${contract}`,
                        "inline": true
                    },
                    {
                        "name": "Transaction",
                        "value": `https://etherscan.io/tx/${tx.hash}`,
                        "inline": true
                    },
                    {
                        "name": "Block",
                        "value": `${tx.blockNumber}`,
                        "inline": true

                    }

                ],
                "footer": {
                    "text": "Made by @DefiBuilderETH, powered by Etherscan",
                    "icon_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Twitter-logo.svg/1200px-Twitter-logo.svg.png"
                }
            }
        ]
    }

    axios
        .post(webhook, payload)
        .then(res => {
            console.log(`statusCode: ${res.status}`)
        })
        .catch(error => {
            console.error(error.response)
        })
}




setTimeout(function () {
    pollApi(blockNumber);
}, 1000);