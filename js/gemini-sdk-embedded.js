// gemini-sdk-embedded.js
// Google Generative AI SDK 內嵌版本
// 這是從 @google/generative-ai@0.2.0 提取的簡化版
// 用於在 CDN 連接不穩定時作為備用

(function(global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.google = global.google || {}));
})(this, (function(exports) {
    'use strict';

    // 基本工具函數
    const hasTextBlocks = content => content.parts.some(part => typeof part === "string" || part.text !== undefined);
    
    // 實現基本的 generativeAI 功能
    class GoogleGenerativeAI {
        constructor(apiKey) {
            this.apiKey = apiKey;
            this.baseUrl = "https://generativelanguage.googleapis.com";
            this.apiVersion = "v1"; // 使用 v1 版本，更穩定
        }
        
        getGenerativeModel(options) {
            return new GenerativeModel(this.apiKey, options);
        }
    }
    
    // 生成模型類
    class GenerativeModel {
        constructor(apiKey, options) {
            this.apiKey = apiKey;
            this.model = options.model;
            this.baseUrl = "https://generativelanguage.googleapis.com";
            this.apiVersion = "v1"; // 使用 v1 版本，更穩定
        }
        
        async generateContent(prompt) {
            console.log("正在使用內嵌 SDK 生成內容...");
            
            // 檢查 apiKey 是否有效
            if (!this.apiKey || this.apiKey === 'MOCK_API_KEY_FOR_DEMO') {
                throw new Error("缺少有效的 API Key");
            }
            
            // 構建請求對象
            let request;
            if (typeof prompt === "string") {
                request = { contents: [{ parts: [{ text: prompt }] }] };
            } else if (Array.isArray(prompt)) {
                request = { contents: [{ parts: prompt.map(p => typeof p === "string" ? { text: p } : p) }] };
            } else if (prompt.parts !== undefined) {
                request = { contents: [prompt] };
            } else if (prompt.contents !== undefined) {
                request = prompt;
            } else {
                throw new Error("無效的 prompt 格式");
            }
            
            try {
                const response = await fetch(
                    `${this.baseUrl}/${this.apiVersion}/models/${this.model}:generateContent?key=${this.apiKey}`, 
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(request)
                    }
                );
                
                if (!response.ok) {
                    const error = await response.json();
                    const errorMessage = error.error?.message || response.statusText;
                    
                    // 特殊處理模型不存在的錯誤
                    if (errorMessage.includes('not found') || errorMessage.includes('not supported')) {
                        throw new Error(`模型 ${this.model} 不可用。請嘗試使用 gemini-1.5-flash 或 gemini-1.5-pro 模型。錯誤詳情: ${errorMessage}`);
                    }
                    
                    throw new Error(`API 響應錯誤: ${errorMessage}`);
                }
                
                const result = await response.json();
                return this._processResponse(result);
            } catch (error) {
                console.error("生成內容時發生錯誤:", error);
                throw error;
            }
        }
        
        // 處理 API 響應
        _processResponse(response) {
            if (!response.candidates || response.candidates.length === 0) {
                throw new Error("API 未返回有效內容");
            }
            
            return {
                response: response,
                text: () => this._extractText(response),
                candidates: response.candidates
            };
        }
        
        // 提取文本內容
        _extractText(response) {
            let text = "";
            if (response.candidates && response.candidates.length > 0) {
                const firstCandidate = response.candidates[0];
                if (firstCandidate.content && firstCandidate.content.parts) {
                    firstCandidate.content.parts.forEach(part => {
                        if (part.text) text += part.text;
                    });
                }
            }
            return text;
        }
    }
    
    // 導出命名空間
    exports.generativeAI = {
        GoogleGenerativeAI
    };

    // 確保正確設置到 window.google
    if (typeof window !== 'undefined') {
        window.google = window.google || {};
        window.google.generativeAI = {
            GoogleGenerativeAI
        };
    }

    console.log('內嵌版 Google Generative AI SDK 已載入');
}));
