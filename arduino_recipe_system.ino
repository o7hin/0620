/*
  Arduino 食譜系統 - 按鈕加燈泡難度選擇
  移除OLED顯示，改用LED燈泡指示難度
  
  硬體連接:
  - LED 簡單難度 (白色): Pin 11
  - LED 中等難度 (綠色): Pin 10  
  - LED 困難難度 (紅色): Pin 9
  - 切換按鈕: Pin 2 (接地) - 單按鈕循環切換三種難度
  
  功能:
  - 按下按鈕循環切換難度：簡單→中等→困難→簡單...
  - 每次按下都會點亮對應的LED並關閉其他LED
  - 接收網頁端指令控制LED
  - 向網頁端發送難度變更事件
*/

// LED 引腳定義
#define LED_EASY 11      // 簡單難度 LED (白色)
#define LED_MEDIUM 10    // 中等難度 LED (綠色)
#define LED_HARD 9      // 困難難度 LED (紅色)

// 按鈕引腳定義
#define BTN_TOGGLE 2    // 切換難度按鈕

// 按鈕狀態變數
bool lastBtnToggle = HIGH;
unsigned long lastDebounceTime = 0;
unsigned long debounceDelay = 200;  // 增加防彈跳時間到200ms

// 難度索引 (0=easy, 1=medium, 2=hard)
int difficultyIndex = 0;
String difficulties[] = {"easy", "medium", "hard"};

// 當前選擇的難度
String currentDifficulty = "easy";

void setup() {
  // 初始化串口通訊
  Serial.begin(9600);
  
  // 設置LED引腳為輸出
  pinMode(LED_EASY, OUTPUT);
  pinMode(LED_MEDIUM, OUTPUT);
  pinMode(LED_HARD, OUTPUT);
  
  // 設置按鈕引腳為輸入並啟用內部上拉電阻
  pinMode(BTN_TOGGLE, INPUT_PULLUP);
  
  // 確保所有LED初始狀態為關閉
  digitalWrite(LED_EASY, LOW);
  digitalWrite(LED_MEDIUM, LOW);
  digitalWrite(LED_HARD, LOW);
  
  // 等待一下讓系統穩定
  delay(1000);
  
  Serial.println("Arduino 食譜系統已啟動");
  Serial.println("硬體診斷資訊:");
  Serial.println("- LED簡單(白色): Pin 11");
  Serial.println("- LED中等(綠色): Pin 10");
  Serial.println("- LED困難(紅色): Pin 9");
  Serial.println("- 按鈕: Pin 2");
  
  // 檢查按鈕初始狀態
  bool initialButtonState = digitalRead(BTN_TOGGLE);
  Serial.print("按鈕初始狀態: ");
  Serial.println(initialButtonState ? "HIGH (正常)" : "LOW (可能被按住)");
  
  // 初始狀態：點亮簡單難度LED (Pin 11)
  setDifficulty("easy");
  
  Serial.println("單按鈕循環切換難度模式");
  Serial.println("按鈕切換順序: 簡單→中等→困難→簡單...");
  
  // 發送初始難度狀態給網頁端 (使用大寫)
  delay(2000); // 等待2秒讓網頁端準備好
  Serial.println("DIFFICULTY:EASY");
}

void loop() {
  // 檢查按鈕按下
  checkButtons();
  
  // 檢查串口指令
  checkSerialCommands();
  
  delay(10); // 小延遲避免過度佔用CPU
}

// 檢查按鈕按下事件
void checkButtons() {
  bool btnToggle = digitalRead(BTN_TOGGLE);
  
  // 添加調試信息
  static unsigned long lastPrintTime = 0;
  if (millis() - lastPrintTime > 2000) {  // 每2秒打印一次按鈕狀態
    Serial.print("按鈕當前狀態: ");
    Serial.println(btnToggle ? "HIGH" : "LOW");
    lastPrintTime = millis();
  }
  
  // 防彈跳處理
  if ((millis() - lastDebounceTime) > debounceDelay) {
    
    // 檢查切換按鈕按下 (從HIGH變為LOW)
    if (btnToggle == LOW && lastBtnToggle == HIGH) {
      Serial.println("按鈕被按下！");
      
      // 循環切換到下一個難度
      difficultyIndex = (difficultyIndex + 1) % 3;
      String nextDifficulty = difficulties[difficultyIndex];
      
      Serial.println("BUTTON:TOGGLE");
      Serial.println("切換到難度: " + nextDifficulty);
      setDifficulty(nextDifficulty);
      lastDebounceTime = millis();
      
      // 等待按鈕釋放，但設置超時防止無限等待
      unsigned long waitStart = millis();
      while(digitalRead(BTN_TOGGLE) == LOW && (millis() - waitStart) < 3000) {
        delay(10);
      }
      
      if ((millis() - waitStart) >= 3000) {
        Serial.println("警告：按鈕可能卡住了！");
      } else {
        Serial.println("按鈕已釋放");
      }
    }
  }
  
  // 記錄按鈕狀態
  lastBtnToggle = btnToggle;
}

// 設置難度並控制LED
void setDifficulty(String difficulty) {
  currentDifficulty = difficulty;
  
  // 更新難度索引以保持同步
  if (difficulty == "easy") {
    difficultyIndex = 0;
  } else if (difficulty == "medium") {
    difficultyIndex = 1;
  } else if (difficulty == "hard") {
    difficultyIndex = 2;
  }
  
  // 關閉所有LED
  digitalWrite(LED_EASY, LOW);
  digitalWrite(LED_MEDIUM, LOW);
  digitalWrite(LED_HARD, LOW);
  
  // 根據難度點亮對應LED
  if (difficulty == "easy") {
    digitalWrite(LED_EASY, HIGH);
    Serial.println("LED狀態: 簡單(白色)已點亮");
  } else if (difficulty == "medium") {
    digitalWrite(LED_MEDIUM, HIGH);
    Serial.println("LED狀態: 中等(綠色)已點亮");
  } else if (difficulty == "hard") {
    digitalWrite(LED_HARD, HIGH);
    Serial.println("LED狀態: 困難(紅色)已點亮");
  }
  
  // 向網頁端發送難度變更通知 (使用大寫以符合網頁端期望)
  String upperDifficulty = difficulty;
  upperDifficulty.toUpperCase();
  Serial.println("DIFFICULTY:" + upperDifficulty);
}

// 檢查並處理串口指令
void checkSerialCommands() {
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    Serial.println("收到指令: " + command);
    
    // 處理燈泡控制指令
    if (command.startsWith("LIGHTS:")) {
      handleLightsCommand(command);
    }
    // 處理食譜生成通知
    else if (command.startsWith("RECIPE_GENERATED:")) {
      String recipeName = command.substring(17);
      handleRecipeGenerated(recipeName);
    }
    // 處理調酒生成通知
    else if (command.startsWith("COCKTAIL_GENERATED:")) {
      String cocktailName = command.substring(19);
      handleCocktailGenerated(cocktailName);
    }
    // 處理統計資訊
    else if (command.startsWith("STATS:")) {
      String stats = command.substring(6);
      Serial.println("統計資訊: " + stats);
    }
  }
}

// 處理燈泡控制指令
void handleLightsCommand(String command) {
  // 解析格式: LIGHTS:EASY:1,MEDIUM:0,HARD:0
  String lightData = command.substring(7); // 移除 "LIGHTS:" 前綴
  
  // 分割指令
  int easyPos = lightData.indexOf("EASY:");
  int mediumPos = lightData.indexOf("MEDIUM:");
  int hardPos = lightData.indexOf("HARD:");
  
  if (easyPos != -1) {
    int easyState = lightData.substring(easyPos + 5, easyPos + 6).toInt();
    digitalWrite(LED_EASY, easyState ? HIGH : LOW);
  }
  
  if (mediumPos != -1) {
    int mediumState = lightData.substring(mediumPos + 7, mediumPos + 8).toInt();
    digitalWrite(LED_MEDIUM, mediumState ? HIGH : LOW);
  }
  
  if (hardPos != -1) {
    int hardState = lightData.substring(hardPos + 5, hardPos + 6).toInt();
    digitalWrite(LED_HARD, hardState ? HIGH : LOW);
  }
  
  Serial.println("燈泡狀態已更新");
}

// 處理食譜生成完成
void handleRecipeGenerated(String recipeName) {
  Serial.println("食譜已生成: " + recipeName);
  
  // 閃爍當前難度的LED表示完成
  for (int i = 0; i < 3; i++) {
    if (currentDifficulty == "easy") {
      digitalWrite(LED_EASY, LOW);
      delay(200);
      digitalWrite(LED_EASY, HIGH);
    } else if (currentDifficulty == "medium") {
      digitalWrite(LED_MEDIUM, LOW);
      delay(200);
      digitalWrite(LED_MEDIUM, HIGH);
    } else if (currentDifficulty == "hard") {
      digitalWrite(LED_HARD, LOW);
      delay(200);
      digitalWrite(LED_HARD, HIGH);
    }
    delay(200);
  }
}

// 處理調酒生成完成
void handleCocktailGenerated(String cocktailName) {
  Serial.println("調酒已生成: " + cocktailName);
  
  // 所有LED閃爍表示調酒完成（在網頁端已處理，這裡只是確認）
  Serial.println("調酒燈光效果由網頁端控制");
}
