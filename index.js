import dotenv from 'dotenv';
import axios from 'axios';
import Bottleneck from "bottleneck";
import fetch from 'node-fetch';

dotenv.config()

const blockNumber = 14405659

let webhook = process.env.WEBHOOK

const pollApi = async function (blockNumber) {

    console.log(blockNumber)

    await fetch(`https://api.etherscan.io/api?module=account&action=txlist&address=0x5C6374a2ac4EBC38DeA0Fc1F8716e5Ea1AdD94dd&startblock=${blockNumber}&endblock=99999999&page=1&offset=200&sort=desc&apikey=YourApiKeyToken`)
        .then(r => r.json())
        .then(res => {
            if (res.status == 0) {
                console.log(res.message)
                setTimeout(function () {
                    pollApi(blockNumber);
                }, 600000);
            }
            else if (res.status) {
                blockNumber = Number(res.result[0].blockNumber) + 1
                for (let i = 0; i < res.result.length; i++) {
                    console.log('new tx: ', res.result[i].hash)
                    parseTx(res.result[i])
                    
                }
                setTimeout(function () {
                    pollApi(blockNumber);
                }, 60000);
            }
        })
    // console.log(blockNumber)
}

const parseTx = async function (tx) {

    let type = tx.input.slice(0, 10)
    console.log(type)
    
    // console.log(tx)
    if (type == "0xbdfa9bae") {
        console.log("DEPOSIT")
        console.log(`https://etherscan.io/tx/${tx.hash}`)
        pingWebhook(tx)
    } else if (type == "0x94bf804d") {
        console.log("MINT")
        console.log(`https://etherscan.io/tx/${tx.hash}`)
        pingWebhook(tx)
    }
}

const pingWebhook = async function (tx) {

    let payload = {
        "username": "ZZ Whale Watcher",
        "content": "",
        "embeds": [
            {
                "author": {
                    "name": "ZigZag Exchange",
                    "url": "https://trade.zigzag.exchange/"
                },
                "title": `ALCX Thing Happened`,
                "url": `https://etherscan.io/tx/${tx.hash}`,

                "color": 65310,
                "fields": [
                    {
                        "name": `test`,
                        "value": `stuff`,
                        "inline": true
                    }
                    
                ],
                "footer": {
                    "text": "Made by @DefiBuilderETH, powered by ZigZag",
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