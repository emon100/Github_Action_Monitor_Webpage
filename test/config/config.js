const superagent = require('superagent');
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.106 Safari/537.36'
};
const sitesConfig = {
    '东大教务处官网': {
        //type有html和json两种。
        type: "html",
        siteURL: "http://aao.neu.edu.cn/",
        parts: {
            '教学研究': {
                maxLength: 10,
                //cheerio的dom元素选择器语法，类似jQuery的选择器和CSS Selector语法
                selector: '[frag="窗口9"] li'
            }
        }
    },
    '计算机学院官网': {
        type: "html",
        siteURL: "http://www.cse.neu.edu.cn/",
        parts: {
            '通知公告': {
                maxLength: 10,
                //自己定义的json反序列化之后的对象的处理函数，输出字符串。
                processor: function (dom) {
                    let domList = dom.window.document.querySelectorAll('[frag="窗口76"] .con .news_list li');
                    let result = [];

                    for (const node of domList) {
                        result.push(`${node.children[0].children[0].textContent} ${node.children[1].textContent}`);
                    }
                    return result;
                }
            }
        }
    },
    '热榜': {
        type: 'json',
        siteURL: 'https://www.tophub.fun:8888/v2/GetAllInfoGzip?id=59&page=0',
        parts: {
            'V2ex': {
                //自己定义的json反序列化之后的对象的处理器，输出字符串。
                maxLength: 10,//下面processor也有
                processor: function (obj) {
                    let result= [];
                    if (obj != null && obj["Code"] === 0){
                        for(let i=0;i<10;++i){
                            result.push(`${unescape(obj['Data']['data'][i]['Title'])} : ${unescape(obj['Data']['data'][i]['hotDesc'])}`);
                        }
                    }
                    return result;
                }
            }
        }
    },
    /*
    '东大BB': {
        type: "json",
        getResponse: async function () {
            //POST发送用户名，密码https://bb.neu.edu.cn/webapps/login/，
            //拿到session_id, s_session_id
            //拿去访问https://bb.neu.edu.cn/webapps/blackboard/execute/announcement?method=search&context=mybb&viewChoice=2
            //访问两次才有结果
            let newHeaders = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.106 Safari/537.36',
                'Host': `bb.neu.edu.cn`,
                'Origin': `https://bb.neu.edu.cn`,
                'Connection': 'keep-alive'
            };
            let postData1 = {
                user_id: '********',
                password: '******',
                x: `${Math.floor(Math.random() * 43)}`,
                y: `${Math.floor(Math.random() * 17)}`,
                action: 'login',
                one_time_token: '待定内容'
            };
            let postData2 = {
                cmd: 'loadStream',
                streamName: 'alerts',
                providers: '{}',
                forOverview: 'false'
            };
            const agent = superagent.agent();
            agent.set(newHeaders);
            agent.timeout({response: 30000});
            let a = null;
            try {
                await  agent.get('https://bb.neu.edu.cn/');
                agent.type('form');
                await agent
                    .post('https://bb.neu.edu.cn/webapps/login/')
                    .send(postData1);
                await agent.get('https://bb.neu.edu.cn/webapps/bb-social-learning-BBLEARN/execute/mybb?cmd=display&toolId=AlertsOnMyBb_____AlertsTool');
                await agent.get('https://bb.neu.edu.cn/webapps/streamViewer/streamViewer?cmd=view&streamName=alerts&globalNavigation=false');
                agent.set({'Referer':'https://bb.neu.edu.cn/webapps/streamViewer/streamViewer?cmd=view&streamName=alerts&globalNavigation=false',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'X-Prototype-Version': 1.7,
                    'X-Requested-With': 'XMLHttpRequest'});
                a = await agent
                    .post('https://bb.neu.edu.cn/webapps/streamViewer/streamViewer')
                    .send(postData2);
                let count =5;
                while(JSON.parse(a.text)['sv_streamEntries'].findIndex(v=>v['providerId']==='bb-nautilus')===-1&&count){
                    a = await agent
                        .post('https://bb.neu.edu.cn/webapps/streamViewer/streamViewer')
                        .send(postData2);
                    count--;
                }
                a = a.text;
            } catch (e) {
                console.log(e);
                a = 'Get BB failed'
            }
            console.log(a);
            return a;
        },
        parts: {
            '最新课程公告': {
                maxLength: 10,
                processor: function (obj) {
                    if (obj != null && obj["sv_streamEntries"].length >= 1) {
                        //找最新日期
                        let newest_id =  obj["sv_providers"].find(v => {
                            return v["sp_provider"] === "bb-nautilus";
                        })["sp_newest"];
                        if (newest_id === -1) {
                            throw "Don't exist newest_se_id";
                        }
                        let newest_se_id = "bb-nautilus"+newest_id.toString();
                        let newest_obj = obj["sv_streamEntries"].find(v => {
                            return v["se_id"] === newest_se_id;
                        });
                        if (newest_obj == null) {
                            throw "can't found newest_obj";
                        }
                        let newest_obj_course_id=newest_obj["se_courseId"];
                        let course_name=obj["sv_extras"]["sx_filters"][0]["choices"][newest_obj_course_id];
                        return `${course_name} 中的 ${newest_obj["itemSpecificData"]["title"]}更新 \n ${newest_obj["se_details"]}`;
                    }
                    throw "BB JSON not completed.";
                }
            }
        }
    }
    */

};

module.exports.config = sitesConfig;
module.exports.headers = headers;
