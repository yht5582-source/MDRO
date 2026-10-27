# MDRO 多重抗藥性菌株診療決策支援（台灣版）

https://yht5582-source.github.io/MDRO/

單一 `index.html`，無外部相依。依 IDSA 2026 Guidance on the Treatment of Antimicrobial-Resistant Gram-Negative Infections（2026-07-30）整理，並以感染部位（膀胱炎／cUTI／泌尿道以外）、嚴重度、carbapenemase 機制與腎臟替代治療產生選藥方向。

- 選藥邏輯在 `index.html` 的 `/*ENGINE-START*/ … /*ENGINE-END*/` 區塊（`MDRO.recommend()`）
- 測試：`node tests.cjs`
- 健保給付欄位依藥品給付規定第十節 抗微生物劑（115.07.23 更新）原文摘要，2026-10-27 核對；正式申報以健保署當日公告為準

教學與臨床輔助，非自動處方。
