# 🍳 AI 智慧語音互動食譜與創意調酒系統

![系統狀態](https://img.shields.io/badge/狀態-正常運作-brightgreen)
![最後更新](https://img.shields.io/badge/最後更新-2025年6月-blue)
![Arduino](https://img.shields.io/badge/Arduino-Compatible-orange)
![Google AI](https://img.shields.io/badge/Google_AI-Gemini_1.5-purple)

## 一、專題動機

在現代忙碌生活中，許多人面臨「不知道煮什麼」、「預算有限」、「健康考量」等料理困擾。本專題開發一套「AI 智慧語音互動食譜與創意調酒系統」，結合語音識別、AI 分析與 Arduino 硬體控制，根據使用者的食材、預算、熱量需求，智慧生成個人化食譜與創意調酒建議。透過語音互動與智慧分析，打造「會說話的智慧廚房助手」。

## 二、目標使用者

- **料理新手或忙碌上班族**：需要簡單易學的食譜指導
- **預算控制需求者**：希望在有限預算內享受美食
- **健康管理者**：需要控制熱量攝取的使用者
- **創意調酒愛好者**：喜歡嘗試便利商店材料調酒
- **語音操作偏好者**：習慣免手操作的智慧家電使用者

## 三、使用情境描述

1. 使用者透過語音或手動輸入現有食材、預算限制與熱量需求
2. 系統運用 AI 分析使用者偏好，生成個人化食譜建議
3. 提供詳細的烹飪步驟、購買清單與營養資訊
4. 額外提供便利商店材料的創意調酒配方
5. Arduino 硬體可同步顯示資訊，支援廚房環境操作
6. 系統學習使用者喜好，持續優化推薦內容

## 四、系統架構（含 AI 智慧分析）

| 層級 | 元件/技術 | 功能說明 |
|------|-----------|----------|
| **使用者層** | 語音輸入 + 網頁介面 | 語音/手動輸入食材與需求、查看食譜與調酒建議 |
| **AI 分析層** | Google Gemini API + JavaScript 邏輯引擎 | 智慧食譜生成、調酒創意、預算與熱量分析 |
| **硬體控制層** | Arduino + OLED/LCD 顯示 + Web Serial API | 廚房環境資訊顯示、按鈕控制、即時同步 |
| **語音回饋層** | Web Speech API + 響應式介面 | 語音播報建議、即時互動回饋 |

## 五、AI 分析功能說明（智慧廚房助手）

| 分析項目 | 說明 |
|----------|------|
| **食材智慧搭配** | 分析食材相容性，推薦營養均衡的搭配組合 |
| **預算優化分析** | 計算食材成本，在預算內提供最佳搭配建議 |
| **熱量精算系統** | 精確計算每道菜的熱量，符合健康管理需求 |
| **個人化推薦** | 學習使用者偏好，提供越來越精準的食譜建議 |
| **創意調酒生成** | 基於便利商店材料，創造獨特調酒配方 |
| **營養資訊分析** | 提供蛋白質、維生素等營養成分詳細資訊 |
| **難度等級評估** | 根據使用者經驗，推薦適合的烹飪難度 |

## 六、操作流程

1. **系統啟動** → 開啟 `index.html` 或執行本地伺服器
2. **AI 設定** → 輸入 Google Gemini API Key 啟用智慧分析
3. **硬體連接** → 點擊「連接 Arduino」建立硬體通訊（可選）
4. **輸入需求** → 語音或手動輸入食材、預算、熱量需求
5. **選擇難度** → 選擇烹飪難度等級：簡單/中等/困難
6. **AI 分析** → 系統智慧分析並生成個人化食譜建議
7. **查看結果** → 檢視詳細食譜、購買清單、營養資訊
8. **調酒建議** → 切換至調酒模式，獲取創意調酒配方
9. **語音回饋** → 聆聽 AI 語音播報的烹飪建議與技巧

## 七、技術與材料

### 軟體技術棧
| 技術類別 | 使用技術 | 功能說明 |
|----------|----------|----------|
| **AI 分析引擎** | Google Gemini 1.5 Flash API | 智慧食譜生成、營養分析、個人化建議 |
| **前端架構** | JavaScript ES6+ (原生) | 核心邏輯、UI 控制、資料處理 |
| **語音處理** | Web Speech API | 語音識別輸入、語音播報回饋 |
| **硬體通訊** | Web Serial API | Arduino 與瀏覽器串列通訊 |
| **介面設計** | CSS3 Grid/Flexbox | 響應式設計、現代化廚房助手介面 |
| **資料分析** | 自建統計引擎 | 預算計算、熱量統計、營養分析 |

### 硬體材料清單
| 元件類型 | 規格型號 | 功能說明 |
|----------|----------|----------|
| **主控板** | Arduino Uno/ESP32 | 核心控制、串列通訊 |
| **顯示螢幕** | OLED 128x64 / LCD 16x2 | 食譜資訊顯示 |
| **按鈕模組** | 瞬間按鈕開關 | 難度選擇、功能切換 |
| **蜂鳴器** | 有源蜂鳴器 | 操作回饋音效 |
| **連接線材** | 杜邦線/麵包板 | 電路連接 |
| **USB 傳輸線** | USB A to B/Micro | 供電與數據通訊 |

### 硬體連接配置
```
Arduino 腳位配置：
┌─────────────────┐
│     Arduino     │
│                 │ 
│  D2 ●───[簡單按鈕]───GND
│  D3 ●───[中等按鈕]───GND  
│  D4 ●───[困難按鈕]───GND
│  A4 ●───[SDA]──[OLED顯示器]
│  A5 ●───[SCL]──[OLED顯示器]
│  D8 ●───[蜂鳴器]───GND
│ USB ●───[連接電腦]
└─────────────────┘
```

## 八、設計亮點

| 亮點特色 | 技術實現 | 創新價值 |
|----------|----------|----------|
| **🍳 AI 智慧食譜生成** | Gemini API + 營養資料庫 | 不只推薦食譜，AI 主動分析營養搭配與預算優化 |
| **🎙️ 語音廚房助手** | Web Speech API 雙向互動 | 免手操作，適合廚房環境的語音控制體驗 |
| **💰 預算智慧管理** | 成本計算演算法 | 在有限預算內提供最佳食材搭配建議 |
| **🥗 熱量精算系統** | 營養成分資料庫整合 | 精確計算每道菜熱量，支援健康管理需求 |
| **🍹 便利商店調酒** | 創意配方生成引擎 | 將平凡材料轉化為創意調酒，提升生活樂趣 |
| **🔗 硬體廚房整合** | Arduino + Web Serial API | 廚房環境友善的硬體控制與資訊顯示 |
| **📚 個人化學習** | 使用者偏好記憶系統 | AI 持續學習使用者喜好，提供越來越精準的建議 |

## 九、預期成果

### 🎯 系統成就
- **打造結合「語音 + AI + 硬體」的智慧廚房助手系統**
- **實現個人化食譜推薦與營養管理的一站式解決方案**
- **可擴充為智慧家庭、健康管理、餐廳經營等多種應用情境**
- **展現 AI + IoT 在日常生活應用上的實用價值與創新潛力**

### ✅ 功能驗證成果 (2025年6月)
| 功能模組 | 實現狀態 | 測試結果 |
|----------|----------|----------|
| **語音識別輸入** | ✅ 完全實現 | Web Speech API 整合、語音轉文字正常 |
| **Google AI 食譜生成** | ✅ 完全實現 | Gemini API 整合、智慧食譜生成正常 |
| **Arduino 硬體控制** | ✅ 完全實現 | 按鈕控制、資訊顯示、串列通訊正常 |
| **預算熱量計算** | ✅ 完全實現 | 成本分析、營養計算、統計功能正常 |
| **創意調酒生成** | ✅ 完全實現 | 便利商店材料配方、創意建議正常 |
| **響應式介面** | ✅ 完全實現 | 現代化設計、跨裝置相容性完整 |

## 🚀 快速部署指南

### 方法一：本地伺服器啟動 (推薦)
```bash
# 進入專案目錄
cd "/Users/yuqing/Desktop/ntub 2-2/互動設計/HW/期末"

# 啟動本地伺服器
python3 -m http.server 8081

# 開啟瀏覽器
open http://localhost:8081
```

### 方法二：直接開啟檔案
```bash
# 直接在瀏覽器中開啟
open index.html
```

## 十、詳細設定指南

### 1. Google AI API 設定
1. 前往 [Google AI Studio](https://aistudio.google.com/)
2. 建立新專案並取得 API Key
3. 在系統設定面板中點擊「設定 Google API Key」
4. 輸入 API Key 並儲存設定
5. 確認狀態顯示為「已連接」

### 2. Arduino 硬體設定 (可選)

#### 程式上傳步驟
1. 下載並安裝 [Arduino IDE](https://www.arduino.cc/en/software)
2. 開啟 `arduino_recipe_system.ino`
3. 安裝必要函式庫 (如 OLED 顯示庫)
4. 選擇正確的板子和序列埠
5. 上傳程式到 Arduino

### 3. 系統需求
- **作業系統**: Windows 10+, macOS 10.15+, Ubuntu 18.04+
- **建議瀏覽器**: Chrome 89+, Edge 89+ (支援 Web Serial/Speech API)
- **備用瀏覽器**: Firefox, Safari (部分功能受限)
- **硬體需求**: Arduino 相容板 + 顯示器 (可選)
- **網路需求**: 需要網路連線 (Google AI API)
- **音訊設備**: 麥克風 (語音輸入)、喇叭 (語音回饋)

## 十一、操作說明與功能解讀

### 基本操作流程
1. **系統啟動** → 開啟網頁並設定 API Key
2. **連接硬體** → 點擊「連接 Arduino 裝置」(可選)
3. **輸入食材** → 語音說出或手動輸入現有食材
4. **設定需求** → 輸入預算限制與熱量需求
5. **選擇難度** → 根據烹飪經驗選擇難度等級
6. **生成食譜** → 點擊「生成食譜」獲得 AI 建議
7. **查看詳情** → 檢視烹飪步驟、購買清單、營養資訊
8. **切換調酒** → 點擊調酒標籤查看創意調酒配方

### 支援的輸入格式

#### 食材輸入範例
- `雞蛋、麵粉、牛奶`（頓號分隔）
- `雞蛋,麵粉,牛奶`（逗號分隔）
- `雞蛋 麵粉 牛奶`（空格分隔）
- `雞蛋和麵粉及牛奶`（連接詞分隔）

#### 需求輸入範例
- `辣、素食`
- `清淡、健康`
- `快速、簡單`
- `中式、家常`

## 十二、故障排除與問題解決

### 常見問題解決方案

#### Q: Arduino 硬體連接失敗？
**解決狀態**: ✅ **已完全修復 - Arduino 與食譜生成器整合正常**
- 確認 USB 線已正確連接
- 檢查 Arduino 程式是否已成功上傳
- 確認使用 Chrome/Edge 瀏覽器
- 檢查序列埠是否被其他程式佔用
- **最新修復**: 修正了 `arduino-service.js` 中的變數名稱錯誤，Arduino 難度同步功能現已正常

#### Q: Google AI API 無回應？
**解決步驟**:
- 檢查 API Key 是否正確輸入且有效
- 確認網路連線狀態正常
- 查看瀏覽器開發者工具的錯誤訊息
- 確認 Google AI API 配額是否充足
- 嘗試重新設定 API Key

## 🍳 立即體驗智慧廚房助手

**開啟您的 AI 料理之旅！**

```bash
# 啟動系統
python3 -m http.server 8081
open http://localhost:8081
```

**系統特色總結**:
- ✅ Google AI 智慧食譜生成完全正常
- ✅ Arduino 硬體整合穩定連接 **(最新修復完成)**
- ✅ 預算熱量計算精確可靠
- ✅ 便利商店調酒創意生成正常
- ✅ 響應式介面跨裝置完美相容
- ✅ 本地化 Google AI SDK 部署完成

*本系統已完成全面整合與優化，包含最新的 Arduino 整合修復，展現了 AI + 語音 + IoT 技術在智慧廚房應用上的創新整合與實用價值。*

---

© 2025 AI 智慧語音互動食譜與創意調酒系統
