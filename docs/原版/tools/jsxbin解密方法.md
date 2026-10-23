# jsxbin 解密方法（已验证）

> 日期：2026-10-20
> 结论：`all.c0Z3r02y.js` 可以**完全解密**成可执行的 `@JSXBIN@` 文件，不需要原面板。

---

## 一、这是什么

原面板的 PS 能力层是一个加密文件：

```
%APPDATA%\fz.FengZi1Hao\js\all.c0Z3r02y.js
大小 146,944 B
开头 "JBLwMCYNdRZQhQg7/KhEjMMwy..."（不是明文，也不是标准 jsxbin）
```

面板启动时会解密它，生成临时文件 `temp_e9I0x9Hjx3xFs2.js`，`$.evalFile` 加载后立即删除。

**现在可以自己解密，不用依赖原面板。**

---

## 二、解密流程

```
加密文件（文本）
  ↓ base64 解码
110,208 字节
  ↓ AES-128-CBC 解密（PKCS7）
110,207 字节
  ↓ gzip 解压
338,105 字节
  ↓
@JSXBIN@ES@2.0@MyBbyBnA2lLBMKbyBn0AE...
```

**关键：中间结果有 gzip 头 `1f 8b`，必须再解压一层。**

---

## 三、key 和 iv

```js
key = "c85d871e5a984545c63b49130f287211"   // 32 hex = 16 字节
iv  = "8b8f6daa15ec3ae26b41c896f7c5aa10"   // 32 hex = 16 字节
```

**来源**：模块 `14ac` 的 `o()` 和 `c()` 函数，都是字符串拼接。

---

## 四、解密代码

```js
const fs = require('fs');
const crypto = require('crypto');
const zlib = require('zlib');

const KEY = Buffer.from('c85d871e5a984545c63b49130f287211', 'hex');
const IV  = Buffer.from('8b8f6daa15ec3ae26b41c896f7c5aa10', 'hex');

const text = fs.readFileSync('all.c0Z3r02y.js', 'utf8').trim();

// 1. base64 解码（crypto-js 的 AES.decrypt 默认把密文当 base64）
const cipher = Buffer.from(text, 'base64');

// 2. AES-128-CBC 解密
const d = crypto.createDecipheriv('aes-128-cbc', KEY, IV);
let out = Buffer.concat([d.update(cipher), d.final()]);

// 3. gzip 解压
if (out[0] === 0x1f && out[1] === 0x8b) {
  out = zlib.gunzipSync(out);
}

// 4. 得到 @JSXBIN@
fs.writeFileSync('all.decrypted.js', out.toString('utf8'));
```

**脚本**：`C:\Users\Public\decrypt-jsx3.js`（可重跑）

---

## 五、解密产物

```
all.decrypted.js   330 KB
开头 @JSXBIN@ES@2.0@...
```

**这是标准的 Adobe ExtendScript 字节码**，`$.evalFile` 能直接执行。

**注意**：文件里搜不到 `ztgl_initSystemList` 这类函数名——因为 JSXBIN 编码时名字被压缩了。但**加载后函数名会恢复**，可以正常调用。

---

## 六、怎么用

**必须三步，缺一不可**：

```js
// 1. 加载 jsx
evalScript('$.evalFile("C:/path/to/all.decrypted.js")')

// 2. 设置环境（关键！不调会报 "undefined 不是对象"）
evalScript(`Sys_setSystemEnvInfo('{"VUE_APP_USER_DIR":"/SheJiZhuLi","NODE_ENV":"production",...}')`)

// 3. 调用
evalScript('ztgl_initSystemList()')   // → 259 个字体
```

**环境变量完整内容**：

```json
{
  "VUE_APP_BASE_SERVER": "https://zhuli.gaoding.com",
  "VUE_APP_WEBSITE_HOST": "https://www.pszhuli.com",
  "VUE_APP_ENVNAME": "",
  "VUE_APP_CURRENTMODE": "prod",
  "VUE_APP_BASE_SYNC_SERVER": "https://syncserver.pszhuli.com",
  "VUE_APP_UMS": "https://ums.gaoding.com",
  "VUE_APP_BASE_CEP": "https://cepapp.pszhuli.com",
  "VUE_APP_USER_DIR": "/SheJiZhuLi",
  "VUE_APP_OPTIMAL_DIR": "/Optimal",
  "NODE_ENV": "production",
  "VUE_APP_CEP_VERSION": "3.6.2",
  "VUE_APP_CEP_NAME": "design",
  "VUE_APP_CEP_PUB_TIME": "2022-06-28",
  "VUE_APP_CEP_PUB_TIMESTAMP": "1656410553279",
  "BASE_URL": ""
}
```

**`VUE_APP_USER_DIR` 最重要**——jsx 内部用它拼数据文件路径（`%APPDATA%\SheJiZhuLi`）。

---

## 六点五、完整验证结果（2026-10-20）

```
① getSystemPath("extension")     ✅
② 文件存在（338,105 B）           ✅
③ $.evalFile                     ✅ type=function
④ typeof ztgl_initSystemList     ✅ function
⑤ Sys_setSystemEnvInfo           ✅
⑥ ztgl_initSystemList()          ✅ 返回 259 个字体
```

**这是重写面板的地基，已完全验证。**

---

## 七、重要发现：CEP 会话隔离

| 事实 | 说明 |
|---|---|
| **每个 CEP 扩展的 ExtendScript 会话独立** | A 面板加载的 jsx，B 面板调不到 |
| 所以必须各自加载 | 新面板必须自己解密 + 自己 evalFile |

**这条决定了架构**：新面板不能依赖原面板，必须自包含。

---

## 八、原面板的解密逻辑（参考）

`app.v4.js` 第 71471-71481 行：

```js
a = read(n + "/SheJiZhuLi" + "/info.ini");   // "/fz.FengZi1Hao/index.html"
i = a.split("/"); i.pop(); a = i.join("/");   // "/fz.FengZi1Hao"
r = n + a + "/js/all.c0Z3r02y.js";            // 加密文件
o = n + "/temp_e9I0x9Hjx3xFs2.js";            // 解密后
Object(s.b)(r, o);                             // 解密（模块 538c 的 b 导出）
this.loadJsxFile(o);                           // $.evalFile
c.a.delete(o);                                 // 删除
```

**模块依赖**：
- `538c` → 解密主函数（`C`）
- `14ac` → key/iv
- `384c` → `CryptoJS.enc.Hex`
- `3844` → `CryptoJS.pad.Pkcs7`
- `3178` → `CryptoJS.AES`

---

## 九、Vue 3 兼容性验证

```
Vue 3.4.21     ✅
Proxy 支持     ✅
CEP 接口       ✅
响应式         ✅
jsx 调用       ✅（解密后独立加载）
```

**结论：可以用 Vue 3 重写，不需要退 Vue 2.7。**

---

## 十、复现步骤

```
1. 运行 node decrypt-jsx3.js
2. 得到 all.decrypted.js（330KB）
3. 放进新扩展的 lib/ 目录
4. evalScript('$.evalFile("绝对路径")')
5. 调任意 jsx 函数
```

**不需要原面板，不需要联网，不需要登录。**
