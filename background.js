// background.js - 后台服务脚本

// 导入network-monitor（在service worker中需要使用importScripts）
importScripts('network-monitor.js');

// 存储捕获的资源信息
const capturedResources = new Map();
let isMonitoring = false;
let monitoringTabId = null;
let monitoringFilters = {
    resourceTypes: ['image'],  // 监听的资源类型: image, video, audio, media
    imageFormats: ['jpg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'],
    videoFormats: ['mp4', 'webm', 'm3u8', 'flv', 'avi', 'mov'],
    audioFormats: ['mp3', 'wav', 'ogg', 'aac', 'flac']
};

// 面板模式设置
let useSidePanel = true; // 默认使用侧边栏模式

// 标记状态是否已从 storage 恢复
let stateRestored = false;

// 待处理的请求队列（在状态恢复前缓存）
const pendingRequests = [];

// 初始化侧边栏设置
async function initSidePanel() {
    try {
        // 设置点击图标时自动打开侧边栏
        await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
        console.log('侧边栏初始化成功');
    } catch (error) {
        console.error('侧边栏初始化失败:', error);
    }
}

// 执行初始化
initSidePanel();

// 初始化时从storage恢复状态（立即执行）
async function restoreState() {
    try {
        const result = await chrome.storage.local.get(['isMonitoring', 'monitoringTabId', 'capturedResources', 'monitoringFilters', 'useSidePanel']);
        
        if (result.isMonitoring) {
            isMonitoring = result.isMonitoring;
            monitoringTabId = result.monitoringTabId;
            console.log('恢复监听状态:', isMonitoring, monitoringTabId);
        }
        if (result.capturedResources) {
            result.capturedResources.forEach(item => {
                capturedResources.set(item.url, item);
            });
            console.log('恢复捕获数据:', capturedResources.size, '条');
        }
        if (result.monitoringFilters) {
            monitoringFilters = result.monitoringFilters;
            console.log('恢复过滤器设置:', monitoringFilters);
        }
        // 恢复面板模式设置并更新行为
        useSidePanel = result.useSidePanel !== false; // 默认为true
        updatePanelBehavior(useSidePanel);
        console.log('面板模式:', useSidePanel ? '侧边栏' : '弹出窗口');
        
        // 标记状态已恢复
        stateRestored = true;
        
        // 处理在状态恢复前缓存的请求
        if (pendingRequests.length > 0) {
            console.log('处理缓存的请求:', pendingRequests.length, '条');
            pendingRequests.forEach(details => processRequest(details));
            pendingRequests.length = 0;
        }
        
    } catch (error) {
        console.error('恢复状态失败:', error);
        stateRestored = true; // 即使失败也标记为已恢复，避免请求一直被缓存
    }
}

// 立即执行状态恢复
restoreState();

// 更新面板行为
async function updatePanelBehavior(useSidePanel) {
    try {
        await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: useSidePanel });
    } catch (error) {
        console.error('更新面板行为失败:', error);
    }
}

// 保存状态到storage
function saveState() {
    chrome.storage.local.set({
        isMonitoring: isMonitoring,
        monitoringTabId: monitoringTabId,
        capturedResources: Array.from(capturedResources.values()),
        monitoringFilters: monitoringFilters
    });
}

// 处理扩展图标点击事件（仅在非侧边栏模式下生效）
chrome.action.onClicked.addListener(async (tab) => {
    // 如果是侧边栏模式，由 setPanelBehavior 自动处理，这里不需要做什么
    // 如果是弹出窗口模式，打开独立窗口
    const result = await chrome.storage.local.get(['useSidePanel']);
    const shouldUseSidePanel = result.useSidePanel !== false;
    
    if (!shouldUseSidePanel) {
        // 打开弹出窗口（创建一个新窗口）
        try {
            await chrome.windows.create({
                url: 'popup.html',
                type: 'popup',
                width: 420,
                height: 650,
                top: 100,
                left: 100
            });
        } catch (error) {
            console.error('打开弹出窗口失败:', error);
        }
    }
});

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'download') {
        downloadResource(request.url, request.filename, request.timestamp, request.convert, request.targetFormat)
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // 保持消息通道开放
    }
    
    if (request.action === 'startMonitoring') {
        startMonitoring(request.tabId, request.filters);
        sendResponse({ success: true });
        return true;
    }
    
    if (request.action === 'setPanelMode') {
        useSidePanel = request.useSidePanel;
        chrome.storage.local.set({ useSidePanel: useSidePanel });
        updatePanelBehavior(useSidePanel);
        console.log('面板模式已更新:', useSidePanel ? '侧边栏' : '弹出窗口');
        sendResponse({ success: true });
        return true;
    }
    
    if (request.action === 'stopMonitoring') {
        stopMonitoring();
        sendResponse({ success: true });
        return true;
    }
    
    if (request.action === 'getCapturedResources') {
        sendResponse({ 
            resources: Array.from(capturedResources.values()),
            isMonitoring: isMonitoring,
            monitoringTabId: monitoringTabId,
            filters: monitoringFilters
        });
        return true;
    }
    
    // 兼容旧版调用
    if (request.action === 'getCapturedImages') {
        sendResponse({ 
            images: Array.from(capturedResources.values()),
            isMonitoring: isMonitoring,
            monitoringTabId: monitoringTabId,
            filters: monitoringFilters
        });
        return true;
    }
    
    if (request.action === 'clearCapturedResources' || request.action === 'clearCapturedImages') {
        capturedResources.clear();
        saveState();
        sendResponse({ success: true });
        return true;
    }
    
    if (request.action === 'getMonitoringStatus') {
        sendResponse({ 
            isMonitoring: isMonitoring, 
            tabId: monitoringTabId,
            filters: monitoringFilters,
            count: capturedResources.size
        });
        return true;
    }
    
    if (request.action === 'updateFilters') {
        monitoringFilters = request.filters;
        saveState();
        sendResponse({ success: true });
        return true;
    }
    
    if (request.action === 'openDownloadFolder') {
        openDownloadFolder()
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
    
    // 代理请求URL（用于跨域场景）
    if (request.action === 'fetchUrl') {
        fetchUrlContent(request.url)
            .then(html => sendResponse({ html: html }))
            .catch(error => sendResponse({ error: error.message }));
        return true;
    }
    
    // 获取资源 Blob（用于跨域资源打包下载）
    if (request.action === 'fetchBlob') {
        fetchBlobContent(request.url)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ error: error.message }));
        return true;
    }
});

// 开始监听Network请求
function startMonitoring(tabId, filters) {
    isMonitoring = true;
    monitoringTabId = tabId;
    if (filters) {
        monitoringFilters = filters;
    }
    capturedResources.clear();
    saveState();
    console.log('开始监听Network请求，Tab ID:', tabId, '过滤器:', monitoringFilters);
}

// 停止监听
function stopMonitoring() {
    isMonitoring = false;
    monitoringTabId = null;
    saveState();
    console.log('停止监听Network请求');
}

// 获取URL内容（用于跨域场景）
async function fetchUrlContent(url) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.text();
    } catch (error) {
        console.error('获取URL内容失败:', error);
        throw error;
    }
}

// 获取资源 Blob 内容（用于跨域资源打包下载）
async function fetchBlobContent(url) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuffer);
        
        return {
            data: base64,
            type: blob.type
        };
    } catch (error) {
        console.error('获取Blob内容失败:', error);
        throw error;
    }
}

// ArrayBuffer 转 Base64
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// 检查URL是否匹配过滤器
function matchesFilter(url, contentType) {
    const urlLower = url.toLowerCase();
    const resourceType = getResourceCategory(urlLower, contentType);
    
    // 检查资源类型是否被选中
    if (!monitoringFilters.resourceTypes.includes(resourceType)) {
        return false;
    }
    
    // 根据资源类型检查具体格式
    const format = getResourceFormat(urlLower, contentType);
    
    if (resourceType === 'image') {
        return monitoringFilters.imageFormats.includes(format);
    } else if (resourceType === 'video') {
        return monitoringFilters.videoFormats.includes(format);
    } else if (resourceType === 'audio') {
        return monitoringFilters.audioFormats.includes(format);
    } else if (resourceType === 'media') {
        return true; // 其他媒体类型默认通过
    }
    
    return false;
}

// 获取资源类别
function getResourceCategory(url, contentType) {
    const urlLower = url.toLowerCase();
    
    // 根据Content-Type判断
    if (contentType) {
        if (contentType.startsWith('image/')) return 'image';
        if (contentType.startsWith('video/')) return 'video';
        if (contentType.startsWith('audio/')) return 'audio';
    }
    
    // 根据URL扩展名判断
    // 图片
    if (/\.(jpe?g|png|gif|webp|avif|svg|bmp|ico|tiff?)(\?|$)/i.test(urlLower)) return 'image';
    // 视频
    if (/\.(mp4|webm|m3u8|ts|flv|avi|mov|mkv|wmv)(\?|$)/i.test(urlLower)) return 'video';
    // 音频
    if (/\.(mp3|wav|ogg|aac|flac|m4a|wma)(\?|$)/i.test(urlLower)) return 'audio';
    
    return 'media'; // 其他媒体
}

// 获取资源格式
function getResourceFormat(url, contentType) {
    const urlLower = url.toLowerCase();
    
    // 图片格式
    if (/\.jpe?g(\?|$)/i.test(urlLower)) return 'jpg';
    if (/\.png(\?|$)/i.test(urlLower)) return 'png';
    if (/\.gif(\?|$)/i.test(urlLower)) return 'gif';
    if (/\.webp(\?|$)/i.test(urlLower)) return 'webp';
    if (/\.avif(\?|$)/i.test(urlLower)) return 'avif';
    if (/\.svg(\?|$)/i.test(urlLower)) return 'svg';
    if (/\.bmp(\?|$)/i.test(urlLower)) return 'bmp';
    if (/\.ico(\?|$)/i.test(urlLower)) return 'ico';
    if (/\.tiff?(\?|$)/i.test(urlLower)) return 'tiff';
    
    // 视频格式
    if (/\.mp4(\?|$)/i.test(urlLower)) return 'mp4';
    if (/\.webm(\?|$)/i.test(urlLower)) return 'webm';
    if (/\.m3u8(\?|$)/i.test(urlLower)) return 'm3u8';
    if (/\.ts(\?|$)/i.test(urlLower)) return 'm3u8'; // HLS分片也归类到m3u8
    if (/\.flv(\?|$)/i.test(urlLower)) return 'flv';
    if (/\.avi(\?|$)/i.test(urlLower)) return 'avi';
    if (/\.mov(\?|$)/i.test(urlLower)) return 'mov';
    
    // 音频格式
    if (/\.mp3(\?|$)/i.test(urlLower)) return 'mp3';
    if (/\.wav(\?|$)/i.test(urlLower)) return 'wav';
    if (/\.ogg(\?|$)/i.test(urlLower)) return 'ogg';
    if (/\.aac(\?|$)/i.test(urlLower)) return 'aac';
    if (/\.flac(\?|$)/i.test(urlLower)) return 'flac';
    if (/\.m4a(\?|$)/i.test(urlLower)) return 'aac';
    
    // 根据Content-Type判断
    if (contentType) {
        if (contentType.includes('jpeg')) return 'jpg';
        if (contentType.includes('png')) return 'png';
        if (contentType.includes('gif')) return 'gif';
        if (contentType.includes('webp')) return 'webp';
        if (contentType.includes('avif')) return 'avif';
        if (contentType.includes('svg')) return 'svg';
        if (contentType.includes('bmp')) return 'bmp';
        if (contentType.includes('tiff')) return 'tiff';
        if (contentType.includes('mp4')) return 'mp4';
        if (contentType.includes('webm')) return 'webm';
        if (contentType.includes('mp3') || contentType.includes('mpeg')) return 'mp3';
    }
    
    return 'unknown';
}

// 获取图片类型（兼容旧版）
function getImageType(url) {
    return getResourceFormat(url, null);
}

// 处理单个请求（核心逻辑）
function processRequest(details) {
    if (!isMonitoring) return;
    
    // 允许 tabId 为 -1（某些资源加载可能没有关联到具体标签页）
    if (monitoringTabId !== null && details.tabId !== -1 && details.tabId !== monitoringTabId) return;
    
    const url = details.url;
    
    // 过滤掉 data: 和 blob: URL
    if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('chrome-extension:')) return;
    
    // 避免重复
    if (capturedResources.has(url)) return;
    
    // 获取Content-Type
    let contentType = '';
    if (details.responseHeaders) {
        const ctHeader = details.responseHeaders.find(
            h => h.name.toLowerCase() === 'content-type'
        );
        if (ctHeader) {
            contentType = ctHeader.value.toLowerCase();
        }
    }
    
    // 检查是否匹配过滤器
    if (!matchesFilter(url, contentType)) return;
    
    // 获取资源类型和格式
    const category = getResourceCategory(url, contentType);
    const format = getResourceFormat(url, contentType);
    
    // 尝试从响应头获取大小
    let size = 0;
    if (details.responseHeaders) {
        const contentLength = details.responseHeaders.find(
            h => h.name.toLowerCase() === 'content-length'
        );
        if (contentLength) {
            size = parseInt(contentLength.value);
        }
    }
    
    // 存储资源信息
    const resourceInfo = {
        url: url,
        type: format,
        category: category,
        size: size,
        timestamp: Date.now(),
        statusCode: details.statusCode,
        method: details.method,
        contentType: contentType
    };
    
    capturedResources.set(url, resourceInfo);
    saveState();
    
    console.log('捕获资源:', category, format, url.substring(0, 80) + '...');
}

// 监听网络请求（图片类型）
chrome.webRequest.onCompleted.addListener(
    (details) => {
        // 如果状态还未恢复，先缓存请求
        if (!stateRestored) {
            // 只缓存可能是资源的请求（避免缓存太多无关请求）
            const url = details.url.toLowerCase();
            if (/\.(jpe?g|png|gif|webp|avif|svg|bmp|ico|tiff?|mp4|webm|m3u8|ts|flv|avi|mov|mkv|mp3|wav|ogg|aac|flac|m4a)([?#!@_]|$)/i.test(url)) {
                pendingRequests.push(details);
            }
            return;
        }
        
        processRequest(details);
    },
    { 
        urls: ["<all_urls>"],
        types: ["image", "media", "xmlhttprequest", "other"]
    },
    ["responseHeaders"]
);

// 额外监听 onResponseStarted 事件（某些资源在 onCompleted 前可能丢失）
chrome.webRequest.onResponseStarted.addListener(
    (details) => {
        // 立即处理，不等待 onCompleted
        if (!stateRestored) return;
        
        // 只处理 200 状态的请求
        if (details.statusCode !== 200) return;
        
        processRequest(details);
    },
    { 
        urls: ["<all_urls>"],
        types: ["image", "media"]
    },
    ["responseHeaders"]
);

// 将图片转换为指定格式（使用 Canvas）
async function convertImageFormat(url, targetFormat) {
    console.log('[格式转换] 开始转换:', { url: url.substring(0, 100), targetFormat });
    
    try {
        // 获取图片数据 - 尝试多种方式
        let blob;
        
        try {
            // 方式1: 直接 fetch（适用于大多数情况）
            console.log('[格式转换] 尝试 fetch 获取图片...');
            const response = await fetch(url, {
                mode: 'cors',
                credentials: 'include',
                headers: {
                    'Accept': 'image/*,*/*'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            blob = await response.blob();
            console.log('[格式转换] fetch 成功, blob size:', blob.size, 'type:', blob.type);
        } catch (fetchError) {
            console.warn('[格式转换] fetch 失败，尝试无 credentials:', fetchError.message);
            
            // 方式2: 不带 credentials 重试
            const response = await fetch(url, {
                mode: 'cors',
                headers: {
                    'Accept': 'image/*,*/*'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            blob = await response.blob();
            console.log('[格式转换] 无 credentials fetch 成功, blob size:', blob.size);
        }
        
        if (!blob || blob.size === 0) {
            throw new Error('获取的图片数据为空');
        }
        
        // 创建 ImageBitmap
        console.log('[格式转换] 创建 ImageBitmap...');
        const imageBitmap = await createImageBitmap(blob);
        console.log('[格式转换] ImageBitmap 创建成功:', imageBitmap.width, 'x', imageBitmap.height);
        
        // 创建 OffscreenCanvas
        const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
        const ctx = canvas.getContext('2d');
        
        // 如果是 JPG 格式，先填充白色背景（处理透明图片）
        if (targetFormat === 'jpg' || targetFormat === 'jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // 绘制图片
        ctx.drawImage(imageBitmap, 0, 0);
        
        // 转换为目标格式
        const mimeType = targetFormat === 'jpg' || targetFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
        const quality = targetFormat === 'jpg' || targetFormat === 'jpeg' ? 0.92 : undefined;
        
        console.log('[格式转换] 转换为 blob, mimeType:', mimeType);
        const convertedBlob = await canvas.convertToBlob({ type: mimeType, quality });
        console.log('[格式转换] 转换后 blob size:', convertedBlob.size, 'type:', convertedBlob.type);
        
        // 转换为 Data URL
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                console.log('[格式转换] Data URL 生成成功, 长度:', reader.result?.length);
                resolve(reader.result);
            };
            reader.onerror = (err) => {
                console.error('[格式转换] FileReader 错误:', err);
                reject(err);
            };
            reader.readAsDataURL(convertedBlob);
        });
    } catch (error) {
        console.error('[格式转换] 转换失败:', error.message, error.stack);
        throw error;
    }
}

// 需要转换的格式列表
const CONVERTIBLE_FORMATS = ['avif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'tif'];

// 从 Content-Type 获取格式
function getFormatFromContentType(contentType) {
    if (!contentType) return '';
    const ct = contentType.toLowerCase();
    
    if (ct.includes('avif')) return 'avif';
    if (ct.includes('webp')) return 'webp';
    if (ct.includes('svg')) return 'svg';
    if (ct.includes('bmp')) return 'bmp';
    if (ct.includes('ico') || ct.includes('icon')) return 'ico';
    if (ct.includes('tiff')) return 'tiff';
    if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpg';
    if (ct.includes('png')) return 'png';
    if (ct.includes('gif')) return 'gif';
    
    return '';
}

// 下载资源
async function downloadResource(url, filename, timestamp, convert = false, targetFormat = null) {
    console.log('[下载资源] 参数:', { 
        url: url.substring(0, 80), 
        filename, 
        convert, 
        targetFormat 
    });
    
    try {
        // 使用时间戳作为子目录名
        const folder = timestamp ? `resources/${timestamp}` : 'resources';
        
        let downloadUrl = url;
        let finalFilename = filename;
        let needConvert = convert;
        let finalTargetFormat = targetFormat;
        
        // 如果启用了自动转换，先检测实际的 Content-Type
        // 因为有些网站（如YouTube）URL后缀是.jpg但实际返回avif
        if (targetFormat && !convert) {
            try {
                console.log('[下载资源] 检测实际 Content-Type...');
                const headResponse = await fetch(url, { 
                    method: 'HEAD',
                    mode: 'cors'
                });
                const contentType = headResponse.headers.get('content-type') || '';
                const actualFormat = getFormatFromContentType(contentType);
                
                console.log('[下载资源] 实际 Content-Type:', contentType, '-> 格式:', actualFormat);
                
                // 如果实际格式是需要转换的格式
                if (actualFormat && CONVERTIBLE_FORMATS.includes(actualFormat)) {
                    console.log('[下载资源] 检测到需要转换的格式:', actualFormat);
                    needConvert = true;
                    finalTargetFormat = targetFormat;
                    // 修正文件名扩展名
                    finalFilename = filename.replace(/\.[^.]+$/, `.${targetFormat}`);
                }
            } catch (headError) {
                console.warn('[下载资源] HEAD 请求失败，跳过格式检测:', headError.message);
            }
        }
        
        // 如果需要转换格式
        if (needConvert && finalTargetFormat) {
            try {
                console.log(`[下载资源] 开始转换格式: -> ${finalTargetFormat}`);
                downloadUrl = await convertImageFormat(url, finalTargetFormat);
                console.log('[下载资源] 格式转换成功，使用 Data URL 下载');
            } catch (convertError) {
                console.warn('[下载资源] 格式转换失败，使用原始URL下载:', convertError.message);
                downloadUrl = url;
                finalFilename = filename; // 恢复原始文件名
            }
        } else {
            console.log('[下载资源] 无需转换格式，直接下载原始文件');
        }
        
        // 使用chrome.downloads API下载
        const downloadId = await chrome.downloads.download({
            url: downloadUrl,
            filename: `${folder}/${finalFilename}`,
            conflictAction: 'uniquify', // 如果文件名冲突，自动重命名
            saveAs: false // 不显示保存对话框
        });
        
        console.log('[下载资源] 下载已开始, downloadId:', downloadId, '文件名:', finalFilename);
        
        // 记录最后下载的文件ID
        lastDownloadId = downloadId;
        
    } catch (error) {
        console.error('[下载资源] 下载失败:', url, error);
        throw error;
    }
}

// 兼容旧版downloadImage函数
async function downloadImage(url, filename, timestamp) {
    return downloadResource(url, filename, timestamp);
}

// 记录最后下载的文件ID
let lastDownloadId = null;

// 打开下载文件夹
async function openDownloadFolder() {
    try {
        // 方法1: 如果有最近下载的文件，在文件管理器中显示它
        if (lastDownloadId) {
            await chrome.downloads.show(lastDownloadId);
            return;
        }
        
        // 方法2: 查找最近下载的文件并显示
        const downloads = await chrome.downloads.search({
            limit: 1,
            orderBy: ['-startTime'],
            filenameRegex: '.*resources.*'  // 只查找我们下载的资源
        });
        
        if (downloads.length > 0) {
            await chrome.downloads.show(downloads[0].id);
            return;
        }
        
        // 方法3: 打开默认下载文件夹
        // 注意：Chrome 没有直接打开下载文件夹的 API，
        // 但我们可以通过 showDefaultFolder 来实现（仅在某些版本可用）
        if (chrome.downloads.showDefaultFolder) {
            chrome.downloads.showDefaultFolder();
            return;
        }
        
        throw new Error('没有找到已下载的文件');
    } catch (error) {
        console.error('打开文件夹失败:', error);
        throw error;
    }
}

// 监听下载完成事件（可选，用于统计）
chrome.downloads.onChanged.addListener((delta) => {
    if (delta.state && delta.state.current === 'complete') {
        console.log('下载完成:', delta.id);
    }
});

// 监听标签页关闭，如果是监听的标签页则停止监听
chrome.tabs.onRemoved.addListener((tabId) => {
    if (tabId === monitoringTabId) {
        console.log('监听的标签页已关闭，保留数据但停止监听');
        // 不清除数据，只是标记标签页已关闭
        // stopMonitoring(); 
    }
});
