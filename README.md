# Github_Action_Monitor_Webpage 

一个通用化，提取网页html信息与api的JSON信息，与之前提取的版本对比，输出差异的GitHub action。

## 输入

### `prevInfoPath`: 

 **必要** 存放之前信息的 JSON 路径。默认：`'../prevInfo.json'`.   
        
### `configPath`: 

 **必要** 配置组件的位置，为 Node.js 的 require 里的路径。默认：`'../config'`.

## 输出

### `changed`:
    
 标记是否改变。返回 'true' 和 'false' 字符串
    
###  `title`:

 与之前信息差别的标题。
 
###  `pureText`:

 与之前信息差别的内容，纯文字。
 
###  `markdownText`:

 与之前信息差别的内容，markdown 格式。

## Example usage

注意：给使用这个 action 的那一步加 id 。

```yaml
    # 例子：演示使用 Github_Action_Monitor_Webpage 获得信息并传递给其他 step
    - name: Do data work.
      uses: emon100/Github_Action_Monitor_Webpage@v4.1
      id: dataWork # id
      with:
        prevInfoPath: '../prevContent.json'
        configPath: '../config'

    - name: ServerChan Notify new stuffs.
      uses: yakumioto/serverchan-action@v1
      if: steps.dataWork.outputs.changed == 'true' #判断是否改变
      with:
        key: ${{ something }}
        text: ${{ steps.dataWork.outputs.title }}#用id和输出获得信息
        desp: ${{ steps.dataWork.outputs.markdownText }}
```


## 输出的具体实例
```
  changed: 'true'
  title: 东大教务处官网 等 有变化了
  
  pureText:
  改变如下：
    东大教务处官网:
    	教学研究:
    		undefined
    计算机学院官网:
    	通知公告:
    		undefined
    热榜:
    	V2ex:
    		undefined

  markdownText:
  ### 改变如下：
  ####  东大教务处官网:
  #####  	教学研究:
    		  undefined
  ####  计算机学院官网:
  #####  	通知公告:
    		  undefined
  ####  热榜:
  #####  	V2ex:
    		  undefined
  ```

## 配置方法

只需用 JS 写出一个配置文件即可，此项目里有一个[完整例子](https://github.com/emon100/Github_Action_Monitor_Webpage/blob/master/config/config.js)。以下是个不完全的例子详解：
```javascript
//如需进行网络请求，可以引用 superagent 来用其中的方法请求.
const superagent = require('superagent');
//如不定义此项则将会以无请求头的方式请求。
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.106 Safari/537.36'
};
const sitesConfig = {
    '东大教务处官网': {
        //type 有 html 和 json 两种，分别对应不同的请求方式。
        type: "html",
        siteURL: "http://aao.neu.edu.cn/",
        parts: {
            '教学研究': {
                maxLength: 10,
                //selector 会做 document.querySelectorAll() 的参数
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
                //用 processor 来指明自己定义的处理函数，输出信息字符串。
                processor: function (dom) {
                    let domList = dom.window.document.querySelectorAll('[frag="窗口76"] .con .news_list li');
                    let result = [];

                    for (const node of domList) {
                        result.push(`${node.children[0].children[0].textContent} ${node.children[1].textContent}`);
                        if(result.length>=this.maxLength){
                            break;
                        }
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
                maxLength: 10,
                //json 对象暂时只能利用自定义的 processor 函数转换为相应的信息字符串。
                processor: function (obj) {
                    let result= [];
                    if (obj != null && obj["Code"] === 0){
                        for(let i=0;i<this.maxLength;++i){
                            result.push(`${unescape(obj['Data']['data'][i]['Title'])} : ${unescape(obj['Data']['data'][i]['hotDesc'])}`);
                        }
                    }
                    return result;
                }
            }
        }
    }
};
module.exports.config = sitesConfig;
module.exports.headers = headers;
```
如果你需要在 config 中使用帐号密码或 cookie 等隐私信息，最佳实践如下：
1. 在仓库里创建对应的 GitHub secret 
2. 在 workflow 里将 secret 传入环境变量
3. 在 config 中利用 Node.js 的 process.env 来中读取这些信息。
