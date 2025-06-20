// Google Generative AI SDK - UMD 版本
// 兼容版本，與 gemini-sdk-embedded.js 協同工作
// 優先使用 CDN 版本，失敗時回退到內嵌版本

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.GoogleGenerativeAI = {}));
}(this, (function (exports) { 
    'use strict';

    // Google Generative AI SDK UMD 包裝器
    class GoogleGenerativeAI {
        constructor(apiKey) {
            this.apiKey = apiKey;
            this.baseUrl = "https://generativelanguage.googleapis.com";
            this.apiVersion = "v1beta"; // 使用 v1beta 版本以獲得最新功能
        }

        getGenerativeModel(config) {
            return new GenerativeModel(this.apiKey, config);
        }
    }

    class GenerativeModel {
        constructor(apiKey, config) {
            this.apiKey = apiKey;
            this.model = config.model || 'gemini-1.5-flash';
            this.baseUrl = "https://generativelanguage.googleapis.com";
            this.apiVersion = "v1beta";
            this.generationConfig = config.generationConfig || {};
            this.safetySettings = config.safetySettings || [];
        }

        async generateContent(request) {
            console.log("🌐 使用官方 UMD SDK 生成內容...");
            
            if (!this.apiKey || this.apiKey === 'MOCK_API_KEY_FOR_DEMO') {
                throw new Error("無效的 API Key");
            }

            // 處理不同的輸入格式
            let processedRequest;
            if (typeof request === 'string') {
                processedRequest = {
                    contents: [{ parts: [{ text: request }] }]
                };
            } else if (Array.isArray(request)) {
                processedRequest = {
                    contents: [{ parts: request.map(part => 
                        typeof part === 'string' ? { text: part } : part
                    )}]
                };
            } else if (request.contents) {
                processedRequest = request;
            } else if (request.parts) {
                processedRequest = { contents: [request] };
            } else {
                throw new Error("無效的請求格式");
            }

            // 添加生成配置
            if (Object.keys(this.generationConfig).length > 0) {
                processedRequest.generationConfig = this.generationConfig;
            }

            if (this.safetySettings.length > 0) {
                processedRequest.safetySettings = this.safetySettings;
            }

            try {
                const url = `${this.baseUrl}/${this.apiVersion}/models/${this.model}:generateContent?key=${this.apiKey}`;
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(processedRequest)
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
                    
                    if (errorMessage.includes('API key not valid')) {
                        throw new Error('API Key 無效或已過期');
                    } else if (errorMessage.includes('quota exceeded')) {
                        throw new Error('API 配額已用盡');
                    } else if (errorMessage.includes('model not found')) {
                        throw new Error(`模型 ${this.model} 不存在或不可用`);
                    }
                    
                    throw new Error(errorMessage);
                }

                const data = await response.json();
                return new GenerateContentResponse(data);
                
            } catch (error) {
                console.error("UMD SDK 生成內容失敗:", error);
                
                // 如果 UMD 版本失敗，回退到內嵌版本
                if (window.google?.generativeAI?.GoogleGenerativeAI) {
                    console.log("🔄 回退到內嵌版本 SDK...");
                    const fallbackAI = new window.google.generativeAI.GoogleGenerativeAI(this.apiKey);
                    const fallbackModel = fallbackAI.getGenerativeModel({ model: this.model });
                    return await fallbackModel.generateContent(request);
                }
                
                throw error;
            }
        }
    }

    class GenerateContentResponse {
        constructor(response) {
            this.response = response;
            this.candidates = response.candidates || [];
        }

        text() {
            if (!this.candidates || this.candidates.length === 0) {
                throw new Error("回應中沒有候選內容");
            }

            const candidate = this.candidates[0];
            if (!candidate.content || !candidate.content.parts) {
                throw new Error("候選內容格式無效");
            }

            return candidate.content.parts
                .filter(part => part.text)
                .map(part => part.text)
                .join('');
        }
    }

    // 導出到全域
    exports.GoogleGenerativeAI = GoogleGenerativeAI;
    exports.GenerativeModel = GenerativeModel;
    exports.GenerateContentResponse = GenerateContentResponse;

    // 確保在 window 上可用
    if (typeof window !== 'undefined') {
        window.GoogleGenerativeAI = GoogleGenerativeAI;
        
        // 也設置到 google 命名空間以保持兼容性
        window.google = window.google || {};
        window.google.generativeAI = window.google.generativeAI || {};
        window.google.generativeAI.GoogleGenerativeAI = GoogleGenerativeAI;
    }

    console.log('✅ Google Generative AI UMD SDK 已載入');

})));
