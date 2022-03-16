import dotenv from 'dotenv';
import axios from 'axios';
import Bottleneck from "bottleneck";

dotenv.config()

const blockNumber = 1

let webhook = process.env.WEBHOOK

const pollApi = async function (blockNumber) {
    console.log(blockNumber)

    setTimeout(function () {
        pollApi(blockNumber+1);
    }, 500);
}

setTimeout(function () {
    pollApi(1);
}, 500);