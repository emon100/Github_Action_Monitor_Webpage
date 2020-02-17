const http = require('http');
const https = require('https');

module.exports.Get = function (ip, path, headers, type) {
    var requestCallback = (resolve)=>{
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
        const opt = {
            host: ip,  // 这里是ip(192.168.1.1)或者域名(mydomain.com)，注意不能带http://或https://
            method: 'GET',
            path: path,
            headers: headers,
            timeout: 30000
        };

        let cb = requestCallback(resolve);

        let req;

        if (type === "https") {
            req = https.request(opt, cb);
        }else if (type === "http") {
            req = http.request(opt, cb);
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

module.exports.Post = function (opt,type,data) {
    var requestCallback = (resolve)=>{
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
        if (type === "http") {
           req = http.request(opt, cb);
            req.on('error', function (e) {
                // request请求失败
                console.log(opt.host+'请求失败: ' + e.message);
                reject("0");
            });
            req.write(data);
            req.end();
        } else if (type === "https") {
           const req = https.request(opt, cb);
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
