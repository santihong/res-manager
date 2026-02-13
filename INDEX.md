# 🖼️ 图片资源下载器 Chrome 插件

> 一键下载网页中的所有图片，支持多种格式和智能过滤

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?logo=google-chrome)](https://www.google.com/chrome/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)](https://developer.chrome.com/docs/extensions/mv3/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## 🚀 快速开始

### 1️⃣ 生成图标（必需）
```bash
打开 icon-generator.html → 点击下载 → 保存到 icons 文件夹
```

### 2️⃣ 安装插件
```bash
Chrome浏览器 → chrome://extensions/ → 开发者模式 → 加载已解压的扩展程序
```

### 3️⃣ 开始使用
```bash
打开任意网页 → 点击插件图标 → 选择格式 → 下载
```

📖 **详细教程**：查看 [INSTALL.md](INSTALL.md)

---

## ✨ 核心功能

| 功能 | 说明 |
|------|------|
| 🎯 **双模式下载** | 当前页面 / 指定URL |
| 🖼️ **多格式支持** | JPG、PNG、GIF、WebP、SVG、BMP |
| 📏 **智能过滤** | 按尺寸过滤，去除小图标 |
| 📊 **实时统计** | 显示找到和已下载数量 |
| 🎨 **美观界面** | 现代化渐变UI设计 |
| ⚡ **智能提取** | 自动识别多种图片来源 |

---

## 📚 文档导航

| 文档 | 内容 |
|------|------|
| [README.md](README.md) | 📖 完整功能说明和使用指南 |
| [INSTALL.md](INSTALL.md) | 🔧 快速安装步骤 |
| [EXAMPLES.md](EXAMPLES.md) | 💡 实际使用场景和案例 |
| [PROJECT.md](PROJECT.md) | 🏗️ 项目架构和技术细节 |

---

## 🎬 使用演示

### 场景1：下载当前页面图片
```
1. 打开图片网站（如：Unsplash）
2. 点击插件图标
3. 选择 JPG + PNG，最小尺寸 500
4. 点击「下载当前页面图片」
5. ✅ 所有高清图片自动下载
```

### 场景2：下载指定网页图片
```
1. 点击插件图标
2. 切换到「指定URL」标签
3. 输入：https://example.com
4. 选择格式和尺寸
5. 点击「下载指定页面图片」
6. ✅ 自动打开、提取、下载、关闭
```

📖 **更多案例**：查看 [EXAMPLES.md](EXAMPLES.md)

---

## 📁 项目结构

```
res-manager/
├── 📄 manifest.json          # 插件配置
├── 🎨 popup.html             # 用户界面
├── ⚙️ popup.js               # 交互逻辑
├── 🔧 background.js          # 后台服务
├── 🎨 icon-generator.html    # 图标生成器
├── 📁 icons/                 # 图标文件夹
├── 📖 README.md              # 完整说明
├── 🔧 INSTALL.md             # 安装指南
├── 💡 EXAMPLES.md            # 使用案例
└── 🏗️ PROJECT.md             # 技术文档
```

---

## 🎯 技术特点

- ✅ **Manifest V3**：使用最新Chrome扩展标准
- ✅ **权限最小化**：只请求必要权限
- ✅ **智能提取**：支持多种图片来源
- ✅ **异步处理**：不阻塞浏览器
- ✅ **错误处理**：完善的异常捕获
- ✅ **用户友好**：实时反馈和进度显示

---

## 🔍 功能亮点

### 智能图片提取
- `<img>` 标签（src + srcset）
- CSS 背景图片
- `<picture>` 标签
- 网站图标
- 自动转换相对路径

### 灵活过滤
- 6种图片格式可选
- 最小尺寸过滤
- 自动去重
- 文件名冲突处理

### 用户体验
- 双模式切换
- 实时统计
- 进度条显示
- 状态提示
- 美观UI

---

## 📊 使用统计

| 指标 | 数据 |
|------|------|
| 代码行数 | 660+ |
| 支持格式 | 6种 |
| 文档页数 | 4份 |
| 功能模块 | 3个 |

---

## ⚠️ 注意事项

1. **版权提醒**：下载的图片可能受版权保护，请遵守法律法规
2. **网站限制**：某些网站可能有反爬虫机制
3. **下载速度**：大量图片需要时间，请耐心等待
4. **浏览器兼容**：仅支持Chrome浏览器（及基于Chromium的浏览器）

---

## 🛠️ 开发相关

### 技术栈
- Chrome Extension Manifest V3
- Vanilla JavaScript (ES6+)
- HTML5 + CSS3
- Chrome APIs (downloads, scripting, tabs)

### 核心API
- `chrome.downloads` - 文件下载
- `chrome.scripting` - 脚本注入
- `chrome.tabs` - 标签页管理

📖 **技术细节**：查看 [PROJECT.md](PROJECT.md)

---

## 🤝 贡献

欢迎提交问题和改进建议！

---

## 📄 许可证

MIT License - 自由使用、修改和分发

---

## 📞 支持

- 📖 查看文档：[README.md](README.md)
- 💡 使用案例：[EXAMPLES.md](EXAMPLES.md)
- 🔧 安装帮助：[INSTALL.md](INSTALL.md)
- 🏗️ 技术支持：[PROJECT.md](PROJECT.md)

---

<div align="center">

**Made with ❤️ by AI Assistant**

⭐ 如果觉得有用，欢迎分享！

</div>
