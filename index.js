'use strict';
//
//通用化爬虫
//
//
//原理：
//流水线 workflow：得到内容 -> 与之前内容对比 -> 有变化发请求

const arrDiff = require('arr-diff');
const util = require('util');
const core = require('@actions/core');
const fs = require('fs');
const request = require('superagent');
const config = require(core.getInput('configPath'));
const headers = config.headers;
const {JSDOM} = require('jsdom');

const timeoutTimems = 15000;//Deadline for each query

//const jsonFile = './prevContent/try.json';

//const SCKEYS = [process.env.SCKEY];
//console.log(SCKEYS);


//读文件工具
let readFile = util.promisify(fs.readFile);

//写文件工具
let writeFile = util.promisify(fs.writeFile);


//得到网站设置
function getSitesConfig() {
    return config.config;
}

//制作新内容对象
function putNewContentsIntoObj(siteConfig, data, thisSiteContent) {
    function putNewsIntoContentObj(obj, part, news) {
        if (!obj[part]) {
            obj[part] = {};
        }
        obj[part]['latestNews'] = news;
    }

    for (const part of Object.keys(siteConfig['parts'])) {
        //遍历每个设置，得到各部分最新信息
        console.log(part);
        let selector = siteConfig['parts'][part]['selector'];
        let processor = siteConfig['parts'][part]['processor'];
        if (selector != null) {
            try {
                let newsNodes = data.window.document.querySelectorAll(selector);
                let latestNews = [];
                for (const v of newsNodes) {
                    latestNews.push(v.textContent);
                    if (latestNews.length >= siteConfig['parts'][part]['maxLength']) {
                        break;
                    }
                }
                console.log("消息: " + latestNews);//得到了！
                putNewsIntoContentObj(thisSiteContent, part, latestNews);
            } catch (e) {
                console.log(`${part} : ${e}`);
            }
        } else if (processor != null) {
            try {
                let latestNews = siteConfig['parts'][part]['processor'](data);
                console.log("消息: " + latestNews);//得到了！
                putNewsIntoContentObj(thisSiteContent, part, latestNews);
            } catch (e) {
                console.log(`${part} : ${e}`);
            }
        }
    }
}

//抓取单个站点
async function scrapSite(siteName, siteConfig) {
    console.log('Now processing ' + siteName);
    if (siteConfig == null) {
        throw siteName + " config not exist";
    }

    //获得网站response
    let response = null;
    try {
        if (siteConfig["getResponse"] != null) {
            response = await siteConfig["getResponse"]();
        } else {
            response = await request
                .get(siteConfig['siteURL'])
                .timeout(timeoutTimems)
                .set(headers);//await readFile('aaoneu.html');
            response = response.text;
        }
    } catch (e) {
        console.log('scrapSite catch: ' + e);
    }
    if (response == null) {
        return null;
    }

    let result = {};
    result[siteName] = {};

    let obj;
    if (siteConfig['type'] === "html") {    //解析html
        obj = new JSDOM(response.toString());
    } else if (siteConfig['type'] === 'json') {//解析json
        obj = JSON.parse(response);
    } else {
        throw siteName + 'type is not clear';
    }

    putNewContentsIntoObj(siteConfig, obj, result[siteName]);
    return result;
}

//批量抓取站点
async function getNewContent(sitesConfig) {
    let newContent = {};
    const results = Object.keys(sitesConfig).map(siteName => {
        try {
            return scrapSite(siteName, sitesConfig[siteName]);
        } catch (e) {
            console.log('getNewContent catch: ' + e);
        }
        return null;
    });

    for (const result of results) {
        try {
            let siteResponse = await result;
            if (siteResponse != null) {
                Object.assign(newContent, siteResponse);
            }
        } catch (e) {
            console.log('result catch : ' + e);
        }
    }
    return newContent;
}

//找区别，返回新信息新增和修改的部分，但忽略新信息中缺失老信息中有的部分
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
            result.hasDiff = true;
            diff[site] = newObj[site];
            continue;
        }
        let parts = newObj[site];
        for (const part of Object.keys(parts)) {
            if (oldObj[site][part] == null ||  oldObj[site][part]['latestNews'] == null || oldObj[site][part]['latestNews'][0] !== parts[part]['latestNews'][0]) {     
                result.hasDiff = true;

                if (diff[site] == null) {
                    diff[site] = {};
                }
                if (diff[site][part] == null){
                    diff[site][part] = {};    
                }
                if(oldObj[site][part]==null||oldObj[site][part]['latestNews'] == null){
                    diff[site][part]['latestNews'] = parts[part]['latestNews'];
                }else{
                    diff[site][part]['latestNews'] = arrDiff(parts[part]['latestNews'], oldObj[site][part]['latestNews']);
                }
            }
        }
    }
    return result;
}

//用server酱推送到 weChat
/*
function pushToWeChat(message,SCKEY){
    let postData = querystring.stringify({
        text: message.text,
        desp: message.desp
    });

    return send.Post(postData,'sc.ftqq.com',`/${SCKEY}.send`, {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
    },'https');
}
*/

//利用区别创建信息
function createMessage(diff) {
    const diffSites = Object.keys(diff);

    let text = `${diffSites[0]} ${diffSites.length > 1 ? '等' : ''} 有变化了`;
    let pureText = '改变如下: \n';
    let desp = '### 改变如下: \n';
    for (const site of diffSites) {
        pureText += `${site}:\n`;
        desp += `#### ${site}:\n`;
        for (const part of Object.keys(diff[site])) {
            let detail = '';
            for (const news of diff[site][part]['latestNews']) {
                detail += `\t${news}\n`;
            }
            desp += `##### ${part}:\n${detail}`;
            pureText += `\t${part}:\n\t${detail}`;
        }
    }
    return {pureText: pureText, text: text, desp: desp};
}

//对diff进行推送
/*
function pushDiff(diff) {
    let result = [];
    if(SCKEYS.length>0){
        let message = createMessage(diff);
        console.log(message.text);
        console.log(message.desp);
        for (const SCKEY of SCKEYS){
            result.push(pushToWeChat(message,SCKEY))
        }
    }
    return result;
}
*/

//流水线：得到内容 -> 与之前内容对比 -> 写入变量

async function workFlow() {
    const prevInfoPath = core.getInput('prevInfoPath', {required: true});

    const read = readFile(prevInfoPath).catch(err => {
        console.log(err);
    });

    //得到配置信息
    const sitesConfig = getSitesConfig();
    console.log('Get Sites Config');

    //得到每个网站的内容
    let newContent = await getNewContent(sitesConfig);
    console.log('Get content of each site, put into new Content');
    console.log(JSON.stringify(newContent));


    //异步读取json文件，获得之前信息
    let oldContent = null;
    console.log('try reading oldContent');
    try {
        let fileResult = await read;
        oldContent = JSON.parse(fileResult.toString());
    } catch (e) {
        console.log("fileReader catch: " + e);
    }


    //对比，获得diff对象
    let diff = diffContent(newContent, oldContent);
    console.log('diff: ' + JSON.stringify(diff));


    //如果有区别，通知外界，把新内容写入文件
    console.log(`hasDiff: ${diff.hasDiff}`);
    if (diff.hasDiff) {
        let result = oldContent == null ? newContent : Object.assign(oldContent, newContent);
        result.lastUpdated = Date();
        let message = createMessage(diff.content);
        core.setOutput('changed', 'true');
        core.setOutput('title', message.text);//server-chan
        core.setOutput('markdownText', message.desp);//server-chan
        core.setOutput('pureText', message.pureText);

        await writeFile(prevInfoPath, JSON.stringify(result));

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

    } else {
        core.setOutput('changed', 'false');
    }
    return "Yes";
}


workFlow().then(r => console.log("Everything is done :" + r));




