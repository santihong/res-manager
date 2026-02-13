# 图片资源下载器 - 项目总览

## 📁 项目结构

```
res-manager/
├── manifest.json           # Chrome插件配置文件（必需）
├── popup.html             # 弹出窗口界面
├── popup.js               # 弹出窗口逻辑
├── background.js          # 后台服务脚本
├── icons/                 # 插件图标文件夹
│   ├── icon16.png        # 16x16 工具栏图标
│   ├── icon48.png        # 48x48 扩展管理页图标
│   └── icon128.png       # 128x128 Chrome商店图标
├── icon-generator.html    # 图标生成工具
├── README.md             # 完整说明文档
├── INSTALL.md            # 快速安装指南
└── EXAMPLES.md           # 使用示例文档
```

## 🎯 核心功能

### 1. 双模式下载
- **当前页面模式**：下载正在浏览的页面图片
- **指定URL模式**：输入任意网址自动下载

### 2. 智能图片提取
- `<img>` 标签的 src 和 srcset
- CSS 背景图片（background-image）
- `<picture>` 标签的 source
- `<link rel="icon">` 网站图标
- 自动转换相对路径为绝对路径

### 3. 灵活过滤
- 支持6种图片格式：JPG、PNG、GIF、WebP、SVG、BMP
- 可设置最小尺寸过滤
- 自动去重（相同URL只下载一次）

### 4. 用户体验
- 实时显示找到的图片数量
- 下载进度条显示
- 状态提示（成功/失败/进行中）
- 美观的渐变UI设计

## 🔧 技术架构

### Manifest V3
使用最新的Chrome扩展API标准：
- Service Worker 替代 Background Page
- Scripting API 注入内容脚本
- Downloads API 处理文件下载

### 权限说明
```json
{
  "activeTab": "访问当前标签页内容",
  "downloads": "下载文件到本地",
  "storage": "保存用户设置（预留）",
  "scripting": "注入脚本提取图片",
  "host_permissions": "访问所有网站（用于指定URL模式）"
}
```

### 工作流程

```
用户点击下载
    ↓
popup.js 收集设置
    ↓
注入 extractImages 函数到目标页面
    ↓
在页面上下文中提取所有图片URL
    ↓
返回图片列表到 popup.js
    ↓
发送下载请求到 background.js
    ↓
background.js 调用 chrome.downloads API
    ↓
图片下载到本地
```

## 📊 代码统计

| 文件 | 行数 | 功能 |
|------|------|------|
| manifest.json | 30 | 插件配置 |
| popup.html | 280 | UI界面 |
| popup.js | 320 | 交互逻辑 |
| background.js | 30 | 下载处理 |
| **总计** | **660+** | **完整功能** |

## 🚀 快速开始

### 1分钟安装
```bash
1. 打开 icon-generator.html 生成图标
2. 打开 chrome://extensions/
3. 开启「开发者模式」
4. 加载 res-manager 文件夹
5. 完成！
```

### 1分钟使用
```bash
1. 打开任意网页
2. 点击插件图标
3. 选择图片格式
4. 点击下载按钮
5. 完成！
```

## 🎨 UI设计

### 颜色方案
- 主色调：紫色渐变 (#667eea → #764ba2)
- 成功提示：绿色 (#d4edda)
- 错误提示：红色 (#f8d7da)
- 信息提示：蓝色 (#d1ecf1)

### 布局特点
- 固定宽度：400px
- 响应式高度：自适应内容
- 圆角设计：12px
- 阴影效果：柔和的投影

## 🔍 核心算法

### 图片提取算法
```javascript
1. 遍历所有 <img> 标签
2. 遍历所有元素的 CSS 背景图
3. 遍历所有 <picture> 标签
4. 遍历所有 <link> 图标
5. 转换相对路径为绝对路径
6. 检查格式是否匹配
7. 检查尺寸是否符合要求
8. 去重并返回结果
```

### 尺寸检查
```javascript
- 优先使用 naturalWidth/naturalHeight
- 如果不可用，创建临时 Image 对象
- 异步加载并检查尺寸
- 返回是否符合最小尺寸要求
```

## 📈 性能优化

### 1. 异步处理
- 使用 async/await 避免阻塞
- Promise.all 并行检查图片尺寸

### 2. 下载限流
- 每次下载间隔 100ms
- 避免触发网站限流机制

### 3. 内存优化
- 使用 Set 去重，避免重复处理
- 及时清理临时 Image 对象

### 4. 用户体验
- 实时更新进度
- 后台下载不阻塞浏览器

## 🛡️ 安全考虑

### 1. 权限最小化
只请求必要的权限，不过度索取

### 2. 数据隐私
- 不收集用户数据
- 不上传任何信息
- 所有处理都在本地完成

### 3. 错误处理
- 完善的 try-catch 捕获
- 友好的错误提示
- 不会因为单个图片失败而中断

## 🔮 未来扩展

### 可能的功能增强
- [ ] 支持批量URL输入
- [ ] 自定义下载目录
- [ ] 图片预览功能
- [ ] 下载历史记录
- [ ] 图片格式转换
- [ ] 压缩包打包下载
- [ ] 云端同步设置
- [ ] 快捷键支持

### 技术改进
- [ ] 添加单元测试
- [ ] 性能监控
- [ ] 错误日志系统
- [ ] 国际化支持

## 📚 学习资源

### Chrome扩展开发
- [官方文档](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 迁移指南](https://developer.chrome.com/docs/extensions/mv3/intro/)

### 相关API
- [chrome.downloads](https://developer.chrome.com/docs/extensions/reference/downloads/)
- [chrome.scripting](https://developer.chrome.com/docs/extensions/reference/scripting/)
- [chrome.tabs](https://developer.chrome.com/docs/extensions/reference/tabs/)

## 🤝 贡献指南

### 如何贡献
1. Fork 项目
2. 创建功能分支
3. 提交代码
4. 发起 Pull Request

### 代码规范
- 使用 ES6+ 语法
- 添加必要的注释
- 保持代码简洁清晰

## 📝 更新日志

### v1.0.0 (2024)
- ✨ 初始版本发布
- 🎯 双模式下载支持
- 🖼️ 6种图片格式支持
- 📏 尺寸过滤功能
- 📊 实时统计显示
- 🎨 美观的UI设计

## 📄 许可证

MIT License - 自由使用、修改和分发

## 👨‍💻 作者

Created by AI Assistant with ❤️

---

**项目地址**：`E:/code/AI/.codebuddy/res-manager/`

**最后更新**：2024

**版本**：v1.0.0
