// recipe-generator.js
// 食譜生成與 AI 整合功能

class RecipeGenerator {
    constructor() {
        this.difficultyLevel = 'easy'; // 預設為簡單
        this.userPreferences = {
            favoriteIngredients: [],
            budgetRange: { min: 100, max: 300 },
            caloriesRange: { min: 300, max: 700 },
            preferredDifficulty: 'easy'
        };
        
        // 模擬用戶偏好學習資料
        this.preferencesHistory = [];
        
        this.initialize();
    }
    
    initialize() {
        // 獲取 DOM 元素
        this.easyBtn = document.getElementById('easyBtn');
        this.mediumBtn = document.getElementById('mediumBtn');
        this.hardBtn = document.getElementById('hardBtn');
        this.confirmBtn = document.getElementById('confirmBtn');
        
        this.recipeNameElement = document.getElementById('recipeName');
        this.recipeIngredientsElement = document.getElementById('recipeIngredients');
        this.recipeStepsElement = document.getElementById('recipeSteps');
        this.recipeBudgetElement = document.getElementById('recipeBudget');
        this.recipeCaloriesElement = document.getElementById('recipeCalories');
        this.recipeDifficultyElement = document.getElementById('recipeDifficulty');
        this.shoppingListElement = document.getElementById('shoppingList');
        
        // 設置事件監聽器
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // 難度按鈕事件 - 支援Arduino控制
        this.easyBtn.addEventListener('click', () => this.handleDifficultyClick('easy'));
        this.mediumBtn.addEventListener('click', () => this.handleDifficultyClick('medium'));
        this.hardBtn.addEventListener('click', () => this.handleDifficultyClick('hard'));
        
        // 確認按鈕事件
        this.confirmBtn.addEventListener('click', () => this.generateRecipe());
        
        // 監聽來自Arduino的難度變更事件
        document.addEventListener('difficulty-changed', (event) => {
            console.log('RecipeGenerator: 接收到難度變更事件:', event.detail);
            if (event.detail && event.detail.source === 'arduino') {
                const difficulty = event.detail.difficulty;
                console.log(`RecipeGenerator: 從Arduino接收難度變更為 ${difficulty}`);
                this.setDifficulty(difficulty);
            }
        });
        
        // 相容性：也監聽舊的Arduino事件
        document.addEventListener('arduino-difficulty-change', (event) => {
            console.log('RecipeGenerator: 接收到Arduino難度變更事件:', event.detail);
            if (event.detail && event.detail.difficulty) {
                this.setDifficulty(event.detail.difficulty);
            }
        });
    }
    
    // 處理難度按鈕點擊 - 考慮Arduino連接狀態
    handleDifficultyClick(level) {
        // 如果這是來自Arduino的同步，直接設置難度而不發送回Arduino
        if (window._arduinoSync) {
            console.log(`來自Arduino的同步，直接設置網頁端難度為: ${level}`);
            this.setDifficulty(level);
            return;
        }
        
        // 檢查Arduino是否已連接
        const isArduinoConnected = window.arduinoServiceInstance && window.arduinoServiceInstance.isConnected();
        
        if (isArduinoConnected) {
            // 如果Arduino已連接，通過Arduino設置難度
            console.log(`通過Arduino設置難度為: ${level}`);
            window.arduinoServiceInstance.setDifficulty(level);
            
            // 顯示提示信息
            if (typeof showNotification === 'function') {
                showNotification(`🎛️ 已向Arduino發送難度設置: ${this.getDifficultyDisplayName(level)}`, 'info', 2000);
            }
        } else {
            // 如果Arduino未連接，直接在網頁端設置
            console.log(`直接在網頁端設置難度為: ${level}`);
            this.setDifficulty(level);
            
            // 顯示提示信息
            if (typeof showNotification === 'function') {
                showNotification(`💻 網頁端難度設置為: ${this.getDifficultyDisplayName(level)} (建議連接Arduino獲得更好體驗)`, 'warning', 3000);
            }
        }
    }
    
    // 獲取難度顯示名稱
    getDifficultyDisplayName(level) {
        const displayNames = {
            'easy': '簡單',
            'medium': '中等',
            'hard': '困難'
        };
        return displayNames[level] || level;
    }
    
    setDifficulty(level) {
        console.log(`RecipeGenerator: 設置難度為 ${level}`);
        
        // 先清除所有按鈕的 active 狀態
        this.easyBtn.classList.remove('active');
        this.mediumBtn.classList.remove('active');
        this.hardBtn.classList.remove('active');
        
        // 設置選中的按鈕
        switch(level) {
            case 'easy':
                this.easyBtn.classList.add('active');
                console.log('簡單按鈕已設為 active');
                break;
            case 'medium':
                this.mediumBtn.classList.add('active');
                console.log('中等按鈕已設為 active');
                break;
            case 'hard':
                this.hardBtn.classList.add('active');
                console.log('困難按鈕已設為 active');
                break;
            default:
                console.warn(`未知的難度級別: ${level}`);
        }
        
        // 更新內部狀態
        this.difficultyLevel = level;
        console.log(`RecipeGenerator: 內部難度狀態已更新為 ${this.difficultyLevel}`);
        
        // 觸發難度變更事件（方便其他模組監聽）
        const event = new CustomEvent('recipe-difficulty-change', { 
            detail: { difficulty: level } 
        });
        document.dispatchEvent(event);
    }
    
    async generateRecipe() {
        try {
            console.log('=== 開始生成食譜 ===');
            
            // 顯示生成中狀態
            this.recipeNameElement.textContent = '正在生成食譜...';
            this.recipeIngredientsElement.innerHTML = '<li>請稍候...</li>';
            this.recipeStepsElement.innerHTML = '<li>正在分析您的需求...</li>';
            
            // 獲取手動輸入結果
            const inputHandler = window.speechRecognitionInstance;
            let inputResult = {};
            
            if (inputHandler && typeof inputHandler.getRecognitionResult === 'function') {
                inputResult = inputHandler.getRecognitionResult();
                console.log('從 ManualInputHandler 獲取的輸入結果:', inputResult);
            } else {
                console.warn('ManualInputHandler 不可用，將使用表單直接獲取');
            }
            
            // 也從表單直接獲取輸入，作為備用
            const ingredientsInput = document.getElementById('ingredientsInput') ? document.getElementById('ingredientsInput').value : '';
            const foodRequirementsInput = document.getElementById('foodRequirementsInput') ? document.getElementById('foodRequirementsInput').value : '';
            const budgetInput = document.getElementById('budgetInput') ? document.getElementById('budgetInput').value : '';
            const caloriesInput = document.getElementById('caloriesInput') ? document.getElementById('caloriesInput').value : '';
            
            console.log('表單直接獲取的值:', {
                ingredientsInput,
                foodRequirementsInput,
                budgetInput,
                caloriesInput
            });
            
            // 優先使用 ManualInputHandler 的結果，表單輸入作為備用
            const ingredients = (inputResult.ingredients && inputResult.ingredients.length > 0) 
                ? inputResult.ingredients 
                : (ingredientsInput ? ingredientsInput.split(/[、,，\s和與及]+/).filter(i => i.trim() !== '') : []);
                
            const foodRequirements = (inputResult.foodRequirements && inputResult.foodRequirements.length > 0)
                ? inputResult.foodRequirements
                : (foodRequirementsInput ? foodRequirementsInput.split(/[、,，\s和與及]+/).filter(i => i.trim() !== '') : []);
                
            const budget = inputResult.budget !== null && inputResult.budget !== undefined ? inputResult.budget : (budgetInput ? parseInt(budgetInput) : null);
            const calories = inputResult.calories !== null && inputResult.calories !== undefined ? inputResult.calories : (caloriesInput ? parseInt(caloriesInput) : null);
            
            console.log('=== 準備生成食譜 ===');
            console.log('最終生成參數:', { ingredients, foodRequirements, budget, calories, difficulty: this.difficultyLevel });
            
            // 記錄當前請求，用於學習用戶偏好
            this.recordPreference(ingredients, foodRequirements, budget, calories, this.difficultyLevel);
            
            // 更新用戶偏好分析
            this.analyzeUserPreferences();
            
            // 呼叫 Google API 生成食譜
            let recipe;
            
            // 檢查是否有可用的 Google API 服務
            if (window.geminiServiceInstance && window.geminiServiceInstance.isInitialized()) {
                console.log('使用 Google API 生成食譜');
                const params = {
                    ingredients,
                    foodRequirements, // 將食物需求傳遞給 Google API
                    budget,
                    calories,
                    difficulty: this.difficultyLevel,
                    preferences: this.userPreferences
                };
                
                recipe = await window.geminiServiceInstance.generateRecipe(params);
                console.log('Google API 返回的食譜:', recipe);
            } else {
                // 使用模擬數據
                console.log('使用模擬數據（Google API 未初始化）');
                recipe = await this.mockGoogleApiCall(ingredients, foodRequirements, budget, calories, this.difficultyLevel);
                console.log('模擬 API 返回的食譜:', recipe);
            }
            
            // 顯示生成的食譜
            this.displayRecipe(recipe);
            console.log('=== 食譜生成完成 ===');
            
        } catch (error) {
            console.error('=== 生成食譜時出錯 ===');
            console.error('錯誤詳情:', error);
            console.error('錯誤堆疊:', error.stack);
            
            this.recipeNameElement.textContent = '食譜生成失敗';
            this.recipeIngredientsElement.innerHTML = `<li>發生錯誤: ${error.message}</li>`;
            this.recipeStepsElement.innerHTML = '<li>請檢查輸入或重新嘗試</li>';
        }
    }
    
    // 模擬 Google API 呼叫
    async mockGoogleApiCall(ingredients, foodRequirements, budget, calories, difficulty) {
        // 模擬 API 請求延遲
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        console.log('食譜生成條件:', {
            ingredients,
            foodRequirements,
            budget,
            calories,
            difficulty
        });
        
        // 擴充模擬食譜庫，加入更多種類的食譜，以便根據食物需求選擇
        const allRecipes = {
            // 中式食譜
            '中式_炒菜': {
                name: '宮保雞丁',
                ingredients: [
                    '雞胸肉 300克',
                    '花生 50克',
                    '乾辣椒 8-10個',
                    '青蔥 3根',
                    '薑 15克',
                    '蒜 4瓣',
                    '醬油 1湯匙',
                    '料酒 1湯匙',
                    '白醋 1茶匙',
                    '糖 1湯匙',
                    '澱粉 1茶匙',
                    '花椒 1茶匙',
                    '食鹽 適量',
                    '食用油 適量'
                ],
                steps: [
                    '雞胸肉切成小丁，加入少許食鹽、料酒和澱粉醃制10分鐘',
                    '花生米用油炸至金黃色，撈出備用',
                    '乾辣椒剪成段，蔥、薑、蒜切碎',
                    '炒鍋倒油燒熱，放入雞丁翻炒至變色',
                    '加入乾辣椒、花椒、蔥薑蒜炒出香味',
                    '調入醬油、白醋、糖、食鹽炒勻',
                    '最後加入花生米，快速翻炒均勻即可'
                ],
                budget: 120,
                calories: 450,
                difficulty: '中等 🔵',
                tags: ['中式', '辣', '炒菜', '雞肉', '主菜']
            },
            '中式_麵食': {
                name: '牛肉拉麵',
                ingredients: [
                    '牛腱子肉 300克',
                    '拉麵 300克',
                    '西紅柿 1個',
                    '青菜 100克',
                    '薑片 5片',
                    '蔥 2根',
                    '八角 2個',
                    '桂皮 1塊',
                    '花椒 1茶匙',
                    '醬油 2湯匙',
                    '鹽 適量'
                ],
                steps: [
                    '牛肉切塊，焯水去血水',
                    '鍋中加水，放入牛肉、薑片、蔥、八角、桂皮和花椒',
                    '大火煮沸後轉小火燉1.5小時至牛肉軟爛',
                    '加入醬油和鹽調味',
                    '另起鍋煮拉麵至熟',
                    '碗中放入煮好的拉麵，加入切片的西紅柿和青菜',
                    '淋上熱湯和牛肉塊，撒上蔥花即可'
                ],
                budget: 180,
                calories: 520,
                difficulty: '中等 🔵',
                tags: ['中式', '湯品', '麵食', '牛肉', '主食']
            },
            '日式_壽司': {
                name: '三文魚壽司卷',
                ingredients: [
                    '壽司米 2杯',
                    '三文魚 200克',
                    '黃瓜 半根',
                    '牛油果 半個',
                    '海苔 3張',
                    '壽司醋 3湯匙',
                    '芥末 少許',
                    '醬油 適量',
                    '薑片 適量'
                ],
                steps: [
                    '壽司米煮熟，拌入壽司醋，放涼',
                    '三文魚切成細長條',
                    '黃瓜和牛油果切成細條',
                    '海苔平鋪在竹簾上，抹上一層米飯',
                    '在中間放上三文魚、黃瓜和牛油果',
                    '捲起並壓緊，切成小段',
                    '配上芥末、醬油和薑片食用'
                ],
                budget: 220,
                calories: 380,
                difficulty: '中等 🔵',
                tags: ['日式', '壽司', '海鮮', '魚', '生食']
            },
            '韓式_辣': {
                name: '韓式辣炒年糕',
                ingredients: [
                    '年糕條 300克',
                    '魚餅 100克',
                    '洋蔥 半個',
                    '韓式辣醬 2湯匙',
                    '糖 1茶匙',
                    '醬油 1湯匙',
                    '蒜末 1茶匙',
                    '芝麻油 少許',
                    '芝麻 適量',
                    '青蔥 1根'
                ],
                steps: [
                    '年糕條用冷水浸泡30分鐘',
                    '魚餅切條，洋蔥切絲，青蔥切段',
                    '鍋中加水煮開，放入年糕煮至軟',
                    '另起鍋，加入少許食用油',
                    '放入洋蔥和蒜末炒香',
                    '加入辣醬、糖、醬油炒勻',
                    '放入煮好的年糕和魚餅條翻炒均勻',
                    '淋上芝麻油，撒上蔥花和芝麻即可'
                ],
                budget: 130,
                calories: 430,
                difficulty: '簡單 🟢',
                tags: ['韓式', '辣', '年糕', '小吃', '主食']
            },
            '西式_義大利麵': {
                name: '奶油蘑菇義大利麵',
                ingredients: [
                    '義大利麵 200克',
                    '鴻喜菇 100克',
                    '洋蔥 半個',
                    '培根 50克',
                    '蒜末 2茶匙',
                    '奶油 30克',
                    '鮮奶油 100ml',
                    '雞高湯 50ml',
                    '帕瑪森起司粉 3湯匙',
                    '黑胡椒 適量',
                    '鹽 適量',
                    '歐芹 少許'
                ],
                steps: [
                    '義大利麵煮至8分熟，撈出備用',
                    '培根切小丁，洋蔥切碎，蘑菇切片',
                    '熱鍋融化奶油，放入培根、洋蔥和蒜末炒香',
                    '加入蘑菇炒至金黃色',
                    '倒入鮮奶油和雞高湯，煮至微沸',
                    '放入義大利麵和起司粉，翻炒均勻',
                    '調入鹽和黑胡椒，撒上歐芹裝飾'
                ],
                budget: 160,
                calories: 550,
                difficulty: '中等 🔵',
                tags: ['西式', '義式', '義大利麵', '奶油', '主食']
            },
            '泰式_辣': {
                name: '泰式酸辣蝦湯',
                ingredients: [
                    '草蝦 8尾',
                    '洋蔥 半個',
                    '番茄 1個',
                    '香菜 適量',
                    '青檸檬 1個',
                    '辣椒 2個',
                    '蘑菇 100克',
                    '檸檬草 2根',
                    '魚露 2湯匙',
                    '辣椒醬 1湯匙',
                    '檸檬汁 3湯匙',
                    '糖 1茶匙',
                    '高湯 500ml'
                ],
                steps: [
                    '蝦子去殼留尾，洗淨後背部劃開取出腸線',
                    '檸檬草切段拍碎，辣椒切圈，番茄切塊',
                    '洋蔥切絲，蘑菇切片',
                    '鍋中加入高湯煮沸，放入檸檬草和辣椒',
                    '加入蘑菇、洋蔥和番茄煮3分鐘',
                    '放入蝦子煮至變色',
                    '調入魚露、辣椒醬、檸檬汁和糖',
                    '撒上香菜葉，關火即可'
                ],
                budget: 190,
                calories: 320,
                difficulty: '中等 🔵',
                tags: ['泰式', '酸辣', '湯品', '蝦', '海鮮']
            },
            '素食_蔬菜': {
                name: '什錦素炒',
                ingredients: [
                    '豆腐 200克',
                    '胡蘿蔔 1根',
                    '西蘭花 100克',
                    '香菇 5朵',
                    '青豆 50克',
                    '紅甜椒 半個',
                    '黃甜椒 半個',
                    '蒜末 1茶匙',
                    '薑末 1茶匙',
                    '醬油 1湯匙',
                    '素蠔油 1湯匙',
                    '糖 半茶匙',
                    '澱粉水 適量',
                    '食用油 適量'
                ],
                steps: [
                    '豆腐切塊略煎至表面金黃',
                    '胡蘿蔔切片，西蘭花切小朵，香菇切片',
                    '甜椒切塊，所有蔬菜焯水撈出',
                    '熱鍋加油，放入蒜末和薑末爆香',
                    '加入所有蔬菜翻炒均勻',
                    '調入醬油、素蠔油和糖',
                    '加入豆腐塊輕輕翻炒',
                    '勾芡上碟即可'
                ],
                budget: 90,
                calories: 280,
                difficulty: '簡單 🟢',
                tags: ['素食', '炒菜', '蔬菜', '豆腐', '主菜']
            },
            // 簡單食譜
            easy: {
                name: '簡易蔬菜炒飯',
                ingredients: [
                    '白飯 1碗',
                    '雞蛋 2顆',
                    '紅蘿蔔 半根',
                    '青豆 1/4杯',
                    '玉米粒 1/4杯',
                    '醬油 1湯匙',
                    '鹽 適量',
                    '胡椒粉 少許'
                ],
                steps: [
                    '將雞蛋打散，加入少許鹽調味',
                    '熱鍋加油，倒入蛋液快速翻炒成蛋花',
                    '加入切丁的紅蘿蔔拌炒1分鐘',
                    '加入青豆、玉米粒繼續拌炒',
                    '倒入白飯，用鍋鏟打散混合均勻',
                    '加入醬油、鹽和胡椒調味拌勻',
                    '翻炒至所有食材混合均勻即可盛盤'
                ],
                budget: 80,
                calories: 420,
                difficulty: '簡單 🟢',
                tags: ['中式', '炒飯', '蔬菜', '主食']
            },
            medium: {
                name: '日式親子丼',
                ingredients: [
                    '雞胸肉 200克',
                    '洋蔥 半顆',
                    '雞蛋 3顆',
                    '白飯 2碗',
                    '醬油 2湯匙',
                    '味醂 2湯匙',
                    '日式高湯 100ml',
                    '蔥花 少許'
                ],
                steps: [
                    '雞肉切成適口大小的塊狀',
                    '洋蔥切成薄片',
                    '鍋中加入高湯、醬油、味醂煮滾',
                    '放入雞肉塊和洋蔥片，小火煮至雞肉熟透',
                    '打散雞蛋，倒入鍋中',
                    '蓋上鍋蓋燜煮約30秒至雞蛋半熟',
                    '將白飯盛入碗中，淋上雞蛋和雞肉的混合物',
                    '撒上蔥花裝飾即可上桌'
                ],
                budget: 150,
                calories: 580,
                difficulty: '中等 🔵',
                tags: ['日式', '飯類', '雞肉', '雞蛋', '主菜']
            },
            hard: {
                name: '松露野菇燉飯',
                ingredients: [
                    '義大利米 1杯',
                    '各式野菇 200克',
                    '洋蔥 1顆',
                    '白酒 50ml',
                    '雞高湯 600ml',
                    '帕瑪森起司 50克',
                    '橄欖油 2湯匙',
                    '奶油 30克',
                    '大蒜 2瓣',
                    '松露油 少許',
                    '迷迭香 1小枝',
                    '鹽與黑胡椒 適量'
                ],
                steps: [
                    '將野菇切片，洋蔥和大蒜切碎',
                    '熱鍋倒入橄欖油，加入洋蔥和大蒜碎炒香',
                    '放入義大利米拌炒至透明狀',
                    '倒入白酒煮至酒精揮發',
                    '分次加入溫熱的雞���湯，每次加入後攪拌至米粒吸收湯汁',
                    '加入野菇和迷迭香，持續攪拌',
                    '米煮至軟硬適中時，熄火加入奶油和帕瑪森起司',
                    '最後加入松露油、鹽和黑胡椒調味',
                    '靜置1分鐘後盛盤，可再撒上少許起司碎'
                ],
                budget: 320,
                calories: 680,
                difficulty: '困難 🔴',
                tags: ['義式', '燉飯', '菇類', '西式', '主食']
            },
            // 新增食譜類型
            '清淡_肉': {
                name: '清蒸雞胸肉',
                ingredients: [
                    '雞胸肉 300克',
                    '薑 5片',
                    '蔥 2根',
                    '鹽 1/2茶匙',
                    '米酒 1湯匙',
                    '香油 1茶匙',
                    '枸杞 10顆',
                    '蒸魚豉油 1湯匙'
                ],
                steps: [
                    '雞胸肉洗淨，瀝乾水分，用叉子在表面戳幾個小洞',
                    '薑切片，蔥切段',
                    '雞胸肉加入鹽和米酒醃制15分鐘',
                    '將薑片和一半蔥段鋪在盤底',
                    '雞胸肉放在薑片和蔥上',
                    '上鍋大火蒸12分鐘',
                    '取出後，撒上剩餘蔥段和枸杞',
                    '淋上香油和蒸魚豉油即可'
                ],
                budget: 110,
                calories: 280,
                difficulty: '簡單 🟢',
                tags: ['清淡', '雞肉', '蒸', '低熱量', '健康', '主菜']
            },
            '辣_牛肉': {
                name: '麻辣牛肉',
                ingredients: [
                    '牛肉片 300克',
                    '蒜片 3瓣',
                    '辣椒 5個',
                    '花椒 1茶匙',
                    '豆瓣醬 2湯匙',
                    '醬油 1湯匙',
                    '蔥段 適量',
                    '薑片 5片',
                    '八角 1個',
                    '小茴香 1茶匙',
                    '油 適量',
                    '鹽 1/2茶匙'
                ],
                steps: [
                    '牛肉切薄片，加入少許醬油和澱粉醃制10分鐘',
                    '熱鍋加油，爆香花椒、八角和小茴香',
                    '加入薑片、蒜片和辣椒，炒出香味',
                    '加入豆瓣醬炒出紅油',
                    '放入牛肉片，快速翻炒至變色',
                    '加入醬油和鹽調味',
                    '最後撒上蔥段，翻炒均勻即可'
                ],
                budget: 170,
                calories: 420,
                difficulty: '中等 🔵',
                tags: ['中式', '辣', '牛肉', '炒菜', '麻辣', '主菜']
            },
            '素食_涼拌': {
                name: '涼拌豆腐',
                ingredients: [
                    '嫩豆腐 1盒',
                    '小黃瓜 1根',
                    '紅蘿蔔 半根',
                    '蒜末 1茶匙',
                    '薑末 1茶匙',
                    '醬油 1湯匙',
                    '香油 1茶匙',
                    '香菜 適量',
                    '辣椒油 少許'
                ],
                steps: [
                    '豆腐切成小方塊',
                    '小黃瓜和紅蘿蔔切絲',
                    '所有蔬菜放入冰水中浸泡5分鐘，使其更加爽脆',
                    '瀝乾水分，與豆腐混合',
                    '調製醬料：蒜末、薑末、醬油、香油和辣椒油混合',
                    '將醬料淋在豆腐和蔬菜上',
                    '輕輕拌勻，撒上香菜即可'
                ],
                budget: 70,
                calories: 180,
                difficulty: '簡單 🟢',
                tags: ['涼拌', '冷菜', '素食', '豆腐', '低熱量', '小菜']
            }
        };
        
        // 根據食物需求和難度選擇最合適的食譜
        let matchedRecipes = [];
        
        // 為了調試，輸出所有可用的食譜標籤
        console.log('可用食譜及其標籤：');
        Object.entries(allRecipes).forEach(([key, recipe]) => {
            console.log(`${key}: ${recipe.name} - 標籤: ${recipe.tags.join(', ')}`);
        });            // 如果有食物需求，將會影響食譜選擇
        if (foodRequirements && foodRequirements.length > 0) {
            console.log(`處理食物需求: ${foodRequirements}`);
            
            // 預處理食物需求，統一轉為小寫
            const processedRequirements = foodRequirements
                .filter(req => req && req.trim() !== '')
                .map(req => req.toLowerCase().trim())
                .filter(req => req.length <= 6); // 確保只保留關鍵詞
            
            // 過濾包含動詞的需求
            let filteredRequirements = processedRequirements.filter(req => 
                !req.includes('想') && 
                !req.includes('要') && 
                !req.includes('希望') &&
                !req.includes('需要') &&
                !req.includes('可以') &&
                !req.includes('應該')
            );
            
            // 重要：將高優先級關鍵詞保留在列表中
            const priorityKeywords = ["辣", "中式", "西式", "日式", "韓式", "泰式", "素食", "海鮮", "炒", "麵"];
            
            // 確保特別保留這些優先關鍵詞
            processedRequirements.forEach(req => {
                if (priorityKeywords.includes(req) && !filteredRequirements.includes(req)) {
                    filteredRequirements.push(req);
                    console.log(`保留優先關鍵詞: ${req}`);
                }
            });
            
            console.log(`處理後的食物需求: ${filteredRequirements}`);
            console.log(`處理後的食物需求長度: ${filteredRequirements.length}`);
            
            // 確保至少有一個有效的需求
            if (filteredRequirements.length === 0) {
                console.warn('警告：預處理後沒有有效的食物需求');
                
                // 嘗試重新檢查原始輸入是否有問題
                const originalRequirementsInput = document.getElementById('foodRequirementsInput').value;
                console.log(`原始需求輸入: "${originalRequirementsInput}"`);
                
                // 從原始輸入嘗試提取常見關鍵詞
                if (originalRequirementsInput) {
                    const commonKeywords = ["辣", "中式", "西式", "日式", "韓式", "泰式", "清淡", "素食", "海鮮", "麵", "湯", "義式"];
                    for (const keyword of commonKeywords) {
                        if (originalRequirementsInput.toLowerCase().includes(keyword.toLowerCase())) {
                            filteredRequirements.push(keyword.toLowerCase());
                            console.log(`從原始輸入中直接提取關鍵詞: ${keyword}`);
                        }
                    }
                }
            }
            
            // 如果已經有食物需求，顯示明確提示
            console.log(`根據食物需求關鍵詞 [${filteredRequirements.join(', ')}] 選擇食譜`);
            
            // 為了清楚顯示在UI中，添加食物需求根據標記
            document.querySelector(".voice-result-summary")?.insertAdjacentHTML('beforeend', 
                `<p class="requirements-applied">系統將根據您的食物需求關鍵詞選擇食譜</p>`);
            
            // 更新一下CSS以顯示標記
            const styleElement = document.createElement('style');
            styleElement.textContent = `
                .requirements-applied {
                    color: #28a745;
                    font-weight: bold;
                    margin-top: 10px;
                    margin-bottom: 15px;
                    font-size: 0.95em;
                    padding: 5px 0;
                    border-bottom: 1px solid #e8f5e9;
                }
                .matched-requirement {
                    display: inline-block;
                    background: #ebfae2;
                    color: #2c7d14;
                    border-radius: 12px;
                    padding: 3px 10px;
                    margin: 3px 5px;
                    font-size: 1em;
                    border: 1px solid #9bd98a;
                    font-weight: bold;
                }
            `;
            document.head.appendChild(styleElement);
            
            // 直接先檢查是否有明確的類型匹配，比如「中式」「辣」「素食」
            const directTypeMatches = {
                '辣': ['辣_牛肉', '韓式_辣', '中式_炒菜', '泰式_辣'],
                '中式': ['中式_炒菜', '中式_麵食', '辣_牛肉'], // 加入中式相關菜品
                '日式': ['日式_壽司', 'medium'], // medium是日式親子丼
                '韓式': ['韓式_辣'],
                '西式': ['西式_義大利麵'],
                '義式': ['西式_義大利麵', 'hard'], // hard是松露野菇燉飯(義式)
                '素食': ['素食_涼拌', '素食_蔬菜'],
                '清淡': ['清淡_肉', '素食_蔬菜', '素食_涼拌'],
                '湯': ['中式_麵食', '泰式_辣'], // 泰式_辣是酸辣蝦湯
                '麵': ['中式_麵食', '西式_義大利麵'],
                '豆腐': ['素食_蔬菜', '素食_涼拌'],
                '海鮮': ['泰式_辣', '日式_壽司'],
                '炒': ['中式_炒菜', '素食_蔬菜'],
                '涼拌': ['素食_涼拌'],
                '牛肉': ['辣_牛肉', '中式_麵食'],
                '雞肉': ['中式_炒菜', '清淡_肉', 'medium']  // medium是日式親子丼
            };
            
            // 檢查是否有直接匹配的食譜類型 (使用過濾後的需求關鍵詞)
            let directMatchFound = false;
            for (const req of filteredRequirements) {
                if (directTypeMatches[req]) {
                    for (const recipeKey of directTypeMatches[req]) {
                        if (allRecipes[recipeKey]) {
                            matchedRecipes.push({
                                key: recipeKey, 
                                recipe: allRecipes[recipeKey], 
                                score: 10,  // 直接匹配給予最高分
                                directMatch: true,
                                matchedKeyword: req // 記錄匹配的關鍵詞
                            });
                            console.log(`直接食物需求關鍵詞匹配: ${req} -> ${recipeKey}`);
                            directMatchFound = true;
                        }
                    }
                }
            }
            
            // 如果找到直接匹配，跳過詳細匹配
            if (!directMatchFound) {
                // 尋找匹配食物需求的食譜
                for (const key in allRecipes) {
                    const recipe = allRecipes[key];
                    let matchScore = 0; // 用於評分食譜與需求的匹配度
                    
                    // 檢查每個需求的匹配情況 (使用過濾後的食物需求關鍵詞)
                    filteredRequirements.forEach(reqLower => {
                        let reqMatched = false;
                        
                        // 1. 先檢查食譜標籤
                        if (recipe.tags && recipe.tags.some(tag => {
                            const tagLower = tag.toLowerCase();
                            
                            // 完全匹配
                            if (tagLower === reqLower) {
                                matchScore += 3; // 給予較高分數
                                return true;
                            }
                            
                            // 包含關係匹配
                            if (tagLower.includes(reqLower) || reqLower.includes(tagLower)) {
                                matchScore += 2;
                                return true;
                            }
                            
                            return false;
                        })) {
                            reqMatched = true;
                            console.log(`食譜「${recipe.name}」的標籤匹配「${reqLower}」`);
                        }
                        
                        // 2. 檢查特定關聯詞匹配
                        const relatedTerms = {
                            '辣': ['麻辣', '辣椒', '辣醬', '辣味', '香辣', '酸辣', '微辣', '重辣'],
                            '清淡': ['健康', '低油', '少油', '少鹽', '清爽', '素食'],
                            '海鮮': ['魚', '蝦', '蟹', '貝', '海鮮'],
                            '肉類': ['雞肉', '豬肉', '牛肉', '鴨肉', '羊肉'],
                            '蔬菜': ['蔬食', '素食', '青菜', '菜'],
                            '中式': ['中餐', '中國菜', '國菜'],
                            '日式': ['日本料理', '日料', '壽司'],
                            '西式': ['西餐', '義大利', '法式', '美式'],
                            '韓式': ['韓餐', '韓國料理'],
                            '泰式': ['泰國菜', '泰餐']
                        };
                        
                        // 檢查關聯詞匹配（標籤與關鍵詞）
                        if (!reqMatched) {
                            // 檢查需求是否是關聯詞的key
                            for (const [key, terms] of Object.entries(relatedTerms)) {
                                if (reqLower === key && recipe.tags.some(tag => 
                                    tag.toLowerCase() === key || terms.some(term => 
                                        tag.toLowerCase().includes(term.toLowerCase())
                                    )
                                )) {
                                    matchScore += 3;
                                    reqMatched = true;
                                    console.log(`食譜「${recipe.name}」通過關聯詞匹配需求「${reqLower}」`);
                                    break;
                                }
                                
                                // 檢查需求是否是關聯詞中的一個
                                if (terms.includes(reqLower) && recipe.tags.some(tag => 
                                    tag.toLowerCase() === key || tag.toLowerCase().includes(reqLower)
                                )) {
                                    matchScore += 2;
                                    reqMatched = true;
                                    console.log(`食譜「${recipe.name}」通過關聯詞項匹配需求「${reqLower}」`);
                                    break;
                                }
                            }
                        }
                        
                        // 3. 檢查食譜名稱
                        if (!reqMatched && recipe.name.toLowerCase().includes(reqLower)) {
                            matchScore += 3;
                            reqMatched = true;
                            console.log(`食譜「${recipe.name}」的名稱匹配「${reqLower}」`);
                        }
                        
                        // 4. 檢查食材列表
                        if (!reqMatched && recipe.ingredients.some(ing => ing.toLowerCase().includes(reqLower))) {
                            matchScore += 1;
                            reqMatched = true;
                            console.log(`食譜「${recipe.name}」的食材匹配「${reqLower}」`);
                        }
                        
                        // 5. 檢查食譜key中是否包含需求
                        if (!reqMatched && key.toLowerCase().includes(reqLower)) {
                            matchScore += 4;  // 給予最高分數
                            reqMatched = true;
                            console.log(`食譜key「${key}」直接匹配「${reqLower}」`);
                        }
                    });
                    
                    // 如果至少有一個匹配，加入候選清單
                    if (matchScore > 0) {
                        matchedRecipes.push({key, recipe, score: matchScore});
                        console.log(`食譜「${recipe.name}」匹配得分: ${matchScore}`);
                    }
                }
            }
            
            // 按匹配分數從高到低排序
            matchedRecipes.sort((a, b) => b.score - a.score);
            
            // 如果找到匹配的食譜
            if (matchedRecipes.length > 0) {
                console.log(`找到 ${matchedRecipes.length} 個匹配食物需求的食譜，得分排序: ${matchedRecipes.map(r => `${r.recipe.name}(${r.score}${r.directMatch ? '-直接匹配' : ''})`).join(', ')}`);
                
                // 檢查是否有直接匹配的食譜
                const directMatches = matchedRecipes.filter(item => item.directMatch === true);
                
                if (directMatches.length > 0) {
                    // 優先選擇直接匹配的食譜
                    const selected = directMatches[0];
                    console.log(`選擇了直接匹配食物需求的食譜: ${selected.recipe.name}`);
                    
                    // 將該食譜添加食物需求標籤作為屬性，方便UI顯示
                    selected.recipe.matchedRequirements = filteredRequirements; // 只使用過濾後的關鍵詞
                    
                    // 特別標記此食譜是基於食物需求選擇的
                    selected.recipe.basedOnRequirements = true;
                    
                    // 添加匹配的需求關鍵詞 (只包含過濾後的關鍵詞)
                    selected.recipe.matchedRequirementKeywords = [...filteredRequirements];
                    
                    // 特別記錄當前匹配的具體關鍵詞
                    selected.recipe.primaryMatchKeyword = selected.matchedKeyword || filteredRequirements[0];
                    
                    // 添加詳細的匹配情況日誌
                    console.log("食物需求匹配詳情:");
                    console.log("- 過濾後的需求關鍵詞:", filteredRequirements);
                    console.log("- 原始需求:", foodRequirements);
                    console.log("- 主要匹配關鍵詞:", selected.recipe.primaryMatchKeyword);
                    console.log("- 選擇食譜:", selected.recipe.name);
                    console.log("- 食譜標籤:", selected.recipe.tags);
                    console.log("- 匹配分數:", selected.score);
                    console.log("- 直接匹配:", selected.directMatch ? "是" : "否");
                    
                    // 清除之前可能的匹配標記，以確保UI顯示正確
                    if (document.querySelector(".matched-requirements-banner")) {
                        document.querySelector(".matched-requirements-banner").remove();
                    }
                    
                    return selected.recipe;
                }
                
                // 如果沒有直接匹配，則根據難度過濾
                const difficultyMatches = matchedRecipes.filter(item => 
                    item.recipe.difficulty.includes(difficulty === 'easy' ? '簡單' : 
                                                  difficulty === 'medium' ? '中等' : '困難')
                );
                
                // 如果找到符合難度的食譜，優先使用
                if (difficultyMatches.length > 0) {
                    // 選擇得分最高的符合難度的食譜
                    const selected = difficultyMatches[0]; // 已經按分數排序，取第一個
                    console.log(`選擇了符合食物需求和難度的食譜: ${selected.recipe.name}，得分: ${selected.score}`);
                    
                    // 將該食譜添加食物需求標籤作為屬性，方便UI顯示
                    selected.recipe.matchedRequirements = foodRequirements;
                    
                    // 特別標記此食譜是基於食物需求選擇的
                    selected.recipe.basedOnRequirements = true;
                    return selected.recipe;
                } else {
                    // 否則選擇總體得分最高的食譜
                    const selected = matchedRecipes[0]; // 已經按分數排序，取第一個
                    console.log(`根據食物需求選擇了最佳匹配食譜: ${selected.recipe.name}，得分: ${selected.score}`);
                    
                    // 將該食譜添加食物需求標籤作為屬性，方便UI顯示
                    selected.recipe.matchedRequirements = foodRequirements;
                    
                    // 特別標記此食譜是基於食物需求選擇的
                    selected.recipe.basedOnRequirements = true;
                    return selected.recipe;
                }
            }
        }
        
        // 如果沒有找到匹配的食譜，或者沒有指定食物需求，則回到基於難度的預設選擇
        console.log(`沒有找到符合需求的食譜，使用預設${difficulty}難度食譜`);
        return allRecipes[difficulty];
    }
    
    displayRecipe(recipe) {
        console.log('=== 開始顯示食譜 ===');
        console.log('收到的食譜數據:', recipe);
        
        if (!recipe) {
            console.error('食譜數據為空，無法顯示');
            this.recipeNameElement.textContent = '無法生成食譜';
            this.recipeIngredientsElement.innerHTML = '<li>沒有找到合適的食譜</li>';
            this.recipeStepsElement.innerHTML = '<li>請檢查輸入條件或重試</li>';
            return;
        }
        
        // 更新食譜名稱
        this.recipeNameElement.textContent = recipe.name || '未命名食譜';
        console.log('設置食譜名稱:', recipe.name);
        
        // 顯示食譜標籤信息(如果有)
        if (recipe.tags && recipe.tags.length > 0) {
            // 移除之前的標籤（如果有）
            const existingTags = document.querySelector('.recipe-tags');
            if (existingTags) {
                existingTags.remove();
            }
            
            // 顯示食物需求和標籤信息
            const foodRequirementsInput = document.getElementById('foodRequirementsInput');
            // 從輸入框獲取需求關鍵詞
            const requirements = foodRequirementsInput && foodRequirementsInput.value ? 
                                foodRequirementsInput.value.split('、').filter(req => req.trim() !== '' && req.length <= 6) : [];
            
            const tagsList = document.createElement('div');
            tagsList.className = 'recipe-tags';                // 如果有食物需求，先顯示需求符合項
            if (requirements.length > 0) {
                let requirmentHTML = `<p class="recipe-requirements">您的需求關鍵詞: `;
                
                requirements.forEach((req, i) => {
                    if (req.trim()) { // 確保不是空字符串
                        // 只顯示短關鍵詞
                        if (req.length <= 6) {
                            requirmentHTML += `<span class="requirement-tag">${req}</span>`;
                        }
                    }
                });
                
                // 如果這個食譜是基於食物需求選擇的，特別標記
                if (recipe.basedOnRequirements) {
                    // 如果有特定主要匹配關鍵詞，顯示它
                    if (recipe.primaryMatchKeyword) {
                        requirmentHTML += `<span class="requirements-matched pulse-highlight">✓ 已根據「<strong>${recipe.primaryMatchKeyword}</strong>」關鍵詞選擇食譜</span>`;
                    } else if (recipe.matchedRequirementKeywords && recipe.matchedRequirementKeywords.length > 0) {
                        requirmentHTML += `<span class="requirements-matched pulse-highlight">✓ 已根據「<strong>${recipe.matchedRequirementKeywords[0]}</strong>」關鍵詞選擇食譜</span>`;
                    } else {
                        requirmentHTML += `<span class="requirements-matched pulse-highlight">✓ 已根據需求關鍵詞選擇食譜</span>`;
                    }
                } else {
                    // 即使沒有直接基於需求選擇的食譜，我們也顯示這在嘗試匹配需求
                    requirmentHTML += `<span class="requirements-trying">系統正嘗試匹配您的需求</span>`;
                }
                
                requirmentHTML += `</p>`;
                
                // 食譜標籤部分
                let tagHTML = `<p class="recipe-tag-title">食譜特點: `;
                
                recipe.tags.forEach((tag, index) => {
                    let isRequirement = false;
                    let matchedReq = "";
                    
                    // 檢查該標籤是否匹配用戶的食物需求
                    requirements.forEach(req => {
                        if (req && (tag.toLowerCase().includes(req.toLowerCase()) || 
                            req.toLowerCase().includes(tag.toLowerCase()))) {
                            isRequirement = true;
                            matchedReq = req;
                        }
                    });
                    
                    // 用不同的樣式顯示標籤
                    if (isRequirement) {
                        tagHTML += `<span class="matched-tag" title="匹配您的「${matchedReq}」需求">${tag}</span>`;
                    } else {
                        tagHTML += `<span class="recipe-tag">${tag}</span>`;
                    }
                    
                    // 使用間距代替分隔符
                    if (index < recipe.tags.length - 1) {
                        tagHTML += ' ';
                    }
                });
                
                tagHTML += `</p>`;
                tagsList.innerHTML = requirmentHTML + tagHTML;
            } else {
                // 如果沒有食物需求，直接顯示標籤
                tagsList.innerHTML = `<p class="recipe-tag-title">食譜特點: ${recipe.tags.join('、')}</p>`;
            }
            
            // 添加標籤樣式
            if (!document.querySelector('#recipe-tags-styles')) {
                const styleEl = document.createElement('style');
                styleEl.id = 'recipe-tags-styles';
                
                // 添加脈動動畫效果，讓匹配需求的提示更加顯眼
                styleEl.textContent = `
                    .recipe-tags {
                        margin: 10px 0;
                        padding: 5px 10px;
                        background-color: #f8f9fa;
                        border-radius: 6px;
                    }
                    
                    .recipe-requirements {
                        margin-bottom: 8px;
                        font-size: 0.95em;
                        color: #444;
                    }
                    
                    .recipe-tag-title {
                        font-size: 0.9em;
                        color: #555;
                        margin: 5px 0;
                    }
                    
                    .requirement-tag {
                        display: inline-block;
                        background: #e1f5fe;
                        color: #0277bd;
                        border-radius: 12px;
                        padding: 2px 8px;
                        margin: 2px 4px;
                        font-size: 0.9em;
                        border: 1px solid #b3e5fc;
                    }
                    
                    .recipe-tag {
                        display: inline-block;
                        background: #f1f1f1;
                        color: #666;
                        border-radius: 10px;
                        padding: 1px 6px;
                        margin: 2px;
                        font-size: 0.85em;
                    }
                    
                    .matched-tag {
                        display: inline-block;
                        background: #e8f5e9;
                        color: #2e7d32;
                        border-radius: 10px;
                        padding: 1px 6px;
                        margin: 2px;
                        font-size: 0.85em;
                        border: 1px solid #c8e6c9;
                        font-weight: bold;
                    }
                    
                    .requirements-matched {
                        display: block;
                        margin-top: 10px;
                        padding: 6px 10px;
                        background: #e8f5e9;
                        color: #2e7d32;
                        border-radius: 4px;
                        font-size: 0.9em;
                    }
                    
                    .requirements-trying {
                        display: block;
                        margin-top: 10px;
                        padding: 6px 10px;
                        background: #fff3e0;
                        color: #e65100;
                        border-radius: 4px;
                        font-size: 0.9em;
                    }
                    
                    @keyframes pulse-highlight {
                        0% { box-shadow: 0 0 0 0 rgba(46, 125, 50, 0.4); }
                        70% { box-shadow: 0 0 0 8px rgba(46, 125, 50, 0); }
                        100% { box-shadow: 0 0 0 0 rgba(46, 125, 50, 0); }
                    }
                    
                    .pulse-highlight {
                        animation: pulse-highlight 2s infinite;
                    }
                `;
                styleEl.innerHTML = `
                    .recipe-tags {
                        margin: 10px 0;
                        font-size: 0.9em;
                    }
                    .requirement-tag {
                        display: inline-block;
                        background: #e9f5ff;
                        color: #0066cc;
                        border-radius: 12px;
                        padding: 4px 10px;
                        margin: 3px 5px;
                        font-size: 0.95em;
                        border: 1px solid #b3d7ff;
                        font-weight: 500;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                        transition: all 0.2s ease;
                    }
                    .requirement-tag:hover {
                        background: #d4ebff;
                        transform: translateY(-1px);
                        box-shadow: 0 2px 5px rgba(0,0,0,0.15);
                    }
                    .recipe-tag {
                        display: inline-block;
                        background: #f5f5f5;
                        color: #555;
                        border-radius: 12px;
                        padding: 4px 10px;
                        margin: 3px 5px;
                        font-size: 0.95em;
                        border: 1px solid #ddd;
                        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                        transition: all 0.2s ease;
                    }
                    .recipe-tag:hover {
                        background: #ececec;
                        transform: translateY(-1px);
                    }
                    .matched-tag {
                        display: inline-block;
                        background: #ebfae2;
                        color: #2c7d14;
                        border-radius: 12px;
                        padding: 4px 10px;
                        margin: 3px 5px;
                        font-size: 0.95em;
                        border: 1px solid #9bd98a;
                        font-weight: bold;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                        transition: all 0.2s ease;
                    }
                    .matched-tag:hover {
                        background: #ddf5d0;
                        transform: translateY(-1px);
                        box-shadow: 0 2px 5px rgba(0,0,0,0.15);
                    }
                    .requirements-matched {
                        display: inline-block;
                        background: #f0f9eb;
                        color: #67c23a;
                        border-radius: 12px;
                        padding: 5px 12px;
                        margin-left: 15px;
                        font-size: 0.95em;
                        border: 1px solid #c2e7b0;
                        font-weight: bold;
                        box-shadow: 0 1px 4px rgba(103, 194, 58, 0.2);
                        animation: pulse-green 1.5s infinite;
                    }
                    @keyframes pulse-green {
                        0% {
                            box-shadow: 0 0 0 0 rgba(103, 194, 58, 0.4);
                        }
                        70% {
                            box-shadow: 0 0 0 6px rgba(103, 194, 58, 0);
                        }
                        100% {
                            box-shadow: 0 0 0 0 rgba(103, 194, 58, 0);
                        }
                    }
                `;
                document.head.appendChild(styleEl);
            }
            this.recipeNameElement.parentNode.insertBefore(tagsList, this.recipeNameElement.nextSibling);
        }
        
        // 更新食材列表
        this.recipeIngredientsElement.innerHTML = '';
        recipe.ingredients.forEach(ingredient => {
            const li = document.createElement('li');
            li.textContent = ingredient;
            this.recipeIngredientsElement.appendChild(li);
        });
        
        // 更新烹飪步驟
        this.recipeStepsElement.innerHTML = '';
        recipe.steps.forEach(step => {
            const li = document.createElement('li');
            li.textContent = step;
            this.recipeStepsElement.appendChild(li);
        });
        
        // 更新食譜統計資訊
        this.recipeBudgetElement.textContent = `${recipe.budget}元`;
        this.recipeCaloriesElement.textContent = `${recipe.calories}大卡`;
        this.recipeDifficultyElement.textContent = recipe.difficulty;
        
        // 生成並更新購買清單
        this.generateShoppingList(recipe.ingredients);
    }
    
    // 生成購買清單
    generateShoppingList(ingredients) {
        if (!this.shoppingListElement) return;
        
        this.shoppingListElement.innerHTML = '';
        
        // 解析食材，提取基本食材名稱（去掉數量和單位）
        const shoppingItems = ingredients.map(ingredient => {
            // 提取基本食材名稱（例如從"白飯 1碗"中提取"白飯"）
            const basicIngredient = ingredient.split(' ')[0].split('、')[0];
            return basicIngredient;
        });
        
        // 創建購買清單項
        shoppingItems.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            li.addEventListener('click', () => {
                // 點擊切換已購買/未購買狀態
                li.classList.toggle('purchased');
            });
            this.shoppingListElement.appendChild(li);
        });
    }
    
    // 記錄用戶偏好
    recordPreference(ingredients, foodRequirements, budget, calories, difficulty) {
        this.preferencesHistory.push({
            timestamp: new Date(),
            ingredients: ingredients,
            foodRequirements: foodRequirements, // 添加食物需求
            budget: budget,
            calories: calories,
            difficulty: difficulty
        });
        
        // 只保留最近 10 筆紀錄
        if (this.preferencesHistory.length > 10) {
            this.preferencesHistory.shift();
        }
        
        // 輸出所有記錄的偏好，方便調試
        console.log('用戶偏好歷史:', this.preferencesHistory);
    }
    
    // 分析用戶偏好
    analyzeUserPreferences() {
        if (this.preferencesHistory.length === 0) return;
        
        // 分析常用食材
        const ingredientCounter = {};
        this.preferencesHistory.forEach(record => {
            if (record.ingredients && record.ingredients.length) {
                record.ingredients.forEach(ingredient => {
                    ingredientCounter[ingredient] = (ingredientCounter[ingredient] || 0) + 1;
                });
            }
        });
        
        // 分析食物需求偏好
        const foodRequirementsCounter = {};
        this.preferencesHistory.forEach(record => {
            if (record.foodRequirements && record.foodRequirements.length) {
                record.foodRequirements.forEach(requirement => {
                    foodRequirementsCounter[requirement] = (foodRequirementsCounter[requirement] || 0) + 1;
                });
            }
        });
        
        // 保存用戶食物需求偏好
        this.userPreferences.favoriteFoodRequirements = Object.entries(foodRequirementsCounter)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(entry => entry[0]);
            
        console.log('食物需求偏好:', this.userPreferences.favoriteFoodRequirements);
        
        // 取得前 5 名常用食材
        this.userPreferences.favoriteIngredients = Object.entries(ingredientCounter)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(entry => entry[0]);
        
        // 分析預算範圍
        const budgets = this.preferencesHistory
            .filter(record => record.budget)
            .map(record => record.budget);
            
        if (budgets.length > 0) {
            this.userPreferences.budgetRange.min = Math.min(...budgets);
            this.userPreferences.budgetRange.max = Math.max(...budgets);
        }
        
        // 分析熱量範圍
        const calories = this.preferencesHistory
            .filter(record => record.calories)
            .map(record => record.calories);
            
        if (calories.length > 0) {
            this.userPreferences.caloriesRange.min = Math.min(...calories);
            this.userPreferences.caloriesRange.max = Math.max(...calories);
        }
        
        // 分析難度偏好
        const difficultyCounter = {};
        this.preferencesHistory.forEach(record => {
            difficultyCounter[record.difficulty] = (difficultyCounter[record.difficulty] || 0) + 1;
        });
        
        this.userPreferences.preferredDifficulty = Object.entries(difficultyCounter)
            .sort((a, b) => b[1] - a[1])
            [0][0];
            
        console.log('用戶偏好分析:', this.userPreferences);
    }
    
    // 取得當前用戶偏好
    getUserPreferences() {
        return this.userPreferences;
    }
}

// 導出 RecipeGenerator 類別供其他模組使用
window.RecipeGenerator = RecipeGenerator;
