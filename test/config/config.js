const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.106 Safari/537.36'
};
const sitesConfig = {
    '东大教务处官网': {
        //type有html和json两种。
        type: "html",
        protocol: "http",
        siteHost: "http://aao.neu.edu.cn/",
        parts: {
            '教学研究': {
                //cheerio的dom元素选择器语法，类似jQuery的选择器和CSS Selector语法
                selector: ['[frag="窗口9"] li:first-child']
            }
        }
    },
    '计算机学院官网': {
        type: "html",
        protocol: "http",
        siteHost: "http://www.cse.neu.edu.cn/",
        parts: {
            '通知公告': {
                //自己定义的json反序列化之后的对象的处理函数，输出字符串。
                processor: function ($) {
                    let result = $('[frag="窗口76"] .con .news_list li:first-child span a').text() + ' ';
                    result += $('[frag="窗口76"] .con .news_list li:first-child span:last-child').text();
                    return result;
                }
            }
        }
    },
    '热榜':{
        type:'json',
        protocol:'https',
        siteHost:'https://www.tophub.fun:8888/v2/GetAllInfoGzip?id=59&page=0',
        parts:{
            '第一个':{
                //自己定义的json反序列化之后的对象的处理器，输出字符串。
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
