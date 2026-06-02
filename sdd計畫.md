# SDD — 圖片濾鏡網頁應用程式

## 1. 專案概述

建立一個**純前端**（HTML + CSS + JavaScript）網頁應用，讓使用者上傳圖片，即時套用多種濾鏡特效，並可下載處理後的圖片。使用 Canvas 2D API + 像素級運算，**不依賴任何第三方套件**。

---

## 2. 技術架構

| 層級 | 技術 |
|------|------|
| UI 框架 | 無（原生 HTML/CSS/JS） |
| 影像處理 | Canvas 2D API + `ImageData` 像素操作 |
| 檔案上傳 | `<input type="file">` |
| 圖片輸出 | `canvas.toBlob()` / `canvas.toDataURL()` |
| 佈局 | CSS Grid / Flexbox |
| 圖標 | Unicode / 純文字 |

---

## 3. 功能需求

### 3.1 核心功能

- [ ] 上傳圖片（支援 `jpg / png / webp / bmp`）
- [ ] 一鍵套用濾鏡（即時預覽）
- [ ] 調整濾鏡參數（滑桿）
- [ ] 還原原始圖片
- [ ] 下載處理後圖片
- [ ] 拖曳上傳（Drag & Drop）

### 3.2 濾鏡清單

#### A. 黑白系（Ricoh GR 風格）
| 濾鏡 | 演算法要點 |
|------|-----------|
| 標準灰階 | `0.299R+0.587G+0.114B` 灰階轉換 |
| Ricoh GR 黑白 | S-curve 對比 + 邊緣清晰度 (clarity) + 顆粒感 + 暗角，模擬 Ricoh GR 系列黑白效果 |
| 高對比黑白 | S-curve 對比拉伸 + 可選清晰度，保留灰階漸層 |
| 紅外線黑白 | `R*0.7+G*0.2+B*0.1`，模擬 IR 效果 |
| 銀鹽粒子 | S-curve 對比 + 亮度感知噪點，模擬底片顆粒質感 |
| Ilford HP5 黑白底片 | 灰階 + 適中顆粒 + 可調暗角 |

#### B. 復古／底片系
| 濾鏡 | 演算法要點 |
|------|-----------|
| 柯達 Kodachrome | 提高飽和度，增強紅色/暖色調，暗部偏藍，亮部偏暖 |
| 富士 Velvia | 高飽和度，綠色和藍色強化，對比度拉高 |
| Polaroid | 偏冷色調，邊緣暗角（vignette），輕微模糊 |
| 復古懷舊 | Sepia 色調 + 低飽和 + 暗角 |
| Lomo | 高飽和 + 高對比 + 明顯暗角 + 色彩偏移 |
| 偏黃老照片 | Sepia 色調 + 低對比 + 柔焦 |

#### C. 藝術系
| 濾鏡 | 演算法要點 |
|------|-----------|
| 油畫效果 | 區域內取主要顏色（量化 + 中值濾波） |
| 鉛筆素描 | 邊緣偵測（Sobel） + 反相 + 抖色 |
| 卡通化 |  bilateral filter + 顏色量化（降色階） |
| 像素化 | 將圖片分割區塊，每區塊取平均色 |
| 馬賽克 | 同上但區塊更大 |
| 浮雕 | 邊緣偵測後加入原始亮度 |
| 發光／光暈 | Gaussian blur 混合原圖（疊加模式） |
| 水彩 | 多層 mean shift 濾鏡 + 邊緣強化 |

#### D. 色彩調整系
| 濾鏡 | 演算法要點 |
|------|-----------|
| 冷暖色調 | RGB 曲線偏移（加 R 減 B = 暖，反之 = 冷） |
| 色調分離 | 各通道獨立降階（posterization） |
| 負片 | 每個 pixel `255 - value` |
| 交叉沖洗 (Cross-process) | 曲線扭曲，暗部偏藍綠、亮部偏黃 |
| 褪色 (Faded) | 降低對比 + 提高亮部 + 輕微偏暖 |

#### E. 濾鏡分類 UI 面板

```
[ 黑白系 ] [ 復古底片 ] [ 藝術效果 ] [ 色彩調整 ]
    ↓             ↓            ↓             ↓
  濾鏡按鈕      濾鏡按鈕      濾鏡按鈕       濾鏡按鈕
```

每個濾鏡點擊後即時套用，部分濾鏡顯示參數滑桿（強度、閾值等）。

---

## 4. UI / UX 設計

### 4.1 佈局

```
┌──────────────────────────────────────────┐
│  📸 Image Filters                         │
├──────────────────────┬───────────────────┤
│                      │  濾鏡分類 Tab      │
│   圖片預覽區         │  ┌──────────────┐ │
│   (Canvas)           │  │  濾鏡按鈕網格  │ │
│                      │  │              │ │
│                      │  └──────────────┘ │
│                      │  參數滑桿         │
│                      │  ┌──────────────┐ │
│                      │  │ 強度: ═══●══ │ │
│                      │  └──────────────┘ │
├──────────────────────┴───────────────────┤
│  [上傳圖片] [還原] [下載]                │
└──────────────────────────────────────────┘
```

### 4.2 操作流程

```
使用者 → 上傳圖片 → 選擇濾鏡分類 → 點擊濾鏡
  → 即時預覽 → 調整參數（可選） → 下載
```

---

## 5. 資料結構

```javascript
// 濾鏡定義
const filters = {
  kodachrome: {
    name: '柯達 Kodachrome',
    category: 'film',
    params: { strength: { min: 0, max: 100, default: 80 } },
    apply: (pixels, params) => { /* 像素運算 */ }
  },
  highContrastBW: {
    name: '高對比黑白',
    category: 'bw',
    params: { threshold: { min: 0, max: 255, default: 128 } },
    apply: (pixels, params) => { /* 像素運算 */ }
  },
  // ... 其餘濾鏡
}
```

---

## 6. 實作策略

### 6.1 效能優化

| 技術 | 說明 |
|------|------|
| `ImageData` 直接操作 | 避免在 JS 與 Canvas 間重複序列化 |
| OffscreenCanvas（可選） | 背景運算不阻塞主線程 |
| 預覽縮圖 | 大圖先縮小再套用濾鏡預覽，下載時才處理原尺寸 |
| 請求動畫幀 | 調整滑桿時防抖（debounce） |

### 6.2 暗角（Vignette）演算法

所有需要暗角的濾鏡共用同一函式：
```
亮度係數 = 1 - distance(像素位置, 圖片中心) / maxDistance * 強度
```

### 6.3 濾鏡疊加

支援多層濾鏡疊加（先套 A 再套 B），或單一濾鏡即時切換。

---

## 7. 實作時程

每階段完成後必須通過對應驗證項目方可進入下一階段。

| 階段 | 內容 | 驗證方式 | 預估工時 |
|------|------|---------|---------|
| P0 | HTML 結構 + CSS 佈局 + 上傳/下載邏輯 | V0 | 2h |
| P1 | Pixel 運算核心 + 灰階/負片/銳化/模糊 | V1 | 2h |
| P2 | 復古底片系濾鏡（柯達、富士、Polaroid、Lomo） | V2 | 3h |
| P3 | 黑白系（高對比、紅外線、銀鹽粒子、Ilford HP5） | V2 | 2h |
| P4 | 藝術系（油畫、鉛筆素描、卡通、像素化、浮雕、發光） | V2 | 4h |
| P5 | 色彩調整系（冷暖、色調分離、交叉沖洗、褪色、負片） | V2 | 2h |
| P6 | 暗角效果、濾鏡分類 UI、參數滑桿 | V0 + V3 | 2h |
| P7 | 拖曳上傳、RWD 響應式、效能優化 | V0 + V4 | 2h |
| P8 | LUT 核心引擎（.cube 解析 + Trilinear Interpolation 三線性插值） | V5 | 4h |
| P9 | LUT 濾鏡整合（UI 分類、8 個 LUT 按鈕、強度滑桿、創意/精確模式切換） | V0 + V3 + V5 | 3h |

**總預估：約 26 小時（不含驗證時間）**

---

## 8. 濾鏡參考資料

- Kodachrome：R 通道 Gamma 調高，B 通道輕微壓低，暗部加藍
- 高對比黑白：`gray = (R+G+B)/3` → `gray > threshold ? 255 : 0`
- 紅外線：`gray = R`（只取紅 channel），或以 `R * 0.7 + G * 0.2 + B * 0.1`
- 油畫效果：取每個 pixel 周圍一塊區域，統計各色階出現次數，取最多者
- 鉛筆素描：Sobel edge detection → 反相 → 與原圖亮度混合
- 發光效果：對圖片做 Gaussian blur → 以 Screen 混合模式疊回原圖
- 暗角：pixel 離中心越遠 RGB 乘上越低係數
- Sepia：`R = R*0.393 + G*0.769 + B*0.189` 系數轉換

---

## 9. 檔案結構

```
image-filter-app/
├── index.html            # 主頁面
├── style.css             # 樣式（含 toggle button 樣式）
├── app.js                # 主邏輯（UI 控制、上傳、下載、LUT 分類）
├── filters/
│   ├── core.js           # 像素迭代核心 + 共用工具
│   ├── bw.js             # 黑白系濾鏡（Ricoh GR 風格 + S-curve）
│   ├── film.js           # 復古底片系
│   ├── artistic.js       # 藝術系
│   ├── color.js          # 色彩調整系
│   └── lut.js            # LUT 解析引擎 + 三線性插值 + F-Log 管線
├── luts/                 # Fujifilm .cube 3D LUT 檔案
│   ├── X100VI/           # X100VI 相機 LUT（8 個）
│   │   ├── F-Log/        # F-Log 版本
│   │   │   ├── ETERNA.cube
│   │   │   ├── ETERNA-BB.cube
│   │   │   ├── FLog-to-Rec709.cube
│   │   │   └── WDR.cube
│   │   └── F-Log2/       # F-Log2 版本
│   │       ├── ETERNA.cube
│   │       ├── ETERNA-BB.cube
│   │       ├── FLog2-to-Rec709.cube
│   │       └── WDR.cube
│   └── GFX100SII/        # GFX100SII 相機 LUT（8 個）
│       ├── F-Log/        # F-Log 版本
│       │   ├── ETERNA.cube
│       │   ├── ETERNA-BB.cube
│       │   ├── FLog-to-Rec709.cube
│       │   └── WDR.cube
│       └── F-Log2/       # F-Log2 版本
│           ├── ETERNA.cube
│           ├── ETERNA-BB.cube
│           ├── FLog2-to-Rec709.cube
│           └── WDR.cube
├── test/                 # 驗證測試
│   ├── helper.js         # Node.js 測試輔助（vm 載入模組）
│   ├── core.test.js      # V1: 核心工具單元測試（23 項）
│   ├── lut-parse.test.js # V5: .cube 解析正確性（15 項）
│   ├── lut-interp.test.js# V5: 三線性插值正確性（9 項）
│   ├── lut-real.test.js  # V5: 真實 LUT 驗證（16 個 × 14 項 = 224 項）
│   └── run-all.sh        # 全部驗證腳本
└── README.md             # 使用說明
```

---

## 10. 3D LUT 整合計畫（P8–P9）

### 10.1 概述

在現有濾鏡之外，新增 **16 個 Fujifilm 官方 3D LUT 濾鏡**（X100VI × 8 + GFX100SII × 8），歸類為獨立分頁「**富士 LUT**」。利用 `.cube` 格式的 3D 色彩查找表，透過三線性插值 (trilinear interpolation) 將每個像素的 RGB 值映射為目標色彩。

### 10.2 LUT 檔案規格

| 屬性 | 值 |
|------|-----|
| 格式 | `.cube` (純文字) |
| 解析度 | `LUT_3D_SIZE 33` → 每個表 33³ = 35,937 個色點 |
| 數值範圍 | 0.0 ~ 1.0 (float) |
| Gamma | sRGB gamma (檔案標註為 sRGB) |
| 順序 | B 變動最快 → G → R |

### 10.3 核心演算法

#### 1. LUT 解析 (`filters/lut.js`)

```javascript
window.LUT = {
  // 解析 .cube 文字內容，回傳 { size: 33, data: Float32Array(35937*3) }
  parseCube(text) { /* ... */ },

  // 三線性插值：在 33³ grid 中對 (r, g, b) ∈ [0,1] 做插值
  trilinearInterpolate(lut, r, g, b) { /* ... */ },

  // sRGB → Linear (gamma 解碼)
  srgbToLinear(v) { /* ... */ },

  // Linear → F-Log (log 編碼，符合 Fujifilm 公開規格)
  linearToFLog(v) { /* ... */ },

  // 套用 LUT 到整張圖片（精確模式：sRGB→Linear→F-Log→LUT→sRGB）
  applyLUT(imageData, lut, strength) { /* ... */ }
};
```

#### 2. 色彩管線（精確模式）

```
輸入像素 RGB (0~255)
→ 正規化到 0.0~1.0
→ sRGB → Linear (gamma 解碼: v <= 0.04045 ? v/12.92 : ((v+0.055)/1.055)^2.4)
→ Linear → F-Log (log 編碼: 0.555556 * log10(95*v+1) / log10(96) + 0.011529)
→ 計算 grid 座標: idx = v * (size-1)
→ 取得周圍 8 個 grid 點
→ 根據 fraction 做三線性插值 (B→G→R 軸)
→ 強度混合: result = original * (1 - strength) + lut * strength
→ 輸出 RGB (0~255)
```

### 10.4 UI 設計

#### 色彩模式

固定使用**精確模式**：sRGB→Linear→F-Log→LUT→sRGB 管線，色彩轉換正確。

#### LUT 濾鏡按鈕

以網格排列 16 個 LUT 按鈕（X100VI 8 個 + GFX100SII 8 個），每個按鈕顯示相機型號與 LUT 名稱：

```
┌───────────────────┬───────────────────┐
│ X100VI ETERNA     │ X100VI ETERNA-BB  │
│ (F-Log)           │ (F-Log)           │
├───────────────────┼───────────────────┤
│ X100VI Rec709     │ X100VI WDR        │
│ (F-Log)           │ (F-Log)           │
├───────────────────┼───────────────────┤
│ X100VI ETERNA     │ X100VI ETERNA-BB  │
│ (F-Log2)          │ (F-Log2)          │
├───────────────────┼───────────────────┤
│ X100VI Rec709     │ X100VI WDR        │
│ (F-Log2)          │ (F-Log2)          │
├───────────────────┼───────────────────┤
│ GFX100SII ETERNA  │ GFX100SII ETERNA-BB│
│ (F-Log)           │ (F-Log)           │
├───────────────────┼───────────────────┤
│ GFX100SII Rec709  │ GFX100SII WDR     │
│ (F-Log)           │ (F-Log)           │
├───────────────────┼───────────────────┤
│ GFX100SII ETERNA  │ GFX100SII ETERNA-BB│
│ (F-Log2)          │ (F-Log2)          │
├───────────────────┼───────────────────┤
│ GFX100SII Rec709  │ GFX100SII WDR     │
│ (F-Log2)          │ (F-Log2)          │
└───────────────────┴───────────────────┘
```

#### 強度滑桿

點選任一 LUT 後，顯示強度滑桿 (0–100%)，預設 **50%**。

### 10.5 實作步驟

#### P8: LUT 核心引擎 (4h)

| 步驟 | 內容 |
|------|------|
| 1 | 實作 `.cube` 檔案解析器：處理註解、`LUT_3D_SIZE`、資料行 |
| 2 | 將文字資料解析為 `Float32Array`，驗證色點數量 |
| 3 | 實作 `trilinearInterpolate(lut, size, r, g, b)` 回傳 `[r, g, b]` |
| 4 | 實作 `srgbToLinear` / `linearToSrgb` Gamma 轉換工具 |
| 5 | 實作 `applyLUT(imageData, lut, strength, mode)` 核心函式 |
| 6 | 加入效能最佳化：預先計算 64³ Lookup Table (3MB) 加速 |
| 7 | 撰寫語法驗證 (`node --check filters/lut.js`) |

#### P9: LUT 濾鏡整合 (3h)

| 步驟 | 內容 |
|------|------|
| 1 | 將 16 個 `.cube` 檔案複製到 `luts/X100VI/` 與 `luts/GFX100SII/` 目錄 |
| 2 | 在 `index.html` 加入 `<script src="filters/lut.js">` |
| 3 | 在 `app.js` 新增「富士 LUT」分類與 16 個濾鏡定義 |
| 4 | 每個 LUT 濾鏡使用 `XMLHttpRequest` 載入對應 `.cube` 檔案 |
| 5 | 解析後的 LUT 資料快取在記憶體，避免重複載入 |
| 6 | LUT 按鈕點擊 → 解析 (若未快取) → 套用濾鏡 → 預覽 |
| 7 | 強度滑桿預設 50，雙向綁定：移動滑桿即時更新預覽 |

### 10.6 技術挑戰與對策

| 挑戰 | 對策 |
|------|------|
| 像素迴圈效能 (33³ 插值) | 使用 TypedArray 優化即時插值，邊界點快速路徑 |
| `.cube` 載入時機 | 頁面初始化時背景預載入所有 LUT（~6.6MB 共 16 個） |
| 大圖效能 | 沿用預覽縮圖策略：縮小版 canvas 即時預覽，下載時處理原尺寸 |
| F-Log 與正常照片差異 | 精確模式做 sRGB→Linear→F-Log 轉換，提供正確色彩管線 |

### 10.7 與現有系統的整合

- **檔案結構**：新增 `filters/lut.js` (LUT 引擎) 與 `luts/X100VI/`、`luts/GFX100SII/` 目錄
- **UI 整合**：`app.js` 中新增「富士 LUT」分頁，註冊 16 個濾鏡至統一框架
- **參數系統**：沿用現有 `params` 架構，每個 LUT 濾鏡有 `strength` 滑桿（預設 50）
- **LUT 資料管理**：全域 `window.LUT.cache` 物件，以檔名為 key 快取已解析的 LUT
- **色彩管線**：精確模式固定使用 sRGB→Linear→F-Log→LUT→sRGB，無需切換

---

## 11. 驗證計畫

每個功能開發完成後，必須通過對應驗證項目方可視為完成。驗證分為以下層級：

### 11.1 驗證層級定義

| 代號 | 名稱 | 內容 |
|------|------|------|
| V0 | 基礎功能驗證 | 頁面載入無錯誤、按鈕點擊回應、上傳/下載正常 |
| V1 | 核心工具驗證 | 工具函式在 Node.js 下執行單元測試 |
| V2 | 濾鏡視覺驗證 | 使用測試圖片逐一確認濾鏡效果符合預期 |
| V3 | UI 互動驗證 | 分類切換、滑桿調整、按鈕狀態正確 |
| V4 | 邊界條件驗證 | 大圖(4K+)、小圖(1x1)、無圖操作、特殊檔案名稱 |
| V5 | LUT 正確性驗證 | .cube 解析正確、插值結果與參考值一致 |

### 11.2 V0 — 基礎功能驗證

每階段完成後在瀏覽器直接開啟 `index.html`（file:// 協議）執行：

| 測試項目 | 步驟 | 預期結果 |
|---------|------|---------|
| 頁面載入 | 重新整理頁面 | 無 console 錯誤，UI 完整顯示 |
| 上傳圖片 | 點擊「上傳圖片」選取 jpg/png | 圖片顯示於 Canvas 預覽區 |
| 下載圖片 | 點擊「下載」 | 瀏覽器下載處理後的 png 檔案 |
| 還原圖片 | 套用濾鏡後點擊「還原」 | 圖片恢復為原始狀態 |
| 按鈕可用性 | 未上傳時點擊濾鏡/下載 | 按鈕 disabled 或提示上傳 |

### 11.3 V1 — 核心工具驗證

使用 Node.js 執行語法檢查與工具函式測試。

**驗證指令：**
```bash
node --check filters/core.js
```

**單元測試腳本 (`test/core.test.js`) 涵蓋：**

| 測試 | 輸入 | 預期輸出 |
|------|------|---------|
| `clamp(0, 0, 255)` | 0 | 0 |
| `clamp(-10, 0, 255)` | -10 | 0 |
| `clamp(300, 0, 255)` | 300 | 255 |
| `luminance(255, 0, 0)` | R=255,G=0,B=0 | ≈ 76 |
| `luminance(0, 255, 0)` | R=0,G=255,B=0 | ≈ 150 |
| `luminance(0, 0, 255)` | R=0,G=0,B=255 | ≈ 29 |
| `cloneImageData` | mock ImageData | 新物件，內容相同但引用不同 |
| `adjustBrightnessContrast` | 已知像素矩陣 | 亮度 +20 對比 +10 後數值正確 |
| `adjustSaturation` | 已知像素矩陣 | 飽和度 0 變灰階、200% 飽和度正確 |
| `gaussianBlur` | 3x3 矩陣 | 模糊後中心值為周圍加權平均 |
| `sobelEdgeDetection` | 橫向/縱向梯度圖片 | 邊緣強度值正確 |

**執行方式：**
```bash
node test/core.test.js
```

### 11.4 V2 — 濾鏡視覺驗證

使用標準測試圖片逐一確認濾鏡效果。

**測試圖片需求：**
- `test/test-photo-portrait.jpg`（人物肖像，含膚色細節）
- `test/test-photo-landscape.jpg`（風景，含天空/樹木/草地）
- `test/test-pattern.png`（色彩測試卡：純色塊、漸層、灰階階梯）

**黑白系濾鏡驗證檢查表：**

| 濾鏡 | 視覺檢查點 |
|------|-----------|
| 標準灰階 | 全彩變灰階，亮度分佈均勻，膚色不過暗 |
| 高對比黑白 | 純黑/純白區域明顯，中間色調減少 |
| 紅外線黑白 | 綠色植物區域變亮，天空變暗 |
| 銀鹽粒子 | 灰階 + 可見噪點，粒子分佈均勻 |

**復古底片系濾鏡驗證檢查表：**

| 濾鏡 | 視覺檢查點 |
|------|-----------|
| 柯達 Kodachrome | 暖色調增強，紅色更飽和，暗部偏藍 |
| 富士 Velvia | 高飽和度，綠/藍強化，對比明顯 |
| Polaroid | 冷色調，暗角效果，輕微模糊 |
| 復古懷舊 | Sepia 色調，低飽和，暗角 |
| 黑白膠片 Ilford HP5 | 中性灰階，適中顆粒感 |
| Lomo | 高飽和+高對比+明顯暗角+色彩偏移 |
| 偏黃老照片 | Sepia 色調，低對比，柔焦 |

**藝術系濾鏡驗證檢查表：**

| 濾鏡 | 視覺檢查點 |
|------|-----------|
| 油畫效果 | 色塊分明，筆觸感，邊緣不過度銳利 |
| 鉛筆素描 | 白底黑線，線條連續，灰階自然 |
| 卡通化 | 色階大量減少，邊緣黑色描邊 |
| 像素化 | 可見方塊區塊，區塊內顏色均勻 |
| 馬賽克 | 區塊比像素化更大 |
| 浮雕 | 灰階 + 立體邊緣隆起感 |
| 發光／光暈 | 亮部擴散，柔和的 Screen 混合感 |

**色彩調整系濾鏡驗證檢查表：**

| 濾鏡 | 視覺檢查點 |
|------|-----------|
| 冷暖色調 | 暖色：整體偏黃/紅；冷色：整體偏藍 |
| 色調分離 | 各通道色階明顯減少，色塊邊界銳利 |
| 負片 | 顏色全部反轉，色相 180° 旋轉 |
| 交叉沖洗 | 暗部偏藍綠，亮部偏黃 |
| 褪色 | 對比降低，亮部略微過曝，整體柔和 |

### 11.5 V3 — UI 互動驗證

| 測試項目 | 步驟 | 預期結果 |
|---------|------|---------|
| 分類切換 | 點擊每個分類 Tab | 對應濾鏡按鈕顯示，其他隱藏 |
| 濾鏡套用 | 點擊任一濾鏡按鈕 | Canvas 即時更新濾鏡效果 |
| 強度滑桿 | 拖動滑桿 0→100 | 效果從無到完整過渡，無卡頓 |
| 參數連動 | 調整滑桿後點擊其他濾鏡 | 滑桿數值自動切換對應濾鏡參數 |
| 快速切換 | 1 秒內連續點擊 5 個不同濾鏡 | 每個濾鏡正確套用，無閃爍或錯誤 |
| 按鈕狀態 | 點擊已選中的濾鏡 | 效果不重複疊加 |

### 11.6 V4 — 邊界條件驗證

| 測試項目 | 輸入 | 預期結果 |
|---------|------|---------|
| 超大圖片 | 4000×6000px JPEG（~10MB） | 上傳成功，預覽縮放至可視範圍 |
| 極小圖片 | 1×1px PNG | 上傳成功，濾鏡套用不報錯 |
| 透明 PNG | 含 alpha 通道的透明圖片 | 背景正確處理，濾鏡不影響透明區域 |
| 未上傳操作 | 不選圖片直接點濾鏡 | 提示上傳或無反應（不報錯） |
| 拖曳非圖片 | 拖入 txt/pdf 檔案 | 拒絕並提示僅接受圖片格式 |
| 快速連點下載 | 短時間內連按 5 次下載 | 正確下載 5 個獨立檔案 |

### 11.7 V5 — LUT 正確性驗證

#### 語法驗證
```bash
node --check filters/lut.js
```

#### .cube 解析驗證 (`test/lut-parse.test.js`)

| 測試 | 方法 | 預期結果 |
|------|------|---------|
| 基本解析 | 提供已知 .cube 內容，含註解、`LUT_3D_SIZE 33`、資料行 | size=33，data 長度 = 33³×3 = 35937 |
| 邊界值 | 第一列 `0 0 0` 應對應 index 0 | data[0]=0, data[1]=0, data[2]=0 |
| 最大值 | 最後一列 `1 1 1` 應對應 index 末 | data[末]=1, data[末-1]=1, data[末-2]=1 |
| 空檔案 | 僅有 `LUT_3D_SIZE 2` 無資料 | 拋出適當錯誤 |
| 格式錯誤 | 含 NaN 或負值的檔案 | 拋出解析錯誤 |

#### 三線性插值驗證 (`test/lut-interp.test.js`)

| 測試 | 方法 | 預期結果 |
|------|------|---------|
| 格點精確值 | 輸入剛好對齊 grid 節點 | 輸出等於該格點值（誤差 < 1e-6） |
| 中間值插值 | 輸入在四個格點中心 | 輸出為四點平均值（誤差 < 1e-6） |
| 全黑輸入 | RGB(0,0,0) | 輸出等於 LUT 第一列 (index 0) |
| 全白輸入 | RGB(255,255,255) | 輸出等於 LUT 最後列 |
| 灰階平滑度 | 輸入(0,0,0)～(255,255,255) 取 10 點 | 插值結果單調遞增 |

#### 真實 LUT 驗證 (`test/lut-real.test.js`)

| 測試 | 方法 | 預期結果 |
|------|------|---------|
| 8 個 LUT 皆可解析 | 讀取 `luts/**/*.cube` | 全部成功解析，無報錯 |
| 記憶體使用 | 解析後計算 data 佔用 | 每個 LUT ≈ 36000×3×4 ≈ 432KB，8 個共 < 4MB |
| 創意模式套用 | 套用 ETERNA LUT 至測試圖片 | Canvas 渲染完成無報錯，影像色彩有明顯變化 |
| 精確模式套用 | 同圖片套用 ETERNA LUT（精確模式） | Canvas 渲染完成無報錯，與創意模式結果不同 |
| 強度 0% | 強度設為 0 | 輸出與原始圖片完全相同 |

### 11.8 驗證自動化腳本

建立 `test/run-all.sh` 執行全部驗證：

```bash
#!/bin/bash
set -e
echo "=== V1: 語法檢查 ==="
node --check filters/core.js
node --check filters/bw.js
node --check filters/film.js
node --check filters/artistic.js
node --check filters/color.js
node --check filters/effects.js
node --check filters/lut.js
node --check app.js

echo "=== V1: 單元測試 ==="
node test/core.test.js

echo "=== V5: LUT 解析測試 ==="
node test/lut-parse.test.js

echo "=== V5: LUT 插值測試 ==="
node test/lut-interp.test.js

echo "=== V5: 真實 LUT 驗證 ==="
node test/lut-real.test.js

echo "=== 所有驗證通過 ==="
```

### 11.9 測試目錄結構

```
image-filter-app/
├── test/
│   ├── core.test.js       # V1: 核心工具單元測試
│   ├── lut-parse.test.js  # V5: .cube 解析正確性
│   ├── lut-interp.test.js # V5: 三線性插值正確性
│   ├── lut-real.test.js   # V5: 真實 LUT 檔案驗證
│   ├── run-all.sh         # 全部驗證腳本
│   ├── test-photo-portrait.jpg    # V2: 人物肖像測試圖
│   ├── test-photo-landscape.jpg   # V2: 風景測試圖
│   └── test-pattern.png           # V2: 色彩測試卡
├── filters/
│   └── ...（同前）
└── luts/
    └── ...（同前）
```

---

## 12. 黑白濾鏡 Ricoh GR 風格改進

### 12.1 改進背景

根據 [Ricoh GRIII/GRIIIx 黑白攝影教學](https://www.pentax.com.tw/share/210/tpid-1/RICOH_GRIIIx_GRIII)，Ricoh GR 系列的黑白效果具有以下特徵：

1. **高對比但保留灰階漸層** — 不是簡單的二值化，而是平滑的 S-curve 對比拉伸
2. **清晰度 (Clarity)** — 邊緣局部對比增強，使陰影線條更深、更有立體感
3. **銳利度 (Sharpness)** — 增強物體表面質感與顆粒感
4. **顆粒感 (Film Grain)** — 可見的底片顆粒紋理，尤其在高銳利度時更明顯
5. **深黑 (Deep Blacks)** — 暗部深度充足
6. **暗角 (Vignette)** — 自然的光線衰減

### 12.2 演算法實作

#### S-curve 對比曲線

使用 sigmoid 函數實現平滑的 S-curve，在拉伸對比的同時保留端點與灰階漸層：

```javascript
function sCurve(gray, amount) {
  // gray: 0-255, amount: 0-1
  var n = gray / 255;
  var k = 4 + amount * 8;  // 控制 S 曲線陡度
  var s = 1 / (1 + Math.exp(-k * (n - 0.5)));
  var s0 = 1 / (1 + Math.exp(-k * -0.5));
  var s1 = 1 / (1 + Math.exp(-k * 0.5));
  return (s - s0) / (s1 - s0) * 255;  // 正規化回 0-255
}
```

#### 清晰度 (Clarity) 局部對比增強

利用高斯模糊計算局部平均值，再將差異放大：

```javascript
// 1. 計算模糊版本（局部平均）
var blurred = cloneImageData(imageData);
gaussianBlur(blurred, blurRadius);

// 2. 每像素: enhanced = original + (original - blurred) * amount
for (var i = 0; i < data.length; i += 4) {
  var diff = data[i] - blurred.data[i];
  data[i] = clamp(data[i] + diff * amount);
}
```

#### 亮度感知顆粒

顆粒噪點在中間調最明顯，暗部與亮部較不明顯：

```javascript
var intensity = r / 255;
var noise = (Math.random() - 0.5) * grain * 60 * (1 - Math.abs(intensity - 0.5) * 1.5);
```

### 12.3 濾鏡定義

#### Ricoh GR 黑白（旗艦濾鏡）

| 參數 | 範圍 | 預設 | 說明 |
|------|------|------|------|
| 對比 | 0–100 | 50 | S-curve 對比拉伸程度 |
| 清晰度 | 0–100 | 40 | 邊緣局部對比增強 |
| 顆粒 | 0–100 | 15 | 底片顆粒感強度 |
| 暗角 | 0–100 | 30 | 邊緣光線衰減 |

#### 高對比黑白

| 參數 | 範圍 | 預設 | 說明 |
|------|------|------|------|
| 對比 | 0–100 | 70 | S-curve 對比拉伸 |
| 清晰度 | 0–100 | 20 | 邊緣局部對比增強 |

#### 銀鹽粒子

| 參數 | 範圍 | 預設 | 說明 |
|------|------|------|------|
| 顆粒度 | 0–100 | 30 | 底片顆粒感強度 |
| 對比 | 0–100 | 20 | S-curve 對比拉伸 |

#### Ilford HP5 黑白底片

| 參數 | 範圍 | 預設 | 說明 |
|------|------|------|------|
| 顆粒度 | 0–100 | 25 | 底片顆粒感強度 |
| 暗角 | 0–100 | 20 | 邊緣光線衰減 |

### 12.4 檔案變更

- `filters/bw.js` — 重寫黑白系濾鏡，新增 S-curve、清晰度、亮度感知顆粒、暗角函式
- `filters/core.js` — 新增 `gaussianBlur`、`cloneImageData` 供黑白濾鏡使用
