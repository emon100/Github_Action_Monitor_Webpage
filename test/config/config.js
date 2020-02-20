const https = require('https');
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
    '热榜': {
        type: 'json',
        protocol: 'https',
        siteHost: 'https://www.tophub.fun:8888/v2/GetAllInfoGzip?id=59&page=0',
        parts: {
            '第一个': {
                //自己定义的json反序列化之后的对象的处理器，输出字符串。
                processor: function (obj) {
                    let result;
                    if (obj != null && obj.Code === 0) {
                        result = `${unescape(obj['Data']['data'][0]['Title'])} : ${unescape(obj['Data']['data'][0]['hotDesc'])}`;
                    } else {
                        result = 'api访问错误';
                    }
                    return result;
                }
            }
        }
    },
    '东大BB': {
        type: "json",
        getResponse: function () {
            //POST发送用户名，密码https://bb.neu.edu.cn/webapps/login/，
            //拿到session_id, s_session_id
            //拿去访问https://bb.neu.edu.cn/webapps/blackboard/execute/announcement?method=search&context=mybb&viewChoice=2
            //访问两次才有结果
            return new Promise((resolve, reject) => {
                let postData1 = `user_id=${process.env.STUDENT_ID}&password=${process.env.BB_PASSWORD}&x=${Math.floor(Math.random() * 43)}&y=${Math.floor(Math.random() * 17)}&action=login&remote-user=&new_loc=&auth_type=&one_time_token=%E5%BE%85%E5%AE%9A%E5%86%85%E5%AE%B9&encoded_pw=&encoded_pw_unicode=`;
                let newHeaders = {};
                Object.assign(newHeaders, headers);

                newHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
                newHeaders['Content-Length'] = Buffer.byteLength(postData1);
                let request1 = https.request(`https://bb.neu.edu.cn/webapps/login/`, {
                        method: 'POST',
                        headers: newHeaders,
                        rejectUnauthorized: false,
                    },
                    res1 => {
                        //第一步
                        const encoding = res1.headers['content-encoding'];
                        if (encoding === 'undefined') {
                            res1.setEncoding('utf-8');
                        }
                        console.log(`Step1 code: ${res1.statusCode}\n ${res1.rawHeaders}\n}`);

                        newHeaders.Cookie = res1.headers["set-cookie"];

                        newHeaders['Host'] = 'bb.neu.edu.cn';

                        console.log(newHeaders.Cookie);

                        //第二步
                        let postData2 = 'cmd=loadStream&streamName=alerts&providers=%7B%7D&forOverview=false';
                        newHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
                        newHeaders['Content-Length'] = Buffer.byteLength(postData2);
                        let request2 = https.request('https://bb.neu.edu.cn/webapps/streamViewer/streamViewer', {
                                method: 'POST',
                                headers: newHeaders,
                                rejectUnauthorized: false,
                            },
                            res2 => {
                                const encoding = res2.headers['content-encoding'];
                                if (encoding === 'undefined') {
                                    res2.setEncoding('utf-8');
                                }


                                newHeaders.Cookie = res2.headers["set-cookie"];

                                console.log(newHeaders.Cookie);

                                //第三步
                                let request3 = https.request('https://bb.neu.edu.cn/webapps/streamViewer/streamViewer', {
                                        method: 'POST',
                                        headers: newHeaders,
                                        rejectUnauthorized: false,
                                    },
                                    res3 => {
                                        const encoding = res3.headers['content-encoding'];
                                        if (encoding === 'undefined') {
                                            res3.setEncoding('utf-8');
                                        }
                                        let json = '';
                                        res3.on('data', chunk => {
                                            json += chunk;
                                        });

                                        res3.on('end', () => {
                                            resolve(json);
                                        });

                                        res3.on('error', (err) => {
                                            reject('step3:' + err);
                                        })

                                    });
                                request3.write(postData2);
                                request3.end();

                                res2.on('end', () => {
                                    console.log('BB step2 over');

                                });

                                res2.on('error', (err) => {
                                    console.log('step2: ' + err);
                                })
                            });
                        request2.write(postData2);
                        request2.end();

                        res1.on('end', () => {
                            console.log('BB step1 logged in.');
                        });
                        res1.on('error', () => {
                            reject('BB: Step1 error');
                        });

                    });

                request1.write(postData1);
                request1.end();
            });
        },
        parts: {
            '最新课程公告': {
                processor: function (obj) {
                    if (obj != null && obj["sv_streamEntries"].length >= 1) {
                        //找最新日期
                        let newest_se_id = "bb-nautilus" + obj["sv_providers"].find(v => {
                            return v["sp_provider"] === "bb-nautilus";
                        })["sp_newest"];

                        if (newest_se_id === -1) {
                            return "Don't exist";
                        }

                        let newest_obj = obj["sv_streamEntries"].find(v => {
                            return v["se_id"] === newest_se_id;
                        });

                        if (newest_obj == null) {
                            return "can't found";
                        }

                        let newest_obj_course_id=newest_obj["se_courseId"];
                        let course_name=obj["sv_extras"]["sx_filters"][0]["choices"][newest_obj_course_id];

                        return `${course_name} 中的 ${newest_obj["itemSpecificData"]["title"]}更新 \n ${newest_obj["se_details"]}`;

                    }
                    return "BB JSON not completed.";
                }
            }
        }
    }
};

module.exports.config = sitesConfig;
module.exports.headers = headers;
