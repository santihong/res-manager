# 测试指南

## 如何测试时间戳目录功能

### 准备工作

1. **重新加载插件**
   - 打开 `chrome://extensions/`
   - 找到「图片资源下载器」
   - 点击「重新加载」按钮（🔄图标）

2. **打开测试页面**
   - 可以使用插件自带的 `test.html` 文件
   - 或者访问任意包含图片的网站（如：unsplash.com、pinterest.com）

### 测试步骤

#### 测试1：当前页面下载

1. 打开一个包含图片的网页
2. 点击浏览器工具栏的插件图标
3. 在「当前页面」标签下：
   - 勾选要下载的图片格式（如：JPG、PNG）
   - 设置最小尺寸为 0
   - 点击「下载当前页面图片」
4. 等待下载完成
5. 查看下载目录

**预期结果：**
- 状态提示显示：`成功下载 X 张图片到 images/20240213_143025/ 目录！`
- 在浏览器下载目录中看到：`images/20240213_143025/` 文件夹
- 文件夹内包含下载的所有图片

#### 测试2：指定URL下载

1. 点击插件图标
2. 切换到「指定URL」标签
3. 输入测试URL（如：`https://unsplash.com`）
4. 选择图片格式
5. 点击「下载指定页面图片」
6. 等待下载完成

**预期结果：**
- 创建新的时间戳目录（与测试1不同）
- 图片下载到新目录中

#### 测试3：多次下载验证

1. 等待至少1秒（确保时间戳不同）
2. 重复测试1或测试2
3. 检查是否创建了新的时间戳目录

**预期结果：**
- 每次下载都创建独立的时间戳目录
- 不同批次的图片不会混在一起
- 目录名格式正确：`YYYYMMDD_HHMMSS`

### 验证清单

- [ ] 时间戳格式正确（8位日期 + 下划线 + 6位时间）
- [ ] 每次下载创建新目录
- [ ] 图片正确保存到时间戳目录中
- [ ] 状态提示显示正确的目录路径
- [ ] 文件名冲突时自动添加数字后缀
- [ ] 当前页面模式工作正常
- [ ] 指定URL模式工作正常

### 查看下载目录

**Windows:**
```
C:\Users\[用户名]\Downloads\images\
```

**macOS:**
```
/Users/[用户名]/Downloads/images/
```

**Linux:**
```
/home/[用户名]/Downloads/images/
```

### 目录结构示例

```
Downloads/
└── images/
    ├── 20240213_143025/
    │   ├── photo1.jpg
    │   ├── photo2.png
    │   └── icon.svg
    ├── 20240213_143156/
    │   ├── image1.jpg
    │   ├── image2.jpg
    │   └── image3.webp
    └── 20240213_150230/
        ├── banner.png
        ├── logo.png
        └── background.jpg
```

### 常见问题排查

#### 问题1：没有创建时间戳目录

**可能原因：**
- 插件没有重新加载
- 浏览器缓存了旧版本代码

**解决方法：**
1. 在 `chrome://extensions/` 页面点击「重新加载」
2. 或者删除插件后重新加载
3. 清除浏览器缓存

#### 问题2：时间戳格式不正确

**检查方法：**
1. 打开浏览器开发者工具（F12）
2. 切换到 Console 标签
3. 查看是否有错误信息

#### 问题3：图片下载到错误的位置

**检查方法：**
1. 打开 `chrome://downloads/` 查看下载历史
2. 点击「在文件夹中显示」查看实际位置
3. 检查 `background.js` 中的路径设置

### 调试技巧

#### 查看控制台日志

**Popup 页面日志：**
1. 右键点击插件图标
2. 选择「检查弹出内容」
3. 查看 Console 标签

**Background 脚本日志：**
1. 在 `chrome://extensions/` 页面
2. 找到插件，点击「service worker」链接
3. 查看 Console 标签

#### 手动测试时间戳生成

在 Popup 的 Console 中运行：
```javascript
function generateTimestampFolder() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}_${hour}${minute}${second}`;
}

console.log(generateTimestampFolder());
// 应该输出类似：20240213_143025
```

### 性能测试

#### 大量图片下载测试

1. 访问图片密集型网站（如：Pinterest）
2. 下载100+张图片
3. 观察：
   - 下载速度是否稳定
   - 是否有下载失败
   - 目录创建是否正常
   - 内存占用是否正常

#### 快速连续下载测试

1. 快速连续点击下载按钮（间隔<1秒）
2. 检查是否创建了多个目录
3. 检查图片是否正确分配到各个目录

**预期结果：**
- 如果在同一秒内下载，应该使用同一个目录
- 不同秒的下载应该创建不同目录

### 报告问题

如果发现问题，请记录以下信息：

1. **浏览器信息**
   - Chrome 版本
   - 操作系统

2. **问题描述**
   - 具体操作步骤
   - 预期结果
   - 实际结果

3. **错误信息**
   - Console 中的错误日志
   - 截图

4. **环境信息**
   - 测试的网站URL
   - 下载的图片数量
   - 时间戳值

---

## 自动化测试（可选）

如果需要编写自动化测试，可以参考以下思路：

```javascript
// 测试时间戳生成函数
function testTimestampGeneration() {
    const timestamp1 = generateTimestampFolder();
    console.assert(timestamp1.length === 15, '时间戳长度应为15');
    console.assert(timestamp1.includes('_'), '时间戳应包含下划线');
    
    // 等待1秒
    setTimeout(() => {
        const timestamp2 = generateTimestampFolder();
        console.assert(timestamp1 !== timestamp2, '不同时间应生成不同时间戳');
    }, 1000);
}

// 测试下载路径构建
function testDownloadPath() {
    const timestamp = '20240213_143025';
    const filename = 'test.jpg';
    const expectedPath = `images/${timestamp}/${filename}`;
    
    // 在 background.js 中验证
    console.log('Expected path:', expectedPath);
}
```

---

**测试完成后，请确保所有功能正常工作再发布！** ✅
