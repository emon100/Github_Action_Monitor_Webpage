'use strict';
//
//通用化爬虫
//
//
//原理：
//流水线 workflow：得到内容 -> 与之前内容对比 -> 有变化发请求
const cheerio = require('cheerio');
const core = require('@actions/core');
const fs = require('fs');
const send = require('./send');
const querystring = require('querystring');
const config = require('./config/config');

const headers = config.headers;

const jsonFile = './prevContent/try.json';

const SCKEYS = [process.env.SCKEY];
console.log(SCKEYS);



//读文件工具
function readFile(src) {
    return new Promise((resolve, reject) => {
        fs.readFile(src, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}

//写文件工具
function writeFile(src, string) {
    return new Promise((resolve, reject) => {
        fs.writeFile(src, string, (err, data) => {
            if (err) {
                reject('File read error');
            }
            resolve(data);
        });
    });
}

//得到网站设置
function getSitesConfig() {
    return config.config;
}

function putNewsIntoContentObj(obj, part, news) {
    if (!obj[part]) {
        obj[part] = {};
    }
    obj[part]['latestNews'] = news;
}

//抓取单个站点
async function scrapSite(siteName, siteConfig) {

    console.log('Now processing ' + siteName);
    if (siteConfig == null) {
        throw siteName + " config not exist";
    }

    //获得网站
    let response = await send.Get(siteConfig['siteUrl'], siteConfig['path'], headers, siteConfig['type']);//await readFile('aaoneu.html');

    //解析html
    let $ = cheerio.load(response);

    let result = {};
    let thisSiteContent = result[siteName] = {};

    for (const part of Object.keys(siteConfig['parts'])) {
        //遍历每个设置，得到各部分最新信息
        console.log(part);
        let selector = siteConfig['parts'][part]['selector'];
        let processor = siteConfig['parts'][part]['processor'];
        if (selector != null) {
            let latestNews = $(...selector).text();
            console.log("消息: " + latestNews);//得到了！
            putNewsIntoContentObj(thisSiteContent, part, latestNews);
        } else if (processor != null) {
            let latestNews = processor($);
            console.log(latestNews);
            putNewsIntoContentObj(thisSiteContent, part, latestNews);
        }
    }

    return result;
}

//批量抓取站点
async function getNewContent(sitesConfig) {
    let newContent = {};
    const result = Object.keys(sitesConfig).map(siteName => {
        return scrapSite(siteName, sitesConfig[siteName]);
    });

    for (const scrapPromise of result) {
        try {
            let siteResponse = await scrapPromise;
            if (siteResponse != null) {
                Object.assign(newContent, siteResponse);
            }
        } catch (e) {
            console.log(e);
        }
    }
    return newContent;
}


function diffContent(newObj, oldObj) {
    let result = {hasDiff: false, content: {}};
    let diff = result.content;
    if (oldObj == null) {
        Object.assign(diff, newObj);
        result.hasDiff = true;
        return result;
    }
    for (const site of Object.keys(newObj)) {
        if (oldObj[site] == null) {
            diff[site] = newObj[site];
            result.hasDiff = true;
            continue;
        }
        let parts = newObj[site];
        for (const part of Object.keys(parts)) {
            if (oldObj[site][part] == null || oldObj[site][part]['latestNews'] !== parts[part]['latestNews']) {
                if (diff[site] == null) {
                    diff[site] = {};
                }
                diff[site][part] = parts[part];
                result.hasDiff = true;
            }
        }
    }
    return result;
}

//用server酱推送到wechat
function pushToWeChat(message,SCKEY){

    let postData = querystring.stringify({
        text: message.text,
        desp: message.desp
    });

    const opt = {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
        },
        host: 'sc.ftqq.com',
        method: 'POST',
        path: `/${SCKEY}.send`,
        timeout: 30000
    };
    return send.Post(opt, 'https', postData);
}

function createWeChatMessage(diff) {
    const diffSites = Object.keys(diff);

    let text = `${diffSites[0]} ${diffSites.length > 1 ? '等' : ''} 有变化了`;
    let desp = '### 改变如下: \n';
    for (const site of diffSites) {
        desp += `#### ${site}:\n`;
        for (const part of Object.keys(diff[site])) {
            desp += `##### ${part}:\n\t${diff[site][part]['latestNews']}\n`;
        }
    }
    return {text:text,desp:desp};
}


//对diff进行推送
function pushDiff(diff) {

    let result = [];
    if(SCKEYS.length>0){
        let message = createWeChatMessage(diff);
        console.log(message.text);
        console.log(message.desp);
        for (const SCKEY of SCKEYS){
            result.push(pushToWeChat(message,SCKEY))
        }
    }
    return result;
}


//流水线：得到内容 -> 与之前内容对比 -> 写入文件 -> 有变化发请求

async function workFlow() {
    let fileReader = readFile(jsonFile);

    //得到配置信息
    const sitesConfig = getSitesConfig();
    console.log('Get Sites Config');
    //得到每个网站的内容
    let newContent = await getNewContent(sitesConfig);
    console.log('Get content of each site, put into new Content');
    console.log(JSON.stringify(newContent));


    //异步读取json文件
    let oldContent = null;
    console.log('try reading oldContent');
    try {
        let fileResult = await fileReader;
        oldContent = await JSON.parse(fileResult.toString());
    } catch (e) {
        console.log(e);
    }


    //对比，获得diff对象
    let diff = diffContent(newContent, oldContent);
    console.log('diff: '+JSON.stringify(diff));


    //如果有区别，通知外界，让外界写入
    console.log(`hasDiff: ${diff.hasDiff}`);
    if (diff.hasDiff) {

        let result = oldContent == null ? newContent : Object.assign(oldContent,newContent);
        result.lastUpdated = Date();

        //let write = writeFile(jsonFile, JSON.stringify(result));

        /*
        let pushResults = await Promise.allSettled(pushDiff(diff.content));
        let atLeastPushedOne=false;
        for(const pushResult of pushResults){
            if(pushResult.status==="fulfilled"){
                atLeastPushedOne=true;
                break;
            }
            else {
                console.log(pushResults.reason);
            }
        }
        if(atLeastPushedOne){
            console.log('至少推送成功一个');
            try{
                await write;
                console.log('写入成功');
            }catch (e) {
                console.log('写入新内容失败');
            }
        }
        */

    }
    return "Yes";
}


workFlow().then(r => console.log("Everything is done :"+r));



