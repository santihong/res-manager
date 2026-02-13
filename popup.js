// popup.js - 弹出窗口逻辑

// 标签页切换
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        
        // 更新按钮状态
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // 更新内容显示
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tab + 'Tab').classList.add('active');
    });
});

// 获取选中的图片格式
function getSelectedFormats(tabSuffix = '') {
    const formats = [];
    const formatIds = ['jpg', 'png', 'gif', 'webp', 'svg', 'bmp'];
    
    formatIds.forEach(format => {
        const checkbox = document.getElementById(format + tabSuffix);
        if (checkbox && checkbox.checked) {
            formats.push(format);
        }
    });
    
    return formats;
}

// 显示状态消息
function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    statusEl.style.display = 'block';
    
    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 5000);
    }
}

// 更新统计数据
function updateStats(found, downloaded) {
    document.getElementById('foundCount').textContent = found;
    document.getElementById('downloadCount').textContent = downloaded;
}

// 更新进度条
function updateProgress(current, total) {
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    
    if (total > 0) {
        progressBar.style.display = 'block';
        const percent = (current / total) * 100;
        progressFill.style.width = percent + '%';
        
        if (current >= total) {
            setTimeout(() => {
                progressBar.style.display = 'none';
                progressFill.style.width = '0%';
            }, 2000);
        }
    }
}

// 生成时间戳目录名
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

// 下载当前页面图片
document.getElementById('downloadCurrent').addEventListener('click', async () => {
    const formats = getSelectedFormats();
    const minSize = parseInt(document.getElementById('minSize').value) || 0;
    
    if (formats.length === 0) {
        showStatus('请至少选择一种图片格式', 'error');
        return;
    }
    
    showStatus('正在扫描当前页面...', 'info');
    updateStats(0, 0);
    
    try {
        // 获取当前活动标签页
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // 注入内容脚本并执行
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: extractImages,
            args: [formats, minSize]
        });
        
        const images = results[0].result;
        
        if (images.length === 0) {
            showStatus('未找到符合条件的图片', 'error');
            return;
        }
        
        updateStats(images.length, 0);
        showStatus(`找到 ${images.length} 张图片，开始下载...`, 'info');
        
        // 生成本次下载的时间戳目录
        const timestamp = generateTimestampFolder();
        
        // 下载图片
        let downloaded = 0;
        for (let i = 0; i < images.length; i++) {
            try {
                await chrome.runtime.sendMessage({
                    action: 'download',
                    url: images[i].url,
                    filename: images[i].filename,
                    timestamp: timestamp
                });
                downloaded++;
                updateStats(images.length, downloaded);
                updateProgress(downloaded, images.length);
            } catch (error) {
                console.error('下载失败:', error);
            }
            
            // 避免下载过快被限制
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        showStatus(`成功下载 ${downloaded} 张图片到 images/${timestamp}/ 目录！`, 'success');
        
    } catch (error) {
        console.error('错误:', error);
        showStatus('下载失败: ' + error.message, 'error');
    }
});

// 下载指定URL页面图片
document.getElementById('downloadCustom').addEventListener('click', async () => {
    const url = document.getElementById('customUrl').value.trim();
    const formats = getSelectedFormats('2');
    const minSize = parseInt(document.getElementById('minSize2').value) || 0;
    
    if (!url) {
        showStatus('请输入目标网页URL', 'error');
        return;
    }
    
    if (formats.length === 0) {
        showStatus('请至少选择一种图片格式', 'error');
        return;
    }
    
    showStatus('正在打开目标页面...', 'info');
    updateStats(0, 0);
    
    try {
        // 创建新标签页
        const tab = await chrome.tabs.create({ url: url, active: false });
        
        // 等待页面加载
        await new Promise((resolve) => {
            chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
                if (tabId === tab.id && info.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    resolve();
                }
            });
        });
        
        showStatus('正在扫描页面...', 'info');
        
        // 注入内容脚本并执行
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: extractImages,
            args: [formats, minSize]
        });
        
        const images = results[0].result;
        
        // 关闭标签页
        await chrome.tabs.remove(tab.id);
        
        if (images.length === 0) {
            showStatus('未找到符合条件的图片', 'error');
            return;
        }
        
        updateStats(images.length, 0);
        showStatus(`找到 ${images.length} 张图片，开始下载...`, 'info');
        
        // 生成本次下载的时间戳目录
        const timestamp = generateTimestampFolder();
        
        // 下载图片
        let downloaded = 0;
        for (let i = 0; i < images.length; i++) {
            try {
                await chrome.runtime.sendMessage({
                    action: 'download',
                    url: images[i].url,
                    filename: images[i].filename,
                    timestamp: timestamp
                });
                downloaded++;
                updateStats(images.length, downloaded);
                updateProgress(downloaded, images.length);
            } catch (error) {
                console.error('下载失败:', error);
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        showStatus(`成功下载 ${downloaded} 张图片到 images/${timestamp}/ 目录！`, 'success');
        
    } catch (error) {
        console.error('错误:', error);
        showStatus('下载失败: ' + error.message, 'error');
    }
});

// 提取图片的函数（将在页面上下文中执行）
function extractImages(formats, minSize) {
    const images = [];
    const seen = new Set();
    
    // 构建格式正则表达式
    const formatPattern = formats.map(f => {
        if (f === 'jpg') return 'jpe?g';
        return f;
    }).join('|');
    const regex = new RegExp(`\\.(${formatPattern})($|\\?|#)`, 'i');
    
    // 辅助函数：检查图片尺寸
    function checkSize(img) {
        return new Promise((resolve) => {
            if (img.naturalWidth && img.naturalHeight) {
                resolve({
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    valid: img.naturalWidth >= minSize || img.naturalHeight >= minSize
                });
            } else {
                const tempImg = new Image();
                tempImg.onload = () => {
                    resolve({
                        width: tempImg.naturalWidth,
                        height: tempImg.naturalHeight,
                        valid: tempImg.naturalWidth >= minSize || tempImg.naturalHeight >= minSize
                    });
                };
                tempImg.onerror = () => {
                    resolve({ width: 0, height: 0, valid: false });
                };
                tempImg.src = img.src;
            }
        });
    }
    
    // 辅助函数：生成文件名
    function generateFilename(url, index) {
        try {
            const urlObj = new URL(url, window.location.href);
            const pathname = urlObj.pathname;
            const filename = pathname.split('/').pop() || `image_${index}`;
            
            // 确保有扩展名
            if (!filename.includes('.')) {
                const ext = formats[0] === 'jpg' ? 'jpg' : formats[0];
                return `${filename}.${ext}`;
            }
            
            return filename;
        } catch {
            const ext = formats[0] === 'jpg' ? 'jpg' : formats[0];
            return `image_${index}.${ext}`;
        }
    }
    
    // 辅助函数：添加图片
    async function addImage(url, index) {
        if (!url || seen.has(url)) return;
        
        // 转换为绝对URL
        try {
            url = new URL(url, window.location.href).href;
        } catch {
            return;
        }
        
        // 检查格式
        if (!regex.test(url)) return;
        
        seen.add(url);
        
        // 如果需要检查尺寸
        if (minSize > 0) {
            const img = document.createElement('img');
            img.src = url;
            const size = await checkSize(img);
            if (!size.valid) return;
        }
        
        images.push({
            url: url,
            filename: generateFilename(url, index)
        });
    }
    
    // 收集所有图片URL
    const promises = [];
    let index = 0;
    
    // 1. <img> 标签
    document.querySelectorAll('img').forEach(img => {
        if (img.src) {
            promises.push(addImage(img.src, index++));
        }
        if (img.srcset) {
            const srcsetUrls = img.srcset.split(',').map(s => s.trim().split(' ')[0]);
            srcsetUrls.forEach(url => {
                promises.push(addImage(url, index++));
            });
        }
    });
    
    // 2. CSS背景图片
    document.querySelectorAll('*').forEach(el => {
        const style = window.getComputedStyle(el);
        const bgImage = style.backgroundImage;
        if (bgImage && bgImage !== 'none') {
            const matches = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/g);
            if (matches) {
                matches.forEach(match => {
                    const url = match.replace(/url\(['"]?([^'"]+)['"]?\)/, '$1');
                    promises.push(addImage(url, index++));
                });
            }
        }
    });
    
    // 3. <picture> 标签
    document.querySelectorAll('picture source').forEach(source => {
        if (source.srcset) {
            const srcsetUrls = source.srcset.split(',').map(s => s.trim().split(' ')[0]);
            srcsetUrls.forEach(url => {
                promises.push(addImage(url, index++));
            });
        }
    });
    
    // 4. <link rel="icon"> 等
    document.querySelectorAll('link[rel*="icon"]').forEach(link => {
        if (link.href) {
            promises.push(addImage(link.href, index++));
        }
    });
    
    // 等待所有检查完成
    return Promise.all(promises).then(() => images);
}

// ========== Network监听模式 ==========

let isMonitoring = false;
let monitoringInterval = null;

// 获取Network监听过滤器设置
function getNetworkFilters() {
    const filters = {
        resourceTypes: [],
        imageFormats: [],
        videoFormats: [],
        audioFormats: []
    };
    
    // 资源类型
    if (document.getElementById('networkTypeImage')?.checked) {
        filters.resourceTypes.push('image');
    }
    if (document.getElementById('networkTypeVideo')?.checked) {
        filters.resourceTypes.push('video');
    }
    if (document.getElementById('networkTypeAudio')?.checked) {
        filters.resourceTypes.push('audio');
    }
    if (document.getElementById('networkTypeMedia')?.checked) {
        filters.resourceTypes.push('media');
    }
    
    // 图片格式
    const imageFormatIds = ['networkJpg', 'networkPng', 'networkGif', 'networkWebp', 'networkSvg', 'networkBmp', 'networkIco'];
    const imageFormatMap = { networkJpg: 'jpg', networkPng: 'png', networkGif: 'gif', networkWebp: 'webp', networkSvg: 'svg', networkBmp: 'bmp', networkIco: 'ico' };
    imageFormatIds.forEach(id => {
        if (document.getElementById(id)?.checked) {
            filters.imageFormats.push(imageFormatMap[id]);
        }
    });
    
    // 视频格式
    const videoFormatIds = ['networkMp4', 'networkWebm', 'networkM3u8', 'networkFlv', 'networkAvi', 'networkMov'];
    const videoFormatMap = { networkMp4: 'mp4', networkWebm: 'webm', networkM3u8: 'm3u8', networkFlv: 'flv', networkAvi: 'avi', networkMov: 'mov' };
    videoFormatIds.forEach(id => {
        if (document.getElementById(id)?.checked) {
            filters.videoFormats.push(videoFormatMap[id]);
        }
    });
    
    // 音频格式
    const audioFormatIds = ['networkMp3', 'networkWav', 'networkOgg', 'networkAac', 'networkFlac'];
    const audioFormatMap = { networkMp3: 'mp3', networkWav: 'wav', networkOgg: 'ogg', networkAac: 'aac', networkFlac: 'flac' };
    audioFormatIds.forEach(id => {
        if (document.getElementById(id)?.checked) {
            filters.audioFormats.push(audioFormatMap[id]);
        }
    });
    
    return filters;
}

// 恢复过滤器设置到UI
function restoreFiltersToUI(filters) {
    if (!filters) return;
    
    // 资源类型
    document.getElementById('networkTypeImage').checked = filters.resourceTypes?.includes('image') ?? true;
    document.getElementById('networkTypeVideo').checked = filters.resourceTypes?.includes('video') ?? false;
    document.getElementById('networkTypeAudio').checked = filters.resourceTypes?.includes('audio') ?? false;
    document.getElementById('networkTypeMedia').checked = filters.resourceTypes?.includes('media') ?? false;
    
    // 图片格式
    const imageFormatMap = { jpg: 'networkJpg', png: 'networkPng', gif: 'networkGif', webp: 'networkWebp', svg: 'networkSvg', bmp: 'networkBmp', ico: 'networkIco' };
    Object.entries(imageFormatMap).forEach(([format, id]) => {
        const el = document.getElementById(id);
        if (el) el.checked = filters.imageFormats?.includes(format) ?? false;
    });
    
    // 视频格式
    const videoFormatMap = { mp4: 'networkMp4', webm: 'networkWebm', m3u8: 'networkM3u8', flv: 'networkFlv', avi: 'networkAvi', mov: 'networkMov' };
    Object.entries(videoFormatMap).forEach(([format, id]) => {
        const el = document.getElementById(id);
        if (el) el.checked = filters.videoFormats?.includes(format) ?? false;
    });
    
    // 音频格式
    const audioFormatMap = { mp3: 'networkMp3', wav: 'networkWav', ogg: 'networkOgg', aac: 'networkAac', flac: 'networkFlac' };
    Object.entries(audioFormatMap).forEach(([format, id]) => {
        const el = document.getElementById(id);
        if (el) el.checked = filters.audioFormats?.includes(format) ?? false;
    });
    
    // 更新格式过滤器显示状态
    updateFormatFilterVisibility();
}

// 更新格式过滤器显示/隐藏
function updateFormatFilterVisibility() {
    const imageFilter = document.getElementById('imageFormatFilter');
    const videoFilter = document.getElementById('videoFormatFilter');
    const audioFilter = document.getElementById('audioFormatFilter');
    
    if (imageFilter) {
        imageFilter.style.display = document.getElementById('networkTypeImage')?.checked ? 'block' : 'none';
    }
    if (videoFilter) {
        videoFilter.style.display = document.getElementById('networkTypeVideo')?.checked ? 'block' : 'none';
    }
    if (audioFilter) {
        audioFilter.style.display = document.getElementById('networkTypeAudio')?.checked ? 'block' : 'none';
    }
}

// 监听资源类型复选框变化
document.getElementById('networkTypeImage')?.addEventListener('change', updateFormatFilterVisibility);
document.getElementById('networkTypeVideo')?.addEventListener('change', updateFormatFilterVisibility);
document.getElementById('networkTypeAudio')?.addEventListener('change', updateFormatFilterVisibility);

// 初始化时恢复监听状态
async function initNetworkMonitorState() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'getMonitoringStatus' });
        
        if (response.isMonitoring) {
            isMonitoring = true;
            document.getElementById('startMonitoring').style.display = 'none';
            document.getElementById('stopMonitoring').style.display = 'block';
            showStatus('正在监听Network请求...', 'info');
            
            // 启动定时更新
            monitoringInterval = setInterval(updateNetworkResourceList, 1000);
            
            // 如果正在监听，自动切换到Network标签页
            switchToTab('network');
        } else if (response.count > 0) {
            // 如果有已捕获的数据，也切换到Network标签页
            switchToTab('network');
        }
        
        // 恢复过滤器设置
        if (response.filters) {
            restoreFiltersToUI(response.filters);
        }
        
        // 立即更新资源列表
        updateNetworkResourceList();
        
    } catch (error) {
        console.error('初始化监听状态失败:', error);
    }
}

// 切换到指定标签页
function switchToTab(tabName) {
    // 更新按钮状态
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        if (b.dataset.tab === tabName) {
            b.classList.add('active');
        }
    });
    
    // 更新内容显示
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName + 'Tab').classList.add('active');
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initNetworkMonitorState();
    updateFormatFilterVisibility();
});

// 开始监听
document.getElementById('startMonitoring').addEventListener('click', async () => {
    const filters = getNetworkFilters();
    
    if (filters.resourceTypes.length === 0) {
        showStatus('请至少选择一种资源类型', 'error');
        return;
    }
    
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // 通知background开始监听，传递过滤器设置
        await chrome.runtime.sendMessage({
            action: 'startMonitoring',
            tabId: tab.id,
            filters: filters
        });
        
        isMonitoring = true;
        document.getElementById('startMonitoring').style.display = 'none';
        document.getElementById('stopMonitoring').style.display = 'block';
        
        showStatus('正在监听Network请求...', 'info');
        
        // 定期更新捕获的资源列表
        monitoringInterval = setInterval(updateNetworkResourceList, 1000);
        
    } catch (error) {
        console.error('启动监听失败:', error);
        showStatus('启动监听失败: ' + error.message, 'error');
    }
});

// 停止监听
document.getElementById('stopMonitoring').addEventListener('click', async () => {
    try {
        await chrome.runtime.sendMessage({ action: 'stopMonitoring' });
        
        isMonitoring = false;
        document.getElementById('startMonitoring').style.display = 'block';
        document.getElementById('stopMonitoring').style.display = 'none';
        
        if (monitoringInterval) {
            clearInterval(monitoringInterval);
            monitoringInterval = null;
        }
        
        showStatus('已停止监听（数据已保留）', 'success');
        
    } catch (error) {
        console.error('停止监听失败:', error);
    }
});

// 清空列表
document.getElementById('clearMonitoring').addEventListener('click', async () => {
    try {
        await chrome.runtime.sendMessage({ action: 'clearCapturedResources' });
        updateNetworkResourceList();
        showStatus('已清空列表', 'success');
    } catch (error) {
        console.error('清空列表失败:', error);
    }
});

// 更新Network资源列表
async function updateNetworkResourceList() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'getCapturedResources' });
        const resources = response.resources || response.images || [];
        
        const listEl = document.getElementById('networkImageList');
        const countEl = document.getElementById('networkCount');
        
        countEl.textContent = resources.length;
        
        if (resources.length === 0) {
            listEl.innerHTML = '<p style="text-align: center; color: #999; font-size: 12px;">暂无捕获的资源</p>';
            return;
        }
        
        // 按类别分组显示
        const grouped = {
            image: resources.filter(r => r.category === 'image' || !r.category),
            video: resources.filter(r => r.category === 'video'),
            audio: resources.filter(r => r.category === 'audio'),
            media: resources.filter(r => r.category === 'media')
        };
        
        let html = '';
        
        // 显示各类别
        Object.entries(grouped).forEach(([category, items]) => {
            if (items.length === 0) return;
            
            const categoryNames = { image: '🖼️ 图片', video: '🎬 视频', audio: '🎵 音频', media: '📦 其他媒体' };
            html += `<div style="font-weight: bold; margin: 10px 0 5px; color: #667eea; font-size: 12px;">${categoryNames[category]} (${items.length})</div>`;
            
            items.forEach((res, index) => {
                const filename = res.url.split('/').pop().split('?')[0] || `resource_${index}`;
                const sizeText = res.size > 0 ? formatBytes(res.size) : '未知';
                const typeText = (res.type || 'unknown').toUpperCase();
                
                // 根据类型显示不同的预览
                let previewHtml = '';
                if (category === 'image' || !res.category) {
                    previewHtml = `<img src="${res.url}" alt="" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22><rect fill=%22%23ddd%22 width=%2240%22 height=%2240%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2212%22>?</text></svg>'">`;
                } else if (category === 'video') {
                    previewHtml = `<div style="width: 40px; height: 40px; background: #f0f0f0; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 20px;">🎬</div>`;
                } else if (category === 'audio') {
                    previewHtml = `<div style="width: 40px; height: 40px; background: #f0f0f0; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 20px;">🎵</div>`;
                } else {
                    previewHtml = `<div style="width: 40px; height: 40px; background: #f0f0f0; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 20px;">📦</div>`;
                }
                
                html += `
                    <div class="network-image-item">
                        ${previewHtml}
                        <div class="network-image-info">
                            <div class="network-image-url" title="${res.url}">${filename}</div>
                            <div class="network-image-meta">
                                ${typeText} · ${sizeText}
                            </div>
                        </div>
                    </div>
                `;
            });
        });
        
        listEl.innerHTML = html;
        
    } catch (error) {
        console.error('更新列表失败:', error);
    }
}

// 兼容旧版函数名
const updateNetworkImageList = updateNetworkResourceList;

// 获取图片实际尺寸
function getImageDimensions(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => {
            resolve({ width: 0, height: 0 });
        };
        img.src = url;
        
        // 超时处理
        setTimeout(() => {
            resolve({ width: 0, height: 0 });
        }, 3000);
    });
}

// 格式化字节大小
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// 下载Network捕获的资源
document.getElementById('downloadNetwork').addEventListener('click', async () => {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'getCapturedResources' });
        const resources = response.resources || response.images || [];
        
        if (resources.length === 0) {
            showStatus('没有可下载的资源', 'error');
            return;
        }
        
        showStatus(`开始下载 ${resources.length} 个资源...`, 'info');
        updateStats(resources.length, 0);
        
        // 生成本次下载的时间戳目录
        const timestamp = generateTimestampFolder();
        
        // 下载资源
        let downloaded = 0;
        for (let i = 0; i < resources.length; i++) {
            try {
                const filename = resources[i].url.split('/').pop().split('?')[0] || `resource_${i}.${resources[i].type || 'bin'}`;
                
                await chrome.runtime.sendMessage({
                    action: 'download',
                    url: resources[i].url,
                    filename: filename,
                    timestamp: timestamp
                });
                
                downloaded++;
                updateStats(resources.length, downloaded);
                updateProgress(downloaded, resources.length);
            } catch (error) {
                console.error('下载失败:', error);
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        showStatus(`成功下载 ${downloaded} 个资源到 resources/${timestamp}/ 目录！`, 'success');
        
    } catch (error) {
        console.error('下载失败:', error);
        showStatus('下载失败: ' + error.message, 'error');
    }
});
