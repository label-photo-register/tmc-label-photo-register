Label Photo Register V2.0 — 中 / EN / Bahasa Melayu
======================================================
新增：顶部语言选择（中文、English、Bahasa Melayu）。选择保存在当前浏览器，仅影响界面，不修改已有标签数据。
保留：每个 Label No. 分组 2–3 张照片；OCR、编辑保存、查询、Excel 单表嵌入小照片、ZIP 备份/恢复。
Excel 九栏顺序：Photo 1 | Photo 2 | Photo 3 | Label No. | Lot No. | Description | Spec | Part No. | Net (KG)。三个照片均在同一行，照片面积约 1.03 × 1.03 英寸，保持比例。
语言：启动默认为中文；切换 English/Bahasa Melayu 即时更新按钮、输入提示、OCR 状态、保存及导出提示；未保存的输入不会被清除。Excel 标题与固定栏名仍为英文，以便跨语言共享。
更新：建议先在旧版导出 ZIP 备份，然后将本压缩包解压后全部上传现有 GitHub Repository 覆盖，GitHub Pages 仍使用 main /(root)。
隐私：本压缩包不含任何真实标签或物料照片。拍摄/上传后的照片储存于本机浏览器（IndexedDB），不会因 GitHub Pages 网页发布自动公开。OCR/Excel/ZIP 的 CDN 库首次使用需要互联网；若公司保密政策要求完全断网使用，需另外提供本地依赖版。
注意：不同语言下使用同一数据库，不会复制或删除原记录；不要清除浏览器站点资料。

V2.0 OCR 改进：先定位印刷横线，对 Description / Spec 分行进行自适应背景校正和独立 OCR；低置信度结果不会自动填入。

V2.0：增强有污渍标签的字段识别；Lot 支持英文字母（例如 FSL1809-2），品名和规格独立按区域读取；净重读取失败时再次按位置识别。自动识别不保证每张标签百分百正确，保存前需核对。

V2.1 Excel 照片点击放大与自动归位
==================================
网页的 Excel 导出仍为不含宏的 .xlsx：保留 A–C 三列小照片，图片与资料同一行。
新版在“批量导出”下方新增“Excel 照片放大工具（Windows）”，可下载 Excel_Photo_Zoom_Helper.zip。
Windows 电脑版 Excel：将 .xlsx 另存为 .xlsm，在 VBA 编辑器导入 LabelPhotoZoom.bas，
运行 InstallPhotoZoom 即可在该工作簿中点击小照片放大，约 9 秒自动缩回；
点击放大的照片可提前缩回。需要为每个新导出的文件执行一次导入与安装。
手机 Excel / 网页 Excel 不支持执行此 VBA 宏；照片仍正常显示。
宏仅更改照片的临时显示尺寸与位置，不修改库存资料或发送图片。
切勿因本功能关闭全局宏安全设置；仅对您自己制作且信任的工作簿启用宏。

V2.2 共享版 Excel（Windows）
==========================
页面新增「Excel 共享版（Windows）」按钮。与普通 .xlsx 导出不同，该按钮下载一个
含 Label_Photos_Data.xlsx + 自动制作工具的 ZIP。解压到 Windows 后，双击
Create_Shareable_Excel.vbs 就能使用已安装的桌面 Excel 生成 .xlsm。
首次可能需要由 IT 批准「Trust access to VBA project object model」；之后
Excel 宏模板留在本机，新的共享包重复双击即可，不必重新导入 VBA。
接收方收到最终 .xlsm 后不必安装工具，但其 Excel 安全政策必须允许宏运行。
不能在 Android 版 Excel 运行放大宏。详见共享 ZIP 中的 README_Shareable_Excel.txt。
