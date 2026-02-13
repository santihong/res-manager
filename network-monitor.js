// network-monitor.js - Network请求监听器

class NetworkMonitor {
    constructor() {
        this.capturedImages = new Map(); // 存储捕获的图片信息
        this.isMonitoring = false;
        this.tabId = null;
    }

    // 开始监听
    startMonitoring(tabId) {
        this.tabId = tabId;
        this.isMonitoring = true;
        this.capturedImages.clear();
        
        console.log('开始监听Network请求，Tab ID:', tabId);
    }

    // 停止监听
    stopMonitoring() {
        this.isMonitoring = false;
        this.tabId = null;
        console.log('停止监听Network请求');
    }

    // 添加捕获的图片
    addImage(details) {
        if (!this.isMonitoring) return;
        
        const url = details.url;
        const imageInfo = {
            url: url,
            type: this.getImageType(url),
            timestamp: Date.now(),
            tabId: details.tabId,
            method: details.method,
            statusCode: details.statusCode || 'pending',
            size: 0,
            width: 0,
            height: 0
        };

        this.capturedImages.set(url, imageInfo);
    }

    // 更新图片信息（当响应完成时）
    updateImage(url, responseDetails) {
        if (!this.capturedImages.has(url)) return;
        
        const imageInfo = this.capturedImages.get(url);
        
        // 更新状态码
        if (responseDetails.statusCode) {
            imageInfo.statusCode = responseDetails.statusCode;
        }
        
        // 尝试从响应头获取大小
        if (responseDetails.responseHeaders) {
            const contentLength = responseDetails.responseHeaders.find(
                h => h.name.toLowerCase() === 'content-length'
            );
            if (contentLength) {
                imageInfo.size = parseInt(contentLength.value);
            }
        }
    }

    // 获取图片类型
    getImageType(url) {
        const urlLower = url.toLowerCase();
        if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) return 'jpg';
        if (urlLower.includes('.png')) return 'png';
        if (urlLower.includes('.gif')) return 'gif';
        if (urlLower.includes('.webp')) return 'webp';
        if (urlLower.includes('.svg')) return 'svg';
        if (urlLower.includes('.bmp')) return 'bmp';
        if (urlLower.includes('.ico')) return 'ico';
        return 'unknown';
    }

    // 获取所有捕获的图片
    getCapturedImages() {
        return Array.from(this.capturedImages.values());
    }

    // 清空捕获的图片
    clear() {
        this.capturedImages.clear();
    }

    // 获取统计信息
    getStats() {
        const images = this.getCapturedImages();
        const totalSize = images.reduce((sum, img) => sum + (img.size || 0), 0);
        
        return {
            total: images.length,
            totalSize: totalSize,
            byType: this.groupByType(images)
        };
    }

    // 按类型分组
    groupByType(images) {
        const groups = {};
        images.forEach(img => {
            const type = img.type;
            if (!groups[type]) {
                groups[type] = { count: 0, size: 0 };
            }
            groups[type].count++;
            groups[type].size += img.size || 0;
        });
        return groups;
    }
}

// 导出单例
const networkMonitor = new NetworkMonitor();
