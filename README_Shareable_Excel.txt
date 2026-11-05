Label Photo Register V2.2 - Shareable Excel Photo Zoom
========================================================

中文说明
--------
目标：生成一个含照片放大宏的 .xlsm，发给同事后无需重新导入 VBA。
1. 在网页点击「Excel 共享版（Windows）」；浏览器会下载一个 ZIP。
2. 把这个 ZIP 复制到 Windows 11 电脑，右键「全部解压」。
3. 打开解压文件夹，双击 Create_Shareable_Excel.vbs。
4. 成功后，同一文件夹出现 Label_Photos_Ready_to_Share_日期时间.xlsm。
5. 只需把最后的 .xlsm 文件发送给同事，无需把 .vbs/.bas 或 ZIP 发给对方。
6. 对方用 Windows 电脑版 Excel 打开，在公司安全政策允许宏运行的前提下，
   点击小照片放大，再点一次或等约 9 秒就自动缩回。

首次使用注意：
- 需要已安装 Windows 桌面版 Microsoft Excel。
- 第一次制作时，Excel 可能拒绝「程序访问 VBA 项目」。这种情况需取得 IT 批准后，在
  Excel > File > Options > Trust Center > Trust Center Settings > Macro Settings
  勾选 Trust access to the VBA project object model，然后再双击 .vbs。
- 首次成功后，会建立 %APPDATA%\LabelPhotoRegister\PhotoZoom_Master.xlsm 模板。
  之后再使用新 ZIP 双击 .vbs，重复利用现有模板，不用每次导入 VBA。
  首次授权可由 IT 取消勾选；不要为了此功能关闭所有宏安全保护。
- 如果公司阻止运行 VBS、修改 VBA 或执行宏，请找 IT；不能保证每台公司电脑都允许。
- 通过 Email 或网络下载的 .xlsm，Excel 可能直接封锁宏。
  只有在 IT 审核信任的文件/位置里才允许启用。不要绕过公司的安全政策。
- 这套工具不会上传公司标签照片。所有转换都在自己的 Windows 电脑上完成。
- 原始 Excel (.xlsx) 在无宏电脑或手机仍可直接查看照片和资料。
- 本版未在真实 Windows Excel 中运行自动转换的端到端测试，使用前请先用测试数据验证。

ENGLISH
-------
1. Tap "Excel Shareable Package (Windows)" to download the ZIP.
2. On a Windows PC with desktop Microsoft Excel installed, extract ALL files.
3. Double-click Create_Shareable_Excel.vbs in that extracted folder.
4. Send the resulting Label_Photos_Ready_to_Share_*.xlsm to colleagues.
5. Colleagues do NOT import VBA or install the tool. They need Excel desktop and a policy
   allowing this workbook's macros. Tap a thumbnail to enlarge; tap again, or wait ~9s.
6. On the FIRST run only, Excel may require "Trust access to the VBA project object model"
   after IT approval. Subsequent conversions reuse the local stored macro template.
7. Internet/email downloaded .xlsm files can have macros blocked by Office policy.
8. Do not disable macro protection globally; follow company IT policy.
9. Preview with normal .xlsx if the recipient cannot use macros.

BAHASA MELAYU
-------------
1. Tekan "Pakej Excel Berkongsi (Windows)" dan muat turun ZIP.
2. Ekstrak semua fail pada PC Windows yang mempunyai Microsoft Excel desktop.
3. Dwiklik Create_Shareable_Excel.vbs dalam folder tersebut.
4. Hantar fail Label_Photos_Ready_to_Share_*.xlsm yang terhasil kepada rakan sekerja.
5. Penerima tidak perlu import VBA atau memasang alat, tetapi perlu Excel desktop
   dan kebenaran untuk menjalankan makro mengikut polisi keselamatan syarikat.
6. Klik foto kecil untuk membesarkan. Klik semula atau tunggu sekitar 9 saat.
7. Penyediaan kali pertama mungkin memerlukan kelulusan IT untuk akses projek VBA.
   Selepas itu, templat makro setempat digunakan semula.
8. Fail makro daripada e-mel/internet boleh disekat oleh Excel; ikut polisi IT.

PACKAGE CONTENTS
----------------
Label_Photos_Data.xlsx       - photo and label data; unchanged XLSX export
Create_Shareable_Excel.vbs   - Windows Excel automation, local only
LabelPhotoZoom.bas           - VBA module with photo preview and restore
README_Shareable_Excel.txt   - this document

Technical caveat: A static website cannot directly embed/compile a new VBA project into
an XLSX in the browser. The trusted desktop Excel application does that locally.
