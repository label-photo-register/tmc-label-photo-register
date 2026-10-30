Label Photo Register · V1.2（你选择的新图标）
===========================================

更新内容
  - 已采用你确认的蓝绿渐变「QR 标签 + 2–3 张仓库照片 + 相机」图标。
  - 图标中没有「TMC」字眼，也没有真实标签、真实标签编号或可识别公司资料。
  - icon-192.png、icon-512.png、Apple Touch Icon、favicon.ico、manifest 都已更新。
  - 兼容旧版本 icon.svg：用同一张新版图片覆盖旧 SVG，避免旧 TMC 字样残留。
  - 网站版本更新 V1.2，并调整 Service Worker 缓存策略，方便 GitHub Pages 更新后显示新版图标。
  - 完全保留原功能和设备本机资料。没有内含真实标签照片 sample-label.jpg。

上传至 GitHub Pages
  1. 下载本 ZIP 并解压。不要直接上传压缩包本身。
  2. 打开你的 GitHub Repository，上传解压出来的全部文件至仓库根目录（不是里面再放一个子文件夹）。
  3. 若 GitHub 提示同名文件更新，请将它们提交（Commit changes）。
  4. GitHub Repository > Settings > Pages，Source=Deploy from a branch，Branch=main，Folder=/(root)。
  5. 旧版如曾上传 sample-label.jpg：请在 GitHub 仓库中另外删除这个旧文件，上传新版不会自动删除旧文件。
  6. 更新后打开网站并重新整理。手机旧安装图标未更新时，可以先移除旧主屏幕捷径再重新添加。

操作
  - 每组标签 2～3 张：第 1 张标签自动 OCR；第 2 张物料照片必需；第 3 张可选。
  - OCR 结果请核对后保存。可导出包含 Label Records、Photo Gallery 的 Excel 文件。
  - 还可以导出 ZIP 备份。记录和照片留在当前设备的浏览器 IndexedDB，本版不提供跨设备同步。
  - 请定期备份重要资料；不要随便清理浏览器网站数据，以免删除当地照片。

隐私
  - 这个发布包只有程序和通用设计图片，不包含你的真实标签照片。
  - 网站自身的录入、存储和识别过程都在当前浏览器进行。
  - OCR、Excel/ZIP 导出仍使用在线加载的第三方 JavaScript 库；浏览器首次使用这些功能需要连接网络。
  - 如果以前把真实标签上传到公开的 GitHub 仓库，请注意删除当前文件不等于清除既往 Git 历史记录。
