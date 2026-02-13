// sidepanel-mode.js - 侧边栏模式控制

// 初始化面板模式设置
async function initPanelMode() {
    const sidePanelModeCheckbox = document.getElementById('sidePanelMode');
    const modeIndicator = document.getElementById('modeIndicator');
    
    if (!sidePanelModeCheckbox) return;
    
    // 从storage读取设置
    const result = await chrome.storage.local.get(['useSidePanel']);
    const useSidePanel = result.useSidePanel !== false; // 默认为true
    
    sidePanelModeCheckbox.checked = useSidePanel;
    updateModeIndicator(useSidePanel);
    
    // 监听切换
    sidePanelModeCheckbox.addEventListener('change', async (e) => {
        const useSidePanel = e.target.checked;
        
        // 保存设置
        await chrome.storage.local.set({ useSidePanel: useSidePanel });
        
        // 更新指示器
        updateModeIndicator(useSidePanel);
        
        // 通知background更新点击行为
        await chrome.runtime.sendMessage({
            action: 'setPanelMode',
            useSidePanel: useSidePanel
        });
    });
}

// 更新模式指示器文字
function updateModeIndicator(useSidePanel) {
    const modeIndicator = document.getElementById('modeIndicator');
    if (!modeIndicator) return;
    
    if (useSidePanel) {
        modeIndicator.textContent = '当前：侧边栏模式 - 点击页面或刷新不会隐藏';
        modeIndicator.style.background = '#e8ebff';
        modeIndicator.style.color = '#667eea';
    } else {
        modeIndicator.textContent = '当前：弹出窗口模式 - 点击页面会自动隐藏';
        modeIndicator.style.background = '#fff3e0';
        modeIndicator.style.color = '#e65100';
    }
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', initPanelMode);
