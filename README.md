# Image Filters - 圖片濾鏡

純前端影像濾鏡網頁應用，無需伺服器、無套件依賴，在瀏覽器直接開啟 `index.html` 即可使用。

## 功能特色

- **23+ 濾鏡**：黑白系、復古底片、藝術效果、色彩調整
- **Ricoh GR 黑白風格**：S-curve 對比、清晰度 (Clarity)、底片顆粒、暗角
- **Fujifilm 3D LUT**：X100VI (8個) + GFX100SII (8個) 官方 .cube LUT，支援 F-Log / F-Log2 精確色彩管線
- **零依賴**：純 HTML + CSS + JavaScript，無框架無套件
- **離線可用**：直接開啟 `index.html` 即可，所有 LUT 已內嵌

## 快速開始

1. 下載此專案
2. 用瀏覽器開啟 `index.html`
3. 上傳圖片 → 選擇濾鏡 → 調整參數 → 下載

> 所有功能皆可在 `file://` 協議下運作，無需 HTTP 伺服器。

## 濾鏡一覽

| 分類 | 濾鏡 |
|------|------|
| **黑白系** | 標準灰階、Ricoh GR 黑白、高對比黑白、紅外線黑白、銀鹽粒子、Ilford HP5 |
| **復古底片** | 老照片、復古暖色、復古冷色、LOMO、過曝、暗角 |
| **藝術效果** | 油畫、水彩、鉛筆素描、炭筆、霓虹、邊緣偵測、像素化 |
| **色彩調整** | 色相旋轉、飽和度、亮度對比、色溫、色調分離、負片效果 |
| **富士 LUT** | ETERNA、ETERNA-BB、Rec709、WDR（各 2 種 log 版本 × 2 台相機） |

## 專案結構

```
├── index.html          # 主頁面（直接開啟即可使用）
├── app.js              # 應用邏輯（UI 控制、上傳、下載、LUT 分類）
├── style.css           # 深色主題樣式
├── luts-embedded.js    # 內嵌 LUT 資料（自動產生，支援 file:// 使用）
├── filters/            # 濾鏡引擎
│   ├── core.js         # 核心工具（clamp、luminance、gaussianBlur 等）
│   ├── bw.js           # 黑白系濾鏡
│   ├── film.js         # 復古底片系濾鏡
│   ├── artistic.js     # 藝術系濾鏡
│   ├── color.js        # 色彩調整系濾鏡
│   └── lut.js          # 3D LUT 引擎（.cube 解析、三線性插值、F-Log 管線）
├── luts/               # Fujifilm 官方 3D LUT 檔案
│   ├── X100VI/         # X100VI LUT（F-Log / F-Log2 各 4 個）
│   └── GFX100SII/      # GFX100SII LUT（F-Log / F-Log2 各 4 個）
├── test/               # 驗證測試（Node.js）
│   └── run-all.sh      # 一鍵執行所有測試
├── tools/
│   └── embed-luts.js   # LUT 內嵌工具（重新產生 luts-embedded.js）
├── x100vi-3d-lut-v100/ # X100VI LUT 原始檔案（附 Fujifilm 官方說明文件）
└── gfx100sii-3d-lut-v100/ # GFX100SII LUT 原始檔案
```

## 色彩管線

Fujifilm LUT 採用精確色彩管線，確保正確的色彩轉換：

```
sRGB → Linear (gamma 解碼) → F-Log/F-Log2 (對數編碼) → LUT 查表 → 輸出
```

- **F-Log**：`V = 0.344676 × log₁₀(0.555556 × I + 0.009468) + 0.790453`
- **F-Log2**：`V = 0.245281 × log₁₀(5.555556 × I + 0.064829) + 0.384316`

## 開發

### 重新產生 LUT 內嵌檔案

```bash
node tools/embed-luts.js
```

### 執行測試

```bash
bash test/run-all.sh
```

所有測試通過後會輸出：

```
ALL VERIFICATIONS PASSED
```

## 技術架構

- **Canvas 2D API**：所有濾鏡在像素層級操作（ImageData）
- **III 線性插值**：33³ 3D LUT 使用三線性插值 (trilinear interpolation)
- **TypedArray**：LUT 資料以 Float32Array 儲存，提升效能
- **無 ES Module**：使用 IIFE + `window.*` 全域命名空間，確保 `file://` 相容性

## 授權

僅供個人學習與使用。Fujifilm 3D LUT 檔案版權屬 FUJIFILM Corporation。
