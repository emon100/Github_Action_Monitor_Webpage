const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.106 Safari/537.36'
};

const sitesConfig = {
    '东大创新网': {
        type: "html",
        protocol: "http",
        siteHost: "http://cxzx.neu.edu.cn/",
        parts: {
            '通知公告': {
                selector: ['#tzlist li:first-child div']
            }
        }
    },
    '计算机学院官网': {
        type: "html",
        protocol: "http",
        siteHost: "http://www.cse.neu.edu.cn/",
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
        type: "html",
        protocol: "http",
        siteHost: "http://aao.neu.edu.cn/",
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
    },
    '热榜':{
        type:'json',
        protocol:'https',
        siteHost:'https://www.tophub.fun:8888/v2/GetAllInfoGzip?id=59&page=0',
        parts:{
            '第一个':{
                processor: function (obj) {
                    let result;
                    if(obj != null && obj.Code===0){
                      result = `${ unescape(obj['Data']['data'][0]['Title']) } : ${ unescape(obj['Data']['data'][0]['hotDesc']) }`;
                    }else {
                        result = 'api访问错误';
                    }
                    return result;
                }
            }
        }
    }
};

module.exports.config = sitesConfig;
module.exports.headers = headers;
