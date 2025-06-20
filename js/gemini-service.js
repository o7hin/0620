// Google AI Service
// Google API 整合服務，用於生成食譜和調酒建議

class GeminiService {
    constructor() {
        this.API_KEY = null;
        this.initialized = false;
        this.model = null;
        this.apiType = 'google'; // 標記為 Google API
        console.log('Google AI Service 類別已實例化');
    }

    // 初始化 Google API
    async initialize(apiKey) {
        try {
            console.log('開始初始化 Google AI API...');
            
            if (!apiKey) {
                console.error('初始化失敗：缺少 Google API Key');
                throw new Error('缺少有效的 Google API Key');
            }

            // 使用改進的 API Key 驗證方法
            if (!this.validateApiKey(apiKey)) {
                console.error('初始化失敗：Google API Key 格式不正確');
                throw new Error('Google API Key 格式不正確，請確保完整複製 Google 提供的 API Key');
            }
            
            // 記錄驗證通過
            console.log('API Key 驗證通過，長度為：' + apiKey.length + '字元');

            this.API_KEY = apiKey;
            console.log('API Key 已設置，長度為：' + apiKey.length + '字元');
            
            console.log('正在初始化 Google API，請等待...');
            
            // 使用延長的超時處理，防止初始化過程卡住
            try {
                return await Promise.race([
                    this._initializeWithTimeout(apiKey),
                    new Promise((_, reject) => {
                        setTimeout(() => {
                            reject(new Error('初始化超時 (15 秒)，請檢查網路連線或 API Key 是否有效'));
                        }, 15000); // 延長至 15 秒超時
                    })
                ]);
            } catch (timeoutError) {
                console.error('初始化超時:', timeoutError);
                
                // 提供更詳細的錯誤信息
                if (timeoutError.message.includes('超時')) {
                    throw new Error('連接 Google API 超時，請檢查網路連線後重試');
                } else {
                    throw timeoutError;
                }
            }
        } catch (error) {
            // 提供更有意義的錯誤訊息
            let errorMessage = '初始化失敗';
            
            if (error.message.includes('API key not valid')) {
                errorMessage = 'API Key 無效，請確認是否正確複製了完整的 key';
            } else if (error.message.includes('超時') || error.message.includes('timeout')) {
                errorMessage = '連線超時，請檢查網路狀態';
            } else if (error.message.includes('format') || error.message.includes('格式')) {
                errorMessage = 'API Key 格式不正確';
            } else if (error.message.includes('quota') || error.message.includes('配額')) {
                errorMessage = 'API 使用配額已達上限';
            }
            
            console.error(`Google API 初始化失敗: ${errorMessage}`, error);
            
            // 將詳細錯誤信息拋出，以便上層處理
            throw new Error(errorMessage);
        }
    }
    
    // 載入 Google SDK
    async loadGoogleSdk() {
        console.log('嘗試加載 Google SDK...');
        
        try {
            // 先檢查是否已經載入
            if (typeof window.google !== 'undefined' && typeof window.google.generativeAI !== 'undefined') {
                console.log('Google Generative AI SDK 已載入');
                return true;
            }
            
            // 使用內嵌版 SDK
            console.log('使用內嵌版 SDK...');
            
            // 確保內嵌版可用
            if (typeof window.google === 'undefined') {
                window.google = {};
            }
            
            // 確認內嵌版 SDK 功能已可用
            if (typeof window.google.generativeAI === 'undefined') {
                console.log('嘗試設定內嵌版 SDK');
                
                try {
                    // 如果 generativeAI 為未定義，但我們的內嵌版已載入，則初始化它
                    if (document.querySelector('script[src*="gemini-sdk-embedded.js"]')) {
                        console.log('內嵌版 SDK 腳本已檢測到，初始化中...');
                        // 等待一點時間確保腳本已執行
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                } catch (err) {
                    console.error('初始化內嵌版 SDK 失敗:', err);
                }
            }
            
            return typeof window.google !== 'undefined' && typeof window.google.generativeAI !== 'undefined';
        } catch (error) {
            console.error('載入 SDK 失敗:', error);
            return false;
        }
    }
    
    // 帶超時的初始化
    async _initializeWithTimeout(apiKey) {
        try {
            console.log('開始進行重構版初始化流程...');
            
            // 確保 SDK 已載入
            if (typeof window.google === 'undefined' || typeof window.google.generativeAI === 'undefined') {
                console.log('Google Generative AI SDK 未載入，嘗試自動載入...');
                
                // 先嘗試直接等待，因為可能正在載入中
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // 再次檢查是否已載入
                if (typeof window.google !== 'undefined' && typeof window.google.generativeAI !== 'undefined') {
                    console.log('SDK 已成功載入');
                } else {
                    console.log('仍未檢測到 SDK，嘗試手動載入');
                    try {
                        // 嘗試載入 SDK
                        const sdkLoaded = await this.loadGoogleSdk();
                        
                        if (!sdkLoaded) {
                            console.log('使用內嵌備用 SDK');
                            
                            // 創建最簡單的備用實現 - 使用新版 API 格式
                            if (typeof window.google === 'undefined') window.google = {};
                            
                            window.google.generativeAI = {
                                GoogleGenerativeAI: class {
                                    constructor(apiKey) {
                                        this.apiKey = apiKey;
                                        console.log('已設置 Google API Key');
                                    }
                                    
                                    getGenerativeModel(options) {
                                        const self = this;
                                        console.log('創建模型:', options.model);
                                        return {
                                            generateContent: async function(prompt) {
                                                console.log('使用 Google API 呼叫:', prompt.substring(0, 30) + '...');
                                                
                                                try {
                                                    // 支援多種 Google API 端點 - 使用新版模型
                                                    const endpoints = [
                                                        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${self.apiKey}`,
                                                        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${self.apiKey}`
                                                    ];
                                                    
                                                    let lastError;
                                                    
                                                    // 嘗試不同的端點
                                                    for (const url of endpoints) {
                                                        try {
                                                            const response = await fetch(url, {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({
                                                                    contents: [{ 
                                                                        parts: [{ 
                                                                            text: typeof prompt === 'string' ? prompt : JSON.stringify(prompt) 
                                                                        }] 
                                                                    }]
                                                                })
                                                            });
                                                            
                                                            if (response.ok) {
                                                                const data = await response.json();
                                                                console.log('Google API 回應成功:', data);
                                                                
                                                                return {
                                                                    response: {
                                                                        text: () => data.candidates?.[0]?.content?.parts?.[0]?.text || '無回應內容'
                                                                    }
                                                                };
                                                            } else {
                                                                const errorData = await response.json();
                                                                lastError = new Error(errorData.error?.message || `HTTP ${response.status}`);
                                                            }
                                                        } catch (err) {
                                                            lastError = err;
                                                            console.warn(`端點 ${url} 失敗:`, err);
                                                        }
                                                    }
                                                    
                                                    throw lastError || new Error('所有 Google API 端點都失敗');
                                                } catch (err) {
                                                    console.error('Google API 呼叫失敗:', err);
                                                    throw err;
                                                }
                                            }
                                        };
                                    }
                                }
                            };
                            console.log('已設置內嵌備用 SDK');
                        }
                    } catch (sdkError) {
                        console.error('載入 SDK 時發生錯誤:', sdkError);
                        throw new Error('無法載入 Google AI SDK: ' + sdkError.message);
                    }
                }
            }
            
            try {
                // 初始化 API
                console.log('開始初始化 API...');
                const { GoogleGenerativeAI } = window.google.generativeAI;
                
                // 檢查 API Key (已放寬檢查)
                if (!apiKey) {
                    console.error('缺少 API Key');
                    return false;
                }
                
                console.log(`配置 API，API Key 長度: ${apiKey.length}`);
                
                // 正確的初始化方式
                const genAI = new GoogleGenerativeAI(apiKey);
                
                // 嘗試多個模型，直到找到一個可用的
                const modelNames = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
                let modelCreated = false;
                let lastError = null;
                let finalTestResult = null;
                
                for (const modelName of modelNames) {
                    try {
                        console.log(`嘗試創建 ${modelName} 模型...`);
                        this.model = genAI.getGenerativeModel({ 
                            model: modelName
                        });
                        
                        // 執行簡單測試
                        console.log('執行測試查詢，檢測模型可用性...');
                        finalTestResult = await this.model.generateContent("你好，請回覆「API連接成功」");
                        
                        // 如果到這裡沒有錯誤，說明模型可用
                        console.log(`✅ ${modelName} 模型創建成功`);
                        modelCreated = true;
                        break;
                    } catch (error) {
                        console.warn(`❌ ${modelName} 模型不可用:`, error.message);
                        lastError = error;
                        continue;
                    }
                }
                
                if (!modelCreated) {
                    throw lastError || new Error('所有模型都不可用');
                }
                
                // 獲取回應文本
                let testText;
                if (finalTestResult) {
                    try {
                        // 適應不同版本 SDK 的回應格式
                        if (finalTestResult.response) {
                            if (typeof finalTestResult.response.text === 'function') {
                                testText = finalTestResult.response.text();
                            } else if (finalTestResult.response.candidates) {
                                testText = finalTestResult.response.candidates[0]?.content?.parts?.[0]?.text;
                            }
                        } else if (finalTestResult.text) {
                            testText = typeof finalTestResult.text === 'function' ? finalTestResult.text() : finalTestResult.text;
                        }
                    } catch (parseError) {
                        console.warn('解析測試回應時出錯:', parseError);
                        // 繼續執行，不因為解析錯誤而中斷流程
                        testText = '(無法解析回應但連接成功)';
                    }
                }
                
                // API 已正確初始化
                this.initialized = true;
                console.log('🎉 Google API 初始化成功！');
                
                return true;
            } catch (apiError) {
                // 更好地處理特定 API 錯誤
                console.error('API 初始化錯誤:', apiError);
                
                // 詳細分析錯誤類型
                let errorMessage = '初始化 API 時發生錯誤';
                let errorType = 'unknown';
                
                const errorStr = apiError.toString().toLowerCase();
                
                if (apiError.message) {
                    if (errorStr.includes('api key') || errorStr.includes('invalid')) {
                        errorMessage = 'API Key 格式無效或不正確';
                        errorType = 'invalid_key';
                    } else if (errorStr.includes('quota') || errorStr.includes('rate limit')) {
                        errorMessage = 'API 配額已用盡，請稍後再試';
                        errorType = 'quota';
                    } else if (errorStr.includes('network') || errorStr.includes('failed to fetch') || 
                               errorStr.includes('timeout') || errorStr.includes('連線')) {
                        errorMessage = '網路連線問題，請確保您能夠訪問 Google 服務';
                        errorType = 'network';
                    } else if (errorStr.includes('unauthorized') || errorStr.includes('permission')) {
                        errorMessage = '未授權訪問 API，請確認 API Key 權限設置';
                        errorType = 'auth';
                    }
                }
                
                console.error(`API 錯誤類型: ${errorType} - ${errorMessage}`);
                return false;
            }
        } catch (error) {
            console.error('API 初始化過程中發生未預期錯誤:', error);
            alert('初始化過程中發生意外錯誤。請檢查控制台獲取詳細信息。');
            return false;
        }
    }
    
    // 載入 Google SDK
    async loadGeminiSdk() {
        return new Promise((resolve, reject) => {
            console.log('嘗試動態載入 Google SDK...');
            
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@google/generative-ai@latest';
            script.async = true;
            script.onload = () => {
                console.log('Google SDK 已成功載入');
                resolve(true);
            };
            script.onerror = (err) => {
                console.error('載入 Google SDK 失敗:', err);
                reject(err);
            };
            
            document.head.appendChild(script);
        });
    }
    
    // 驗證 Google API Key 格式
    validateApiKey(apiKey) {
        // Google API Key 格式驗證
        if (!apiKey || typeof apiKey !== 'string') {
            console.error('Google API Key 驗證失敗: 為空或不是字串類型');
            return false;
        }
        
        // 去除可能的空白字符
        const trimmedKey = apiKey.trim();
        
        // 檢查長度 - Google API Keys 通常較長
        if (trimmedKey.length < 15) {
            console.error(`Google API Key 驗證失敗: 長度過短 (${trimmedKey.length}字元，應至少15字元)`);
            return false;
        }
        
        // 檢查是否含有空格或換行符
        if (/\s/.test(trimmedKey)) {
            console.error('Google API Key 驗證失敗: 包含空格或換行符');
            return false;
        }
        
        // Google API Key 通常以 "AIza" 開頭，但也可能有其他格式
        // 所以我們檢查是否包含基本的字母數字組合
        const hasAlphaNum = /[A-Za-z].*[0-9]|[0-9].*[A-Za-z]/.test(trimmedKey);
        if (!hasAlphaNum) {
            console.warn('Google API Key 警告: 不包含字母和數字的組合，但仍允許使用');
        }
        
        console.log(`Google API Key 驗證通過，長度為 ${trimmedKey.length} 字元`);
        return true;
    }

    // 檢查是否已初始化
    isInitialized() {
        return this.initialized;
    }

    // 生成食譜
    async generateRecipe(params) {
        if (!this.initialized || !this.model) {
            console.error('Google API 尚未初始化');
            return this.generateMockRecipe(params); // 退回到模擬數據
        }
        
        try {
            console.log('使用 Google API 生成食譜...');
            console.log('參數:', params);
            
            // 構建提示文本
            const prompt = this.buildRecipePrompt(params);
            console.log('提示文本:', prompt);
            
            // 調用 Google API
            const result = await this.model.generateContent(prompt);
            
            // 兼容不同版本的 SDK 回應格式
            let text;
            if (result.response) {
                // 新版 SDK 格式
                if (typeof result.response.text === 'function') {
                    text = result.response.text();
                } else if (result.response.candidates) {
                    text = result.response.candidates[0]?.content?.parts?.[0]?.text;
                }
            } else if (result.text) {
                // 舊版或內嵌 SDK 格式
                text = typeof result.text === 'function' ? result.text() : result.text;
            } else {
                throw new Error('無法解析 API 回應格式');
            }
            
            console.log('API 返回結果:', text);
            console.log('API 返回結果長度:', text ? text.length : 0);
            console.log('API 返回結果前500字符:', text ? text.substring(0, 500) : 'N/A');
            
            // 解析 API 返回的文本，轉換為食譜對象
            const recipe = this.parseRecipeResponse(text, params);
            
            console.log('解析後的食譜對象:', recipe);
            
            if (!recipe) {
                console.warn('API 返回結果解析失敗，使用模擬數據代替');
                return this.generateMockRecipe(params);
            }
            
            return recipe;
        } catch (error) {
            console.error('生成食譜時出錯:', error);
            console.log('使用模擬數據代替');
            return this.generateMockRecipe(params);
        }
    }
    
    // 解析 API 返回的文本，轉換為食譜對象
    parseRecipeResponse(text, params) {
        try {
            // 預設的難度等級
            const difficultyMap = {
                easy: '簡單 🟢',
                medium: '中等 🔵',
                hard: '困難 🔴'
            };
            const difficulty = difficultyMap[params.difficulty] || '中等 🔵';
            
            // 嘗試提取食譜名稱
            let name = '';
            const nameMatch = text.match(/(?:食譜名稱|名稱|食譜)[:：]?\s*(.+?)(?:\n|$)/i);
            if (nameMatch && nameMatch[1]) {
                name = nameMatch[1].trim();
            } else {
                // 如果無法提取到名稱，嘗試使用文本的第一行
                const firstLine = text.split('\n')[0].trim();
                if (firstLine.length > 0 && firstLine.length < 30) {
                    name = firstLine;
                } else {
                    name = '自動生成食譜';
                }
            }
            
            // 嘗試提取食材列表 - 改進版解析邏輯
            let ingredients = [];
            
            // 多種可能的食材標題
            const ingredientPatterns = [
                /(?:所需食材|食材|材料|材料及份量|所需材料|2\.?\s*所需食材)(?:[:：]?\s*\n?)([\s\S]*?)(?:\n\s*\n|\n(?:步驟|烹飪步驟|做法|製作方法|製作步驟|3\.?\s*烹飪步驟|預算|熱量))/i,
                /(?:2\.?\s*所需食材.*?[:：]?\s*\n?)([\s\S]*?)(?:\n\s*\n|\n(?:3\.?\s*|步驟|烹飪步驟))/i,
                /(?:食材[:：]\s*\n?)([\s\S]*?)(?:\n\s*\n|\n(?:步驟|做法))/i
            ];
            
            for (const pattern of ingredientPatterns) {
                const match = text.match(pattern);
                if (match && match[1]) {
                    console.log('找到食材匹配:', match[1]);
                    // 清理食材列表
                    ingredients = match[1].split('\n')
                        .map(line => line.trim())
                        .filter(line => {
                            // 過濾空行、純數字行、過短的行
                            return line && 
                                   !line.match(/^[0-9.\s]*$/) && 
                                   line.length > 1 && 
                                   !line.match(/^[步驟烹飪做法製作]/);
                        })
                        .map(line => {
                            // 移除編號前綴和項目符號
                            return line.replace(/^[0-9]+[.、）\)]\s*/, '')
                                      .replace(/^[-•·*]\s*/, '')
                                      .replace(/^\s*[一二三四五六七八九十]+[.、）\)]\s*/, '');
                        })
                        .filter(line => line.trim().length > 0);
                    
                    if (ingredients.length > 0) {
                        console.log('成功解析食材:', ingredients);
                        break;
                    }
                }
            }
            
            // 如果還是沒有找到，嘗試通過行分析
            if (ingredients.length === 0) {
                console.log('嘗試通過行分析提取食材...');
                const lines = text.split('\n').map(line => line.trim());
                let inIngredientSection = false;
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    
                    // 檢查是否進入食材區段
                    if (line.match(/(?:所需食材|食材|材料|2\.?\s*所需食材)/i)) {
                        inIngredientSection = true;
                        continue;
                    }
                    
                    // 檢查是否離開食材區段
                    if (inIngredientSection && line.match(/(?:步驟|烹飪步驟|做法|製作方法|3\.?\s*烹飪步驟|預算|熱量)/i)) {
                        break;
                    }
                    
                    // 如果在食材區段內，收集食材
                    if (inIngredientSection && line && line.length > 2 && !line.match(/^[0-9.\s]*$/)) {
                        const cleanLine = line.replace(/^[0-9]+[.、）\)]\s*/, '')
                                             .replace(/^[-•·*]\s*/, '');
                        if (cleanLine.trim().length > 0) {
                            ingredients.push(cleanLine);
                        }
                    }
                }
            }
            
            // 如果未能提取到食材，嘗試最後的備案方法
            if (ingredients.length === 0) {
                console.warn('無法解析食材，嘗試備案方法...');
                // 查找包含常見食材詞彙的行
                const lines = text.split('\n').map(line => line.trim());
                const foodKeywords = ['克', '湯匙', '茶匙', '顆', '片', '條', '根', '個', '杯', '毫升', 'ml', 'g'];
                
                for (const line of lines) {
                    if (line.length > 3 && foodKeywords.some(keyword => line.includes(keyword))) {
                        const cleanLine = line.replace(/^[0-9]+[.、）\)]\s*/, '')
                                             .replace(/^[-•·*]\s*/, '');
                        if (cleanLine.trim().length > 0) {
                            ingredients.push(cleanLine);
                        }
                    }
                }
            }
            
            // 最後檢查，如果還是沒有食材，提供默認值
            if (ingredients.length === 0) {
                console.warn('完全無法解析食材，使用提示信息');
                ingredients = ['食材解析中出現問題，請重新生成或檢查API回應格式'];
            }
            
            // 嘗試提取烹飪步驟 - 改進版解析邏輯
            let steps = [];
            
            // 多種可能的步驟標題
            const stepPatterns = [
                /(?:烹飪步驟|製作步驟|步驟|做法|製作方法|3\.?\s*烹飪步驟)(?:[:：]?\s*\n?)([\s\S]*?)(?:\n\s*\n|\n(?:預算|熱量|估計|營養|結論|完成|建議|4\.?\s*)|$)/i,
                /(?:3\.?\s*烹飪步驟.*?[:：]?\s*\n?)([\s\S]*?)(?:\n\s*\n|\n(?:4\.?\s*|預算|熱量))/i,
                /(?:步驟[:：]\s*\n?)([\s\S]*?)(?:\n\s*\n|\n(?:預算|熱量))/i,
                /(?:做法[:：]\s*\n?)([\s\S]*?)(?:\n\s*\n|\n(?:預算|熱量))/i
            ];
            
            for (const pattern of stepPatterns) {
                const match = text.match(pattern);
                if (match && match[1]) {
                    console.log('找到步驟匹配:', match[1]);
                    const stepsText = match[1];
                    
                    // 首先嘗試按照數字編號拆分步驟
                    const numberedSteps = stepsText.match(/(?:^|\n)[0-9]+[.、）\)][\s]*.+?(?=(?:\n[0-9]+[.、）\)])|$)/gs);
                    
                    if (numberedSteps && numberedSteps.length > 0) {
                        console.log('找到編號步驟:', numberedSteps);
                        steps = numberedSteps.map(step => {
                            // 移除編號和清理空白
                            return step.trim().replace(/^[0-9]+[.、）\)][\s]*/, '').trim();
                        }).filter(step => step.length > 5);
                    } else {
                        // 如果沒有清晰的數字編號，則按行拆分
                        steps = stepsText.split('\n')
                            .map(line => line.trim())
                            .filter(line => {
                                return line && 
                                       line.length > 5 && 
                                       !line.match(/^[預算熱量估計營養]/);
                            })
                            .map(line => {
                                // 移除可能的編號前綴和項目符號
                                return line.replace(/^[0-9]+[.、）\)]?\s*/, '')
                                          .replace(/^[-•·*]\s*/, '')
                                          .replace(/^\s*[一二三四五六七八九十]+[.、）\)]\s*/, '');
                            })
                            .filter(line => line.trim().length > 5);
                    }
                    
                    if (steps.length > 0) {
                        console.log('成功解析步驟:', steps);
                        break;
                    }
                }
            }
            
            // 如果還是沒有找到，嘗試通過行分析
            if (steps.length === 0) {
                console.log('嘗試通過行分析提取步驟...');
                const lines = text.split('\n').map(line => line.trim());
                let inStepSection = false;
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    
                    // 檢查是否進入步驟區段
                    if (line.match(/(?:烹飪步驟|製作步驟|步驟|做法|製作方法|3\.?\s*烹飪步驟)/i)) {
                        inStepSection = true;
                        continue;
                    }
                    
                    // 檢查是否離開步驟區段
                    if (inStepSection && line.match(/(?:預算|熱量|估計|營養|結論|完成|建議|4\.?\s*)/i)) {
                        break;
                    }
                    
                    // 如果在步驟區段內，收集步驟
                    if (inStepSection && line && line.length > 5) {
                        const cleanLine = line.replace(/^[0-9]+[.、）\)]\s*/, '')
                                             .replace(/^[-•·*]\s*/, '');
                        if (cleanLine.trim().length > 5) {
                            steps.push(cleanLine);
                        }
                    }
                }
            }
            
            // 如果未能提取到步驟，嘗試最後的備案方法
            if (steps.length === 0) {
                console.warn('無法解析步驟，嘗試備案方法...');
                // 查找包含烹飪動詞的行
                const lines = text.split('\n').map(line => line.trim());
                const cookingVerbs = ['加入', '放入', '煮', '炒', '切', '洗', '倒入', '攪拌', '加熱', '煸炒', '調味'];
                
                for (const line of lines) {
                    if (line.length > 8 && cookingVerbs.some(verb => line.includes(verb))) {
                        const cleanLine = line.replace(/^[0-9]+[.、）\)]\s*/, '')
                                             .replace(/^[-•·*]\s*/, '');
                        if (cleanLine.trim().length > 8) {
                            steps.push(cleanLine);
                        }
                    }
                }
            }
            
            // 最後檢查，如果還是沒有步驟，提供默認值
            if (steps.length === 0) {
                console.warn('完全無法解析烹飪步驟，使用提示信息');
                steps = ['烹飪步驟解析中出現問題，請重新生成或檢查API回應格式'];
            }
            
            // 嘗試提取預算
            let budget = params.budget || 150; // 默認預算
            const budgetMatch = text.match(/(?:預算|估計預算|所需預算|價格)[:：]?\s*(?:約)?(?:台幣|NT|TWD)?[\s]*([0-9]+)(?:\s*元|塊|圓|台幣|NT\$)?/i);
            if (budgetMatch && budgetMatch[1]) {
                const extractedBudget = parseInt(budgetMatch[1]);
                if (!isNaN(extractedBudget) && extractedBudget > 0) {
                    budget = extractedBudget;
                }
            }
            
            // 嘗試提取熱量
            let calories = params.calories || 500; // 默認熱量
            const caloriesMatch = text.match(/(?:熱量|卡路里|卡)[:：]?\s*(?:約)?[\s]*([0-9]+)(?:\s*大卡|卡路里|千卡|kcal)?/i);
            if (caloriesMatch && caloriesMatch[1]) {
                const extractedCalories = parseInt(caloriesMatch[1]);
                if (!isNaN(extractedCalories) && extractedCalories > 0) {
                    calories = extractedCalories;
                }
            }
            
            // 生成標籤
            const tags = this.generateTags(text, params);
            
            // 返回格式化的食譜對象
            return {
                name: name,
                ingredients: ingredients,
                steps: steps,
                budget: budget,
                calories: calories,
                difficulty: difficulty,
                tags: tags
            };
        } catch (error) {
            console.error('解析食譜結果時出錯:', error);
            return null;
        }
    }
    
    // 根據文本和參數生成標籤
    generateTags(text, params) {
        const tags = [];
        
        // 從參數中提取食物需求
        if (params.foodRequirements && params.foodRequirements.length > 0) {
            tags.push(...params.foodRequirements);
        }
        
        // 從文本中識別口味和類型
        const flavorPatterns = [
            {pattern: /辣|辛辣|麻辣|香辣/g, tag: '辣'},
            {pattern: /甜|甜味|甜食|甜點/g, tag: '甜'},
            {pattern: /酸|酸味|酸辣|酸甜/g, tag: '酸'},
            {pattern: /鹹|鹹味|鹹香/g, tag: '鹹'},
            {pattern: /清淡|清爽|輕食/g, tag: '清淡'},
            {pattern: /鮮美|鮮甜|鮮香/g, tag: '鮮美'}
        ];
        
        const cuisinePatterns = [
            {pattern: /中式|中餐|中國/g, tag: '中式'},
            {pattern: /西式|西餐|歐式|美式/g, tag: '西式'},
            {pattern: /日式|日本/g, tag: '日式'},
            {pattern: /韓式|韓國/g, tag: '韓式'},
            {pattern: /泰式|泰國/g, tag: '泰式'},
            {pattern: /義式|義大利/g, tag: '義式'},
            {pattern: /法式|法國/g, tag: '法式'},
            {pattern: /墨西哥/g, tag: '墨西哥料理'}
        ];
        
        const typePatterns = [
            {pattern: /燉|燉煮|燉菜|燉飯/g, tag: '燉菜'},
            {pattern: /炒|炒菜|快炒/g, tag: '炒菜'},
            {pattern: /烤|烘烤|燒烤/g, tag: '烤物'},
            {pattern: /煎|煎炸/g, tag: '煎炸'},
            {pattern: /湯|湯品|湯料理/g, tag: '湯品'},
            {pattern: /沙拉|生菜|涼拌/g, tag: '沙拉'},
            {pattern: /麵|義大利麵|拉麵|麵條/g, tag: '麵食'},
            {pattern: /飯|米飯|燉飯|炒飯/g, tag: '飯類'},
            {pattern: /素食|蔬食|蔬菜/g, tag: '素食'},
            {pattern: /海鮮|魚|蝦|蟹/g, tag: '海鮮'},
            {pattern: /肉|牛肉|豬肉|雞肉/g, tag: '肉類'},
            {pattern: /蛋|蛋料理|蛋餅/g, tag: '蛋類'}
        ];
        
        // 檢查所有模式是否匹配
        [...flavorPatterns, ...cuisinePatterns, ...typePatterns].forEach(({pattern, tag}) => {
            if (text.match(pattern) && !tags.includes(tag)) {
                tags.push(tag);
            }
        });
        
        // 根據參數中的食材自動添加標籤
        if (params.ingredients && params.ingredients.length > 0) {
            const ingredientsText = params.ingredients.join(' ');
            
            if (/肉|牛|豬|雞|羊/.test(ingredientsText) && !tags.includes('肉類')) {
                tags.push('肉類');
            }
            
            if (/魚|蝦|蟹|貝|海鮮/.test(ingredientsText) && !tags.includes('海鮮')) {
                tags.push('海鮮');
            }
            
            if (/蔬菜|菠菜|青菜|芹菜|花椰菜|胡蘿蔔/.test(ingredientsText) && !tags.includes('蔬菜')) {
                tags.push('蔬菜');
            }
        }
        
        // 根據難度添加標籤
        if (params.difficulty) {
            const difficultyTagMap = {
                easy: '簡單料理',
                medium: '居家料理',
                hard: '進階料理'
            };
            
            if (difficultyTagMap[params.difficulty]) {
                tags.push(difficultyTagMap[params.difficulty]);
            }
        }
        
        // 去除重複標籤並限制數量
        const uniqueTags = [...new Set(tags)].slice(0, 6);
        return uniqueTags;
    }

    // 生成調酒建議
    async generateCocktail(params) {
        if (!this.initialized || !this.model) {
            console.error('Google API 尚未初始化');
            return this.generateMockCocktail(params); // 退回到模擬數據
        }
        
        try {
            console.log('使用 Google API 生成調酒建議...');
            console.log('參數:', params);
            
            // 構建提示文本
            const prompt = this.buildCocktailPrompt(params);
            console.log('提示文本:', prompt);
            
            // 調用 Google API
            const result = await this.model.generateContent(prompt);
            
            // 兼容不同版本的 SDK 回應格式
            let text;
            if (result.response) {
                // 新版 SDK 格式
                if (typeof result.response.text === 'function') {
                    text = result.response.text();
                } else if (result.response.candidates) {
                    text = result.response.candidates[0]?.content?.parts?.[0]?.text;
                }
            } else if (result.text) {
                // 舊版或內嵌 SDK 格式
                text = typeof result.text === 'function' ? result.text() : result.text;
            } else {
                throw new Error('無法解析 API 回應格式');
            }
            
            console.log('API 返回結果:', text);
            
            // 解析 API 返回的文本，轉換為調酒對象
            const cocktail = this.parseCocktailResponse(text, params);
            
            if (!cocktail) {
                console.warn('API 返回結果解析失敗，使用模擬數據代替');
                return this.generateMockCocktail(params);
            }
            
            return cocktail;
        } catch (error) {
            console.error('生成調酒時出錯:', error);
            console.log('使用模擬數據代替');
            return this.generateMockCocktail(params);
        }
    }
    
    // 解析 API 返回的文本，轉換為調酒對象
    parseCocktailResponse(text, params) {
        try {
            // 嘗試提取調酒名稱
            let name = '';
            const nameMatch = text.match(/(?:調酒名稱|名稱|調酒)[:：]?\s*(.+?)(?:\n|$)/i);
            if (nameMatch && nameMatch[1]) {
                name = nameMatch[1].trim();
            } else {
                // 如果無法提取到名稱，嘗試使用文本的第一行
                const firstLine = text.split('\n')[0].trim();
                if (firstLine.length > 0 && firstLine.length < 30) {
                    name = firstLine;
                } else {
                    name = '創意調酒';
                }
            }
            
            // 嘗試提取材料列表 - 改進版解析邏輯
            let ingredients = [];
            
            // 多種可能的材料標題
            const ingredientPatterns = [
                /(?:所需材料|材料|材料及份量|配料|2\.?\s*所需材料)(?:[:：]?\s*\n?)([\s\S]*?)(?:\n\s*\n|\n(?:製作方法|製作步驟|做法|步驟|3\.?\s*製作方法|風格|特點))/i,
                /(?:2\.?\s*所需材料.*?[:：]?\s*\n?)([\s\S]*?)(?:\n\s*\n|\n(?:3\.?\s*|製作方法|做法))/i,
                /(?:材料[:：]\s*\n?)([\s\S]*?)(?:\n\s*\n|\n(?:製作|做法))/i
            ];
            
            for (const pattern of ingredientPatterns) {
                const match = text.match(pattern);
                if (match && match[1]) {
                    console.log('找到調酒材料匹配:', match[1]);
                    // 清理材料列表
                    ingredients = match[1].split('\n')
                        .map(line => line.trim())
                        .filter(line => {
                            // 過濾空行、純數字行、過短的行
                            return line && 
                                   !line.match(/^[0-9.\s]*$/) && 
                                   line.length > 1 && 
                                   !line.match(/^[製作做法步驟]/);
                        })
                        .map(line => {
                            // 移除編號前綴和項目符號
                            return line.replace(/^[0-9]+[.、）\)]\s*/, '')
                                      .replace(/^[-•·*]\s*/, '')
                                      .replace(/^\s*[一二三四五六七八九十]+[.、）\)]\s*/, '');
                        })
                        .filter(line => line.trim().length > 0);
                    
                    if (ingredients.length > 0) {
                        console.log('成功解析調酒材料:', ingredients);
                        break;
                    }
                }
            }
            
            // 如果還是沒有找到，嘗試通過行分析
            if (ingredients.length === 0) {
                console.log('嘗試通過行分析提取調酒材料...');
                const lines = text.split('\n').map(line => line.trim());
                let inIngredientSection = false;
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    
                    // 檢查是否進入材料區段
                    if (line.match(/(?:所需材料|材料|配料|2\.?\s*所需材料)/i)) {
                        inIngredientSection = true;
                        continue;
                    }
                    
                    // 檢查是否離開材料區段
                    if (inIngredientSection && line.match(/(?:製作方法|製作步驟|做法|步驟|3\.?\s*製作方法|風格|特點)/i)) {
                        break;
                    }
                    
                    // 如果在材料區段內，收集材料
                    if (inIngredientSection && line && line.length > 2 && !line.match(/^[0-9.\s]*$/)) {
                        const cleanLine = line.replace(/^[0-9]+[.、）\)]\s*/, '')
                                             .replace(/^[-•·*]\s*/, '');
                        if (cleanLine.trim().length > 0) {
                            ingredients.push(cleanLine);
                        }
                    }
                }
            }
            
            // 如果未能提取到材料，嘗試最後的備案方法
            if (ingredients.length === 0) {
                console.warn('無法解析調酒材料，嘗試備案方法...');
                // 查找包含常見飲料詞彙的行
                const lines = text.split('\n').map(line => line.trim());
                const drinkKeywords = ['ml', '毫升', 'oz', '茶匙', '湯匙', '滴', '片', '顆', '杯', '酒', '汁', '糖漿', '檸檬', '萊姆'];
                
                for (const line of lines) {
                    if (line.length > 3 && drinkKeywords.some(keyword => line.includes(keyword))) {
                        const cleanLine = line.replace(/^[0-9]+[.、）\)]\s*/, '')
                                             .replace(/^[-•·*]\s*/, '');
                        if (cleanLine.trim().length > 0) {
                            ingredients.push(cleanLine);
                        }
                    }
                }
            }
            
            // 最後檢查，如果還是沒有材料，提供默認值
            if (ingredients.length === 0) {
                console.warn('完全無法解析調酒材料，使用提示信息');
                ingredients = ['材料解析中出現問題，請重新生成或檢查API回應格式'];
            }
            
            // 嘗試提取製作方法 - 改進版解析邏輯
            let steps = [];
            
            // 多種可能的步驟標題
            const stepPatterns = [
                /(?:製作方法|製作步驟|做法|步驟|3\.?\s*製作方法)(?:[:：]?\s*\n?)([\s\S]*?)(?:\n\s*\n|\n(?:風格|特點|特色|結論|完成|建議|4\.?\s*)|$)/i,
                /(?:3\.?\s*製作方法.*?[:：]?\s*\n?)([\s\S]*?)(?:\n\s*\n|\n(?:4\.?\s*|風格|特點))/i,
                /(?:做法[:：]\s*\n?)([\s\S]*?)(?:\n\s*\n|\n(?:風格|特點))/i,
                /(?:步驟[:：]\s*\n?)([\s\S]*?)(?:\n\s*\n|\n(?:風格|特點))/i
            ];
            
            for (const pattern of stepPatterns) {
                const match = text.match(pattern);
                if (match && match[1]) {
                    console.log('找到調酒製作步驟匹配:', match[1]);
                    const stepsText = match[1];
                    
                    // 首先嘗試按照數字編號拆分步驟
                    const numberedSteps = stepsText.match(/(?:^|\n)[0-9]+[.、）\)][\s]*.+?(?=(?:\n[0-9]+[.、）\)])|$)/gs);
                    
                    if (numberedSteps && numberedSteps.length > 0) {
                        console.log('找到編號調酒步驟:', numberedSteps);
                        steps = numberedSteps.map(step => {
                            // 移除編號和清理空白
                            return step.trim().replace(/^[0-9]+[.、）\)][\s]*/, '').trim();
                        }).filter(step => step.length > 3);
                    } else {
                        // 如果沒有清晰的數字編號，則按行拆分
                        steps = stepsText.split('\n')
                            .map(line => line.trim())
                            .filter(line => {
                                return line && 
                                       line.length > 3 && 
                                       !line.match(/^[風格特點特色]/);
                            })
                            .map(line => {
                                // 移除可能的編號前綴和項目符號
                                return line.replace(/^[0-9]+[.、）\)]?\s*/, '')
                                          .replace(/^[-•·*]\s*/, '')
                                          .replace(/^\s*[一二三四五六七八九十]+[.、）\)]\s*/, '');
                            })
                            .filter(line => line.trim().length > 3);
                    }
                    
                    if (steps.length > 0) {
                        console.log('成功解析調酒製作步驟:', steps);
                        break;
                    }
                }
            }
            
            // 如果還是沒有找到，嘗試通過行分析
            if (steps.length === 0) {
                console.log('嘗試通過行分析提取調酒製作步驟...');
                const lines = text.split('\n').map(line => line.trim());
                let inStepSection = false;
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    
                    // 檢查是否進入步驟區段
                    if (line.match(/(?:製作方法|製作步驟|做法|步驟|3\.?\s*製作方法)/i)) {
                        inStepSection = true;
                        continue;
                    }
                    
                    // 檢查是否離開步驟區段
                    if (inStepSection && line.match(/(?:風格|特點|特色|結論|完成|建議|4\.?\s*)/i)) {
                        break;
                    }
                    
                    // 如果在步驟區段內，收集步驟
                    if (inStepSection && line && line.length > 3) {
                        const cleanLine = line.replace(/^[0-9]+[.、）\)]\s*/, '')
                                             .replace(/^[-•·*]\s*/, '');
                        if (cleanLine.trim().length > 3) {
                            steps.push(cleanLine);
                        }
                    }
                }
            }
            
            // 如果未能提取到步驟，嘗試最後的備案方法
            if (steps.length === 0) {
                console.warn('無法解析調酒製作步驟，嘗試備案方法...');
                // 查找包含調酒動作的行
                const lines = text.split('\n').map(line => line.trim());
                const mixingVerbs = ['倒入', '加入', '搖晃', '攪拌', '混合', '裝飾', '過濾', '搖盪', '注入', '調配'];
                
                for (const line of lines) {
                    if (line.length > 5 && mixingVerbs.some(verb => line.includes(verb))) {
                        const cleanLine = line.replace(/^[0-9]+[.、）\)]\s*/, '')
                                             .replace(/^[-•·*]\s*/, '');
                        if (cleanLine.trim().length > 5) {
                            steps.push(cleanLine);
                        }
                    }
                }
            }
            
            // 最後檢查，如果還是沒有步驟，提供默認值
            if (steps.length === 0) {
                console.warn('完全無法解析調酒製作步驟，使用提示信息');
                steps = ['製作步驟解析中出現問題，請重新生成或檢查API回應格式'];
            }
            
            // 嘗試提取風格特點
            let style = '';
            const styleMatch = text.match(/(?:風格|特點|特色|風格特點)[:：]?\s*(.+?)(?:\n\s*\n|$)/i);
            if (styleMatch && styleMatch[1]) {
                style = styleMatch[1].trim();
            } else {
                // 如果沒有明確的風格部分，嘗試從文本中提取形容詞作為風格
                if (params.style === 'convenience') {
                    style = '便利實惠';
                } else if (params.style === 'fruit') {
                    style = '清新水果風味';
                } else if (params.style === 'classic') {
                    style = '經典調酒';
                } else {
                    style = '創意混合風格';
                }
            }
            
            // 返回格式化的調酒對象
            return {
                name: name,
                ingredients: ingredients,
                steps: steps,
                style: style
            };
        } catch (error) {
            console.error('解析調酒結果時出錯:', error);
            return null;
        }
    }

    // 構建食譜提示文本
    buildRecipePrompt(params) {
        const { ingredients, budget, calories, difficulty, preferences } = params;
        
        let prompt = `請根據以下條件生成一道美味的食譜：\n\n`;
        
        // 添加食材信息
        if (ingredients && ingredients.length > 0) {
            prompt += `可用食材：${ingredients.join('、')}\n`;
        }
        
        // 添加預算限制
        if (budget) {
            prompt += `預算上限：${budget}元\n`;
        }
        
        // 添加熱量限制
        if (calories) {
            prompt += `熱量上限：${calories}大卡\n`;
        }
        
        // 添加難度要求
        if (difficulty) {
            const difficultyMap = {
                easy: '簡單',
                medium: '中等',
                hard: '困難'
            };
            prompt += `難度要求：${difficultyMap[difficulty] || difficulty}\n`;
        }
        
        // 添加用戶偏好
        if (preferences && preferences.favoriteIngredients && preferences.favoriteIngredients.length > 0) {
            prompt += `偏好食材：${preferences.favoriteIngredients.join('、')}\n`;
        }
        
        prompt += `\n請按照以下格式提供回應：

食譜名稱：[料理名稱]

所需食材：
1. [食材名稱] [份量]
2. [食材名稱] [份量]
3. [食材名稱] [份量]

烹飪步驟：
1. [詳細步驟說明]
2. [詳細步驟說明]
3. [詳細步驟說明]

估計預算：[金額]元
估計熱量：[數值]大卡`;
        
        return prompt;
    }

    // 構建調酒提示文本
    buildCocktailPrompt(params) {
        const { style, alcoholLevel, focus } = params;
        
        let prompt = `請為我設計一款便利商店調酒配方：\n\n`;
        
        // 強調便利商店材料限制
        prompt += `⚠️ 重要限制：只能使用台灣便利商店（7-11、全家、萊爾富、OK超商）能買到的現成商品\n\n`;
        
        // 詳細的便利商店材料清單
        prompt += `🏪 便利商店可購買材料：

📦 酒類商品：
- 台灣啤酒、海尼根啤酒、Corona啤酒
- 梅酒、柚子酒、水蜜桃酒
- 燒酎、威士忌、伏特加、白蘭地
- 日本酒、紅酒、白酒、香檳

🥤 飲料類：
- 可口可樂、百事可樂、雪碧、七喜
- 蘇打水、薑汁汽水、檸檬汽水
- 蔓越莓汁、柳橙汁、蘋果汁、葡萄汁
- 養樂多、優酪乳、綠茶、咖啡

🍋 配料裝飾：
- 檸檬片、萊姆片、橘子片
- 冰塊、鹽巴、糖、蜂蜜
- 薄荷葉（有些便利商店有售）

🍿 搭配小食：
- 洋芋片、堅果、魷魚絲、牛肉乾
- 巧克力、餅乾、起司條\n\n`;
        
        // 根據酒精強度調整
        if (alcoholLevel) {
            const levelMap = {
                light: '低酒精濃度（酒精比例 15% 以下，適合輕鬆社交）',
                medium: '中等酒精濃度（酒精比例 15-25%，平衡口感）',
                strong: '高酒精濃度（酒精比例 25% 以上，濃烈風味）'
            };
            prompt += `🍸 酒精強度要求：${levelMap[alcoholLevel] || alcoholLevel}\n\n`;
        }
        
        prompt += `💰 成本控制：總成本控制在 100-200 元之間

📝 請按照以下格式提供回應：

調酒名稱：[創意名稱，可以結合便利商店品牌]

所需材料：
- [酒類] [確切份量，如30ml]
- [混合飲料] [確切份量，如150ml] 
- [裝飾配料] [適量]
- [其他材料] [份量]

製作步驟：
1. [具體的製作步驟，要簡單易懂]
2. [混合順序和技巧]
3. [裝飾和呈現方法]

風格特點：[描述口感、顏色、香氣等特色]

便利商店購買提示：[建議去哪家便利商店購買，哪些材料比較容易找到]

注意：所有材料都必須是便利商店常見商品，避免使用專業調酒器具，製作方法要適合在家操作。`;
        
        return prompt;
    }

    // 生成模擬的食譜數據
    generateMockRecipe(params) {
        const { difficulty } = params;
        
        // 根據不同難度返回不同的模擬食譜
        const recipes = {
            easy: {
                name: '蒜香奶油蘑菇義大利麵',
                ingredients: [
                    '義大利麵 200克',
                    '蘑菇 200克',
                    '蒜末 3瓣',
                    '奶油 30克',
                    '橄欖油 2湯匙',
                    '鹽 適量',
                    '黑胡椒 適量',
                    '巴西里碎 少許'
                ],
                steps: [
                    '將義大利麵放入滾水中煮至七分熟，撈起瀝乾備用',
                    '熱鍋倒入橄欖油，加入蒜末煸炒出香味',
                    '加入切片的蘑菇，中火炒至蘑菇軟化並略微金黃',
                    '加入奶油融化，然後倒入煮好的義大利麵',
                    '加入少許煮麵水，翻炒均勻',
                    '加入鹽和黑胡椒調味',
                    '出鍋前撒上巴西里碎點綴'
                ],
                budget: 120,
                calories: 450,
                difficulty: '簡單 🟢'
            },
            medium: {
                name: '檸檬香草烤雞腿',
                ingredients: [
                    '雞腿 4隻',
                    '檸檬 1個',
                    '大蒜 4瓣',
                    '迷迭香 2小枝',
                    '橄欖油 3湯匙',
                    '鹽 1茶匙',
                    '黑胡椒 1/2茶匙',
                    '蜂蜜 1湯匙',
                    '小馬鈴薯 500克'
                ],
                steps: [
                    '預熱烤箱至200℃',
                    '雞腿用廚房紙巾擦乾，在皮面劃幾刀',
                    '檸檬擠汁一半，另一半切片',
                    '將檸檬汁、橄欖油、壓碎的大蒜、鹽、胡椒和蜂蜜混合成醃料',
                    '將雞腿放入大碗中，倒入醃料均勻塗抹，醃製30分鐘',
                    '小馬鈴薯洗淨切半，與檸檬片、迷迭香一起放入烤盤',
                    '將醃好的雞腿皮面朝上放在烤盤中',
                    '放入烤箱烤40-45分鐘，途中可刷2次醃料',
                    '烤至雞皮金黃酥脆，雞腿熟透即可'
                ],
                budget: 220,
                calories: 580,
                difficulty: '中等 🔵'
            },
            hard: {
                name: '藍莓優格慕斯蛋糕',
                ingredients: [
                    '消化餅乾 150克',
                    '無鹽奶油 75克',
                    '吉利丁片 10克',
                    '藍莓 200克',
                    '細砂糖 80克',
                    '檸檬汁 2湯匙',
                    '希臘優格 250克',
                    '鮮奶油 200毫升',
                    '香草精 1茶匙',
                    '裝飾用藍莓 適量'
                ],
                steps: [
                    '將消化餅乾放入保鮮袋中壓碎成細屑',
                    '融化奶油，與餅乾屑混合均勻',
                    '將混合物壓實在8吋活底蛋糕模底部，放入冰箱冷藏30分鐘',
                    '將吉利丁片泡冷水軟化',
                    '藍莓與50克糖和檸檬汁一起煮成果醬，攪拌至糖完全融化',
                    '加入軟化的吉利丁片，攪拌至完全溶解，放涼',
                    '將希臘優格和藍莓果醬混合均勻',
                    '鮮奶油加入剩餘的糖和香草精打發至軟峰狀',
                    '將打發的鮮奶油輕輕折入藍莓優格混合物中',
                    '倒入餅乾底的蛋糕模中，震幾下排出氣泡',
                    '放入冰箱冷藏至少4小時或過夜',
                    '脫模前，用熱毛巾包圍蛋糕模側邊幾秒',
                    '慢慢脫模，頂部裝飾新鮮藍莓即可'
                ],
                budget: 350,
                calories: 520,
                difficulty: '困難 🔴'
            }
        };
        
        return recipes[difficulty] || recipes.medium;
    }

    // 生成模擬的調酒數據 - 增加更多樣化的選項
    generateMockCocktail(params) {
        const { style, alcoholLevel } = params;
        
        // 便利商店調酒模擬資料 - 大幅增加選項
        const convenienceStoreCocktails = {
            light: [
                {
                    name: '7-11 檸檬梅酒氣泡',
                    ingredients: [
                        '梅酒 40ml（便利商店小瓶裝）',
                        '檸檬汽水 120ml',
                        '薄荷葉 2-3片',
                        '冰塊 適量',
                        '檸檬片 1片（裝飾）'
                    ],
                    steps: [
                        '在杯中加入冰塊',
                        '倒入梅酒',
                        '緩慢加入檸檬汽水避免泡沫過多',
                        '放入薄荷葉增添清香',
                        '用檸檬片裝飾杯緣'
                    ],
                    style: '便利商店風格 🏪 | 清爽低酒精'
                },
                {
                    name: '全家水果啤酒',
                    ingredients: [
                        '台灣啤酒 200ml',
                        '蘋果汁 80ml',
                        '檸檬片 2片',
                        '冰塊 適量'
                    ],
                    steps: [
                        '在大杯中放入冰塊',
                        '倒入台灣啤酒',
                        '加入蘋果汁調味',
                        '用檸檬片裝飾',
                        '輕輕攪拌即可'
                    ],
                    style: '便利商店風格 🍺 | 清爽低酒精'
                },
                {
                    name: 'OK 柚子啤酒特調',
                    ingredients: [
                        'Corona 啤酒 200ml',
                        '柚子汁 60ml',
                        '蘇打水 50ml',
                        '萊姆片 2片',
                        '冰塊 適量'
                    ],
                    steps: [
                        '在杯中放入冰塊',
                        '倒入 Corona 啤酒',
                        '加入柚子汁',
                        '用蘇打水調整口感',
                        '用萊姆片裝飾'
                    ],
                    style: '便利商店風格 🍊 | 清新低酒精'
                },
                {
                    name: '萊爾富香檳氣泡水',
                    ingredients: [
                        '香檳 80ml（便利商店小瓶）',
                        '薑汁汽水 120ml',
                        '橘子片 1片',
                        '冰塊 適量',
                        '薄荷葉 裝飾'
                    ],
                    steps: [
                        '在香檳杯中放入冰塊',
                        '倒入香檳',
                        '加入薑汁汽水增加氣泡',
                        '用橘子片和薄荷葉裝飾',
                        '輕輕攪拌一下'
                    ],
                    style: '便利商店風格 🥂 | 優雅低酒精'
                },
                {
                    name: '7-11 柚子酒蘇打',
                    ingredients: [
                        '柚子酒 35ml',
                        '蘇打水 130ml',
                        '萊姆片 2片',
                        '冰塊 適量',
                        '薄荷葉 2片'
                    ],
                    steps: [
                        '杯中放入冰塊',
                        '倒入柚子酒',
                        '加入蘇打水',
                        '用萊姆片和薄荷葉裝飾',
                        '輕輕攪拌'
                    ],
                    style: '便利商店風格 🍋 | 清香低酒精'
                }
            ],
            medium: [
                {
                    name: 'OK超商威士忌可樂',
                    ingredients: [
                        '威士忌 30ml（便利商店小瓶）',
                        '可口可樂 150ml',
                        '冰塊 適量',
                        '檸檬片 1片'
                    ],
                    steps: [
                        '在玻璃杯中放入冰塊',
                        '倒入威士忌',
                        '緩慢倒入可樂避免泡沫',
                        '用檸檬片裝飾',
                        '輕輕攪拌 2-3 下'
                    ],
                    style: '便利商店風格 🥃 | 經典中酒精'
                },
                {
                    name: '萊爾富水蜜桃調酒',
                    ingredients: [
                        '水蜜桃酒 35ml',
                        '雪碧 100ml',
                        '蘋果汁 50ml',
                        '冰塊 適量',
                        '蘋果片 1片'
                    ],
                    steps: [
                        '杯中放入冰塊',
                        '依序倒入水蜜桃酒、蘋果汁',
                        '最後加入雪碧',
                        '用蘋果片裝飾',
                        '享用前攪拌均勻'
                    ],
                    style: '便利商店風格 🍑 | 水果中酒精'
                },
                {
                    name: '7-11 白蘭地咖啡',
                    ingredients: [
                        '白蘭地 25ml',
                        '黑咖啡 150ml（便利商店現煮）',
                        '糖 1包',
                        '奶泡 適量',
                        '肉桂粉 少許'
                    ],
                    steps: [
                        '準備熱咖啡杯',
                        '倒入熱咖啡',
                        '加入白蘭地和糖',
                        '攪拌均勻',
                        '頂部加上奶泡，撒上肉桂粉'
                    ],
                    style: '便利商店風格 ☕ | 溫暖中酒精'
                },
                {
                    name: '全家日本酒水果杯',
                    ingredients: [
                        '日本酒 40ml',
                        '葡萄汁 100ml',
                        '蘇打水 60ml',
                        '葡萄 3-4顆',
                        '冰塊 適量'
                    ],
                    steps: [
                        '在杯中放入冰塊',
                        '倒入日本酒',
                        '加入葡萄汁',
                        '用蘇打水調整濃度',
                        '放入葡萄裝飾'
                    ],
                    style: '便利商店風格 🍇 | 和風中酒精'
                },
                {
                    name: 'OK 紅酒氣泡',
                    ingredients: [
                        '紅酒 60ml（便利商店小瓶）',
                        '七喜 120ml',
                        '蔓越莓汁 40ml',
                        '橘子片 1片',
                        '冰塊 適量'
                    ],
                    steps: [
                        '在酒杯中加入冰塊',
                        '倒入紅酒',
                        '加入蔓越莓汁調色',
                        '用七喜增加氣泡',
                        '用橘子片裝飾'
                    ],
                    style: '便利商店風格 🍷 | 果香中酒精'
                },
                {
                    name: '萊爾富梅酒養樂多',
                    ingredients: [
                        '梅酒 40ml',
                        '養樂多 1瓶（100ml）',
                        '檸檬汽水 60ml',
                        '檸檬片 1片',
                        '冰塊 適量'
                    ],
                    steps: [
                        '在杯中加入冰塊',
                        '倒入梅酒',
                        '加入養樂多攪拌',
                        '用檸檬汽水調整口感',
                        '用檸檬片裝飾'
                    ],
                    style: '便利商店風格 🥛 | 創意中酒精'
                }
            ],
            strong: [
                {
                    name: '便利商店燒酎檸檬',
                    ingredients: [
                        '燒酎 40ml',
                        '檸檬汽水 100ml',
                        '檸檬片 2片',
                        '冰塊 適量',
                        '鹽巴 少許（杯緣）'
                    ],
                    steps: [
                        '用檸檬片擦拭杯緣，沾上鹽巴',
                        '杯中加入冰塊',
                        '倒入燒酎',
                        '加入檸檬汽水',
                        '用檸檬片裝飾並攪拌'
                    ],
                    style: '便利商店風格 🍋 | 清爽高酒精'
                },
                {
                    name: '便利商店伏特加養樂多',
                    ingredients: [
                        '伏特加 35ml',
                        '養樂多 1瓶（100ml）',
                        '雪碧 50ml',
                        '冰塊 適量'
                    ],
                    steps: [
                        '在搖酒器中加入冰塊',
                        '倒入伏特加和養樂多',
                        '搖勻後倒入杯中',
                        '加入雪碧增加氣泡',
                        '攪拌後即可享用'
                    ],
                    style: '便利商店風格 🥛 | 創意高酒精'
                },
                {
                    name: '7-11 威士忌綠茶',
                    ingredients: [
                        '威士忌 45ml',
                        '無糖綠茶 150ml（便利商店瓶裝）',
                        '蜂蜜 1小包',
                        '檸檬片 1片',
                        '冰塊 適量'
                    ],
                    steps: [
                        '在杯中放入冰塊',
                        '倒入威士忌',
                        '加入無糖綠茶',
                        '用蜂蜜調味',
                        '用檸檬片裝飾'
                    ],
                    style: '便利商店風格 🍵 | 和風高酒精'
                },
                {
                    name: '萊爾富白酒蘇打',
                    ingredients: [
                        '白酒 50ml',
                        '蘇打水 100ml',
                        '檸檬汽水 50ml',
                        '萊姆片 2片',
                        '冰塊 適量',
                        '薄荷葉 裝飾'
                    ],
                    steps: [
                        '在杯中放入冰塊',
                        '倒入白酒',
                        '加入蘇打水',
                        '用檸檬汽水調味',
                        '用萊姆片和薄荷葉裝飾'
                    ],
                    style: '便利商店風格 🍃 | 清新高酒精'
                },
                {
                    name: '全家伏特加紅茶',
                    ingredients: [
                        '伏特加 40ml',
                        '紅茶 140ml（便利商店瓶裝）',
                        '檸檬汁 10ml',
                        '糖漿 1小包',
                        '冰塊 適量',
                        '檸檬片 裝飾'
                    ],
                    steps: [
                        '在杯中加入冰塊',
                        '倒入伏特加',
                        '加入紅茶',
                        '用檸檬汁和糖漿調味',
                        '用檸檬片裝飾'
                    ],
                    style: '便利商店風格 🫖 | 經典高酒精'
                },
                {
                    name: 'OK 燒酎蘋果汁',
                    ingredients: [
                        '燒酎 45ml',
                        '蘋果汁 120ml',
                        '薑汁汽水 50ml',
                        '蘋果片 2片',
                        '冰塊 適量',
                        '肉桂粉 少許'
                    ],
                    steps: [
                        '杯中放入冰塊',
                        '倒入燒酎',
                        '加入蘋果汁',
                        '用薑汁汽水增加氣泡',
                        '用蘋果片裝飾，撒上肉桂粉'
                    ],
                    style: '便利商店風格 🍎 | 溫潤高酒精'
                }
            ]
        };
        
        // 根據酒精強度選擇對應的調酒，增加隨機性
        const levelCocktails = convenienceStoreCocktails[alcoholLevel] || convenienceStoreCocktails.medium;
        
        // 增加時間因子和多重隨機因子來提高選擇的多樣性
        const timeBasedSeed = Date.now() % 1000;
        const userSeed = Math.floor(Math.random() * 100);
        const combinedSeed = (timeBasedSeed + userSeed) % levelCocktails.length;
        const randomIndex = (Math.floor(Math.random() * levelCocktails.length) + combinedSeed) % levelCocktails.length;
        
        const selectedCocktail = levelCocktails[randomIndex];
        
        console.log(`使用便利商店調酒模擬數據: ${selectedCocktail.name} (隨機索引: ${randomIndex}/${levelCocktails.length-1}, 酒精強度: ${alcoholLevel})`);
        return selectedCocktail;
    }

}

// 導出 GeminiService 類別供其他模組使用
window.GeminiService = GeminiService;
