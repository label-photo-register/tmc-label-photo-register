Label Photo Register · V1.3（Excel 同行嵌入小照片）
================================================

新功能：Excel 导出时只建立 1 张 Label Records 工作表。
每一条 Label No. 对应 Excel 的 1 行，顺序如下：
Photo 1 File | Photo 2 File | Photo 3 File | Label No. | Lot No. | Description | ...

  - A、B、C 三栏直接嵌入小照片（不是随机文件名，且不是超链接）。
  - 第 1 张为标签照片，第 2 张为物料照片，第 3 张可选。
  - 标签资料从 D 栏 Label No. 开始，同一个标签的数据和照片永远同行。
  - 每行照片显示约 110 × 94 像素以内，保持长宽比，不会拉长变形。
  - Excel 只含 Label Records，不再生成 Photo Gallery 工作表。
  - 自动保留 Label、Lot、Part 等编号前面的 0，重量显示 3 位小数。
  - 照片已经嵌入 xlsx；文件在 Excel 中离线打开也能看到。
  - Excel 导出需要在线加载 ExcelJS 程序（浏览器首次访问）；拍照内容本机保存。

重要：V1.3 沿用 V1.2 同一 IndexedDB 本机资料库（tmc_label_photo_register_1）。
只更新网站文件，不清除网站数据；旧版已保存的标签资料和照片可以照常导出。
建议更新前先在旧版点击「照片 + 资料 ZIP 备份」，备份到手机／电脑。

GitHub Pages 更新方法：
  1. 把 ZIP 解压，上传里面全部文件到原 GitHub Repository 根目录。
  2. Commit changes。等待 GitHub Pages 自动完成发布，再刷新网页。
  3. 请不要把真实公司标签照片或含标签资料的备份 ZIP 上传公开仓库。
  4. 如旧版曾上传 sample-label.jpg，须手动删除；已公开的 Git 历史也应处理。

App 图标：保留你确认的蓝绿渐变无 TMC 字眼图标。
  - icon-192、icon-512、maskable、favicon、Apple touch icon 均保持不变。

隐私：公司标签照片只在当前设备的浏览器 IndexedDB 保存；
本 GitHub ZIP 不包含真实标签照片、真实资料或用户记录。
