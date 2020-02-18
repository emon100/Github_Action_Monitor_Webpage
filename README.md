# Github_Action_Monitor_Webpage 

一个通用化，提取网页信息与JSON信息，与之前提取的版本对比，输出差异的工具。

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
    # 使用Github_Action_Monitor_Webpage 的两个steps
    - name: Do data work.
      uses: emon100/Github_Action_Monitor_Webpage@master
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

## 配置方法

只需用JS写出一个配置文件即可，此项目里有一个[完整例子](https://github.com/emon100/Github_Action_Monitor_Webpage/blob/master/config/config.js)。以下是个不完全的例子：
```javascript
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
```
