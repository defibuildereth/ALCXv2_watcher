import dotenv from 'dotenv';
import axios from 'axios';
import Bottleneck from "bottleneck";
import fetch from 'node-fetch';

dotenv.config()

let intervalSecs = 120



// let relevantBlocks = [14426565, 14422663, 14417872, 14430077, 14419078, 14429587, 14429644, 14429614, 14420816, 14387583, 14411231, 14425617, 14429594, 14376257]
let validTokens = [{ address: "0x7da96a3891add058ada2e826306d812c638d87a7", token: "USDT", decimals: 6 }, { address: "0xda816459f1ab5631232fe5e97a05bbbb94970c95", token: "DAI", decimals: 18 }, { address: "0xa354f35829ae975e850e23e9615b11da1b3dc4de", token: 'USDC', decimals: 6 }, { address: "0xa258c4606ca8206d8aa700ce2143d7db854d168c", token: "WETH", decimals: 18 }]

let webhook = process.env.WEBHOOK
let etherscanAPI = process.env.ETHERSCAN

const discord_webhook = new Bottleneck({
    maxConcurrent: 1,
    minTime: 2000
});

let timestamp = Math.round((Date.now()/1000)-(1*86400))
let getCurrentBlock = async function (timestamp) {
    // console.log(timestamp)
    await fetch(`https://api.etherscan.io/api?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before&apikey=${etherscanAPI}`)
    .then(r => r.json())
    .then(res => {
        pollApi(res.result)
    })
}
// let blockNumber = 14436205 

const pollApi = async function (blockNumber) {

    console.log(blockNumber)
    let apiQueries = []
    apiQueries.push(fetch(`https://api.etherscan.io/api?module=account&action=txlist&address=0x5C6374a2ac4EBC38DeA0Fc1F8716e5Ea1AdD94dd&startblock=${blockNumber}&endblock=9999999999&page=1&offset=200&sort=desc&apikey=${etherscanAPI}`))
    apiQueries.push(fetch(`https://api.etherscan.io/api?module=account&action=txlist&address=0x062Bf725dC4cDF947aa79Ca2aaCCD4F385b13b5c&startblock=${blockNumber}&endblock=9999999999&page=1&offset=200&sort=desc&apikey=${etherscanAPI}`))

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
                resArray.push(r.result)
            })
    }
    for (let i = 0; i < resArray.length; i++) {

        let thisArray = resArray[i]
        for (let i = 0; i < thisArray.length; i++) {
            discord_webhook.schedule(() => {
                pingWebhook(thisArray[i])
            })
            blockNumbers.push(Number(thisArray[i].blockNumber))
        }
    }

    if (!blockNumbers.length) {
        setTimeout(function () {
            pollApi(blockNumber);
        }, intervalSecs * 1000);
    } else {
        blockNumber = Math.max(...blockNumbers)
        setTimeout(function () {
            pollApi(blockNumber + 1);
        }, intervalSecs * 1000);
    }
}

const pingWebhook = async function (tx) {

    // console.log(tx)

    let payload;

    let type;
    let tokenAddress;
    let token;
    let amount;
    let decimals;

    let input = tx.input.slice(0, 10)

    if (input == "0xbdfa9bae" || input == "0xf45346dc") {

        type = "deposit";
        tokenAddress = '0x' + tx.input.slice(34, 74)
        for (let i = 0; i < validTokens.length; i++) {
            if (validTokens[i].address == tokenAddress) {
                token = validTokens[i].token
                decimals = validTokens[i].decimals
            }
        }
        amount = parseInt(tx.input.slice(112, 138), 16) * 10 ** -decimals

    } else if (input == "0x94bf804d") {
        type = "mint"
        amount = parseInt(tx.input.slice(40, 74), 16) * 10 ** -18
        if (tx.to == '0x062bf725dc4cdf947aa79ca2aaccd4f385b13b5c') {
            token = 'alETH'
        } else if (tx.to == '0x5c6374a2ac4ebc38dea0fc1f8716e5ea1add94dd') {
            token = 'alUSD'
        } else {
            console.log('no match')
        }

    } else if (input == "0x0710285c") {
        type = "self-liquidation"
        tokenAddress = '0x' + tx.input.slice(34, 74)
        for (let i = 0; i < validTokens.length; i++) {
            if (validTokens[i].address == tokenAddress) {
                token = validTokens[i].token
                decimals = validTokens[i].decimals
            }
        }
        amount = parseInt(tx.input.slice(110, 138), 16) * 10 ** -decimals

    } else if (input == "0xa6459a32") {
        type = "withdrawal"
        tokenAddress = '0x' + tx.input.slice(34, 74)
        for (let i = 0; i < validTokens.length; i++) {
            if (validTokens[i].address == tokenAddress) {
                token = validTokens[i].token
                decimals = validTokens[i].decimals
            }
        }
        amount = parseInt(tx.input.slice(-23,), 16) * 10 ** -decimals

    } else if (input == "0x69328dec") {
        type = 'withdrawal'
        tokenAddress = '0x' + tx.input.slice(34, 74)
        for (let i = 0; i < validTokens.length; i++) {
            if (validTokens[i].address == tokenAddress) {
                token = validTokens[i].token
                decimals = validTokens[i].decimals
            }
        }
        amount = parseInt(tx.input.slice(110, 138), 16) * 10 ** -decimals
        // console.log(amount)

    } else {
        console.log(tx)
        return
    }

    payload = {
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
                        "name": `Token`,
                        "value": `${token}`,
                        "inline": true
                    },
                    {
                        "name": "Amount",
                        "value": `${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
                        "inline": true
                    },
                    {
                        "name": "Transaction",
                        "value": `https://etherscan.io/tx/${tx.hash}`,
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

// for (let i = 0; i < relevantBlocks.length; i++) {
//     pollApi(relevantBlocks[i])
//     await sleep(5000);
// }

// function sleep(ms) {
//     return new Promise((resolve) => {
//         setTimeout(resolve, ms);
//     });
// }

// setTimeout(function () {
//     pollApi(blockNumber);
// }, 1000);

getCurrentBlock(timestamp)