# 🚀 快速开始

## 5分钟上手指南

### 1️⃣ 安装插件（1分钟）

1. 打开 Chrome 浏览器
2. 地址栏输入：`chrome://extensions/`
3. 打开右上角「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择 `plugin-res-manager` 文件夹
6. ✅ 安装完成！

### 2️⃣ 第一次使用（2分钟）

#### 下载当前页面图片

1. 打开任意网页（如：https://unsplash.com）
2. 点击浏览器工具栏的插件图标 🖼️
3. 勾选图片格式（JPG、PNG等）
4. 点击「下载当前页面图片」
5. 等待下载完成 ⏳
6. 查看下载目录：`Downloads/images/[时间戳]/`

#### 下载指定网页图片

1. 点击插件图标
2. 切换到「指定URL」标签
3. 输入网址（如：`https://example.com`）
4. 选择图片格式
5. 点击「下载指定页面图片」
6. 完成！✨

### 3️⃣ 查看下载结果（1分钟）

打开下载目录，你会看到：

```
Downloads/
└── images/
    └── 20240213_143025/    ← 时间戳目录
        ├── photo1.jpg
        ├── photo2.png
        └── image3.webp
```

### 4️⃣ 高级设置（1分钟）

#### 过滤小图片

设置「最小尺寸」为 `200`，只下载大于200像素的图片

#### 选择特定格式

只勾选需要的格式，如只下载 PNG 和 WebP

#### 批量下载

可以多次点击下载，每次都会创建新的时间戳目录

---

## 💡 使用技巧

### 技巧1：快速下载网站所有图片

```
1. 打开目标网站
2. 点击插件图标
3. 全选所有格式
4. 最小尺寸设为 0
5. 点击下载
```

### 技巧2：只下载高质量图片

```
1. 只勾选 PNG 和 WebP
2. 最小尺寸设为 500
3. 点击下载
```

### 技巧3：批量下载多个网站

```
1. 切换到「指定URL」标签
2. 输入第一个网址，下载
3. 输入第二个网址，下载
4. 每个网站的图片都在独立的时间戳目录中
```

---

## 📋 常用场景

### 场景1：设计师收集素材

```
目标：从 Unsplash 下载高质量图片
操作：
  1. 访问 unsplash.com
  2. 勾选 JPG、PNG、WebP
  3. 最小尺寸：1000
  4. 下载
结果：只下载高分辨率图片
```

### 场景2：开发者下载图标

```
目标：下载网站的所有图标
操作：
  1. 访问目标网站
  2. 勾选 PNG、SVG
  3. 最小尺寸：0
  4. 下载
结果：获取所有图标文件
```

### 场景3：批量下载产品图

```
目标：下载电商网站的产品图
操作：
  1. 访问产品页面
  2. 勾选 JPG、PNG
  3. 最小尺寸：300
  4. 下载
结果：获取所有产品大图
```

---

## ⚙️ 自定义配置

### 修改下载目录

编辑 `background.js`：

```javascript
// 修改这一行
const folder = timestamp ? `images/${timestamp}` : 'images';

// 改为自定义目录
const folder = timestamp ? `my-images/${timestamp}` : 'my-images';
```

### 修改时间戳格式

编辑 `popup.js` 中的 `generateTimestampFolder()` 函数：

```javascript
// 当前格式：20240213_143025
return `${year}${month}${day}_${hour}${minute}${second}`;

// 改为：2024-02-13_14-30-25
return `${year}-${month}-${day}_${hour}-${minute}-${second}`;

// 改为：2024-02-13
return `${year}-${month}-${day}`;
```

### 修改下载间隔

编辑 `popup.js`：

```javascript
// 当前间隔：100ms
await new Promise(resolve => setTimeout(resolve, 100));

// 改为 500ms（更慢，更稳定）
await new Promise(resolve => setTimeout(resolve, 500));

// 改为 50ms（更快，可能被限流）
await new Promise(resolve => setTimeout(resolve, 50));
```

---

## 🔍 故障排除

### 问题：插件图标不显示

**解决：**
1. 检查 `icons` 目录是否存在
2. 在 `chrome://extensions/` 点击「重新加载」

### 问题：下载失败

**解决：**
1. 检查网络连接
2. 某些网站可能有防盗链保护
3. 尝试降低下载速度（增加间隔时间）

### 问题：找不到下载的图片

**解决：**
1. 打开 `chrome://downloads/` 查看下载历史
2. 点击「在文件夹中显示」
3. 默认位置：`Downloads/images/[时间戳]/`

### 问题：时间戳目录没有创建

**解决：**
1. 确认已升级到 v1.1.0
2. 在 `chrome://extensions/` 点击「重新加载」
3. 清除浏览器缓存

---

## 📚 更多资源

- **完整文档**：[README.md](README.md)
- **更新日志**：[CHANGELOG.md](CHANGELOG.md)
- **测试指南**：[TESTING.md](TESTING.md)
- **升级说明**：[UPGRADE.md](UPGRADE.md)

---

## 🎯 下一步

- ✅ 尝试下载不同网站的图片
- ✅ 测试不同的格式和尺寸设置
- ✅ 自定义配置以适应你的需求
- ✅ 分享给需要的朋友

**开始享受高效的图片下载体验吧！** 🎉
