# 食譜生成問題排查指南

## 測試步驟

### 1. 打開瀏覽器開發者工具
- 按 F12 或右鍵點擊「檢查」
- 切換到「Console」標籤

### 2. 測試輸入功能
1. 在「家中食材」欄位輸入：`雞蛋、麵粉、牛奶`
2. 在「食物需求」欄位輸入：`簡單、中式`
3. 在「預算」欄位輸入：`200`
4. 在「熱量上限」欄位輸入：`500`
5. 點擊「🔍 調試輸入」按鈕
6. 查看 Console 中的輸出

### 3. 測試食譜生成
1. 選擇一個難度（簡單/中等/困難）
2. 點擊「🍳 生成食譜」按鈕
3. 查看 Console 中的調試訊息
4. 檢查頁面上是否顯示「正在生成食譜...」

### 4. 檢查 Console 輸出
應該看到類似以下的調試訊息：
```
開始初始化 ManualInputHandler...
DOM 元素狀態:
- inputSection: true
- ingredientsInput: true
- foodRequirementsInput: true
- budgetInput: true
- caloriesInput: true
ManualInputHandler 初始化完成
```

當點擊調試按鈕時，應該看到：
```
=== 調試輸入狀態 ===
表單欄位狀態:
- ingredientsInput (隱藏): 雞蛋、麵粉、牛奶
- ingredientsDisplayInput (顯示): 雞蛋、麵粉、牛奶
- foodRequirementsInput: 簡單、中式
- budgetInput: 200
- caloriesInput: 500
ManualInputHandler 結果: {...}
=== 調試完成 ===
```

### 5. 常見問題與解決方案

#### 問題：沒有「家中食材」輸入欄位
**原因**：ManualInputHandler 初始化失敗
**解決**：重新整理頁面，檢查 Console 是否有錯誤

#### 問題：輸入後調試按鈕顯示空值
**原因**：輸入同步失敗
**解決**：
1. 檢查是否在正確的欄位輸入
2. 重新整理頁面重試

#### 問題：點擊生成食譜沒有反應
**原因**：可能的原因包括：
1. JavaScript 錯誤
2. 難度未選擇
3. API 服務問題

**解決**：
1. 檢查 Console 是否有錯誤訊息
2. 確保選擇了難度
3. 檢查 API Key 設置（可選）

#### 問題：顯示「使用模擬數據」
**原因**：Google API 未設置或失敗
**解決**：這是正常的！系統會使用本地模擬數據，應該仍能生成食譜

### 6. 如果仍有問題
1. 重新整理頁面
2. 清除瀏覽器快取
3. 檢查是否使用現代瀏覽器（Chrome、Firefox、Safari 最新版）
4. 提供 Console 中的完整錯誤訊息

## 預期行為

正常情況下，系統應該：
1. 顯示「家中食材」輸入欄位
2. 隱藏語音輸入區塊
3. 所有輸入欄位都能正常工作
4. 點擊生成食譜後顯示生成中狀態
5. 最終顯示生成的食譜（使用 Google API 或模擬數據）
