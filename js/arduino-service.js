// arduino-service.js
// Arduino 硬體連接與通訊服務 - 支援按鈕加燈泡難度選擇

class ArduinoService {
    constructor() {
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.connected = false;
        this.readLoopPromise = null;
        this.currentDifficulty = 'easy'; // 當前選擇的難度
        this.difficultyLights = {
            easy: false,    // 簡單難度燈泡狀態
            medium: false,  // 中等難度燈泡狀態
            hard: false     // 困難難度燈泡狀態
        };
        
        // 添加數據緩衝區來處理分片接收的數據
        this.dataBuffer = '';
    }

    // 檢查瀏覽器是否支援 Web Serial API
    checkSerialSupport() {
        if ('serial' in navigator) {
            console.log('Web Serial API 支援中');
            return true;
        }
        console.error('您的瀏覽器不支援 Web Serial API');
        return false;
    }

    // 連接到 Arduino 設備
    async connect() {
        if (!this.checkSerialSupport()) {
            return false;
        }

        try {
            // 中斷現有連接
            await this.disconnect();
            
            // 請求用戶選擇 Arduino 設備
            this.port = await navigator.serial.requestPort();
            
            // 打開串口連接，設定波特率 9600
            await this.port.open({ baudRate: 9600 });
            
            // 設置讀取器
            this.setupReader();
            
            // 設置寫入器
            this.writer = this.port.writable.getWriter();
            
            this.connected = true;
            console.log('已連接到 Arduino');
            
            return true;
        } catch (error) {
            console.error('連接 Arduino 時出錯:', error);
            await this.disconnect();
            return false;
        }
    }

    // 中斷與 Arduino 的連接
    async disconnect() {
        if (this.reader) {
            try {
                // 停止讀取循環
                await this.reader.cancel();
                this.reader.releaseLock();
            } catch (error) {
                console.error('關閉讀取器時出錯:', error);
            }
            this.reader = null;
        }
        
        if (this.writer) {
            try {
                this.writer.releaseLock();
            } catch (error) {
                console.error('關閉寫入器時出錯:', error);
            }
            this.writer = null;
        }
        
        if (this.port && this.port.readable) {
            try {
                await this.port.close();
            } catch (error) {
                console.error('關閉串口時出錯:', error);
            }
            this.port = null;
        }
        
        this.connected = false;
    }

    // 設置串口讀取器
    setupReader() {
        if (!this.port || !this.port.readable) {
            return;
        }
        
        this.reader = this.port.readable.getReader();
        
        // 開始讀取循環
        this.readLoopPromise = this.readLoop();
    }

    // 持續讀取 Arduino 發送的數據
    async readLoop() {
        while (true) {
            try {
                const { value, done } = await this.reader.read();
                
                if (done) {
                    console.log('Arduino 讀取流已關閉');
                    break;
                }
                
                // 解析收到的數據
                const text = new TextDecoder().decode(value);
                this.handleReceivedData(text);
            } catch (error) {
                console.error('Arduino 讀取錯誤:', error);
                break;
            }
        }
        
        // 釋放讀取器鎖
        if (this.reader) {
            try {
                this.reader.releaseLock();
            } catch (error) {
                console.error('讀取循環結束時釋放鎖出錯:', error);
            }
            this.reader = null;
        }
    }

    // 處理從 Arduino 接收的數據
    handleReceivedData(data) {
        console.log('從 Arduino 接收原始數據:', JSON.stringify(data));
        
        // 將新數據添加到緩衝區
        this.dataBuffer += data;
        
        // 檢查是否有完整的行（以換行符結尾）
        let lines = this.dataBuffer.split('\n');
        
        // 保留最後一個可能不完整的行
        this.dataBuffer = lines.pop() || '';
        
        // 處理完整的行
        lines.forEach(line => {
            if (line.trim().length > 0) {
                console.log('處理完整行:', JSON.stringify(line.trim()));
                this.processCompleteLine(line.trim());
            }
        });
        
        // 觸發自定義事件
        const event = new CustomEvent('arduino-data', { detail: { data } });
        document.dispatchEvent(event);
    }
    
    // 處理完整的命令行
    processCompleteLine(line) {
        console.log('處理Arduino命令行:', line);
        
        if (line.startsWith('BUTTON:')) {
            // 處理按鈕按下事件
            const buttonInfo = line.substring(7); // 移除 "BUTTON:" 前綴
            this.handleButtonPress(buttonInfo);
        } else if (line.startsWith('DIFFICULTY:')) {
            // 處理難度變更回應
            const difficulty = line.substring(11); // 移除 "DIFFICULTY:" 前綴
            console.log('接收到難度指令:', difficulty);
            this.handleDifficultyChange(difficulty);
        } else if (line.includes('LED狀態:') || line.includes('按鈕') || line.includes('Arduino') || line.includes('系統')) {
            // 這些是診斷信息，記錄但不處理
            console.log('Arduino診斷信息:', line);
        } else {
            // 記錄未識別的命令
            console.log('未識別的Arduino命令:', line);
        }
    }
    
    // 處理Arduino按鈕按下事件
    handleButtonPress(buttonInfo) {
        console.log('Arduino按鈕按下:', buttonInfo);
        
        if (buttonInfo === 'TOGGLE') {
            // 這是循環切換事件，等待DIFFICULTY消息來更新狀態
            console.log('檢測到按鈕切換事件');
        }
    }
    
    // 處理難度變更
    handleDifficultyChange(difficulty) {
        console.log('處理難度變更請求:', difficulty);
        
        const difficultyMap = {
            'EASY': 'easy',
            'MEDIUM': 'medium', 
            'HARD': 'hard'
        };
        
        const normalizedDifficulty = difficultyMap[difficulty.toUpperCase()] || difficulty.toLowerCase();
        console.log('正規化難度:', normalizedDifficulty);
        
        // 更新內部狀態
        this.currentDifficulty = normalizedDifficulty;
        
        // 同步網頁端的難度選擇
        this.syncWebDifficulty(normalizedDifficulty);
        
        // 觸發難度變更事件，確保食譜生成器可以接收
        const difficultyEvent = new CustomEvent('difficulty-changed', { 
            detail: { 
                difficulty: normalizedDifficulty,
                source: 'arduino' 
            } 
        });
        
        console.log('派發難度變更事件:', difficultyEvent.detail);
        document.dispatchEvent(difficultyEvent);
        
        // 額外保險：直接調用食譜生成器的setDifficulty方法
        if (window.recipeGeneratorInstance && typeof window.recipeGeneratorInstance.setDifficulty === 'function') {
            console.log('直接調用食譜生成器設定難度:', normalizedDifficulty);
            window.recipeGeneratorInstance.setDifficulty(normalizedDifficulty);
        } else {
            console.warn('食譜生成器未找到或setDifficulty方法不存在');
            // 提供更詳細的調試信息
            console.log('調試信息: recipeGeneratorInstance =', !!window.recipeGeneratorInstance);
            console.log('調試信息: setDifficulty 方法 =', typeof window.recipeGeneratorInstance?.setDifficulty);
        }
        
        // 也觸發原有的事件以保持相容性
        const event = new CustomEvent('arduino-difficulty-change', { 
            detail: { difficulty: normalizedDifficulty } 
        });
        document.dispatchEvent(event);
    }
    
    // 同步網頁端的難度選擇
    syncWebDifficulty(difficulty) {
        console.log(`開始同步網頁端難度為: ${difficulty}`);
        
        const difficultyButtons = {
            easy: document.getElementById('easyBtn'),
            medium: document.getElementById('mediumBtn'),
            hard: document.getElementById('hardBtn')
        };
        
        // 檢查按鈕是否存在
        Object.entries(difficultyButtons).forEach(([key, btn]) => {
            if (!btn) {
                console.error(`找不到${key}按鈕元素`);
            }
        });
        
        // 設置一個標記，表示這是來自Arduino的同步，避免循環調用
        window._arduinoSync = true;
        
        try {
            // 直接調用 RecipeGenerator 的 setDifficulty 方法
            if (window.recipeGeneratorInstance && typeof window.recipeGeneratorInstance.setDifficulty === 'function') {
                console.log('調用 RecipeGenerator.setDifficulty()');
                window.recipeGeneratorInstance.setDifficulty(difficulty);
                console.log(`已通過 RecipeGenerator 設置難度為: ${difficulty}`);
            } else {
                console.error('RecipeGenerator 實例或 setDifficulty 方法不存在');
                
                // 備用方案：手動更新按鈕狀態
                Object.values(difficultyButtons).forEach(btn => {
                    if (btn) btn.classList.remove('active');
                });
                
                if (difficultyButtons[difficulty]) {
                    difficultyButtons[difficulty].classList.add('active');
                    console.log(`已手動設置 ${difficulty} 按鈕為 active`);
                }
            }
        } catch (error) {
            console.error('同步網頁端難度時出錯:', error);
        } finally {
            // 清除Arduino同步標記
            window._arduinoSync = false;
        }
        
        console.log(`網頁端難度同步完成: ${difficulty}`);
    }

    // 向 Arduino 發送數據
    async sendData(data) {
        if (!this.writer || !this.connected) {
            console.error('未連接到 Arduino，無法發送數據');
            return false;
        }
        
        try {
            // 將數據編碼為 UTF-8 位元組
            const bytes = new TextEncoder().encode(data + '\n');
            await this.writer.write(bytes);
            console.log('成功向 Arduino 發送數據:', data);
            return true;
        } catch (error) {
            console.error('向 Arduino 發送數據時出錯:', error);
            return false;
        }
    }

    // 發送食譜到 Arduino (移除OLED顯示，改為LED燈光回饋)
    async sendRecipe(recipe) {
        if (!recipe) return false;
        
        try {
            // 發送食譜生成完成信號 (可用LED閃爍表示)
            await this.sendData(`RECIPE_GENERATED:${recipe.name}`);
            
            // 發送難度信息並點亮對應燈泡
            await this.setDifficulty(recipe.difficulty || 'easy');
            
            // 發送食譜統計資訊 (用於串口監視器查看，不再顯示在OLED)
            await this.sendData(`STATS:BUDGET:${recipe.budget},CALORIES:${recipe.calories}`);
            
            console.log('食譜信息已發送到Arduino (使用LED燈光回饋)');
            return true;
        } catch (error) {
            console.error('發送食譜到 Arduino 時出錯:', error);
            return false;
        }
    }
    
    // 發送調酒到 Arduino (移除OLED顯示，改為LED燈光回饋)
    async sendCocktail(cocktail) {
        if (!cocktail) return false;
        
        try {
            // 發送調酒生成完成信號
            await this.sendData(`COCKTAIL_GENERATED:${cocktail.name}`);
            
            // 調酒使用固定的燈光模式 (例如全部燈泡閃爍)
            await this.cocktailLightEffect();
            
            console.log('調酒信息已發送到Arduino (使用LED燈光回饋)');
            return true;
        } catch (error) {
            console.error('發送調酒到 Arduino 時出錯:', error);
            return false;
        }
    }
    
    // 調酒專用燈光效果
    async cocktailLightEffect() {
        if (!this.connected) return false;
        
        try {
            // 讓所有燈泡閃爍3次表示調酒生成
            for (let i = 0; i < 3; i++) {
                // 全部點亮
                await this.sendData('LIGHTS:EASY:1,MEDIUM:1,HARD:1');
                await new Promise(resolve => setTimeout(resolve, 200));
                
                // 全部熄滅
                await this.sendData('LIGHTS:EASY:0,MEDIUM:0,HARD:0');
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            console.log('調酒燈光效果完成');
            return true;
        } catch (error) {
            console.error('調酒燈光效果錯誤:', error);
            return false;
        }
    }

    // 設置難度並控制LED燈
    async setDifficulty(difficulty) {
        if (!['easy', 'medium', 'hard'].includes(difficulty)) {
            console.error('無效的難度設置:', difficulty);
            return false;
        }
        
        this.currentDifficulty = difficulty;
        
        // 重置所有燈泡狀態
        this.difficultyLights = {
            easy: false,
            medium: false,
            hard: false
        };
        
        // 點亮對應難度的燈泡
        this.difficultyLights[difficulty] = true;
        
        // 發送燈泡控制指令到Arduino
        await this.updateDifficultyLights();
        
        console.log(`難度設置為: ${difficulty}`);
        return true;
    }
    
    // 更新Arduino端的難度指示燈
    async updateDifficultyLights() {
        if (!this.connected) {
            console.log('Arduino未連接，跳過燈泡更新');
            return false;
        }
        
        try {
            // 發送燈泡狀態到Arduino
            // 格式: LIGHTS:EASY:0,MEDIUM:0,HARD:1 (1=亮，0=滅)
            const lightStates = [
                `EASY:${this.difficultyLights.easy ? 1 : 0}`,
                `MEDIUM:${this.difficultyLights.medium ? 1 : 0}`,
                `HARD:${this.difficultyLights.hard ? 1 : 0}`
            ].join(',');
            
            await this.sendData(`LIGHTS:${lightStates}`);
            console.log('燈泡狀態已更新:', lightStates);
            return true;
        } catch (error) {
            console.error('更新燈泡狀態時出錯:', error);
            return false;
        }
    }
    
    // 重置所有燈泡
    async resetLights() {
        this.difficultyLights = {
            easy: false,
            medium: false,
            hard: false
        };
        
        await this.updateDifficultyLights();
        console.log('所有燈泡已重置');
    }
    
    // 測試燈泡序列（用於調試）
    async testLights() {
        if (!this.connected) {
            console.log('Arduino未連接，無法測試燈泡');
            return false;
        }
        
        console.log('開始燈泡測試序列...');
        
        // 依序點亮每個燈泡
        const difficulties = ['easy', 'medium', 'hard'];
        
        for (const difficulty of difficulties) {
            await this.setDifficulty(difficulty);
            await new Promise(resolve => setTimeout(resolve, 500)); // 等待500ms
        }
        
        // 最後重置所有燈泡
        await this.resetLights();
        
        console.log('燈泡測試序列完成');
        return true;
    }

    // 檢查是否已連接
    isConnected() {
        return this.connected;
    }
}

// 導出 ArduinoService 類別供其他模組使用
window.ArduinoService = ArduinoService;
