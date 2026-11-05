Label Photo Register V2.2.2 - Excel Photo Zoom Fix
=====================================================

中文
----
这次修正旧版“Cannot run the macro TogglePhotoZoom”的可能原因：
- 采用全新版本的本机 VBA 模板，避免重复使用旧版缺失宏的模板；
- 创建模板时核对 LabelPhotoZoom 模块和两项必要过程；
- 每张照片连接到 LabelPhotoZoom.TogglePhotoZoom；
- 转换结束后重新打开生成的文件，检查 VBA 项目及照片链接；
- 不能绕过 Excel / 公司 IT 的宏安全设置。

如何操作：
1. 从网站下载最新版「Excel 共享版」ZIP（必须重新导出，旧 ZIP 仍含旧转换器）。
2. 将 ZIP 复制到 Windows 电脑，全部解压到一个文件夹。
3. 用已安装的 Microsoft Excel 桌面版，按公司 IT 安全政策批准后，
   双击文件夹内的 Create_Shareable_Excel.vbs。
4. 首次建立 V2.2.2 模板时，可能需要 IT 批准“Trust access to the VBA project object model”。
   程序会在 %APPDATA%\LabelPhotoRegister 中建立 PhotoZoom_Master_V222.xlsm。
5. 检查生成的 Label_Photos_Ready_to_Share_*.xlsm；打开并测试一张照片。
6. 成功后只发送 .xlsm，不需要将 VBS、BAS 发给同事；对方仍需使用
   允许运行宏的 Windows 电脑版 Excel。

错误检查：
- 不能点击放大：先确认文件扩展名是 .xlsm，不是 .xlsx。
- 如果 Excel 显示 Security Risk 或禁止宏的提示，请联系公司 IT。
- 在 Excel 按 Alt+F8，看看能否看到 CheckPhotoZoomReady 或 TogglePhotoZoom。
  如果看不到：可能宏被禁用、文件宏项目缺失，或打开了错误的工作簿。
- 如果看得到：先执行 CheckPhotoZoomReady。再尝试点击照片。
- 请不要为了运行此功能而启用所有未知文件的宏或绕过公司安全政策。
- 所有照片和标签资料在你的电脑本地处理，不会上传到 GitHub。

ENGLISH
-------
Extract the NEW shareable package ZIP on a Windows PC with desktop Excel.
With IT approval, double-click Create_Shareable_Excel.vbs. The script builds a
new versioned master template and checks that the resulting .xlsm contains a
VBA project and photo links. Test a thumbnail before sharing. The recipient
must be permitted by their organization's Excel macro security policy.
If Excel blocks macros or shows Cannot run macro, contact IT; this converter
cannot bypass those security restrictions.

BAHASA MELAYU
-------------
Ekstrak ZIP pakej perkongsian TERKINI pada PC Windows yang memasang Excel desktop.
Dengan kelulusan IT, dwiklik Create_Shareable_Excel.vbs. Alat ini membina templat
makro baharu dan memeriksa pautan foto dalam fail .xlsm. Cuba klik satu foto
sebelum berkongsi. Penerima memerlukan Excel desktop dan kebenaran makro
mengikut polisi IT syarikat. Jika makro disekat, hubungi IT.

The converter's static checks cannot test whether the recipient can execute macros.
