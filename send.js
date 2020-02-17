const http = require('http');
const https = require('https');

module.exports.Get = function (host, headers, protocol) {
    const opt = {
        method: 'GET',
        headers: headers,
        rejectUnauthorized: false,
        timeout: 30000
    };

    let requestCallback = (resolve)=>{
        return (result)=>{
            const encoding = result.headers['content-encoding'];
            if( encoding === 'undefined'){
                result.setEncoding('utf-8');
            }

            let chunks = '';
            result.on('data', function(chunk) {
                try {
                    chunks+=(chunk);
                } catch(e) {
                    console.log(e);
                }
            }).on('end', function(){
                if (chunks !== undefined && chunks != null) {
                    resolve(chunks);
                } else {
                    // 请求获取不到返回值
                    resolve(opt.host+"ERROR");
                }
            })
        }} ;
    return new Promise((resolve, reject) => {

        let cb = requestCallback(resolve);

        let req;

        if (protocol === "https") {
            req = https.request(host,opt, cb);
        }else if (protocol === "http") {
            req = http.request(host,opt, cb);
        }else {
            reject('5');
        }

        req.on('error', function (e) {
                // request请求失败
                console.log(opt.host+'请求失败: ' + e.message);
                reject("0");
         });
        req.end();
    })

};

module.exports.Post = function (data, host, headers, protocol) {
    const opt = {
        method: 'POST',
        headers: headers,
        rejectUnauthorized: false,
        timeout: 30000
    };

    let requestCallback = (resolve)=>{
        return (result)=>{
            const encoding = result.headers['content-encoding'];
            if( encoding === 'undefined'){
                result.setEncoding('utf-8');
            }
            let chunks = '';
            result.on('data', function(chunk) {
                try {
                    chunks+=(chunk);
                } catch(e) {
                    console.log(e);
                }
            }).on('end', function(){
                if (chunks !== undefined && chunks != null) {
                    resolve(chunks);
                } else {
                    // 请求获取不到返回值
                    resolve(opt.host+"无返回值ERROR");
                }
            })
        }};
    Object.assign(opt,{timeout: 15000});
    return new Promise((resolve, reject) => {
        let cb = requestCallback(resolve);
        let req;
        if (protocol === "http") {
           req = http.request(host, opt, cb);
            req.on('error', function (e) {
                // request请求失败
                console.log(opt.host+'请求失败: ' + e.message);
                reject("0");
            });
            req.write(data);
            req.end();
        } else if (protocol === "https") {
           const req = https.request(host, opt, cb);
            req.on('error', function (e) {
                // request请求失败
                console.log(opt.host+'请求失败: ' + e.message);
                reject("0");
            });
            req.write(data);
            req.end();
        }else {
            reject('5');
        }

    });
};
