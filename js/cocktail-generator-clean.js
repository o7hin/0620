// cocktail-generator.js
// 便利商店調酒生成功能

class CocktailGenerator {
    constructor() {
        this.cocktailPreferences = {
            style: 'convenience', // 專注於便利商店調酒
            alcoholLevel: 'medium', // 'light', 'medium', 'strong'
            convenienceStore: 'all' // 'all', '7-11', 'familymart', 'hilife', 'ok'
        };
        
        // 便利商店常見調酒材料清單
        this.convenienceStoreMaterials = {
            alcohols: [
                '台灣啤酒', '海尼根啤酒', 'Corona啤酒', 
                '梅酒', '柚子酒', '水蜜桃酒',
                '燒酎', '威士忌', '伏特加', '白蘭地',
                '日本酒', '紅酒', '白酒', '香檳'
            ],
            mixers: [
                '可口可樂', '百事可樂', '雪碧', '七喜',
                '蘇打水', '薑汁汽水', '檸檬汽水', 
                '蔓越莓汁', '柳橙汁', '蘋果汁', '葡萄汁',
                '養樂多', '優酪乳', '綠茶', '紅茶', '咖啡'
            ],
            garnishes: [
                '檸檬片', '萊姆片', '橘子片', '蘋果片',
                '薄荷葉', '冰塊', '鹽巴', '糖',
                '蜂蜜', '楓糖漿', '奶泡', '肉桂粉'
            ],
            snacks: [
                '洋芋片', '爆米花', '堅果', '魷魚絲',
                '牛肉乾', '巧克力', '餅乾', '蝦味先',
                '起司條', '泡菜', '關東煮', '茶葉蛋'
            ]
        };
        
        // 模擬用戶調酒偏好學習資料
        this.cocktailHistory = [];
        
        this.initialize();
    }
    
    initialize() {
        // 獲取 DOM 元素
        this.cocktailTabBtn = document.getElementById('cocktailTabBtn');
        
        this.cocktailNameElement = document.getElementById('cocktailName');
        this.cocktailIngredientsElement = document.getElementById('cocktailIngredients');
        this.cocktailStepsElement = document.getElementById('cocktailSteps');
        this.cocktailStyleElement = document.getElementById('cocktailStyle');
        
        // 設置事件監聽器
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // 點擊調酒標籤按鈕時生成調酒配方
        this.cocktailTabBtn.addEventListener('click', () => this.generateCocktail());
        
        // 添加酒精濃度偏好切換功能（隱藏的功能，用戶可點擊風格區域來切換）
        if (this.cocktailStyleElement) {
            this.cocktailStyleElement.addEventListener('click', () => {
                this.cycleThroughAlcoholLevels();
            });
            this.cocktailStyleElement.style.cursor = 'pointer';
            this.cocktailStyleElement.title = '點擊切換酒精濃度偏好';
        }
    }
    
    // 循環切換酒精濃度偏好
    cycleThroughAlcoholLevels() {
        const levels = ['light', 'medium', 'strong'];
        const currentIndex = levels.indexOf(this.cocktailPreferences.alcoholLevel);
        const nextIndex = (currentIndex + 1) % levels.length;
        this.cocktailPreferences.alcoholLevel = levels[nextIndex];
        
        const levelNames = {
            light: '🍃 低酒精',
            medium: '🥃 中酒精', 
            strong: '🔥 高酒精'
        };
        
        console.log(`酒精偏好已切換至: ${levelNames[this.cocktailPreferences.alcoholLevel]}`);
        
        // 顯示切換訊息
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2196F3;
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        notification.textContent = `酒精偏好: ${levelNames[this.cocktailPreferences.alcoholLevel]}`;
        document.body.appendChild(notification);
        
        // 3秒後自動移除通知
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
    
    async generateCocktail() {
        try {
            // 顯示生成中狀態
            this.cocktailNameElement.textContent = '正在生成便利商店調酒...';
            this.cocktailIngredientsElement.innerHTML = '<li>請稍候...</li>';
            this.cocktailStepsElement.innerHTML = '<li>正在創意發想中...</li>';
            
            console.log('開始生成便利商店調酒配方');
            
            // 學習用戶偏好
            this.analyzeUserPreferences();
            
            // 呼叫 Google API 生成便利商店調酒配方
            let cocktail;
            
            // 檢查是否有可用的 Google API 服務
            if (window.geminiServiceInstance && window.geminiServiceInstance.isInitialized()) {
                const params = {
                    style: 'convenience_store', // 強制使用便利商店風格
                    alcoholLevel: this.cocktailPreferences.alcoholLevel,
                    materials: this.convenienceStoreMaterials,
                    focus: '便利商店調酒'
                };
                
                cocktail = await window.geminiServiceInstance.generateCocktail(params);
            } else {
                // 使用便利商店模擬數據
                console.log('使用便利商店模擬數據（Google API 未初始化）');
                cocktail = await this.mockConvenienceStoreCocktail();
            }
            
            // 顯示生成的調酒配方
            this.displayCocktail(cocktail);
            
            // 記錄這次的調酒生成
            this.recordCocktail(cocktail);
            
            console.log('便利商店調酒生成完成:', cocktail.name);
            
        } catch (error) {
            console.error('生成便利商店調酒時出錯:', error);
            this.cocktailNameElement.textContent = '便利商店調酒生成失敗';
            this.cocktailIngredientsElement.innerHTML = '<li>發生錯誤，請重試</li>';
            this.cocktailStepsElement.innerHTML = '<li>錯誤訊息：' + error.message + '</li>';
            this.cocktailStyleElement.textContent = '錯誤';
        }
    }
    
    // 便利商店調酒生成方法 - 增強隨機性和多樣性
    async mockConvenienceStoreCocktail() {
        // 模擬 API 請求延遲
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const convenienceRecipes = [
            {
                name: '7-11 威士忌可樂',
                ingredients: [
                    '威士忌 30ml（便利商店小瓶裝）',
                    '可口可樂 150ml',
                    '冰塊 適量',
                    '檸檬片 1片（裝飾用）'
                ],
                steps: [
                    '在玻璃杯中放入冰塊',
                    '倒入威士忌',
                    '緩慢倒入可口可樂，避免泡沫過多',
                    '用檸檬片裝飾杯緣',
                    '輕輕攪拌 2-3 下即可享用'
                ],
                style: '經典便利商店風格 🥃 | 中等酒精濃度'
            },
            {
                name: '全家梅酒氣泡',
                ingredients: [
                    '梅酒 40ml（便利商店常見品牌）',
                    '檸檬汽水 120ml',
                    '薄荷葉 2-3片',
                    '冰塊 適量'
                ],
                steps: [
                    '在杯中加入冰塊',
                    '倒入梅酒',
                    '加入檸檬汽水',
                    '放入薄荷葉增添香氣',
                    '用吸管輕輕攪拌'
                ],
                style: '清爽便利商店風格 🍋 | 低酒精濃度'
            },
            {
                name: 'OK超商水蜜桃嗨',
                ingredients: [
                    '水蜜桃酒 35ml',
                    '雪碧 100ml',
                    '蘋果汁 50ml',
                    '冰塊 適量',
                    '蘋果片 1片（裝飾）'
                ],
                steps: [
                    '杯中放入冰塊',
                    '依序倒入水蜜桃酒、蘋果汁',
                    '最後加入雪碧',
                    '用蘋果片裝飾',
                    '享用前攪拌均勻'
                ],
                style: '水果便利商店風格 🍑 | 中等酒精濃度'
            },
            {
                name: '萊爾富燒酎檸檬',
                ingredients: [
                    '燒酎 30ml（便利商店常見）',
                    '檸檬汽水 130ml',
                    '檸檬片 2片',
                    '冰塊 適量',
                    '鹽巴 少許（杯緣裝飾）'
                ],
                steps: [
                    '用檸檬片擦拭杯緣，沾上少許鹽巴',
                    '杯中加入冰塊',
                    '倒入燒酎',
                    '加入檸檬汽水',
                    '用檸檬片裝飾並攪拌'
                ],
                style: '清爽便利商店風格 🍋 | 中等酒精濃度'
            },
            {
                name: '便利商店養樂多調酒',
                ingredients: [
                    '伏特加 25ml',
                    '養樂多 1瓶（100ml）',
                    '雪碧 50ml',
                    '冰塊 適量'
                ],
                steps: [
                    '在搖酒器中加入冰塊',
                    '倒入伏特加和養樂多',
                    '搖勻後倒入杯中',
                    '加入雪碧增加氣泡感',
                    '攪拌後即可享用'
                ],
                style: '創意便利商店風格 🥛 | 中等酒精濃度'
            },
            {
                name: '便利店啤酒水果杯',
                ingredients: [
                    '台灣啤酒 200ml',
                    '柳橙汁 80ml',
                    '檸檬片 1片',
                    '橘子片 1片',
                    '冰塊 適量'
                ],
                steps: [
                    '在大杯中放入冰塊',
                    '倒入台灣啤酒',
                    '緩慢加入柳橙汁',
                    '用水果片裝飾',
                    '輕輕攪拌即可'
                ],
                style: '清爽便利商店風格 🍺 | 低酒精濃度'
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
                style: '清香便利商店風格 🍋 | 低酒精濃度'
            },
            {
                name: '全家白蘭地咖啡',
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
                style: '溫暖便利商店風格 ☕ | 中等酒精濃度'
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
                style: '果香便利商店風格 🍷 | 中等酒精濃度'
            },
            {
                name: '萊爾富威士忌綠茶',
                ingredients: [
                    '威士忌 35ml',
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
                style: '和風便利商店風格 🍵 | 中等酒精濃度'
            }
        ];
        
        // 增加多重隨機因子來確保每次選擇都不同
        const timeBasedSeed = Date.now() % 1000;
        const userClickSeed = Math.floor(Math.random() * 100);
        const combinedSeed = (timeBasedSeed + userClickSeed + this.cocktailHistory.length) % convenienceRecipes.length;
        
        // 使用複合隨機選擇算法
        let selectedIndex = (Math.floor(Math.random() * convenienceRecipes.length) + combinedSeed) % convenienceRecipes.length;
        
        // 避免連續選擇相同的配方
        if (this.cocktailHistory.length > 0) {
            const lastRecipe = this.cocktailHistory[this.cocktailHistory.length - 1];
            if (convenienceRecipes[selectedIndex].name === lastRecipe.name && convenienceRecipes.length > 1) {
                selectedIndex = (selectedIndex + 1) % convenienceRecipes.length;
            }
        }
        
        const selectedRecipe = convenienceRecipes[selectedIndex];
        
        console.log(`選擇的便利商店調酒: ${selectedRecipe.name} (索引: ${selectedIndex}/${convenienceRecipes.length-1})`);
        console.log('隨機因子:', { timeBasedSeed, userClickSeed, combinedSeed, historyLength: this.cocktailHistory.length });
        
        return selectedRecipe;
    }
    
    displayCocktail(cocktailData) {
        // 顯示調酒名稱
        this.cocktailNameElement.textContent = cocktailData.name;
        
        // 顯示材料
        this.cocktailIngredientsElement.innerHTML = '';
        cocktailData.ingredients.forEach(ingredient => {
            const li = document.createElement('li');
            li.textContent = ingredient;
            this.cocktailIngredientsElement.appendChild(li);
        });
        
        // 顯示製作步驟
        this.cocktailStepsElement.innerHTML = '';
        cocktailData.steps.forEach(step => {
            const li = document.createElement('li');
            li.textContent = step;
            this.cocktailStepsElement.appendChild(li);
        });
        
        // 顯示風格
        this.cocktailStyleElement.textContent = cocktailData.style;
        
        console.log('便利商店調酒配方顯示完成');
    }
    
    // 分析用戶偏好
    analyzeUserPreferences() {
        // 簡化的偏好分析
        console.log('分析用戶偏好（便利商店調酒）');
    }
    
    // 記錄調酒生成
    recordCocktail(cocktail) {
        this.cocktailHistory.push({
            ...cocktail,
            timestamp: new Date()
        });
        console.log('記錄便利商店調酒:', cocktail.name);
    }
    
    // 獲取用戶調酒偏好分析
    getUserPreferences() {
        if (this.cocktailHistory.length === 0) {
            return '尚無足夠數據進行分析';
        }
        
        // 分析最常選擇的風格
        const styleCount = {};
        this.cocktailHistory.forEach(cocktail => {
            const style = cocktail.style || '未知';
            styleCount[style] = (styleCount[style] || 0) + 1;
        });
        
        const preferredStyle = Object.keys(styleCount).reduce((a, b) => 
            styleCount[a] > styleCount[b] ? a : b
        );
        
        return `您似乎偏好：${preferredStyle}`;
    }
    
    // 清除調酒偏好歷史
    clearCocktailHistory() {
        this.cocktailHistory = [];
        console.log('便利商店調酒偏好歷史已清除');
    }
}

// 導出類別以便在其他文件中使用
window.CocktailGenerator = CocktailGenerator;
