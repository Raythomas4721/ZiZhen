# 字陣

繁體中文的文字塔防遊戲。墨妖沿路啃字，玩家抽字卡、放上格子、同字合成升級；字照閱讀順序相鄰連成詞會發動效果，四字成語是大招。主線 6 章，每章守一本書。完整企劃在 `DESIGN.md`，動手前先讀。

預計技術：React 18 + TypeScript + Vite，戰鬥畫面用 Canvas 2D。引擎是純函式（`src/engine/`，`step(state, input) → state`，固定 tick、可設定種子的亂數），內容是資料（`src/content/` 的字、詞、章節）。部署到 GitHub Pages。

## 固定規矩

- 回覆使用者一律用繁體中文。
- 所有人名、地名、書名、劇情都要原創，不用歷史人物，也不做任何現有遊戲的翻版。
- commit 訊息用繁體中文。每做完一個里程碑就 commit 並 push 到 `main`（https://github.com/Raythomas4721/ZiZhen ，會自動部署到 GitHub Pages）。
- 測試從簡：`npx tsc --noEmit -p .`、`npm run validate`、`npx vitest run`、`npm run simulate`。
- 不要安裝外部的 skill 或 plugin。
- 目標是第一輪就好玩、容易走完；不會 game over，書頁被啃光只會扣星。

## 內容規則（改字、詞、章節時一定要守）

- 每章都要通過 `npm run validate`：書箱裡每個字至少能組出 2 個詞；每章至少 3 個湊得出來的詞，第 4 章起至少 1 個成語；詞用到的字在該章都拿得到；路徑連通，可放字的格子 ≥ 30；波次血量逐波上升（頭目波例外）。
- 詞只照閱讀順序判定：橫排左到右、直排上到下。
- 每章的特殊規則都要有退路，不能讓人卡住。
- 調整數值後要跑 simulate，確認亂放機器人第 1 章勝率 ≥ 70%、湊詞機器人各章勝率 ≥ 85%。
- 存檔 key 是 `zizhen.save.v1`；改存檔格式時要升版號並寫遷移。
- 引擎不能碰 DOM、時間或 `Math.random`，全部經由 state 和種子亂數，同一個種子一定重現同一局。
