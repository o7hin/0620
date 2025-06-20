// main.js
// 主程序 - 整合所有功能模組

document.addEventListener('DOMContentLoaded', () => {
    // 初始化所有模組
    initializeModules();
    
    // 設置標籤頁切換功能
    setupTabSwitching();
    
    // 如果有 Google API，初始化它
    initializeGoogleApi();
    
    // 初始化 Arduino 連接功能
    setupArduinoConnection();
    
    // 設定 API Key 按鈕事件
    setupApiKeyButton();
});

// 初始化所有功能模組
function initializeModules() {
    try {
        // 初始化手動輸入處理器 (替代語音識別功能)
        window.speechRecognitionInstance = new ManualInputHandler();
        
        // 確保舊的語音識別參照也指向新的處理器
        window.SpeechRecognitionHandler = ManualInputHandler;
        
        // 初始化各功能模組
        window.recipeGeneratorInstance = new RecipeGenerator();
        window.cocktailGeneratorInstance = new CocktailGenerator();
        window.arduinoServiceInstance = new ArduinoService();
        
    } catch (error) {
        console.error('初始化模組時出錯:', error);
        alert('系統初始化時出現問題。請重新整理頁面，若問題持續發生，請聯繫系統管理員。');
        
        // 即使出錯也嘗試初始化 Arduino 服務（避免完全無法工作）
        try {
            if (!window.arduinoServiceInstance) {
                window.arduinoServiceInstance = new ArduinoService();
            }
        } catch (arduinoError) {
            console.error('Arduino 服務緊急初始化也失敗:', arduinoError);
        }
    }
}

// 設置標籤頁切換功能
function setupTabSwitching() {
    const recipeTabBtn = document.getElementById('recipeTabBtn');
    const cocktailTabBtn = document.getElementById('cocktailTabBtn');
    const recipeContent = document.getElementById('recipeContent');
    const cocktailContent = document.getElementById('cocktailContent');
    
    // 點擊食譜標籤
    recipeTabBtn.addEventListener('click', () => {
        recipeTabBtn.classList.add('active');
        cocktailTabBtn.classList.remove('active');
        recipeContent.classList.add('active');
        cocktailContent.classList.remove('active');
    });
    
    // 點擊調酒標籤
    cocktailTabBtn.addEventListener('click', () => {
        cocktailTabBtn.classList.add('active');
        recipeTabBtn.classList.remove('active');
        cocktailContent.classList.add('active');
        recipeContent.classList.remove('active');
    });
}

// 初始化 Google API
async function initializeGoogleApi() {
    let removeLoadingIndicator = null;
    try {
        console.log('開始初始化 Google API...');
        
        // 先清除任何存在的載入指示器
        clearAllLoadingIndicators();
        
        // 確保 SDK 已正確載入
        try {
            await ensureGoogleSdkLoaded();
            console.log('SDK 已成功載入並可用');
        } catch (sdkError) {
            console.error('SDK 載入失敗:', sdkError);
            showApiKeyStatus(false, 'SDK載入失敗');
            return;
        }
        
        // 創建 Google API 服務實例
        window.geminiServiceInstance = new GeminiService();
        
        // 檢查本地存儲是否已有 API Key
        let apiKey = localStorage.getItem('googleApiKey');
        
        // 如果沒有 API Key，要求用戶輸入
        if (!apiKey) {
            console.log('未找到保存的 API Key，準備提示用戶輸入...');
            apiKey = await promptForApiKey();
        }
        
        // 確認 API Key 格式
        if (!isValidApiKeyFormat(apiKey)) {
            console.log('API Key 格式無效，請求重新輸入');
            showApiKeyStatus(false, '格式無效');
            apiKey = await promptForApiKey();
        }
        
        // 檢查 API Key 是否有效
        if (!apiKey || apiKey === 'MOCK_API_KEY_FOR_DEMO') {
            console.log('未提供有效的 API Key，將使用模擬數據');
            showApiKeyStatus(false, '使用模擬數據');
            return;
        }
        
        // 記錄 API Key 的字符長度和格式，避免記錄實際 Key (安全考慮)
        console.log(`API Key 資訊: 長度=${apiKey.length}, 前綴=${apiKey.substring(0, 3)}..., 格式有效=${isValidApiKeyFormat(apiKey)}`);
        
        // 顯示載入狀態
        removeLoadingIndicator = showLoadingStatus('正在初始化 Google API...');
        
        // 初始化服務 (使用帶超時的 Promise)
        console.log('嘗試初始化 Google API...');
        const initialized = await Promise.race([
            window.geminiServiceInstance.initialize(apiKey),
            new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error('初始化超時 (30秒)'));
                }, 30000); // 給比較長的超時時間，因為第一次初始化可能較慢
            })
        ]);
        
        // 移除載入指示器
        if (removeLoadingIndicator) removeLoadingIndicator();
        
        if (initialized) {
            console.log('Google API 服務已成功初始化');
            
            // 如果初始化成功，保存 API Key
            localStorage.setItem('googleApiKey', apiKey);
            
            // 顯示成功訊息
            showApiKeyStatus(true);
            
            // 執行一次簡單測試，確保服務完全可用
            try {
                const testResult = await window.geminiServiceInstance.model.generateContent("測試連接");
                console.log('API 測試成功:', testResult);
            } catch (testError) {
                console.warn('API 初始化成功但測試失敗:', testError);
                // 即使測試失敗，我們仍然認為初始化成功，因為可能只是臨時網絡問題
            }
        } else {
            console.log('Google API 初始化失敗，將使用模擬數據');
            localStorage.removeItem('googleApiKey'); // 清除無效的 API Key
            showApiKeyStatus(false, '初始化失敗');
        }
    } catch (error) {
        console.error('初始化 Google API 時出錯:', error);
        console.log('將使用模擬數據');
        // 移除載入指示器
        if (removeLoadingIndicator) removeLoadingIndicator();
        
        // 根據錯誤類型顯示更具體的訊息
        if (error.message && error.message.includes('超時')) {
            showApiKeyStatus(false, '連線超時');
        } else if (error.message && error.message.includes('API key')) {
            showApiKeyStatus(false, 'API Key 無效');
            localStorage.removeItem('googleApiKey'); // 清除無效的 API Key
        } else {
            showApiKeyStatus(false, '初始化錯誤');
        }
    }
}

// 確保 Google SDK 已加載 - 簡化版
async function ensureGoogleSdkLoaded() {
    console.log('檢查 Google Generative AI SDK 是否已載入...');
    
    // 立即檢查 SDK 是否已加載
    if (typeof window.google !== 'undefined' && typeof window.google.generativeAI !== 'undefined') {
        console.log('Google Generative AI SDK 已存在並可用');
        return true;
    }
    
    // 等待一下，因為頁面上的腳本可能正在載入
    console.log('SDK 未就緒，等待3秒...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 再次檢查是否已載入
    if (typeof window.google !== 'undefined' && typeof window.google.generativeAI !== 'undefined') {
        console.log('延遲載入的 SDK 現已可用');
        return true;
    }
    
    // 嘗試載入內嵌版
    console.log('尋找內嵌版 SDK...');
    if (document.querySelector('script[src*="gemini-sdk-embedded.js"]')) {
        // 給內嵌版一點初始化時間
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 檢查內嵌版是否可用
        if (typeof window.google !== 'undefined' && typeof window.google.generativeAI !== 'undefined') {
            console.log('內嵌版 SDK 可用！');
            return true;
        }
    }
    
    console.log('開始手動載入 SDK...');
    
    // 從多個 CDN 依次嘗試載入
    const cdnSources = [
        'https://cdn.jsdelivr.net/npm/@google/generative-ai@latest',
        'https://unpkg.com/@google/generative-ai@latest',
        'https://cdn.jsdelivr.net/npm/@google/generative-ai@0.2.0/dist/index.min.js'
    ];
    
    // 依次嘗試每個 CDN
    for (let i = 0; i < cdnSources.length; i++) {
        try {
            console.log(`嘗試從來源 ${i+1}/${cdnSources.length} 載入 SDK...`);
            
            // 嘗試載入此 CDN
            await loadScript(cdnSources[i]);
            
            // 等待 SDK 初始化
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 檢查是否載入成功
            if (typeof window.google !== 'undefined' && typeof window.google.generativeAI !== 'undefined') {
                console.log(`成功從來源 ${i+1} 載入 SDK`);
                return true;
            }
        } catch (err) {
            console.warn(`從來源 ${i+1} 載入失敗:`, err);
        }
    }
    
    // 如果全部嘗試都失敗
    console.error('所有 SDK 載入來源都失敗');
    
    // 創建一個簡單的備用實現
    console.log('創建備用 SDK 實現...');
    if (typeof window.google === 'undefined') window.google = {};
    
    window.google.generativeAI = {
        configure: function(config) { 
            this.apiKey = config.apiKey; 
            console.log('已使用備用實現設置 API Key');
        },
        getGenerativeModel: function() {
            return {
                generateContent: async function() {
                    console.log('使用備用實現，無法連接 Google API');
                    throw new Error('SDK 載入失敗，無法使用 Google API');
                }
            };
        }
    };
    
    // 顯示錯誤訊息
    showNotification('⚠️ Google SDK 載入失敗，將使用模擬數據', 'error');
    
    // 返回 false 表示載入失敗但有備用
    return false;
}

// 載入腳本輔助函數
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`無法載入腳本: ${src}`));
        
        document.head.appendChild(script);
    });
}

// 顯示載入狀態
function showLoadingStatus(message) {
    const loadingElement = document.createElement('div');
    loadingElement.id = 'loadingStatus';
    loadingElement.className = 'loading-status';
    loadingElement.innerHTML = `<span class="loading-spinner"></span> ${message}`;
    
    // 添加樣式
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        .loading-status {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 15px;
            border-radius: 4px;
            z-index: 9999;
            display: flex;
            align-items: center;
        }
        
        .loading-spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s linear infinite;
            margin-right: 8px;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(styleEl);
    
    // 如果已有載入狀態元素，先移除它
    const existingElement = document.getElementById('loadingStatus');
    if (existingElement) {
        document.body.removeChild(existingElement);
    }
    
    document.body.appendChild(loadingElement);
    
    // 返回一個函數，用於移除載入狀態
    return () => {
        const element = document.getElementById('loadingStatus');
        if (element) {
            document.body.removeChild(element);
        }
    };
}

// 彈出對話框要求用戶提供 API Key - 完全重寫版
function promptForApiKey() {
    return new Promise((resolve) => {
        // 先清除所有現有模態框
        document.querySelectorAll('.api-key-modal').forEach(el => el.remove());
        
        console.log('創建全新 API Key 輸入框');
        
        // 創建基本遮罩層
        const overlay = document.createElement('div');
        overlay.className = 'api-key-modal';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            z-index: 99999;
            display: flex;
            justify-content: center;
            align-items: center;
        `;
        
        // 不使用 innerHTML，改用直接創建DOM元素，以確保事件綁定正確
        const modalBox = document.createElement('div');
        modalBox.style.cssText = `
            background: white; 
            width: 90%; 
            max-width: 450px; 
            border-radius: 10px; 
            padding: 25px; 
            box-shadow: 0 5px 25px rgba(0,0,0,0.3);
        `;
        
                        // 標題
        const title = document.createElement('h3');
        title.textContent = '設定 Google API Key';
        title.style.cssText = 'color: #1976D2; margin-top: 0;';
        modalBox.appendChild(title);
        
        // 說明文字
        const description = document.createElement('p');
        description.textContent = '請輸入您的 Google API Key 或選擇使用模擬數據';
        description.style.cssText = 'color: #555;';
        modalBox.appendChild(description);
        
        // 輸入框
        const apiKeyField = document.createElement('input');
        apiKeyField.type = 'text';
        apiKeyField.id = 'apiKeyField';
        apiKeyField.placeholder = '請輸入您的 API Key...';
        apiKeyField.style.cssText = `
            width: 100%; 
            padding: 12px; 
            border: 1px solid #ddd; 
            border-radius: 8px; 
            font-size: 16px;
            margin: 15px 0;
            box-sizing: border-box;
        `;
        modalBox.appendChild(apiKeyField);
        
        // 按鈕容器
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; justify-content: space-between; margin-top: 20px;';
        
        // 使用模擬數據按鈕
        const useMockBtn = document.createElement('button');
        useMockBtn.textContent = '使用模擬數據';
        useMockBtn.style.cssText = `
            background: #2196F3;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
        `;
        buttonContainer.appendChild(useMockBtn);
        
        // 右側按鈕組
        const rightButtons = document.createElement('div');
        rightButtons.style.cssText = 'display: flex; gap: 10px;';
        
        // 取消按鈕
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.style.cssText = `
            background: #f5f5f5;
            border: none;
            padding: 10px 15px;
            border-radius: 5px;
            cursor: pointer;
        `;
        rightButtons.appendChild(cancelBtn);
        
        // 確認按鈕
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = '確認';
        confirmBtn.style.cssText = `
            background: #4CAF50;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            transition: background-color 0.3s;
        `;
        
        // 添加懸停效果
        confirmBtn.addEventListener('mouseenter', () => {
            confirmBtn.style.backgroundColor = '#45a049';
        });
        
        confirmBtn.addEventListener('mouseleave', () => {
            confirmBtn.style.backgroundColor = '#4CAF50';
        });
        
        // 添加按下效果
        confirmBtn.addEventListener('mousedown', () => {
            confirmBtn.style.transform = 'scale(0.98)';
        });
        
        confirmBtn.addEventListener('mouseup', () => {
            confirmBtn.style.transform = 'scale(1)';
        });
        
        rightButtons.appendChild(confirmBtn);
        
        // 將按鈕組添加至容器
        buttonContainer.appendChild(rightButtons);
        modalBox.appendChild(buttonContainer);
        
        // 添加說明連結
        const linkContainer = document.createElement('div');
        linkContainer.style.cssText = 'margin-top: 20px; text-align: center;';
        
        const helpLink = document.createElement('a');
        helpLink.href = 'https://console.cloud.google.com/apis/credentials';
        helpLink.target = '_blank';
        helpLink.textContent = '如何取得 Google API Key? 前往 Google Cloud Console →';
        helpLink.style.cssText = 'color: #2196F3; text-decoration: none; font-size: 14px;';
        
        linkContainer.appendChild(helpLink);
        modalBox.appendChild(linkContainer);
        
        // 將模態框添加到遮罩層
        overlay.appendChild(modalBox);
        
        // 添加到頁面
        document.body.appendChild(overlay);
        console.log('新版 API Key 輸入框已添加到頁面');
        
        // 設置焦點
        setTimeout(() => apiKeyField.focus(), 200);
        
        // 事件綁定 - 確保按鈕能夠正確響應點擊
        confirmBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('確認按鈕被點擊！');
            
            const apiKey = apiKeyField.value.trim();
            console.log('API Key 值:', apiKey ? '已輸入' : '未輸入');
            
            // 移除模態框
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
            
            resolve(apiKey || null);
        });
        
        cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('取消按鈕被點擊！');
            
            // 移除模態框
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
            
            resolve(null);
        });
        
        // 使用模擬數據按鈕事件
        useMockBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('模擬數據按鈕被點擊！');
            
            // 移除模態框
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
            
            resolve('MOCK_API_KEY_FOR_DEMO');
        });
        
        // Enter 鍵提交
        apiKeyField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                console.log('用戶按下 Enter 鍵提交');
                
                const apiKey = apiKeyField.value.trim();
                console.log('Enter 鍵提交 API Key:', apiKey ? '已輸入' : '未輸入');
                
                // 移除模態框
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
                
                resolve(apiKey || null);
            }
        });
        
        // ESC 鍵取消
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                console.log('ESC 鍵被按下');
                
                // 移除模態框
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
                
                document.removeEventListener('keydown', escHandler);
                resolve(null);
            }
        };
        document.addEventListener('keydown', escHandler);
        
        // 點擊遮罩層背景關閉模態框
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                console.log('點擊背景關閉模態框');
                
                // 移除模態框
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
                
                resolve(null);
            }
        });
        
        // 防止模態框內容區域的點擊冒泡到遮罩層
        modalBox.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    });
}

// 顯示 API 狀態訊息
function showApiKeyStatus(success, errorType = '') {
    // 先清除可能存在的狀態訊息
    const existingStatus = document.querySelectorAll('.api-status');
    existingStatus.forEach(el => {
        if (document.body.contains(el)) {
            document.body.removeChild(el);
        }
    });
    
    const statusMessage = document.createElement('div');
    statusMessage.className = success ? 'api-status success' : 'api-status error';
    
    // 根據成功狀態和錯誤類型顯示不同訊息
    if (success) {
        statusMessage.innerHTML = '<strong>✅ Google API 已成功連接</strong><br>將使用 Google AI 生成個性化食譜和調酒';
    } else {
        // 根據錯誤類型顯示不同訊息
        switch(errorType) {
            case '格式無效':
                statusMessage.innerHTML = '<strong>⚠️ API Key 格式無效</strong><br>請確保複製完整的 Google API Key';
                break;
            case 'API Key 無效':
                statusMessage.innerHTML = '<strong>⚠️ API Key 無效</strong><br>請檢查是否為正確的 Google API Key';
                break;
            case '連線超時':
                statusMessage.innerHTML = '<strong>⚠️ 連接 Google API 超時</strong><br>請檢查您的網路連線並再試一次';
                break;
            case '初始化失敗':
                statusMessage.innerHTML = '<strong>⚠️ Google API 初始化失敗</strong><br>請檢查 API Key 和網路連線';
                break;
            case '使用模擬數據':
                statusMessage.innerHTML = '<strong>ℹ️ 使用模擬數據</strong><br>您可以隨時設定 API Key 以獲得更精準的 AI 生成';
                break;
            default:
                statusMessage.innerHTML = '<strong>⚠️ 使用模擬數據</strong><br>請設定 API Key 以啟用 Google AI 生成';
        }
    }
    
    // 設置樣式
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        .api-status {
            padding: 12px 15px;
            border-radius: 8px;
            margin-bottom: 15px;
            animation: fadeIn 0.3s ease-in-out;
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1000;
            box-shadow: 0 3px 15px rgba(0,0,0,0.15);
            font-size: 14px;
            line-height: 1.5;
            max-width: 300px;
        }
        
        .api-status strong {
            font-size: 16px;
            display: block;
            margin-bottom: 4px;
        }
        
        .api-status.success {
            background-color: #e8f5e9;
            color: #2e7d32;
            border-left: 5px solid #2e7d32;
        }
        
        .api-status.error {
            background-color: #fff8e1;
            color: #e65100;
            border-left: 5px solid #e65100;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(styleEl);
    
    // 添加到頁面並設置自動移除
    document.body.appendChild(statusMessage);
    
    // 添加點擊關閉功能
    statusMessage.style.cursor = 'pointer';
    statusMessage.title = '點擊關閉';
    statusMessage.addEventListener('click', () => {
        statusMessage.style.opacity = '0';
        statusMessage.style.transition = 'opacity 0.5s ease-in-out';
        setTimeout(() => {
            if (document.body.contains(statusMessage)) {
                document.body.removeChild(statusMessage);
            }
        }, 500);
    });
    
    // 設置自動移除
    setTimeout(() => {
        if (document.body.contains(statusMessage)) {
            statusMessage.style.opacity = '0';
            statusMessage.style.transition = 'opacity 0.5s ease-in-out';
            setTimeout(() => {
                if (document.body.contains(statusMessage)) {
                    document.body.removeChild(statusMessage);
                }
            }, 500);
        }
    }, 8000); // 顯示時間延長為8秒
    
    // 更新 API Key 狀態指示器
    updateApiKeyStatusIndicator(success);
}

// 更新 API Key 狀態指示器
function updateApiKeyStatusIndicator(isConnected) {
    const apiKeyStatus = document.getElementById('apiKeyStatus');
    if (apiKeyStatus) {
        if (isConnected) {
            apiKeyStatus.innerHTML = '<i class="fas fa-check-circle"></i> 已連接';
            apiKeyStatus.classList.add('connected');
            apiKeyStatus.style.backgroundColor = '#e8f5e9';
            apiKeyStatus.style.color = '#2e7d32';
            apiKeyStatus.style.border = '1px solid #2e7d32';
        } else {
            apiKeyStatus.innerHTML = '<i class="fas fa-times-circle"></i> 未設定';
            apiKeyStatus.classList.remove('connected');
            apiKeyStatus.style.backgroundColor = '#ffebee';
            apiKeyStatus.style.color = '#c62828';
            apiKeyStatus.style.border = '1px solid #c62828';
        }
    }
    
    // 更新設定按鈕樣式
    const setApiKeyBtn = document.getElementById('setApiKeyBtn');
    if (setApiKeyBtn) {
        if (isConnected) {
            setApiKeyBtn.innerHTML = '<i class="fas fa-edit"></i> 重新設定 API Key';
            setApiKeyBtn.style.backgroundColor = '#4CAF50';
        } else {
            setApiKeyBtn.innerHTML = '<i class="fas fa-key"></i> 設定 Google API Key';
            setApiKeyBtn.style.backgroundColor = '#2196F3';
        }
    }
    
    // 添加 CSS 樣式
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        .status-indicator {
            padding: 8px 12px;
            border-radius: 20px;
            font-weight: bold;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.3s ease;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .status-indicator.connected {
            color: #2e7d32;
            background-color: #e8f5e9;
            border: 1px solid #2e7d32;
        }
        
        .api-settings-section {
            margin-bottom: 20px;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 8px;
            border: 2px solid #e3f2fd;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            transition: all 0.3s ease;
        }
        
        .api-settings-section:hover {
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        
        .api-controls {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 10px;
        }
        
        .api-info {
            color: #6c757d;
            margin: 8px 0 0 0;
            font-style: italic;
        }
        
        #setApiKeyBtn {
            transition: all 0.3s ease;
        }
        
        #setApiKeyBtn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 10px rgba(0,0,0,0.2);
        }
    `;
    document.head.appendChild(styleEl);
}

// 設置 API Key 按鈕事件
function setupApiKeyButton() {
    const setApiKeyBtn = document.getElementById('setApiKeyBtn');
    if (setApiKeyBtn) {
        setApiKeyBtn.addEventListener('click', async () => {
            console.log('用戶點擊設定 API Key 按鈕');
            
            try {
                // 清除可能存在的載入指示器
                clearAllLoadingIndicators();
                
                // 確保 SDK 已載入
                try {
                    const sdkLoaded = await ensureGoogleSdkLoaded();
                    console.log('SDK 載入狀態:', sdkLoaded ? '成功' : '部分失敗但有備用');
                } catch (sdkError) {
                    console.warn('SDK 載入過程中出現警告:', sdkError);
                    // 繼續執行，因為我們有備用策略
                }
                
                // 顯示輸入提示
                showNotification('請輸入您的 Google API Key', 'info', 2000);
                
                console.log('顯示 API Key 輸入模態框');
                // 顯示 API Key 輸入模態框
                const apiKey = await promptForApiKey();
                console.log(`獲取到的 API Key: ${apiKey ? '已填寫' : '未填寫'}`);
                
                if (apiKey && apiKey !== 'MOCK_API_KEY_FOR_DEMO') {
                    // 顯示載入中狀態
                    const removeLoadingIndicator = showLoadingStatus('正在初始化 API...');
                    
                    // 嘗試初始化 API
                    try {
                        console.log('開始簡化版 Google API 初始化流程...');
                        
                        // 重置或創建 Google API Service 實例
                        window.geminiServiceInstance = new GeminiService();
                        
                        // 顯示初始化提示
                        showNotification('🔄 連接 Google AI 服務...', 'info', 2000);
                        // 嘗試直接初始化 API，簡化流程
                        const initialized = await window.geminiServiceInstance.initialize(apiKey);
                        
                        // 移除載入指示器
                        if (removeLoadingIndicator) removeLoadingIndicator();
                        
                        if (initialized) {
                            // 成功情況
                            console.log('✅ Google API 初始化成功');
                            localStorage.setItem('googleApiKey', apiKey);
                            showApiKeyStatus(true);
                            showNotification('✅ Google API Key 設置成功！', 'success');
                            
                            // 執行一個簡單測試查詢
                            try {
                                console.log('執行 API 連線測試...');
                                const test = await window.geminiServiceInstance.model.generateContent('測試連接');
                                console.log('測試成功:', test);
                            } catch (testErr) {
                                console.warn('API 初始化成功但測試查詢失敗:', testErr);
                                // 繼續使用，可能只是暫時性問題
                            }
                        } else {
                            console.log('API 初始化失敗');
                            localStorage.removeItem('googleApiKey');
                            showApiKeyStatus(false, '初始化失敗');
                            showNotification('⚠️ 將使用模擬數據', 'warning');
                        }
                    } catch (error) {
                        console.error('API 初始化錯誤:', error);
                        if (removeLoadingIndicator) removeLoadingIndicator();
                        
                        // 清除無效的 API Key
                        localStorage.removeItem('googleApiKey');
                        
                        // 簡化錯誤處理，顯示通用錯誤訊息
                        showApiKeyStatus(false, '連接失敗');
                        showNotification('⚠️ 無法連接到 Google AI 服務', 'error');
                        
                        // 顯示簡化版錯誤提示
                        alert('無法連接到 Google AI 服務。可能原因：\n\n' +
                              '1. Google API Key 無效或格式不正確\n' +
                              '2. 網路連線問題\n' +
                              '3. Google AI 服務暫時不可用\n' +
                              '4. API Key 權限不足或配額用盡\n\n' +
                              '請確保您複製了正確的 Google API Key，並檢查網路連線。');
                        
                        // 自動開始診斷
                        console.log('自動啟動診斷...');
                        setTimeout(() => diagnosisApiIssue(), 1000);
                    }
                } else if (apiKey === 'MOCK_API_KEY_FOR_DEMO') {
                    console.log('用戶選擇使用模擬數據');
                    showApiKeyStatus(false, '使用模擬數據');
                    showNotification('ℹ️ 將使用模擬數據生成食譜和調酒', 'info');
                }
            } catch (error) {
                console.error('設定 API Key 過程中發生錯誤:', error);
                clearAllLoadingIndicators();
                showNotification('⚠️ 設定 API Key 時出錯', 'error');
                alert('設定 API Key 時發生錯誤，請檢查瀏覽器控制台獲取詳細信息。');
            }
        });
    } else {
        console.error('找不到 setApiKeyBtn 元素');
    }
    
    // 初始檢查 API Key 狀態
    const apiKey = localStorage.getItem('googleApiKey');
    updateApiKeyStatusIndicator(!!apiKey);
}

// 清除所有載入指示器
function clearAllLoadingIndicators() {
    const loadingElements = document.querySelectorAll('.loading-status');
    loadingElements.forEach(el => {
        if (document.body.contains(el)) {
            document.body.removeChild(el);
        }
    });
}

// 通知顯示功能
function showNotification(message, type = 'info', duration = 3000) {
    // 創建通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // 添加樣式
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        max-width: 300px;
        word-wrap: break-word;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    // 根據類型設置背景色
    switch(type) {
        case 'success':
            notification.style.backgroundColor = '#4caf50';
            break;
        case 'error':
            notification.style.backgroundColor = '#f44336';
            break;
        case 'warning':
            notification.style.backgroundColor = '#ff9800';
            break;
        case 'info':
        default:
            notification.style.backgroundColor = '#2196f3';
            break;
    }
    
    // 添加到頁面
    document.body.appendChild(notification);
    
    // 顯示動畫
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // 自動移除
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
}

// 全局系統診斷函數
window.diagnoseSystem = async function() {
    console.log('🔍 開始系統診斷...');
    
    try {
        // 顯示診斷開始提示
        showNotification('🔍 開始系統診斷...', 'info', 2000);
        
        // 調用 API 問題診斷
        await diagnosisApiIssue();
        
        console.log('✅ 系統診斷完成');
        showNotification('✅ 系統診斷完成', 'success', 2000);
        
    } catch (error) {
        console.error('❌ 系統診斷過程中出錯:', error);
        showNotification('❌ 系統診斷過程中出錯', 'error', 3000);
    }
};

// 診斷 API 連接問題
// 進階版 API 問題診斷工具
async function diagnosisApiIssue() {
    console.log('啟動進階版 API 診斷工具...');
    
    const results = {
        internetConnected: false,
        browserCompatible: false,
        sdkLoaded: false,
        sdkVersion: 'unknown',
        sdkSource: 'unknown',
        apiKeyFound: false,
        apiKeyValid: false,
        apiKeyStatus: 'unknown',
        canInitialize: false,
        apiLatency: null,
        detailedErrors: [],
        recommendations: [],
        autoFixed: false
    };
    
    try {
        // 檢查瀏覽器兼容性
        console.log('檢查瀏覽器兼容性...');
        const userAgent = navigator.userAgent;
        results.browserInfo = userAgent;
        
        // 檢查常見不兼容的瀏覽器或太舊的版本
        const isCompatible = !(/MSIE|Trident|Edge\/\d+/).test(userAgent);
        results.browserCompatible = isCompatible;
        
        if (!isCompatible) {
            console.log('檢測到可能不兼容的瀏覽器');
            results.recommendations.push('您使用的瀏覽器可能不支援最新的 Google AI API，請考慮使用 Chrome、Firefox 或 Safari 的最新版本');
        } else {
            console.log('瀏覽器兼容性檢查通過');
        }
        
        // 檢查網絡連接 - 更詳細的檢查
        console.log('進行增強版網絡連接檢查...');
        try {
            // 基本檢查
            const online = navigator.onLine;
            results.internetConnected = online;
            
            if (online) {
                console.log('瀏覽器報告已連接網絡');
                
                // 嘗試訪問 Google 服務以驗證實際連接性
                try {
                    const startTime = Date.now();
                    // 只嘗試連接，不檢查響應（避免CORS問題）
                    await fetch('https://www.google.com/generate_204', { 
                        method: 'HEAD',
                        mode: 'no-cors',
                        cache: 'no-store'
                    });
                    
                    const latency = Date.now() - startTime;
                    results.googleLatency = latency;
                    
                    console.log(`成功連接到 Google 服務，延遲: ${latency}ms`);
                    
                    if (latency > 2000) {
                        results.recommendations.push(`網絡連接延遲較高 (${latency}ms)，可能會影響 API 性能`);
                    }
                } catch (netError) {
                    console.warn('無法連接到 Google 服務:', netError);
                    results.detailedErrors.push({type: 'network', message: netError.message});
                    results.recommendations.push('無法連接到 Google 服務，請檢查您的網絡連接或是否有防火牆阻擋');
                }
            } else {
                console.log('瀏覽器報告未連接網絡');
                results.recommendations.push('您似乎未連接到互聯網，請檢查您的網絡連接');
            }
        } catch (e) {
            console.error('檢查網絡連接時出錯:', e);
            results.detailedErrors.push({type: 'network_check', message: e.message});
        }
        
        // 增強版 SDK 載入檢查
        console.log('進行增強版 Google Generative AI SDK 檢查...');
        
        // 詳細檢查所有可能的 SDK 實現
        const stdSdkLoaded = typeof window.google !== 'undefined' && typeof window.google.generativeAI !== 'undefined';
        const cdnSdkLoaded = typeof window.GoogleGenerativeAI === 'function';
        const embeddedSdkLoaded = typeof window.EmbeddedGoogleGenerativeAI === 'function';
        
        console.log(`SDK 檢測結果: 標準SDK=${stdSdkLoaded}, CDN SDK=${cdnSdkLoaded}, 內嵌SDK=${embeddedSdkLoaded}`);
        
        if (stdSdkLoaded) {
            results.sdkLoaded = true;
            results.sdkSource = '標準SDK';
        } else if (cdnSdkLoaded) {
            results.sdkLoaded = true;
            results.sdkSource = 'CDN SDK';
        } else if (embeddedSdkLoaded) {
            results.sdkLoaded = true;
            results.sdkSource = '內嵌SDK';
        } else {
            // 檢查腳本載入狀態
            const embeddedScriptExists = document.querySelector('script[src*="gemini-sdk-embedded.js"]') !== null;
            const cdnScriptExists = document.querySelector('script[src*="generative-ai"]') !== null;
            
            console.log(`腳本檢測結果: 內嵌腳本=${embeddedScriptExists}, CDN腳本=${cdnScriptExists}`);
            
            if (embeddedScriptExists || cdnScriptExists) {
                results.recommendations.push('發現SDK腳本但未正確初始化，這可能是瀏覽器緩存或腳本錯誤導致的');
            } else {
                results.recommendations.push('未檢測到SDK腳本，將嘗試自動修復');
            }
            
            // 嘗試自動修復 SDK 問題
            try {
                console.log('嘗試自動修復SDK問題...');
                
                // 初始化全局對象
                if (typeof window.google === 'undefined') {
                    window.google = {};
                }
                
                // 載入內嵌SDK
                if (!embeddedScriptExists) {
                    console.log('添加內嵌SDK腳本...');
                    const script = document.createElement('script');
                    script.src = 'js/gemini-sdk-embedded.js';
                    script.async = false; // 確保同步載入
                    document.head.appendChild(script);
                }
                
                // 等待腳本載入完成
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // 檢查是否成功修復
                const fixedEmbeddedSdk = typeof window.EmbeddedGoogleGenerativeAI === 'function';
                
                if (fixedEmbeddedSdk) {
                    console.log('成功載入內嵌SDK');
                    // 設置備用方案
                    window.GoogleGenerativeAI = window.EmbeddedGoogleGenerativeAI;
                    results.sdkLoaded = true;
                    results.sdkSource = '內嵌SDK (已修復)';
                    results.autoFixed = true;
                } else {
                    console.warn('自動修復未能載入SDK');
                    results.recommendations.push('自動修復失敗，請重新整理頁面');
                }
            } catch (fixError) {
                console.error('自動修復時出錯:', fixError);
                results.detailedErrors.push({type: 'sdk_fix', message: fixError.message});
            }
        }
        
        // 增強版 API Key 檢查
        console.log('進行增強版 API Key 檢查...');
        const storedApiKey = localStorage.getItem('googleApiKey');
        
        if (storedApiKey) {
            console.log('找到存儲的 API Key');
            results.apiKeyFound = true;
            
            // 檢查格式
            const formatValid = isValidApiKeyFormat(storedApiKey);
            results.apiKeyValid = formatValid;
            
            if (!formatValid) {
                console.log('API Key 格式無效');
                results.apiKeyStatus = 'invalid_format';
                results.recommendations.push('API Key 格式無效，請重新設置正確的 API Key');
            }
        } else {
            console.log('未找到存儲的 API Key');
            results.apiKeyStatus = 'missing';
            results.recommendations.push('請設置您的 Google API Key');
        }
        
        // 增強版初始化測試
        if (results.sdkLoaded && results.apiKeyValid) {
            console.log('嘗試測試 API 連接...');
            
            try {
                // 確保 Google API Service 實例存在
                if (!window.geminiServiceInstance) {
                    console.log('創建新的 Google API Service 實例用於測試');
                    window.geminiServiceInstance = new GeminiService();
                } else {
                    // 檢查現有實例狀態
                    const isAlreadyInitialized = window.geminiServiceInstance.isInitialized();
                    console.log(`現有 Google API Service 實例狀態: ${isAlreadyInitialized ? '已初始化' : '未初始化'}`);
                    
                    if (isAlreadyInitialized) {
                        // 如果已初始化，我們可以跳過測試
                        console.log('Google API Service 已初始化，跳過測試');
                        results.canInitialize = true;
                        results.apiKeyStatus = 'valid';
                        return showDiagnosisResult(results);
                    }
                }
                
                // 進行簡短測試以確認連接
                console.log('開始測試 API 連接，這可能需要幾秒鐘...');
                const startTime = Date.now();
                
                // 向用戶顯示正在進行測試
                showNotification('🔄 正在測試 API 連接...', 'info');
                
                try {
                    // 使用短超時只測試連接
                    const testResult = await Promise.race([
                        window.geminiServiceInstance.initialize(storedApiKey),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('診斷初始化超時')), 8000))
                    ]);
                    
                    const initTime = Date.now() - startTime;
                    results.apiLatency = initTime;
                    
                    if (testResult) {
                        console.log(`API 連接測試成功，耗時: ${initTime}ms`);
                        results.canInitialize = true;
                        results.apiKeyStatus = 'valid';
                        
                        // 如果初始化時間過長，添加建議
                        if (initTime > 5000) {
                            results.recommendations.push(`API 響應時間較慢 (${Math.round(initTime/1000)}秒)，可能影響體驗`);
                        }
                        
                        showNotification('✅ API 連接測試成功！', 'success');
                    } else {
                        console.log('API 連接測試失敗');
                        results.apiKeyStatus = 'rejected';
                        results.recommendations.push('API 拒絕了您的請求，您的 API Key 可能已失效或超出配額');
                        
                        showNotification('❌ API 連接測試失敗', 'error');
                    }
                } catch (e) {
                    console.error('API 連接測試錯誤:', e);
                    results.detailedErrors.push({type: 'api_test', message: e.message});
                    
                    // 根據錯誤提供具體建議
                    if (e.message.includes('API key not valid') || e.message.includes('無效')) {
                        results.apiKeyStatus = 'invalid';
                        results.recommendations.push('API Key 無效，請更新您的 API Key');
                        showNotification('❌ API Key 無效', 'error');
                    } else if (e.message.includes('quota') || e.message.includes('配額')) {
                        results.apiKeyStatus = 'quota_exceeded';
                        results.recommendations.push('API 使用配額已達上限，請等待配額重置或使用其他 API Key');
                        showNotification('❌ API 配額已用盡', 'error');
                    } else if (e.message.includes('timeout') || e.message.includes('超時')) {
                        results.apiKeyStatus = 'timeout';
                        results.recommendations.push('API 響應超時，請檢查網絡連接或稍後再試');
                        showNotification('❌ API 連接超時', 'error');
                    } else {
                        results.apiKeyStatus = 'error';
                        results.recommendations.push(`連接錯誤: ${e.message}`);
                        showNotification('❌ API 連接錯誤', 'error');
                    }
                }
            } catch (generalError) {
                console.error('測試過程中發生意外錯誤:', generalError);
                results.detailedErrors.push({type: 'general', message: generalError.message});
                results.recommendations.push('測試過程中發生意外錯誤，請重新整理頁面後再試');
            }
        }
        
        // 生成最終診斷結論
        if (results.autoFixed) {
            results.recommendations.unshift('已自動修復部分問題，請重試您的請求');
        }
        
        if (results.internetConnected && results.sdkLoaded && results.canInitialize) {
            results.recommendations.unshift('診斷完成，系統運作正常');
        } else if (!results.internetConnected) {
            results.recommendations.unshift('網絡連接問題是導致 API 無法使用的主要原因');
        } else if (!results.sdkLoaded && !results.autoFixed) {
            results.recommendations.unshift('SDK 載入失敗是主要問題，請重新整理頁面');
        } else if (results.apiKeyStatus === 'invalid' || results.apiKeyStatus === 'invalid_format') {
            results.recommendations.unshift('您的 API Key 無效，請重新設置');
        }
        
        // 顯示診斷結果
        console.log('診斷完成，詳細結果:', results);
        showDiagnosisResult(results);
        
        return results;
    } catch (error) {
        console.error('診斷工具執行出錯:', error);
        results.detailedErrors.push({type: 'diagnosis_tool', message: error.message});
        results.recommendations.push(`診斷工具錯誤: ${error.message}，請重新整理頁面後再試`);
        showDiagnosisResult(results);
        return results;
    }
}

// 顯示診断結果
function showDiagnosisResult(results) {
    console.log('=== API 診斷結果 ===');
    console.log('網路連接:', results.internetConnected ? '✅' : '❌');
    console.log('瀏覽器兼容:', results.browserCompatible ? '✅' : '❌');
    console.log('SDK 載入:', results.sdkLoaded ? '✅' : '❌');
    console.log('API Key 找到:', results.apiKeyFound ? '✅' : '❌');
    console.log('API Key 有效:', results.apiKeyValid ? '✅' : '❌');
    console.log('可以初始化:', results.canInitialize ? '✅' : '❌');
    
    if (results.detailedErrors.length > 0) {
        console.log('詳細錯誤:');
        results.detailedErrors.forEach(error => {
            console.log(`- ${error.type}: ${error.message}`);
        });
    }
    
    if (results.recommendations.length > 0) {
        console.log('建議:');
        results.recommendations.forEach(rec => {
            console.log(`- ${rec}`);
        });
    }
    
    // 顯示通知給用戶
    let notificationMessage = '';
    let notificationType = 'info';
    
    if (results.canInitialize && results.apiKeyValid) {
        notificationMessage = '✅ API 診斷完成：一切正常';
        notificationType = 'success';
    } else if (results.detailedErrors.length > 0) {
        notificationMessage = `❌ 發現 ${results.detailedErrors.length} 個問題`;
        notificationType = 'error';
    } else {
        notificationMessage = '⚠️ 診斷完成，請檢查控制台詳情';
        notificationType = 'warning';
    }
    
    showNotification(notificationMessage, notificationType, 4000);
}

// 調試輸入函數
window.debugInputs = function() {
    console.log('=== 調試輸入狀態 ===');
    
    const inputs = {
        ingredients: document.getElementById('manualIngredientsInput')?.value || '',
        foodRequirements: document.getElementById('foodRequirementsInput')?.value || '',
        budget: document.getElementById('budgetInput')?.value || '',
        calories: document.getElementById('caloriesInput')?.value || ''
    };
    
    console.log('表單輸入值:', inputs);
    
    // 檢查 ManualInputHandler 狀態
    if (window.speechRecognitionInstance) {
        const result = window.speechRecognitionInstance.getRecognitionResult();
        console.log('ManualInputHandler 解析結果:', result);
    } else {
        console.warn('ManualInputHandler 未初始化');
    }
    
    // 顯示結果
    alert(`調試輸入狀態：\n\n食材: ${inputs.ingredients}\n食物需求: ${inputs.foodRequirements}\n預算: ${inputs.budget}\n熱量: ${inputs.calories}\n\n詳細資訊請查看瀏覽器控制台`);
};

// 測試食譜生成功能
window.testRecipeGeneration = function() {
    console.log('=== 測試食譜生成 ===');
    
    // 自動填入測試數據
    const ingredientsInput = document.getElementById('manualIngredientsInput');
    const foodRequirementsInput = document.getElementById('foodRequirementsInput');
    const budgetInput = document.getElementById('budgetInput');
    const caloriesInput = document.getElementById('caloriesInput');
    
    if (ingredientsInput) ingredientsInput.value = '雞肉、蔬菜、米飯';
    if (foodRequirementsInput) foodRequirementsInput.value = '中式、不要太辣';
    if (budgetInput) budgetInput.value = '150';
    if (caloriesInput) caloriesInput.value = '500';
    
    // 觸發手動輸入處理器更新
    if (window.speechRecognitionInstance && typeof window.speechRecognitionInstance.updateFromManualInput === 'function') {
        window.speechRecognitionInstance.updateFromManualInput();
    }
    
    // 設置難度為簡單
    const easyBtn = document.getElementById('easyBtn');
    if (easyBtn) {
        easyBtn.click();
    }
    
    // 顯示提示
    showNotification('🧪 已填入測試數據，將自動生成食譜', 'info', 2000);
    
    // 延遲一秒後自動生成
    setTimeout(() => {
        const confirmBtn = document.getElementById('confirmBtn');
        if (confirmBtn) {
            confirmBtn.click();
        }
    }, 1000);
};

// 設置 Arduino 連接功能
function setupArduinoConnection() {
    try {
        // 檢查是否支持 Web Serial API
        if ('serial' in navigator) {
            console.log('Web Serial API 可用，Arduino 連接功能已啟用');
            
            // 設置 Arduino 連接按鈕事件
            const connectArduinoBtn = document.getElementById('connectArduinoBtn');
            if (connectArduinoBtn) {
                connectArduinoBtn.addEventListener('click', async () => {
                    if (window.arduinoServiceInstance) {
                        const connected = await window.arduinoServiceInstance.connect();
                        updateArduinoStatus(connected);
                    }
                });
            }
            
            // 設置發送到Arduino按鈕事件
            const sendToArduinoBtn = document.getElementById('sendToArduinoBtn');
            if (sendToArduinoBtn) {
                sendToArduinoBtn.addEventListener('click', () => {
                    if (window.arduinoServiceInstance && window.arduinoServiceInstance.isConnected()) {
                        // 發送當前顯示的食譜或調酒
                        sendCurrentContentToArduino();
                    }
                });
            }
            
            // 設置測試燈泡按鈕事件
            const testLightsBtn = document.getElementById('testLightsBtn');
            if (testLightsBtn) {
                testLightsBtn.addEventListener('click', async () => {
                    if (window.arduinoServiceInstance && window.arduinoServiceInstance.isConnected()) {
                        showNotification('🔍 測試燈泡序列...', 'info', 2000);
                        await window.arduinoServiceInstance.testLights();
                        showNotification('✅ 燈泡測試完成', 'success', 2000);
                    } else {
                        showNotification('⚠️ 請先連接Arduino', 'warning', 2000);
                    }
                });
            }
            
            // 設置重置燈泡按鈕事件
            const resetLightsBtn = document.getElementById('resetLightsBtn');
            if (resetLightsBtn) {
                resetLightsBtn.addEventListener('click', async () => {
                    if (window.arduinoServiceInstance && window.arduinoServiceInstance.isConnected()) {
                        await window.arduinoServiceInstance.resetLights();
                        showNotification('🔄 燈泡已重置', 'info', 2000);
                    } else {
                        showNotification('⚠️ 請先連接Arduino', 'warning', 2000);
                    }
                });
            }
            
            // 監聽Arduino難度變更事件
            document.addEventListener('arduino-difficulty-change', (event) => {
                const difficulty = event.detail.difficulty;
                console.log(`收到Arduino難度變更事件: ${difficulty}`);
                
                // 顯示通知
                showNotification(`🎛️ Arduino難度已設置為: ${getDifficultyDisplayName(difficulty)}`, 'info', 2000);
                
                // 確保網頁狀態同步
                const difficultyButtons = {
                    easy: document.getElementById('easyBtn'),
                    medium: document.getElementById('mediumBtn'),
                    hard: document.getElementById('hardBtn')
                };
                
                // 更新按鈕狀態
                Object.entries(difficultyButtons).forEach(([key, btn]) => {
                    if (btn) {
                        if (key === difficulty) {
                            btn.classList.add('active');
                        } else {
                            btn.classList.remove('active');
                        }
                    }
                });
                
                console.log(`網頁端難度狀態已同步更新為: ${difficulty}`);
            });
            
            // 監聽食譜生成器的難度變更事件
            document.addEventListener('recipe-difficulty-change', (event) => {
                const difficulty = event.detail.difficulty;
                console.log(`食譜生成器難度已變更為: ${difficulty}`);
            });
            
        } else {
            console.warn('Web Serial API 不可用，Arduino 連接功能將被停用');
            
            // 隱藏 Arduino 相關按鈕
            const connectArduinoBtn = document.getElementById('connectArduinoBtn');
            const testLightsBtn = document.getElementById('testLightsBtn');
            const resetLightsBtn = document.getElementById('resetLightsBtn');
            const sendToArduinoBtn = document.getElementById('sendToArduinoBtn');
            
            [connectArduinoBtn, testLightsBtn, resetLightsBtn, sendToArduinoBtn].forEach(btn => {
                if (btn) btn.style.display = 'none';
            });
        }
    } catch (error) {
        console.error('設置 Arduino 連接時出錯:', error);
    }
}

// 更新Arduino連接狀態顯示
function updateArduinoStatus(connected) {
    const statusElement = document.getElementById('arduinoStatus');
    const sendBtn = document.getElementById('sendToArduinoBtn');
    const testLightsBtn = document.getElementById('testLightsBtn');
    const resetLightsBtn = document.getElementById('resetLightsBtn');
    
    if (connected) {
        if (statusElement) {
            statusElement.textContent = '已連接';
            statusElement.style.backgroundColor = '#d4edda';
            statusElement.style.color = '#155724';
        }
        
        // 啟用控制按鈕
        [sendBtn, testLightsBtn, resetLightsBtn].forEach(btn => {
            if (btn) btn.disabled = false;
        });
        
        showNotification('✅ Arduino連接成功', 'success', 2000);
    } else {
        if (statusElement) {
            statusElement.textContent = '未連接';
            statusElement.style.backgroundColor = '#f8d7da';
            statusElement.style.color = '#721c24';
        }
        
        // 停用控制按鈕
        [sendBtn, testLightsBtn, resetLightsBtn].forEach(btn => {
            if (btn) btn.disabled = true;
        });
    }
}

// 發送當前內容到Arduino
async function sendCurrentContentToArduino() {
    if (!window.arduinoServiceInstance || !window.arduinoServiceInstance.isConnected()) {
        showNotification('⚠️ Arduino未連接', 'warning', 2000);
        return;
    }
    
    // 檢查當前顯示的是食譜還是調酒
    const recipeTab = document.getElementById('recipeContent');
    const cocktailTab = document.getElementById('cocktailContent');
    
    if (recipeTab && recipeTab.classList.contains('active')) {
        // 發送食譜
        const recipeName = document.getElementById('recipeName')?.textContent;
        if (recipeName && recipeName !== '尚未生成食譜') {
            const recipe = {
                name: recipeName,
                difficulty: window.recipeGeneratorInstance?.difficultyLevel || 'easy'
            };
            
            await window.arduinoServiceInstance.sendRecipe(recipe);
            showNotification('📤 食譜已發送到Arduino', 'success', 2000);
        } else {
            showNotification('⚠️ 請先生成食譜', 'warning', 2000);
        }
    } else if (cocktailTab && cocktailTab.classList.contains('active')) {
        // 發送調酒
        const cocktailName = document.getElementById('cocktailName')?.textContent;
        if (cocktailName && cocktailName !== '尚未生成調酒') {
            const cocktail = {
                name: cocktailName
            };
            
            await window.arduinoServiceInstance.sendCocktail(cocktail);
            showNotification('🍸 調酒已發送到Arduino', 'success', 2000);
        } else {
            showNotification('⚠️ 請先生成調酒', 'warning', 2000);
        }
    }
}

// 獲取難度的顯示名稱
function getDifficultyDisplayName(difficulty) {
    const displayNames = {
        'easy': '簡單',
        'medium': '中等', 
        'hard': '困難'
    };
    return displayNames[difficulty] || difficulty;
}

// 驗證 Google API Key 格式
function isValidApiKeyFormat(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
        return false;
    }
    
    // Google API Key 通常以 "AIza" 開頭，長度約 39 個字符
    const googleApiKeyPattern = /^AIza[0-9A-Za-z_-]{35}$/;
    
    // 檢查基本格式
    if (googleApiKeyPattern.test(apiKey)) {
        return true;
    }
    
    // 允許一些變體格式（長度在 35-45 之間，以 AIza 開頭）
    if (apiKey.startsWith('AIza') && apiKey.length >= 35 && apiKey.length <= 45) {
        return true;
    }
    
    // 開發測試用的模擬 Key
    if (apiKey === 'MOCK_API_KEY_FOR_DEMO') {
        return true;
    }
    
    return false;
}

// 添加全域診斷函數
window.diagnoseDifficultySync = function() {
    console.log('=== 難度同步診斷 ===');
    console.log('1. RecipeGenerator 實例:', !!window.recipeGeneratorInstance);
    console.log('2. setDifficulty 方法:', typeof window.recipeGeneratorInstance?.setDifficulty);
    console.log('3. 當前難度:', window.recipeGeneratorInstance?.difficultyLevel);
    
    // 測試設置
    if (window.recipeGeneratorInstance) {
        console.log('4. 測試設置難度為 hard...');
        const originalDifficulty = window.recipeGeneratorInstance.difficultyLevel;
        window.recipeGeneratorInstance.setDifficulty('hard');
        console.log('5. 設置後難度:', window.recipeGeneratorInstance.difficultyLevel);
        
        // 恢復原始難度
        setTimeout(() => {
            window.recipeGeneratorInstance.setDifficulty(originalDifficulty);
            console.log('6. 已恢復原始難度:', originalDifficulty);
        }, 2000);
    }
    
    // 檢查按鈕狀態
    const buttons = ['easyBtn', 'mediumBtn', 'hardBtn'];
    buttons.forEach(id => {
        const btn = document.getElementById(id);
        console.log(`7. ${id}:`, btn ? `存在 (active: ${btn.classList.contains('active')})` : '不存在');
    });
    
    // 檢查 Arduino 連接狀態
    console.log('8. Arduino 連接狀態:', window.arduinoServiceInstance?.connected);
    console.log('9. Arduino 同步標記:', window._arduinoSync);
    
    // 顯示提示
    if (typeof showNotification === 'function') {
        showNotification('🔧 難度同步診斷已執行，請查看控制台輸出', 'info', 3000);
    }
};
