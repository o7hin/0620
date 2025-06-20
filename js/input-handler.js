// input-handler.js
// 簡化的輸入處理器 - 手動輸入功能

class InputHandler {
    constructor() {
        this.inputData = {
            ingredients: [],
            foodRequirements: [],
            budget: null,
            calories: null
        };

        this.initialize();
    }

    initialize() {
        // 確保 DOM 準備就緒
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.doInitialize());
        } else {
            this.doInitialize();
        }
    }
    
    doInitialize() {
        console.log('初始化輸入處理器...');
        
        // 獲取DOM元素
        this.inputSection = document.querySelector('.input-section');
        this.ingredientsInput = document.getElementById('ingredientsInput');
        this.foodRequirementsInput = document.getElementById('foodRequirementsInput');
        this.budgetInput = document.getElementById('budgetInput');
        this.caloriesInput = document.getElementById('caloriesInput');
        
        // 隱藏語音輸入區域
        this.hideVoiceSection();
        
        // 設置事件監聽器
        this.setupEventListeners();
        
        // 初始更新一次
        this.updateInputData();
        
        console.log('輸入處理器初始化完成');
    }
    
    hideVoiceSection() {
        const voiceSection = document.querySelector('.voice-input-section');
        if (voiceSection) {
            voiceSection.style.display = 'none';
        }
    }
    
    setupEventListeners() {
        console.log('設置輸入監聽器...');
        
        // 監聽各個輸入欄位的變化
        if (this.foodRequirementsInput) {
            this.foodRequirementsInput.addEventListener('input', () => this.updateInputData());
        }
        
        if (this.budgetInput) {
            this.budgetInput.addEventListener('input', () => this.updateInputData());
        }
        
        if (this.caloriesInput) {
            this.caloriesInput.addEventListener('input', () => this.updateInputData());
        }
    }
    
    updateInputData() {
        // 處理食物需求
        const foodText = this.foodRequirementsInput?.value?.trim() || '';
        if (foodText) {
            this.inputData.foodRequirements = foodText
                .split(/[，,、；;]/)
                .map(item => item.trim())
                .filter(item => item.length > 0);
        } else {
            this.inputData.foodRequirements = [];
        }
        
        // 處理預算
        const budgetText = this.budgetInput?.value?.trim() || '';
        const budgetMatch = budgetText.match(/\d+/);
        this.inputData.budget = budgetMatch ? parseInt(budgetMatch[0], 10) : null;
        
        // 處理熱量
        const caloriesText = this.caloriesInput?.value?.trim() || '';
        const caloriesMatch = caloriesText.match(/\d+/);
        this.inputData.calories = caloriesMatch ? parseInt(caloriesMatch[0], 10) : null;
        
        // 更新隱藏的食材輸入欄位（用於向後相容）
        if (this.ingredientsInput) {
            this.ingredientsInput.value = this.inputData.foodRequirements.join(', ');
        }
        
        console.log('輸入數據已更新:', this.inputData);
    }
    
    // 獲取當前輸入數據
    getInputData() {
        this.updateInputData();
        return this.inputData;
    }
    
    // 向後相容性方法
    getRecognitionResult() {
        return this.getInputData();
    }
    
    // 清空所有輸入
    clearInputs() {
        if (this.foodRequirementsInput) this.foodRequirementsInput.value = '';
        if (this.budgetInput) this.budgetInput.value = '';
        if (this.caloriesInput) this.caloriesInput.value = '';
        if (this.ingredientsInput) this.ingredientsInput.value = '';
        
        this.inputData = {
            ingredients: [],
            foodRequirements: [],
            budget: null,
            calories: null
        };
        
        console.log('所有輸入已清空');
    }
}

// 向後相容性 - 保持原有的類別名稱
window.ManualInputHandler = InputHandler;
window.InputHandler = InputHandler;
