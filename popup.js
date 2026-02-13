// popup.js - 弹出窗口逻辑（统一版）

// ========== 全局状态 ==========
let currentMode = 'current';  // 当前模式: current, custom, network
let isMonitoring = false;     // 网络监听是否开启
let monitoringInterval = null; // 网络监听轮询定时器

// 统一的资源存储（三种模式共用）
let allResources = [];        // 所有扫描/捕获到的资源
let filteredResources = [];   // 过滤后的资源
let selectedResources = new Set(); // 选中的资源索引
let manualClear = false;      // 是否手动清空选择

// 记录最后一次下载的时间戳
let lastDownloadTimestamp = null;

// ========== 模式切换 ==========
function initModeSelector() {
    const modeRadios = document.querySelectorAll('input[name="downloadMode"]');
    modeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const newMode = e.target.value;
            handleModeChange(newMode);
        });
    });
    updateModeUI();
}

// 处理模式切换
function handleModeChange(newMode) {
    // 如果从网络监听模式切出，停止轮询（但不停止监听）
    if (currentMode === 'network' && newMode !== 'network') {
        if (monitoringInterval) {
            clearInterval(monitoringInterval);
            monitoringInterval = null;
        }
    }
    
    // 切换模式时清空资源列表（网络监听模式除外，保留数据）
    if (newMode !== 'network') {
        allResources = [];
        filteredResources = [];
        selectedResources.clear();
        manualClear = false;
    }
    
    currentMode = newMode;
    updateModeUI();
    
    // 如果切换到网络监听模式，恢复数据并启动轮询
    if (newMode === 'network') {
        initNetworkMonitorState();
    } else {
        renderResourceList();
    }
}

// 更新模式相关的UI显示
function updateModeUI() {
    const customUrlSection = document.getElementById('customUrlSection');
    const networkDescSection = document.getElementById('networkDescSection');
    const sizeFilterSection = document.getElementById('sizeFilterSection');
    const scanBtn = document.getElementById('scanPage');
    const monitoringControls = document.getElementById('monitoringControls');
    
    // 隐藏所有模式特定的部分
    if (customUrlSection) customUrlSection.style.display = 'none';
    if (networkDescSection) networkDescSection.style.display = 'none';
    
    // 根据当前模式显示相应部分
    switch (currentMode) {
        case 'current':
            if (sizeFilterSection) sizeFilterSection.style.display = 'block';
            if (scanBtn) scanBtn.style.display = 'flex';
            if (monitoringControls) monitoringControls.style.display = 'none';
            break;
        case 'custom':
            if (customUrlSection) customUrlSection.style.display = 'block';
            if (sizeFilterSection) sizeFilterSection.style.display = 'block';
            if (scanBtn) scanBtn.style.display = 'flex';
            if (monitoringControls) monitoringControls.style.display = 'none';
            break;
        case 'network':
            if (networkDescSection) networkDescSection.style.display = 'block';
            if (sizeFilterSection) sizeFilterSection.style.display = 'none';
            if (scanBtn) scanBtn.style.display = 'none';
            if (monitoringControls) monitoringControls.style.display = 'flex';
            break;
    }
}

// 切换到指定模式
function switchToMode(modeName) {
    const modeRadio = document.querySelector(`input[name="downloadMode"][value="${modeName}"]`);
    if (modeRadio) {
        modeRadio.checked = true;
        handleModeChange(modeName);
    }
}

// ========== 统一的过滤器配置 ==========
function getResourceFilters() {
    const filters = {
        resourceTypes: [],
        imageFormats: [],
        videoFormats: [],
        audioFormats: [],
        otherFormats: []
    };
    
    // 资源类型
    if (document.getElementById('typeImage')?.checked) filters.resourceTypes.push('image');
    if (document.getElementById('typeVideo')?.checked) filters.resourceTypes.push('video');
    if (document.getElementById('typeAudio')?.checked) filters.resourceTypes.push('audio');
    if (document.getElementById('typeOther')?.checked) filters.resourceTypes.push('other');
    
    // 图片格式
    const imageFormatMap = {
        'formatJpg': 'jpg', 'formatPng': 'png', 'formatGif': 'gif',
        'formatWebp': 'webp', 'formatSvg': 'svg', 'formatBmp': 'bmp', 'formatIco': 'ico'
    };
    Object.entries(imageFormatMap).forEach(([id, format]) => {
        if (document.getElementById(id)?.checked) filters.imageFormats.push(format);
    });
    
    // 视频格式
    const videoFormatMap = {
        'formatMp4': 'mp4', 'formatWebm': 'webm', 'formatM3u8': 'm3u8',
        'formatFlv': 'flv', 'formatAvi': 'avi', 'formatMov': 'mov'
    };
    Object.entries(videoFormatMap).forEach(([id, format]) => {
        if (document.getElementById(id)?.checked) filters.videoFormats.push(format);
    });
    
    // 音频格式
    const audioFormatMap = {
        'formatMp3': 'mp3', 'formatWav': 'wav', 'formatOgg': 'ogg',
        'formatAac': 'aac', 'formatFlac': 'flac'
    };
    Object.entries(audioFormatMap).forEach(([id, format]) => {
        if (document.getElementById(id)?.checked) filters.audioFormats.push(format);
    });
    
    // 其它格式
    const otherFormatMap = {
        'formatPdf': 'pdf', 'formatDoc': 'doc', 'formatXls': 'xls',
        'formatPpt': 'ppt', 'formatZip': 'zip', 'formatTxt': 'txt',
        'formatJson': 'json', 'formatXml': 'xml'
    };
    Object.entries(otherFormatMap).forEach(([id, format]) => {
        if (document.getElementById(id)?.checked) filters.otherFormats.push(format);
    });
    
    return filters;
}

// 恢复过滤器设置到UI
function restoreFiltersToUI(filters) {
    if (!filters) return;
    
    // 资源类型
    const typeImageEl = document.getElementById('typeImage');
    const typeVideoEl = document.getElementById('typeVideo');
    const typeAudioEl = document.getElementById('typeAudio');
    const typeOtherEl = document.getElementById('typeOther');
    
    if (typeImageEl) typeImageEl.checked = filters.resourceTypes?.includes('image') ?? true;
    if (typeVideoEl) typeVideoEl.checked = filters.resourceTypes?.includes('video') ?? false;
    if (typeAudioEl) typeAudioEl.checked = filters.resourceTypes?.includes('audio') ?? false;
    if (typeOtherEl) typeOtherEl.checked = filters.resourceTypes?.includes('other') ?? false;
    
    // 图片格式
    const imageFormatMap = { jpg: 'formatJpg', png: 'formatPng', gif: 'formatGif', webp: 'formatWebp', svg: 'formatSvg', bmp: 'formatBmp', ico: 'formatIco' };
    Object.entries(imageFormatMap).forEach(([format, id]) => {
        const el = document.getElementById(id);
        if (el) el.checked = filters.imageFormats?.includes(format) ?? false;
    });
    
    // 视频格式
    const videoFormatMap = { mp4: 'formatMp4', webm: 'formatWebm', m3u8: 'formatM3u8', flv: 'formatFlv', avi: 'formatAvi', mov: 'formatMov' };
    Object.entries(videoFormatMap).forEach(([format, id]) => {
        const el = document.getElementById(id);
        if (el) el.checked = filters.videoFormats?.includes(format) ?? false;
    });
    
    // 音频格式
    const audioFormatMap = { mp3: 'formatMp3', wav: 'formatWav', ogg: 'formatOgg', aac: 'formatAac', flac: 'formatFlac' };
    Object.entries(audioFormatMap).forEach(([format, id]) => {
        const el = document.getElementById(id);
        if (el) el.checked = filters.audioFormats?.includes(format) ?? false;
    });
    
    // 其它格式
    const otherFormatMap = { pdf: 'formatPdf', doc: 'formatDoc', xls: 'formatXls', ppt: 'formatPpt', zip: 'formatZip', txt: 'formatTxt', json: 'formatJson', xml: 'formatXml' };
    Object.entries(otherFormatMap).forEach(([format, id]) => {
        const el = document.getElementById(id);
        if (el) el.checked = filters.otherFormats?.includes(format) ?? false;
    });
    
    updateFormatFilterVisibility();
}

// 更新格式过滤器显示/隐藏
function updateFormatFilterVisibility() {
    const imageFilter = document.getElementById('imageFormatFilter');
    const videoFilter = document.getElementById('videoFormatFilter');
    const audioFilter = document.getElementById('audioFormatFilter');
    const otherFilter = document.getElementById('otherFormatFilter');
    
    if (imageFilter) imageFilter.style.display = document.getElementById('typeImage')?.checked ? 'block' : 'none';
    if (videoFilter) videoFilter.style.display = document.getElementById('typeVideo')?.checked ? 'block' : 'none';
    if (audioFilter) audioFilter.style.display = document.getElementById('typeAudio')?.checked ? 'block' : 'none';
    if (otherFilter) otherFilter.style.display = document.getElementById('typeOther')?.checked ? 'block' : 'none';
}

// 当过滤器变化时
async function onFilterChange() {
    updateFormatFilterVisibility();
    
    // 重新过滤并显示资源
    if (allResources.length > 0) {
        filterAndRenderResources();
    }
    
    // 如果正在网络监听，实时更新 background.js 的过滤器
    if (isMonitoring && currentMode === 'network') {
        const filters = getResourceFilters();
        try {
            await chrome.runtime.sendMessage({ action: 'updateFilters', filters: filters });
            console.log('过滤器已更新');
        } catch (error) {
            console.error('更新过滤器失败:', error);
        }
    }
}

// ========== 统一的资源列表渲染 ==========
function filterAndRenderResources() {
    const filters = getResourceFilters();
    
    // 过滤资源
    filteredResources = allResources.filter(res => {
        const type = res.type || res.category || 'image';
        
        // 检查资源类型是否被选中
        if (!filters.resourceTypes.includes(type)) return false;
        
        // 获取格式
        const format = getFileExtension(res.url) || res.format || '';
        
        // 根据类型检查格式
        if (type === 'image') {
            return filters.imageFormats.length === 0 || filters.imageFormats.includes(format);
        } else if (type === 'video') {
            return filters.videoFormats.length === 0 || filters.videoFormats.includes(format);
        } else if (type === 'audio') {
            return filters.audioFormats.length === 0 || filters.audioFormats.includes(format);
        } else if (type === 'other') {
            return filters.otherFormats.length === 0 || filters.otherFormats.includes(format);
        }
        return true;
    });
    
    renderResourceList();
}

// 渲染资源列表（统一入口）
function renderResourceList() {
    const listEl = document.getElementById('resourceList');
    const countEl = document.getElementById('resourceCount');
    const selectControlsEl = document.getElementById('selectControls');
    const selectedCountEl = document.getElementById('selectedCount');
    
    if (!listEl) return;
    
    const resources = filteredResources;
    
    if (countEl) countEl.textContent = resources.length;
    
    if (resources.length === 0) {
        if (selectControlsEl) selectControlsEl.style.display = 'none';
        if (selectedCountEl) selectedCountEl.textContent = '0';
        
        // 没有资源时移除固定高度类和内联样式
        listEl.classList.remove('has-resources');
        listEl.style.height = '';
        listEl.style.maxHeight = '';
        listEl.style.minHeight = '';
        
        const emptyMessage = currentMode === 'network' 
            ? '暂无发现的资源' 
            : '点击"扫描资源"开始';
        listEl.innerHTML = `<p style="text-align: center; color: #999; font-size: 11px; margin: 8px 0;">${emptyMessage}</p>`;
        return;
    }
    
    // 有资源时添加固定高度类，并恢复保存的高度
    listEl.classList.add('has-resources');
    
    // 恢复保存的高度
    chrome.storage.local.get('resourceListHeight', (result) => {
        if (result.resourceListHeight && listEl.classList.contains('has-resources')) {
            listEl.style.height = result.resourceListHeight + 'px';
            listEl.style.maxHeight = result.resourceListHeight + 'px';
        }
    });
    
    // 显示全选控制
    if (selectControlsEl) selectControlsEl.style.display = 'inline';
    
    // 自动选择新增的资源（如果不是手动清空）
    if (!manualClear) {
        const oldSize = selectedResources.size;
        resources.forEach((_, idx) => {
            if (!selectedResources.has(idx) && idx >= oldSize) {
                selectedResources.add(idx);
            }
        });
        if (oldSize === 0) {
            resources.forEach((_, idx) => selectedResources.add(idx));
        }
    }
    
    // 按类别分组
    const grouped = { image: [], video: [], audio: [], other: [] };
    resources.forEach((res, idx) => {
        const type = res.type || res.category || 'image';
        const category = type === 'media' ? 'other' : type;
        if (grouped[category]) {
            grouped[category].push({ ...res, globalIndex: idx });
        }
    });
    
    let html = '';
    const categoryNames = { image: '🖼️ 图片', video: '🎬 视频', audio: '🎵 音频', other: '📦 其他' };
    
    Object.entries(grouped).forEach(([category, items]) => {
        if (items.length === 0) return;
        
        html += `<div class="resource-category"><strong>${categoryNames[category]} (${items.length})</strong></div>`;
        
        items.forEach((res) => {
            const filename = getFilenameFromUrl(res.url);
            const shortFilename = filename.length > 25 ? filename.substring(0, 25) + '...' : filename;
            const sizeText = res.size > 0 ? formatBytes(res.size) : '';
            const formatText = (getFileExtension(res.url) || res.format || '').toUpperCase();
            const isChecked = selectedResources.has(res.globalIndex);
            
            // 生成缩略图
            let thumbHtml = '';
            if (category === 'image') {
                thumbHtml = `<div class="resource-thumb"><img src="${res.url}" alt="" onerror="this.parentElement.innerHTML='🖼️'"></div>`;
            } else if (category === 'video') {
                thumbHtml = `<div class="resource-thumb">🎬</div>`;
            } else if (category === 'audio') {
                thumbHtml = `<div class="resource-thumb">🎵</div>`;
            } else {
                thumbHtml = `<div class="resource-thumb">📦</div>`;
            }
            
            html += `
                <div class="resource-item" title="${res.url}" data-index="${res.globalIndex}">
                    <input type="checkbox" class="resource-checkbox" data-index="${res.globalIndex}" ${isChecked ? 'checked' : ''}>
                    ${thumbHtml}
                    <div class="resource-info">
                        <div class="resource-name">${shortFilename}</div>
                        <div class="resource-url">${formatText}${sizeText ? ' · ' + sizeText : ''}</div>
                    </div>
                </div>
            `;
        });
    });
    
    listEl.innerHTML = html;
    
    // 绑定勾选框事件
    listEl.querySelectorAll('.resource-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            if (e.target.checked) {
                selectedResources.add(index);
            } else {
                selectedResources.delete(index);
            }
            updateSelectedCount();
        });
    });
    
    updateSelectedCount();
}

// 更新选中数量
function updateSelectedCount() {
    const selectedCountEl = document.getElementById('selectedCount');
    if (selectedCountEl) {
        selectedCountEl.textContent = selectedResources.size;
    }
}

// 全选
function selectAllResources() {
    filteredResources.forEach((_, idx) => selectedResources.add(idx));
    manualClear = false;
    renderResourceList();
}

// 全不选
function selectNoneResources() {
    selectedResources.clear();
    manualClear = true;
    renderResourceList();
}

// ========== 工具函数 ==========
function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('status');
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    statusEl.style.display = 'block';
    
    if (type === 'success' || type === 'error') {
        setTimeout(() => { statusEl.style.display = 'none'; }, 5000);
    }
}

function updateProgress(current, total) {
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    if (!progressBar || !progressFill) return;
    
    if (total > 0) {
        progressBar.style.display = 'block';
        progressFill.style.width = Math.round((current / total) * 100) + '%';
    } else {
        progressBar.style.display = 'none';
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function generateTimestampFolder() {
    const now = new Date();
    return now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') + '_' +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0') +
        String(now.getSeconds()).padStart(2, '0');
}

function getFilenameFromUrl(url) {
    try {
        const pathname = new URL(url).pathname;
        return pathname.split('/').pop()?.split('?')[0] || 'resource';
    } catch {
        return 'resource';
    }
}

function getFileExtension(url) {
    try {
        const pathname = new URL(url).pathname;
        const filename = pathname.split('/').pop() || '';
        // 清理CDN后缀: !w200, @100w, _webp等
        let cleanFilename = filename
            .split('?')[0].split('#')[0].split('!')[0].split('@')[0]
            .replace(/_\d+x\d+/g, '').replace(/_thumb/gi, '');
        const dotIndex = cleanFilename.lastIndexOf('.');
        if (dotIndex > 0) {
            let ext = cleanFilename.substring(dotIndex + 1).toLowerCase();
            ext = ext.replace(/[^a-z0-9]/g, '');
            // jpeg 归一化为 jpg
            if (ext === 'jpeg') ext = 'jpg';
            if (ext.length > 0 && ext.length <= 5) return ext;
        }
    } catch {}
    return '';
}

function normalizeUrl(url) {
    url = url.trim();
    if (!url) return '';
    if (!url.match(/^https?:\/\//i)) {
        if (url.startsWith('//')) url = 'https:' + url;
        else url = 'https://' + url;
    }
    return url;
}

// ========== 扫描功能（当前页面 & 指定网址模式） ==========
async function scanResources() {
    const filters = getResourceFilters();
    
    if (filters.resourceTypes.length === 0) {
        showStatus('请至少选择一种资源类型', 'error');
        return;
    }
    
    const minSizeInput = document.getElementById('minSize');
    const minSize = parseInt(minSizeInput?.value || '0') || 0;
    
    showStatus('正在扫描资源...', 'info');
    
    try {
        if (currentMode === 'current') {
            // 扫描当前页面
            await scanCurrentPage(filters, minSize);
        } else if (currentMode === 'custom') {
            // 扫描指定网址
            const customUrlInput = document.getElementById('customUrl');
            let url = customUrlInput?.value?.trim();
            
            if (!url) {
                showStatus('请输入目标网址', 'error');
                return;
            }
            
            url = normalizeUrl(url);
            await scanCustomUrl(url, filters, minSize);
        }
    } catch (error) {
        console.error('扫描失败:', error);
        showStatus('扫描失败: ' + error.message, 'error');
    }
}

// 扫描当前页面
async function scanCurrentPage(filters, minSize) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: extractResourcesFromPage,
            args: [filters, minSize]
        });
        
        if (results && results[0] && results[0].result) {
            allResources = results[0].result;
            filterAndRenderResources();
            
            if (allResources.length === 0) {
                showStatus('未找到任何资源', 'info');
            } else {
                showStatus(`扫描完成，找到 ${allResources.length} 个资源`, 'success');
            }
        } else {
            showStatus('扫描失败：无法获取页面内容', 'error');
        }
    } catch (error) {
        console.error('扫描当前页面失败:', error);
        showStatus('扫描失败: ' + error.message, 'error');
    }
}

// 扫描指定网址
async function scanCustomUrl(url, filters, minSize) {
    try {
        // 先尝试直接 fetch
        let html = '';
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
            });
            if (response.ok) {
                html = await response.text();
            }
        } catch (fetchError) {
            console.log('直接fetch失败，尝试通过background代理:', fetchError);
        }
        
        // 如果直接fetch失败，通过background.js代理
        if (!html) {
            const result = await chrome.runtime.sendMessage({
                action: 'fetchUrl',
                url: url
            });
            
            if (result.error) {
                throw new Error(result.error);
            }
            html = result.html;
        }
        
        allResources = extractResourcesFromHtml(html, url, minSize);
        filterAndRenderResources();
        
        if (allResources.length === 0) {
            showStatus('未找到任何资源', 'info');
        } else {
            showStatus(`扫描完成，找到 ${allResources.length} 个资源`, 'success');
        }
    } catch (error) {
        console.error('扫描指定网址失败:', error);
        showStatus('扫描失败: ' + error.message, 'error');
    }
}

// 从页面中提取资源（注入到目标页面执行）
function extractResourcesFromPage(filters, minSize) {
    const resources = [];
    const seen = new Set();
    
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'];
    const videoExts = ['mp4', 'webm', 'm3u8', 'flv', 'avi', 'mov', 'mkv'];
    const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'];
    const otherExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar', '7z', 'tar', 'gz', 'txt', 'json', 'xml'];
    
    function getExt(url) {
        try {
            const pathname = new URL(url, location.href).pathname;
            const filename = pathname.split('/').pop() || '';
            let cleanFilename = filename.split('?')[0].split('#')[0].split('!')[0].split('@')[0];
            const dotIndex = cleanFilename.lastIndexOf('.');
            if (dotIndex > 0) {
                let ext = cleanFilename.substring(dotIndex + 1).toLowerCase().replace(/[^a-z0-9]/g, '');
                if (ext === 'jpeg') ext = 'jpg';
                if (ext.length > 0 && ext.length <= 5) return ext;
            }
        } catch {}
        return '';
    }
    
    function detectType(url) {
        const ext = getExt(url);
        if (!ext) return null;
        if (imageExts.includes(ext)) return 'image';
        if (videoExts.includes(ext)) return 'video';
        if (audioExts.includes(ext)) return 'audio';
        if (otherExts.includes(ext)) return 'other';
        return null;
    }
    
    function addResource(url, type = null) {
        if (!url || url.startsWith('data:') || url.startsWith('javascript:')) return;
        try {
            const absoluteUrl = new URL(url, location.href).href;
            if (seen.has(absoluteUrl)) return;
            
            const detectedType = type || detectType(absoluteUrl);
            if (!detectedType) return;
            
            // 检查是否在过滤器中
            if (!filters.resourceTypes.includes(detectedType)) return;
            
            seen.add(absoluteUrl);
            
            let filename = absoluteUrl.split('/').pop()?.split('?')[0] || 'resource';
            if (!filename.includes('.')) {
                const ext = detectedType === 'image' ? 'jpg' : detectedType === 'video' ? 'mp4' : detectedType === 'audio' ? 'mp3' : 'bin';
                filename = `${filename}.${ext}`;
            }
            
            resources.push({
                url: absoluteUrl,
                filename: filename,
                type: detectedType,
                format: getExt(absoluteUrl)
            });
        } catch {}
    }
    
    // 提取 <img>
    if (filters.resourceTypes.includes('image')) {
        document.querySelectorAll('img').forEach(img => {
            addResource(img.src, 'image');
            addResource(img.dataset?.src, 'image');
            addResource(img.dataset?.original, 'image');
            addResource(img.dataset?.lazySrc, 'image');
            
            const srcset = img.getAttribute('srcset');
            if (srcset) {
                srcset.split(',').forEach(s => {
                    const url = s.trim().split(' ')[0];
                    if (url) addResource(url, 'image');
                });
            }
        });
        
        // 背景图片
        document.querySelectorAll('[style*="background"]').forEach(el => {
            const style = el.getAttribute('style') || '';
            const matches = style.match(/url\(['"]?([^'")\s]+)['"]?\)/gi);
            if (matches) {
                matches.forEach(match => {
                    const url = match.replace(/url\(['"]?([^'")\s]+)['"]?\)/i, '$1');
                    addResource(url);
                });
            }
        });
    }
    
    // 提取 <video>
    if (filters.resourceTypes.includes('video')) {
        document.querySelectorAll('video').forEach(video => {
            addResource(video.src, 'video');
            video.querySelectorAll('source').forEach(source => {
                addResource(source.src, 'video');
            });
        });
    }
    
    // 提取 <audio>
    if (filters.resourceTypes.includes('audio')) {
        document.querySelectorAll('audio').forEach(audio => {
            addResource(audio.src, 'audio');
            audio.querySelectorAll('source').forEach(source => {
                addResource(source.src, 'audio');
            });
        });
    }
    
    // 提取其他资源（链接）
    if (filters.resourceTypes.includes('other')) {
        document.querySelectorAll('a[href]').forEach(link => {
            addResource(link.href, null);
        });
        document.querySelectorAll('embed[src], object[data]').forEach(el => {
            addResource(el.src || el.data, null);
        });
    }
    
    return resources;
}

// 从 HTML 字符串中提取资源
function extractResourcesFromHtml(html, baseUrl, minSize) {
    const resources = [];
    const seen = new Set();
    
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'];
    const videoExts = ['mp4', 'webm', 'm3u8', 'flv', 'avi', 'mov', 'mkv'];
    const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'];
    const otherExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar', '7z', 'tar', 'gz', 'txt', 'json', 'xml'];
    
    function getExt(url) {
        try {
            const pathname = new URL(url, baseUrl).pathname;
            const filename = pathname.split('/').pop() || '';
            let cleanFilename = filename.split('?')[0].split('#')[0].split('!')[0].split('@')[0];
            const dotIndex = cleanFilename.lastIndexOf('.');
            if (dotIndex > 0) {
                let ext = cleanFilename.substring(dotIndex + 1).toLowerCase().replace(/[^a-z0-9]/g, '');
                if (ext === 'jpeg') ext = 'jpg';
                if (ext.length > 0 && ext.length <= 5) return ext;
            }
        } catch {}
        return '';
    }
    
    function detectType(url) {
        const ext = getExt(url);
        if (!ext) return null;
        if (imageExts.includes(ext)) return 'image';
        if (videoExts.includes(ext)) return 'video';
        if (audioExts.includes(ext)) return 'audio';
        if (otherExts.includes(ext)) return 'other';
        return null;
    }
    
    function toAbsoluteUrl(src) {
        if (!src || src.startsWith('data:') || src.startsWith('javascript:')) return null;
        try {
            return new URL(src, baseUrl).href;
        } catch {
            return null;
        }
    }
    
    function addResource(url, forcedType = null) {
        const absoluteUrl = toAbsoluteUrl(url);
        if (!absoluteUrl || seen.has(absoluteUrl)) return;
        
        const type = forcedType || detectType(absoluteUrl);
        if (!type) return;
        
        seen.add(absoluteUrl);
        
        let filename;
        try {
            const pathname = new URL(absoluteUrl).pathname;
            filename = pathname.split('/').pop() || `resource_${resources.length}`;
            if (!filename.includes('.')) {
                const ext = type === 'image' ? 'jpg' : type === 'video' ? 'mp4' : type === 'audio' ? 'mp3' : 'bin';
                filename = `${filename}.${ext}`;
            }
        } catch {
            filename = `resource_${resources.length}.bin`;
        }
        
        resources.push({
            url: absoluteUrl,
            filename: filename,
            type: type,
            format: getExt(absoluteUrl)
        });
    }
    
    // 解析 HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // 提取 <img>
    doc.querySelectorAll('img').forEach(img => {
        addResource(img.getAttribute('src'), 'image');
        addResource(img.dataset?.src, 'image');
        addResource(img.dataset?.original, 'image');
        
        const srcset = img.getAttribute('srcset');
        if (srcset) {
            srcset.split(',').forEach(s => {
                const url = s.trim().split(' ')[0];
                if (url) addResource(url, 'image');
            });
        }
    });
    
    // 背景图片
    doc.querySelectorAll('[style*="background"]').forEach(el => {
        const style = el.getAttribute('style') || '';
        const matches = style.match(/url\(['"]?([^'")\s]+)['"]?\)/gi);
        if (matches) {
            matches.forEach(match => {
                const url = match.replace(/url\(['"]?([^'")\s]+)['"]?\)/i, '$1');
                addResource(url);
            });
        }
    });
    
    // 提取 <video>
    doc.querySelectorAll('video').forEach(video => {
        addResource(video.getAttribute('src'), 'video');
        video.querySelectorAll('source').forEach(source => {
            addResource(source.getAttribute('src'), 'video');
        });
    });
    
    // 提取 <audio>
    doc.querySelectorAll('audio').forEach(audio => {
        addResource(audio.getAttribute('src'), 'audio');
        audio.querySelectorAll('source').forEach(source => {
            addResource(source.getAttribute('src'), 'audio');
        });
    });
    
    // 提取链接
    doc.querySelectorAll('a[href]').forEach(link => {
        addResource(link.getAttribute('href'));
    });
    
    return resources;
}

// ========== 网络监听功能 ==========
async function initNetworkMonitorState() {
    try {
        // 先清除可能存在的旧轮询
        if (monitoringInterval) {
            clearInterval(monitoringInterval);
            monitoringInterval = null;
        }
        
        const response = await chrome.runtime.sendMessage({ action: 'getMonitoringStatus' });
        
        if (!response) {
            console.warn('获取监听状态：无响应');
            return;
        }
        
        console.log('监听状态:', response);
        
        if (response.isMonitoring) {
            isMonitoring = true;
            updateMonitoringUI(true);
            showStatus(`正在监听... 已捕获 ${response.count || 0} 个资源`, 'info');
            
            // 启动轮询（确保只有一个轮询在运行）
            if (!monitoringInterval) {
                monitoringInterval = setInterval(refreshNetworkResources, 800);
                console.log('启动轮询定时器（800ms）');
            }
        }
        
        // 恢复已捕获的资源
        await refreshNetworkResources();
        
        // 恢复过滤器设置
        if (response.filters) {
            restoreFiltersToUI(response.filters);
        }
        
    } catch (error) {
        console.error('初始化监听状态失败:', error);
    }
}

// 刷新网络捕获的资源
async function refreshNetworkResources() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'getCapturedResources' });
        
        if (!response) {
            console.warn('获取捕获资源：无响应，可能是 Service Worker 休眠');
            // 尝试唤醒 Service Worker
            await chrome.runtime.sendMessage({ action: 'getMonitoringStatus' });
            return;
        }
        
        const resources = response.resources || [];
        
        // 检查是否有新资源
        const newCount = resources.length;
        const oldCount = allResources.length;
        
        // 更新资源列表
        allResources = resources.map(r => ({
            ...r,
            type: r.category || 'image',
            format: r.type
        }));
        
        // 只在有变化时重新渲染
        if (newCount !== oldCount) {
            console.log(`资源列表更新: ${oldCount} -> ${newCount}`);
            filterAndRenderResources();
            
            // 更新状态提示
            if (isMonitoring) {
                showStatus(`正在监听... 已捕获 ${newCount} 个资源`, 'info');
            }
        }
        
        // 同步监听状态
        if (response.isMonitoring !== undefined && response.isMonitoring !== isMonitoring) {
            isMonitoring = response.isMonitoring;
            updateMonitoringUI(isMonitoring);
            
            // 如果后台显示正在监听但前端轮询已停止，重启轮询
            if (isMonitoring && !monitoringInterval) {
                console.log('检测到监听中但轮询已停止，重启轮询');
                monitoringInterval = setInterval(refreshNetworkResources, 1000);
            }
        }
        
    } catch (error) {
        console.error('获取捕获资源失败:', error);
        
        // 如果是连接错误，尝试重新建立连接
        if (error.message?.includes('Could not establish connection') || 
            error.message?.includes('Extension context invalidated')) {
            console.log('Service Worker 可能休眠，等待重试...');
            
            // 尝试重启轮询
            if (isMonitoring && currentMode === 'network') {
                if (monitoringInterval) {
                    clearInterval(monitoringInterval);
                }
                // 延迟 2 秒后重新启动轮询
                setTimeout(() => {
                    if (isMonitoring && currentMode === 'network' && !monitoringInterval) {
                        console.log('重新启动轮询定时器');
                        monitoringInterval = setInterval(refreshNetworkResources, 1000);
                    }
                }, 2000);
            }
        }
    }
}

// 开始监听
async function startMonitoring() {
    const filters = getResourceFilters();
    
    if (filters.resourceTypes.length === 0) {
        showStatus('请至少选择一种资源类型', 'error');
        return;
    }
    
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab || !tab.id) {
            showStatus('无法获取当前标签页', 'error');
            return;
        }
        
        console.log('启动监听，Tab ID:', tab.id, 'URL:', tab.url);
        
        const response = await chrome.runtime.sendMessage({
            action: 'startMonitoring',
            tabId: tab.id,
            filters: filters
        });
        
        if (!response || !response.success) {
            showStatus('启动监听失败', 'error');
            return;
        }
        
        isMonitoring = true;
        updateMonitoringUI(true);
        showStatus('正在监听网络请求...', 'info');
        
        // 清空当前列表
        allResources = [];
        filteredResources = [];
        selectedResources.clear();
        manualClear = false;
        renderResourceList();
        
        // 启动轮询（先清除旧的）
        if (monitoringInterval) {
            clearInterval(monitoringInterval);
        }
        monitoringInterval = setInterval(refreshNetworkResources, 800); // 缩短轮询间隔
        console.log('监听已启动，轮询定时器已设置（800ms）');
        
    } catch (error) {
        console.error('启动监听失败:', error);
        showStatus('启动监听失败: ' + error.message, 'error');
    }
}

// 停止监听
async function stopMonitoring() {
    try {
        await chrome.runtime.sendMessage({ action: 'stopMonitoring' });
        
        isMonitoring = false;
        updateMonitoringUI(false);
        
        if (monitoringInterval) {
            clearInterval(monitoringInterval);
            monitoringInterval = null;
        }
        
        showStatus('已停止监听（数据已保留）', 'success');
        
    } catch (error) {
        console.error('停止监听失败:', error);
    }
}

// 清空监听列表
async function clearMonitoringList() {
    try {
        await chrome.runtime.sendMessage({ action: 'clearCapturedResources' });
        allResources = [];
        filteredResources = [];
        selectedResources.clear();
        manualClear = false;
        renderResourceList();
        showStatus('已清空列表', 'success');
    } catch (error) {
        console.error('清空列表失败:', error);
    }
}

// 更新监听控制UI
function updateMonitoringUI(monitoring) {
    const startBtn = document.getElementById('startMonitoring');
    const stopBtn = document.getElementById('stopMonitoring');
    
    if (monitoring) {
        if (startBtn) startBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'flex';
    } else {
        if (startBtn) startBtn.style.display = 'flex';
        if (stopBtn) stopBtn.style.display = 'none';
    }
}

// ========== 格式转换设置 ==========
// 需要转换的格式列表
const CONVERTIBLE_FORMATS = ['avif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'tif'];

// 获取格式转换设置
function getConvertSettings() {
    const convertCheckbox = document.getElementById('convertFormat');
    const targetRadio = document.querySelector('input[name="targetFormat"]:checked');
    
    // 调试日志
    console.log('convertFormat checkbox:', convertCheckbox, 'checked:', convertCheckbox?.checked);
    console.log('targetFormat radio:', targetRadio, 'value:', targetRadio?.value);
    
    const convertEnabled = convertCheckbox?.checked ?? true;
    const targetFormat = targetRadio?.value || 'png';
    return { convertEnabled, targetFormat };
}

// 保存格式转换设置
function saveConvertSettings() {
    const settings = getConvertSettings();
    chrome.storage.local.set({ convertSettings: settings });
}

// 恢复格式转换设置
async function restoreConvertSettings() {
    try {
        const result = await chrome.storage.local.get('convertSettings');
        console.log('恢复格式转换设置，存储的值:', result.convertSettings);
        
        if (result.convertSettings) {
            const { convertEnabled, targetFormat } = result.convertSettings;
            const convertCheckbox = document.getElementById('convertFormat');
            console.log('convertFormat checkbox 元素:', convertCheckbox);
            
            if (convertCheckbox) {
                convertCheckbox.checked = convertEnabled;
                console.log('设置 convertFormat checked =', convertEnabled);
            }
            
            const targetRadio = document.querySelector(`input[name="targetFormat"][value="${targetFormat}"]`);
            if (targetRadio) {
                targetRadio.checked = true;
                console.log('设置 targetFormat =', targetFormat);
            }
            
            updateConvertOptionsVisibility();
        } else {
            // 没有保存的设置，确保默认开启
            const convertCheckbox = document.getElementById('convertFormat');
            if (convertCheckbox && !convertCheckbox.checked) {
                convertCheckbox.checked = true;
                console.log('默认开启格式转换');
            }
        }
    } catch (error) {
        console.error('恢复格式转换设置失败:', error);
    }
}

// 更新转换选项显示/隐藏
function updateConvertOptionsVisibility() {
    const convertEnabled = document.getElementById('convertFormat')?.checked;
    const convertOptions = document.getElementById('convertOptions');
    if (convertOptions) {
        convertOptions.style.display = convertEnabled ? 'block' : 'none';
    }
}

// ========== 下载功能（三种模式统一） ==========

// 从 URL 提取格式
function getFormatFromUrl(url) {
    try {
        const pathname = new URL(url).pathname;
        const filename = pathname.split('/').pop() || '';
        const cleanFilename = filename.split('?')[0].split('#')[0];
        const dotIndex = cleanFilename.lastIndexOf('.');
        if (dotIndex > 0) {
            let ext = cleanFilename.substring(dotIndex + 1).toLowerCase();
            if (ext === 'jpeg') ext = 'jpg';
            if (ext.length > 0 && ext.length <= 5) return ext;
        }
    } catch {}
    return '';
}

// 从 Content-Type 提取格式
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
    if (ct.includes('mp4')) return 'mp4';
    if (ct.includes('webm')) return 'webm';
    if (ct.includes('mp3') || ct.includes('mpeg')) return 'mp3';
    if (ct.includes('ogg')) return 'ogg';
    if (ct.includes('wav')) return 'wav';
    
    return '';
}

// 综合判断资源格式（优先级：res.format > res.type > contentType > URL）
function detectResourceFormat(res) {
    // 1. 优先使用已有的 format 字段
    let format = (res.format || '').toLowerCase();
    if (format && format !== 'unknown' && format !== 'other') {
        return format;
    }
    
    // 2. 检查 type 字段（网络监听模式使用 type 存储格式）
    format = (res.type || '').toLowerCase();
    if (format && format !== 'unknown' && format !== 'other' && format !== 'image' && format !== 'video' && format !== 'audio') {
        return format;
    }
    
    // 3. 从 contentType 判断
    if (res.contentType) {
        format = getFormatFromContentType(res.contentType);
        if (format) return format;
    }
    
    // 4. 从 URL 提取
    format = getFormatFromUrl(res.url);
    if (format) return format;
    
    // 5. 最后检查 URL 参数中的格式提示
    try {
        const urlObj = new URL(res.url);
        // 检查常见的格式参数
        const formatParam = urlObj.searchParams.get('format') || 
                           urlObj.searchParams.get('f') ||
                           urlObj.searchParams.get('type');
        if (formatParam) {
            const fp = formatParam.toLowerCase();
            if (['avif', 'webp', 'jpg', 'jpeg', 'png', 'gif', 'svg'].includes(fp)) {
                return fp === 'jpeg' ? 'jpg' : fp;
            }
        }
    } catch {}
    
    return '';
}

async function downloadSelectedResources() {
    const resourcesToDownload = filteredResources.filter((_, idx) => selectedResources.has(idx));
    
    if (resourcesToDownload.length === 0) {
        showStatus('请选择要下载的资源', 'error');
        return;
    }
    
    // 获取格式转换设置
    const { convertEnabled, targetFormat } = getConvertSettings();
    console.log('格式转换设置:', { convertEnabled, targetFormat });
    console.log('可转换的格式列表:', CONVERTIBLE_FORMATS);
    
    showStatus(`开始下载 ${resourcesToDownload.length} 个资源...`, 'info');
    
    const timestamp = generateTimestampFolder();
    let downloaded = 0;
    let converted = 0;
    
    for (let i = 0; i < resourcesToDownload.length; i++) {
        try {
            const res = resourcesToDownload[i];
            let filename = getFilenameFromUrl(res.url) || `resource_${i}.${res.format || 'bin'}`;
            
            // 使用综合格式检测
            const format = detectResourceFormat(res);
            
            // 调试：打印原始资源数据
            console.log(`资源 ${i} 原始数据:`, { 
                'res.format': res.format, 
                'res.type': res.type,
                'res.category': res.category,
                'res.contentType': res.contentType,
                'detected format': format,
                url: res.url.substring(0, 100)
            });
            
            // 判断是否需要转换格式
            const needConvert = convertEnabled && CONVERTIBLE_FORMATS.includes(format);
            console.log(`资源 ${i}: format=${format}, needConvert=${needConvert}, convertEnabled=${convertEnabled}`);
            
            if (needConvert) {
                // 修改文件扩展名为目标格式
                const hasExtension = /\.[^.]+$/.test(filename);
                if (hasExtension) {
                    filename = filename.replace(/\.[^.]+$/, `.${targetFormat}`);
                } else {
                    // 文件名没有扩展名，添加目标格式扩展名
                    filename = `${filename}.${targetFormat}`;
                }
            } else if (!filename.includes('.')) {
                // 没有扩展名且不需要转换，添加检测到的格式作为扩展名
                if (format) {
                    filename = `${filename}.${format}`;
                }
            }
            
            // 即使 needConvert=false，如果启用了转换设置，也传递 targetFormat
            // 让 background.js 可以检测实际的 Content-Type 并自动转换
            // （因为有些网站如YouTube，URL后缀是.jpg但实际返回avif）
            await chrome.runtime.sendMessage({
                action: 'download',
                url: res.url,
                filename: filename,
                timestamp: timestamp,
                convert: needConvert,
                targetFormat: convertEnabled ? targetFormat : null
            });
            
            downloaded++;
            if (needConvert) converted++;
            updateProgress(downloaded, resourcesToDownload.length);
        } catch (error) {
            console.error('下载失败:', error);
        }
        
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    let message = `成功下载 ${downloaded} 个资源到 resources/${timestamp}/ 目录！`;
    if (converted > 0) {
        message += ` (${converted} 个已转换为 ${targetFormat.toUpperCase()})`;
    }
    showStatus(message, 'success');
    lastDownloadTimestamp = timestamp;
}

// ========== 事件绑定 ==========
document.addEventListener('DOMContentLoaded', () => {
    // 初始化模式选择器
    initModeSelector();
    
    // 初始化格式过滤器显示
    updateFormatFilterVisibility();
    
    // 恢复格式转换设置
    restoreConvertSettings();
    
    // 绑定格式转换设置
    document.getElementById('convertFormat')?.addEventListener('change', () => {
        updateConvertOptionsVisibility();
        saveConvertSettings();
    });
    document.querySelectorAll('input[name="targetFormat"]').forEach(radio => {
        radio.addEventListener('change', saveConvertSettings);
    });
    
    // 绑定扫描按钮
    document.getElementById('scanPage')?.addEventListener('click', scanResources);
    
    // 绑定下载按钮
    document.getElementById('downloadResources')?.addEventListener('click', downloadSelectedResources);
    
    // 绑定全选/全不选
    document.getElementById('selectAll')?.addEventListener('click', selectAllResources);
    document.getElementById('selectNone')?.addEventListener('click', selectNoneResources);
    
    // 绑定监听控制按钮
    document.getElementById('startMonitoring')?.addEventListener('click', startMonitoring);
    document.getElementById('stopMonitoring')?.addEventListener('click', stopMonitoring);
    document.getElementById('clearMonitoring')?.addEventListener('click', clearMonitoringList);
    
    // 绑定打开文件夹按钮
    document.getElementById('openDownloadFolder')?.addEventListener('click', async () => {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'openDownloadFolder' });
            if (!response.success) {
                showStatus('打开文件夹失败: ' + (response.error || '未知错误'), 'error');
            }
        } catch (error) {
            console.error('打开文件夹失败:', error);
            showStatus('打开文件夹失败: ' + error.message, 'error');
        }
    });
    
    // 绑定资源类型复选框
    ['typeImage', 'typeVideo', 'typeAudio', 'typeOther'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', onFilterChange);
    });
    
    // 绑定格式复选框
    const formatIds = [
        'formatJpg', 'formatPng', 'formatGif', 'formatWebp', 'formatSvg', 'formatBmp', 'formatIco',
        'formatMp4', 'formatWebm', 'formatM3u8', 'formatFlv', 'formatAvi', 'formatMov',
        'formatMp3', 'formatWav', 'formatOgg', 'formatAac', 'formatFlac',
        'formatPdf', 'formatDoc', 'formatXls', 'formatPpt', 'formatZip', 'formatTxt', 'formatJson', 'formatXml'
    ];
    formatIds.forEach(id => {
        document.getElementById(id)?.addEventListener('change', onFilterChange);
    });
    
    // 如果是网络监听模式，初始化状态
    if (currentMode === 'network') {
        initNetworkMonitorState();
    }
    
    // 监听页面可见性变化，恢复轮询
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && currentMode === 'network' && isMonitoring) {
            console.log('页面恢复可见，检查轮询状态');
            // 如果轮询已停止，重新启动
            if (!monitoringInterval) {
                console.log('重启轮询定时器（800ms）');
                monitoringInterval = setInterval(refreshNetworkResources, 800);
            }
            // 立即刷新一次
            refreshNetworkResources();
        }
    });
});

// ========== 兼容旧版 ==========
// 兼容旧版 popup.html 中的元素ID
const legacyMappings = {
    'pageResourceList': 'resourceList',
    'pageResourceCount': 'resourceCount',
    'pageSelectControls': 'selectControls',
    'pageSelectedCount': 'selectedCount',
    'pageSelectAll': 'selectAll',
    'pageSelectNone': 'selectNone',
    'downloadPage': 'downloadResources',
    'networkImageList': 'resourceList',
    'networkCount': 'resourceCount',
    'networkSelectControls': 'selectControls',
    'networkSelectedCount': 'selectedCount',
    'networkSelectAll': 'selectAll',
    'networkSelectNone': 'selectNone',
    'downloadNetwork': 'downloadResources'
};

// 重写 getElementById 以支持旧版ID
const originalGetElementById = document.getElementById.bind(document);
document.getElementById = function(id) {
    let el = originalGetElementById(id);
    if (!el && legacyMappings[id]) {
        el = originalGetElementById(legacyMappings[id]);
    }
    return el;
};

// 兼容旧版标签页切换
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const tabContent = document.getElementById(tab + 'Tab');
        if (tabContent) tabContent.classList.add('active');
        
        // 映射到新版模式
        const modeMap = { 'page': 'current', 'network': 'network' };
        if (modeMap[tab]) {
            switchToMode(modeMap[tab]);
        }
    });
});


// ========== 资源列表拖拽调整大小 ==========
(function() {
    const resizeHandle = document.getElementById('resizeHandle');
    // 兼容两种 ID
    const resourceList = document.getElementById('resourceList') || document.getElementById('networkImageList');
    
    if (!resizeHandle || !resourceList) return;
    
    let isResizing = false;
    let startY = 0;
    let startHeight = 0;
    
    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startY = e.clientY;
        startHeight = resourceList.offsetHeight;
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const deltaY = e.clientY - startY;
        const newHeight = Math.max(100, Math.min(600, startHeight + deltaY));
        resourceList.style.height = newHeight + 'px';
        resourceList.style.maxHeight = newHeight + 'px';
    });
    
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            
            // 保存高度设置
            const height = resourceList.offsetHeight;
            chrome.storage.local.set({ resourceListHeight: height });
        }
    });
    
    // 恢复保存的高度（只在有资源时才应用，由 renderResourceList 控制）
})();

// ========== 资源列表扩展大面板 ==========
(function() {
    const expandBtn = document.getElementById('expandPanelBtn');
    const closeBtn = document.getElementById('closeExpandedBtn');
    const overlay = document.getElementById('panelOverlay');
    // 兼容两种 ID
    const resourceList = document.getElementById('resourceList') || document.getElementById('networkImageList');
    
    if (!expandBtn || !resourceList) return;
    
    let isExpanded = false;
    let savedHeight = '';
    let savedMaxHeight = '';
    
    function expandPanel() {
        if (isExpanded) return;
        
        // 保存当前高度
        savedHeight = resourceList.style.height;
        savedMaxHeight = resourceList.style.maxHeight;
        
        // 展开面板
        resourceList.classList.add('expanded');
        if (overlay) overlay.classList.add('visible');
        if (closeBtn) closeBtn.classList.add('visible');
        expandBtn.innerHTML = '⛶';
        expandBtn.title = '收起面板';
        isExpanded = true;
    }
    
    function collapsePanel() {
        if (!isExpanded) return;
        
        // 恢复高度
        resourceList.classList.remove('expanded');
        resourceList.style.height = savedHeight;
        resourceList.style.maxHeight = savedMaxHeight;
        
        if (overlay) overlay.classList.remove('visible');
        if (closeBtn) closeBtn.classList.remove('visible');
        expandBtn.innerHTML = '⛶';
        expandBtn.title = '展开大面板';
        isExpanded = false;
    }
    
    expandBtn.addEventListener('click', () => {
        if (isExpanded) {
            collapsePanel();
        } else {
            expandPanel();
        }
    });
    
    if (closeBtn) {
        closeBtn.addEventListener('click', collapsePanel);
    }
    
    if (overlay) {
        overlay.addEventListener('click', collapsePanel);
    }
    
    // ESC 键关闭
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isExpanded) {
            collapsePanel();
        }
    });
})();
