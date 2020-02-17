'use strict';
//
//通用化爬虫
//
//
//原理：
//流水线 workflow：得到内容 -> 与之前内容对比 -> 有变化发请求
const cheerio = require('cheerio');
const fs = require('fs');
const send = require('./send');
const querystring = require('querystring');

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.106 Safari/537.36'
};

const jsonFile = './prevContent/try.json';

const SCKEY = process.env.SCKEY;


const sitesConfig = {
    '东大创新网': {
        type: "http",
        siteUrl: "cxzx.neu.edu.cn",
        path: "/main.htm",
        parts: {
            '通知公告': {
                selector: ['#tzlist li:first-child div']
            }
        }
    },
    '计算机学院官网': {
        type: "http",
        siteUrl: "www.cse.neu.edu.cn",
        path: '/',
        parts: {
            '通知公告': {
                processor: function ($) {
                    let result = $('[frag="窗口76"] .con .news_list li:first-child span a').text() + ' ';
                    result += $('[frag="窗口76"] .con .news_list li:first-child span:last-child').text();
                    return result;
                }
            }
        }
    },
    '东大教务处官网': {
        type: "http",
        siteUrl: "aao.neu.edu.cn",
        path: "/",
        parts: {
            '通知': {
                selector: ['[frag="窗口51"] div:first-child+div span font']
            },
            '公告': {
                selector: ['[frag="窗口6"] div:first-child+div']
            },
            '教学研究': {
                selector: ['[frag="窗口9"] li:first-child']
            }
            //'素质教育'
        }
    }
};


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
    return sitesConfig;
}

//
function putNewsIntoContentObj(obj, part, news) {
    if (!obj[part]) {
        obj[part] = {};
    }
    obj[part]['latestNews'] = news;
    obj[part]['lastUpdated'] = Date();
}

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

async function getNewContent(sitesConfig) {
    let newContent = {};
    const result = Object.keys(sitesConfig).map(async siteName => {
        let siteResponse;
        try {
            siteResponse = await scrapSite(siteName, sitesConfig[siteName]);
        } catch (e) {
            console.log(e);
            siteResponse = null;
        }
        return siteResponse;
    });

    for (const v of result) {
        let temp = await v;
        if (temp != null) {
            Object.assign(newContent, temp);
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


function pushDiff(diff) {
    return [pushToWeChat(diff)];
}

//用server酱推送到wechat
function pushToWeChat(diff){
    const diffSites = Object.keys(diff);

    let text = `${diffSites[0]} ${diffSites.length > 2 ? '等' : ''} 有变化了`;
    let desp = '### 改变如下: \n';
    for (const site of diffSites) {
        desp += `#### ${site}:\n`;
        for (const part of Object.keys(diff[site])) {
            desp += `##### ${part}:\n\t${diff[site][part]['latestNews']}\n`;
        }
    }
    console.log(text);
    console.log(desp);
    let postData = querystring.stringify({
        'text': text,
        'desp': desp
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



//流水线：得到内容 -> 与之前内容对比 -> 有变化发请求 -> 写入文件

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


    //如果有区别发请求，写入
    console.log(`hasDiff: ${diff.hasDiff}`);
    if (diff.hasDiff) {
        console.log("hasDiff: true");
        let result = oldContent == null ? newContent : Object.assign(oldContent,newContent);
        result.lastUpdated = Date();

        let write = writeFile(jsonFile, JSON.stringify(result));
        let pushResults = await Promisew.allSettled(pushDiff(diff.content));
        let atLeastPushedOne=false;
        for(const pushResult of pushResults){
            if(pushResult.status==="fulfilled"){
                atLeastPushedOne=true;
                break;
            }
        }
        if(atLeastPushedOne){
            console.log('至少推送成功一个');
            try{
                await write;
            }catch (e) {
                console.log('写入新内容失败');
            }
        }


    }
    return "Yes";
}


workFlow().then(r => console.log("Everything is done :"+r));



