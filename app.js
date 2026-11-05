/* Label Photo Register V2.3 — local-first photo grouping + field-aware browser OCR */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const form = $('record-form');
  const FIELD_KEYS = ['labelNo','lotNo','description','spec','partNo','netKg']; // Retain legacy data in IndexedDB/ZIP backups, but do not display/export unused fields.
  const DB_NAME = 'tmc_label_photo_register_1';
  const STORE = 'labels';
  let db;
  let records = [];
  let draft = freshRecord();
  let workerPromise;
  let busy = false;
  let chosenSlot = 0;
  const urlCache = new WeakMap();
  let toastTimer;

  const TRANSLATIONS = {"zh":{"brandSub":"智能标签照片登记 · V2.3","localOnly":"仅储存在本机","language":"语言","eyebrow":"仓库 · 标签照片记录","heroMain":"一个标签，一组照片，","heroEm":"自动填写资料。","heroDesc":"拍摄标签照片自动读取 Label / Lot / Part / Net 等字段，再加入 1–2 张物料照片。每个标签固定为独立一组，导出 Excel 时 2–3 张小照片直接放在 Label No. 前面，整组资料都在同一行。","newLabel":"＋ 新增标签","savedLabels":"已保存的标签","groupsUnit":"组资料","searchPlaceholder":"搜索 Label / Lot / Part…","searchAria":"搜索记录","noRecords":"暂无记录。先拍一张标签照片吧。","exportHeading":"批量导出","excelButton":"↓ Excel（照片与资料同一行）","zipButton":"↓ 照片 + 资料 ZIP 备份","importButton":"↑ 导入 ZIP 备份","backupHelp":"支持每组 2–3 张照片。建议定期备份；浏览器资料不会自动同步到其他设备。","captureHeading":"拍摄 / 选择照片","captureDesc":"第 1 张是标签，另外 1–2 张是同一物料的照片。","photoLabel":"标签照片","photoMaterial":"物料照片","photoOptional":"其他角度照片","photoLabelHelp":"必需 · 用于自动识别","photoMaterialHelp":"必需 · 与标签同一组","photoOptionalHelp":"可选 · 最多 3 张","notSelected":"尚未选择","camera":"拍照","upload":"上传","remove":"删除","ocrHeading":"标签识别（OCR）","ocrIntro":"上传标签照片后，系统会定位横线并逐行加强识别品名与规格。","ocrAgain":"↻ 重新识别","ocrRawSummary":"查看识别原文（用于检查不清楚的字段）","ocrNoText":"暂无识别内容","detailsHeading":"标签资料","detailsDesc":"自动填写后仍可手动修正。重量、料号与批号会按原格式保存。","required":"* 必填","fieldDescription":"Description / 品名","fieldSpec":"Spec / 规格","fieldPart":"Part No. / 料号","fieldNet":"Net Weight (KG)","phLabel":"例如 000001","phLot":"例如 50077-2606-02","phDesc":"识别到的完整品名","phSpec":"例如 Mixed","phPart":"例如 1234567890123","phNet":"例如 100.000","formNew":"当前为新记录","clearButton":"清空 / 新增","saveButton":"✓ 保存这一组（2–3 张）","footerPrivacy":"图片自动识别在本机浏览器执行，图片不会上传至服务器。OCR 及 Excel 导出所需程序首次使用时需联网加载。","footerCaution":"识别可能受拍照角度、光线及标签字体影响，请在保存前检查关键字段。","progressProcessing":"处理中…","progressWait":"请勿关闭页面","pageDescription":"标签拍照识别，每个标签绑定 2–3 张照片，导出含照片的 Excel。","photoUnit":"张","photoShortUnit":"张照片","photoAltLabel":"标签","photoAltMaterial":"物料","photoAltOther":"其他角度","photoFallback":"照片 {n}","searchNone":"没有找到符合的标签。","previewAlt":"标签缩略图","unnamedLabel":"未命名标签","photosCount":"{n} 张照片","ocrSaved":"已保存上次识别结果，可重新识别。","ocrUploadInitial":"上传第 1 张照片后自动识别；识别后请核对资料。","formEditing":"编辑已保存的记录","errNoIndexedDB":"此浏览器不支持本机数据库 IndexedDB","errDbUnavailable":"数据库不可用，请在 HTTPS/GitHub Pages 上打开应用","errReadPhoto":"无法读取照片文件","errCompressPhoto":"无法压缩照片","busyPhoto":"正在处理照片，请完成当前操作。","chooseImage":"请选择照片图片文件。","imageTooBig":"图片超过 35MB，请先压缩。","loadingPhoto":"正在读取照片","photoNumberFile":"第 {n} 张：{file}","addedPhoto":"第 {n} 张照片已加入当前标签组","photoFail":"读取照片失败：{error}","needLabelPhoto":"请先拍摄标签照片（第 1 张）。","ocrInitializing":"识别标签中","ocrDownload":"第一次使用需要下载 OCR 语言识别文件；照片只在本机处理。","ocrLibraryMissing":"OCR 程序尚未载入，请确认设备有联网并刷新网页。","ocrRecognizing":"正在识别标签","ocrPercent":"文字识别 {pct}%","ocrReadFields":"读取标签的号码、日期、重量…","ocrDetailTitle":"加强品名与规格识别","ocrDetailDesc":"正在定位标签横线、逐行增强识别 Description 和 Spec…","ocrNone":"未识别到文字","ocrStatusDone":"已识别 {n} 个字段{confidence}。请核对 Lot / Description / Spec / Part / Net。","confidence":" · 文本置信度 {pct}%","ocrMissing":"仍未可靠读取：{fields}。请看标签照片核对并手动填写，不会猜测缺失内容。","ocrFew":"本张标签识别较少：请确保照片清楚、光线充足并正对标签，或在下方手动修改资料。","ocrFinished":"自动识别完成：找到 {n} 项字段，请核对准确性。","ocrFailure":"OCR 识别未完成：{error}。可手动输入标签资料，照片仍能保存。","ocrFailureStatus":"识别失败，可手动填写或重试。","needLabelNo":"请填写 Label No.","needTwoPhotos":"每个标签必须包含：标签照片（1）和物料照片（2）；第 3 张可选。","needTwoNotice":"保存前须至少放入标签照片 + 物料照片，共 2 张；最多 3 张。","confirmDuplicate":"Label {label} 已保存过 {n} 组。确定仍要新增另一组照片吗？","savedState":"已保存 · 可继续修改","savedToast":"Label {label} 已保存（{n} 张照片）。","saveFail":"保存失败：{error}。可尝试减少照片大小、检查浏览器储存空间。","confirmDelete":"确定要删除 Label {label} 的整组记录和所有照片吗？删除后无法撤销。","deletedToast":"已删除这组标签和照片。","noExcelRecords":"没有已保存的标签可导出。","excelMissing":"Excel 程序未加载。请连接互联网后刷新网页重试。","excelTitle":"制作 Excel 文件","excelBuilding":"正在建立照片与标签同一行的表格…","excelPhotoTitle":"正在把小照片插入 Excel","excelPhotoDetail":"Label {label} · 第 {i}/{total} 组","excelWrapping":"正在生成 Excel 文件","excelWrappingDesc":"正在封装单张工作表及所有嵌入照片…","excelDone":"Excel 导出完成：{n} 组，照片与资料全部在同一张工作表。","excelFail":"Excel 导出失败：{error}","noBackupRecords":"没有已保存的标签可备份。","zipMissing":"ZIP 程序未加载。请连接互联网后刷新重试。","zipTitle":"制作照片备份","zipDescription":"包含应用保存的高清照片及完整记录","zipProgress":"整理 Label {label} ({i}/{total})","zipCompress":"正在压缩照片","zipPercent":"已完成 {pct}%","zipDone":"ZIP 备份完成，包含所有照片和资料。","zipFail":"ZIP 导出失败：{error}","importTitle":"读取备份","importChecking":"正在检查 ZIP 内容","errNoManifest":"ZIP 内没有 records.json，这不是 TMC 应用备份。","errBadBackup":"备份格式不正确","importConfirm":"备份包含 {n} 组标签。导入后同编号 ID 的记录会更新，其他记录保留。是否继续？","errInvalidPhotoPath":"备份照片路径不正确","errMissingPhoto":"备份照片缺失：{path}","importRestoring":"恢复标签记录","importDone":"备份导入完成：{n} 组标签。","importFail":"导入备份失败：{error}","deleteButton":"删除本组","ocrAfterRemove":"上传标签照片后自动识别。","errLocalStorage":"无法使用本机储存：{error}。请使用最新版 Chrome / Edge 并允许网站储存资料。","warningFile":"当前使用 file:// 方式打开；建议将整个文件夹部署到 GitHub Pages（HTTPS），以便 OCR、保存及 PWA 更稳定。","languageChanged":"语言已切换。"},"en":{"brandSub":"Smart Label Photo Register · V2.3","localOnly":"Saved on this device only","language":"Language","eyebrow":"WAREHOUSE · LABEL PHOTO RECORD","heroMain":"One label, one photo group,","heroEm":"details filled automatically.","heroDesc":"Photograph the label to read Label / Lot / Part / Net automatically, then add 1–2 photos of the same material. Each label is saved as its own group. In Excel, 2–3 small photos appear before Label No., all on one row.","newLabel":"＋ New label","savedLabels":"Saved labels","groupsUnit":"groups","searchPlaceholder":"Search Label / Lot / Part…","searchAria":"Search records","noRecords":"No records yet. Start by photographing a label.","exportHeading":"Export & backup","excelButton":"↓ Excel (photos and details in one row)","zipButton":"↓ ZIP backup (photos + data)","importButton":"↑ Import ZIP backup","backupHelp":"2–3 photos per group. Back up regularly; browser data is not automatically synced to other devices.","captureHeading":"Take / choose photos","captureDesc":"Photo 1 is the label; photos 2–3 show the same material.","photoLabel":"Label photo","photoMaterial":"Material photo","photoOptional":"Another angle","photoLabelHelp":"Required · for automatic OCR","photoMaterialHelp":"Required · same label group","photoOptionalHelp":"Optional · maximum 3 photos","notSelected":"Not selected","camera":"Camera","upload":"Upload","remove":"Remove","ocrHeading":"Label recognition (OCR)","ocrIntro":"Photo 1 is recognized automatically. Description and Spec use line-by-line scanning between printed rules.","ocrAgain":"↻ Recognize again","ocrRawSummary":"Show raw OCR text (to review unclear fields)","ocrNoText":"No OCR text yet","detailsHeading":"Label details","detailsDesc":"Automatically filled details can still be edited. Weight, part number and lot number keep their original formatting.","required":"* Required","fieldDescription":"Description","fieldSpec":"Spec","fieldPart":"Part No.","fieldNet":"Net Weight (KG)","phLabel":"e.g. 000001","phLot":"e.g. 50077-2606-02","phDesc":"Full description from OCR","phSpec":"e.g. Mixed","phPart":"e.g. 1234567890123","phNet":"e.g. 100.000","formNew":"New record","clearButton":"Clear / new","saveButton":"✓ Save group (2–3 photos)","footerPrivacy":"Image recognition runs in your browser. Photos are not uploaded to our server. An internet connection is required to load OCR and Excel libraries for first use.","footerCaution":"OCR accuracy depends on camera angle, lighting and label print. Check important fields before saving.","progressProcessing":"Processing…","progressWait":"Do not close this page","pageDescription":"Recognize labels, save 2–3 photos per label, and export them together to Excel.","photoUnit":"photos","photoShortUnit":"photos","photoAltLabel":"Label","photoAltMaterial":"Material","photoAltOther":"Another angle","photoFallback":"Photo {n}","searchNone":"No matching labels found.","previewAlt":"Label thumbnail","unnamedLabel":"Unnamed label","photosCount":"{n} photos","ocrSaved":"Previous OCR result is saved; you can recognize again.","ocrUploadInitial":"Upload Photo 1 to start OCR; check the details afterward.","formEditing":"Editing saved record","errNoIndexedDB":"This browser does not support IndexedDB local storage","errDbUnavailable":"Database unavailable. Open the app on HTTPS/GitHub Pages","errReadPhoto":"Cannot read image file","errCompressPhoto":"Cannot compress image","busyPhoto":"A photo is being processed. Finish the current task first.","chooseImage":"Please select an image file.","imageTooBig":"Image exceeds 35 MB. Compress it first.","loadingPhoto":"Reading photo","photoNumberFile":"Photo {n}: {file}","addedPhoto":"Photo {n} added to the current label group","photoFail":"Could not read photo: {error}","needLabelPhoto":"Photograph the label first (Photo 1).","ocrInitializing":"Recognizing label","ocrDownload":"OCR language files download on first use. Photos are processed locally.","ocrLibraryMissing":"OCR library not loaded. Check internet access and refresh.","ocrRecognizing":"Recognizing label","ocrPercent":"Text recognition {pct}%","ocrReadFields":"Reading label number, date and weight…","ocrDetailTitle":"Improving Description & Spec","ocrDetailDesc":"Detecting printed rules and enhancing Description / Spec line by line…","ocrNone":"No text recognized","ocrStatusDone":"{n} fields recognized{confidence}. Check Lot / Description / Spec / Part / Net.","confidence":" · text confidence {pct}%","ocrMissing":"Could not reliably read: {fields}. Check the photo and enter these fields manually; missing values will not be guessed.","ocrFew":"Only a few fields were recognized. Use a clear, well-lit, straight-on photo or edit the details manually.","ocrFinished":"OCR complete: {n} fields found. Please verify their accuracy.","ocrFailure":"OCR could not finish: {error}. You can enter details manually and still save the photos.","ocrFailureStatus":"OCR failed. Enter details manually or retry.","needLabelNo":"Please enter Label No.","needTwoPhotos":"Each label requires a label photo (1) and a material photo (2); Photo 3 is optional.","needTwoNotice":"Add both a label photo and a material photo before saving (2–3 photos total).","confirmDuplicate":"Label {label} already has {n} saved group(s). Create another group anyway?","savedState":"Saved · you may edit again","savedToast":"Label {label} saved ({n} photos).","saveFail":"Save failed: {error}. Try smaller photos or check browser storage.","confirmDelete":"Delete Label {label} and all its photos? This cannot be undone.","deletedToast":"Label group and photos deleted.","noExcelRecords":"No saved labels to export.","excelMissing":"Excel library not loaded. Connect to the internet and refresh.","excelTitle":"Creating Excel file","excelBuilding":"Preparing photos and details in the same row…","excelPhotoTitle":"Inserting small photos into Excel","excelPhotoDetail":"Label {label} · group {i}/{total}","excelWrapping":"Generating Excel file","excelWrappingDesc":"Finishing the single worksheet and embedded photos…","excelDone":"Excel exported: {n} groups, photos and details on one worksheet.","excelFail":"Excel export failed: {error}","noBackupRecords":"No saved labels to back up.","zipMissing":"ZIP library not loaded. Connect to the internet and refresh.","zipTitle":"Creating photo backup","zipDescription":"Including full-resolution saved photos and complete records","zipProgress":"Preparing Label {label} ({i}/{total})","zipCompress":"Compressing photos","zipPercent":"Completed {pct}%","zipDone":"ZIP backup complete with all photos and data.","zipFail":"ZIP export failed: {error}","importTitle":"Reading backup","importChecking":"Checking ZIP contents","errNoManifest":"No records.json in ZIP. This is not an app backup.","errBadBackup":"Invalid backup format","importConfirm":"This backup contains {n} label groups. Records with the same ID will be updated; all others remain. Continue?","errInvalidPhotoPath":"Invalid backup photo path","errMissingPhoto":"Backup photo missing: {path}","importRestoring":"Restoring label records","importDone":"Backup imported: {n} label groups.","importFail":"Backup import failed: {error}","deleteButton":"Delete group","ocrAfterRemove":"Upload a label photo for automatic recognition.","errLocalStorage":"Local storage unavailable: {error}. Use the latest Chrome / Edge and allow site storage.","warningFile":"You opened a file:// URL. Deploy the folder on GitHub Pages (HTTPS) for more reliable OCR, storage and PWA.","languageChanged":"Language changed."},"ms":{"brandSub":"Pendaftaran Foto Label Pintar · V2.3","localOnly":"Disimpan pada peranti ini sahaja","language":"Bahasa","eyebrow":"GUDANG · REKOD FOTO LABEL","heroMain":"Satu label, satu kumpulan foto,","heroEm":"maklumat diisi secara automatik.","heroDesc":"Ambil gambar label untuk membaca Label / Lot / Part / Net secara automatik, kemudian tambah 1–2 foto bahan yang sama. Setiap label disimpan dalam kumpulan berasingan. Dalam Excel, 2–3 foto kecil diletakkan sebelum Label No., semuanya dalam satu baris.","newLabel":"＋ Label baharu","savedLabels":"Label yang disimpan","groupsUnit":"kumpulan","searchPlaceholder":"Cari Label / Lot / Part…","searchAria":"Cari rekod","noRecords":"Belum ada rekod. Mulakan dengan mengambil foto label.","exportHeading":"Eksport & sandaran","excelButton":"↓ Excel (foto dan maklumat sebaris)","zipButton":"↓ Sandaran ZIP (foto + data)","importButton":"↑ Import sandaran ZIP","backupHelp":"2–3 foto setiap kumpulan. Buat sandaran secara berkala; data pelayar tidak disegerakkan ke peranti lain secara automatik.","captureHeading":"Ambil / pilih foto","captureDesc":"Foto pertama ialah label; 1–2 foto lagi menunjukkan bahan yang sama.","photoLabel":"Foto label","photoMaterial":"Foto bahan","photoOptional":"Sudut lain","photoLabelHelp":"Wajib · untuk pengecaman automatik","photoMaterialHelp":"Wajib · kumpulan label yang sama","photoOptionalHelp":"Pilihan · maksimum 3 foto","notSelected":"Belum dipilih","camera":"Kamera","upload":"Muat naik","remove":"Buang","ocrHeading":"Pengecaman label (OCR)","ocrIntro":"Foto pertama dikenal pasti secara automatik. Description dan Spec dibaca mengikut bahagian masing-masing pada label.","ocrAgain":"↻ Kenal pasti semula","ocrRawSummary":"Lihat teks OCR asal (untuk semak medan tidak jelas)","ocrNoText":"Belum ada teks OCR","detailsHeading":"Maklumat label","detailsDesc":"Maklumat yang diisi secara automatik masih boleh diedit. Berat, nombor bahagian dan nombor lot dikekalkan dalam format asal.","required":"* Wajib","fieldDescription":"Keterangan","fieldSpec":"Spesifikasi","fieldPart":"No. Bahagian","fieldNet":"Berat Bersih (KG)","phLabel":"cth. 000001","phLot":"cth. 50077-2606-02","phDesc":"Keterangan penuh daripada OCR","phSpec":"cth. Mixed","phPart":"cth. 1234567890123","phNet":"cth. 100.000","formNew":"Rekod baharu","clearButton":"Kosongkan / baharu","saveButton":"✓ Simpan kumpulan (2–3 foto)","footerPrivacy":"Pengecaman imej dijalankan dalam pelayar pada peranti anda. Foto tidak dimuat naik ke pelayan kami. Sambungan internet diperlukan untuk memuatkan modul OCR dan Excel pada penggunaan pertama.","footerCaution":"Ketepatan OCR bergantung pada sudut kamera, pencahayaan dan cetakan label. Semak medan penting sebelum menyimpan.","progressProcessing":"Sedang diproses…","progressWait":"Jangan tutup halaman ini","pageDescription":"Kenal pasti label, simpan 2–3 foto bagi setiap label dan eksport bersama ke Excel.","photoUnit":"foto","photoShortUnit":"foto","photoAltLabel":"Label","photoAltMaterial":"Bahan","photoAltOther":"Sudut lain","photoFallback":"Foto {n}","searchNone":"Tiada label yang sepadan.","previewAlt":"Lakaran kecil label","unnamedLabel":"Label tanpa nama","photosCount":"{n} foto","ocrSaved":"Hasil OCR terdahulu disimpan; anda boleh mengenal pasti semula.","ocrUploadInitial":"Muat naik Foto 1 untuk memulakan OCR; semak maklumat selepas itu.","formEditing":"Mengedit rekod yang disimpan","errNoIndexedDB":"Pelayar ini tidak menyokong storan setempat IndexedDB","errDbUnavailable":"Pangkalan data tidak tersedia. Buka aplikasi melalui HTTPS/GitHub Pages","errReadPhoto":"Tidak dapat membaca fail imej","errCompressPhoto":"Tidak dapat memampatkan imej","busyPhoto":"Foto sedang diproses. Selesaikan operasi semasa dahulu.","chooseImage":"Sila pilih fail imej.","imageTooBig":"Imej melebihi 35 MB. Mampatkan dahulu.","loadingPhoto":"Membaca foto","photoNumberFile":"Foto {n}: {file}","addedPhoto":"Foto {n} ditambah ke kumpulan label semasa","photoFail":"Gagal membaca foto: {error}","needLabelPhoto":"Ambil foto label terlebih dahulu (Foto 1).","ocrInitializing":"Mengenal pasti label","ocrDownload":"Fail bahasa OCR dimuat turun semasa penggunaan pertama. Foto diproses pada peranti.","ocrLibraryMissing":"Modul OCR belum dimuatkan. Semak internet dan muat semula.","ocrRecognizing":"Mengenal pasti label","ocrPercent":"Pengecaman teks {pct}%","ocrReadFields":"Membaca nombor label, tarikh dan berat…","ocrDetailTitle":"Memperbaik Keterangan & Spesifikasi","ocrDetailDesc":"Membaca Keterangan dan Spesifikasi daripada baris cetakan berasingan…","ocrNone":"Tiada teks dikenal pasti","ocrStatusDone":"{n} medan dikenal pasti{confidence}. Semak Lot / Description / Spec / Part / Net.","confidence":" · keyakinan teks {pct}%","ocrMissing":"Tidak dapat membaca dengan yakin: {fields}. Semak foto dan isi secara manual; nilai yang tiada tidak akan diteka.","ocrFew":"Hanya beberapa medan dikenal pasti. Gunakan foto yang jelas, terang dan lurus atau edit secara manual.","ocrFinished":"OCR selesai: {n} medan ditemui. Sila semak ketepatannya.","ocrFailure":"OCR tidak berjaya: {error}. Anda masih boleh mengisi maklumat secara manual dan menyimpan foto.","ocrFailureStatus":"OCR gagal. Isi secara manual atau cuba lagi.","needLabelNo":"Sila masukkan Label No.","needTwoPhotos":"Setiap label memerlukan foto label (1) dan foto bahan (2); Foto 3 adalah pilihan.","needTwoNotice":"Tambah foto label dan foto bahan sebelum menyimpan (jumlah 2–3 foto).","confirmDuplicate":"Label {label} sudah mempunyai {n} kumpulan tersimpan. Tetap cipta kumpulan baharu?","savedState":"Disimpan · boleh diedit lagi","savedToast":"Label {label} disimpan ({n} foto).","saveFail":"Gagal menyimpan: {error}. Cuba foto lebih kecil atau semak ruang storan pelayar.","confirmDelete":"Padam Label {label} bersama semua fotonya? Tindakan ini tidak boleh dibatalkan.","deletedToast":"Kumpulan label dan foto telah dipadam.","noExcelRecords":"Tiada label tersimpan untuk dieksport.","excelMissing":"Modul Excel belum dimuatkan. Sambung ke internet dan muat semula.","excelTitle":"Menjana fail Excel","excelBuilding":"Menyusun foto dan maklumat dalam baris yang sama…","excelPhotoTitle":"Memasukkan foto kecil ke dalam Excel","excelPhotoDetail":"Label {label} · kumpulan {i}/{total}","excelWrapping":"Menjana fail Excel","excelWrappingDesc":"Menyiapkan satu lembaran kerja dan foto terbenam…","excelDone":"Excel berjaya dieksport: {n} kumpulan, foto dan maklumat dalam satu lembaran kerja.","excelFail":"Eksport Excel gagal: {error}","noBackupRecords":"Tiada label tersimpan untuk disandarkan.","zipMissing":"Modul ZIP belum dimuatkan. Sambung ke internet dan muat semula.","zipTitle":"Menyediakan sandaran foto","zipDescription":"Merangkumi foto resolusi tinggi dan rekod lengkap yang disimpan","zipProgress":"Menyediakan Label {label} ({i}/{total})","zipCompress":"Memampatkan foto","zipPercent":"Selesai {pct}%","zipDone":"Sandaran ZIP selesai dengan semua foto dan maklumat.","zipFail":"Eksport ZIP gagal: {error}","importTitle":"Membaca sandaran","importChecking":"Menyemak kandungan ZIP","errNoManifest":"Tiada records.json dalam ZIP. Ini bukan sandaran aplikasi.","errBadBackup":"Format sandaran tidak sah","importConfirm":"Sandaran ini mengandungi {n} kumpulan label. Rekod dengan ID sama akan dikemas kini; rekod lain dikekalkan. Teruskan?","errInvalidPhotoPath":"Laluan foto sandaran tidak sah","errMissingPhoto":"Foto sandaran tiada: {path}","importRestoring":"Memulihkan rekod label","importDone":"Sandaran diimport: {n} kumpulan label.","importFail":"Import sandaran gagal: {error}","deleteButton":"Padam kumpulan","ocrAfterRemove":"Muat naik foto label untuk pengecaman automatik.","errLocalStorage":"Storan setempat tidak tersedia: {error}. Gunakan Chrome / Edge terkini dan benarkan storan laman.","warningFile":"Anda membuka URL file://. Terbitkan folder melalui GitHub Pages (HTTPS) untuk OCR, storan dan PWA yang lebih stabil.","languageChanged":"Bahasa telah ditukar."}};
  // Shareable Excel package for Windows. Each ZIP includes the current .xlsx data and a local desktop converter.
  Object.assign(TRANSLATIONS.zh,{
    excelShareButton:'↓ Excel 共享版（Windows 一键生成 .xlsm）',
    excelShareHelp:'下载含资料的共享 ZIP，Windows 电脑解压后双击制作工具，生成可发送的 .xlsm。首次需获准使用 Excel VBA 项目；接收者须获准启用宏，手机 Excel 不支持。',
    excelSharePackaging:'制作 Excel 共享包',
    excelSharePackageDetail:'放入标签资料、照片及 Windows 转换工具…',
    excelShareDone:'共享 ZIP 已下载。请在 Windows 电脑解压并双击 Create_Shareable_Excel.vbs 制作可发送的 .xlsm。',
    excelShareMissing:'共享包程序文件缺失，请重新部署完整 V2.2 文件夹。',
  });
  Object.assign(TRANSLATIONS.en,{
    excelShareButton:'↓ Shareable Excel (Windows .xlsm creator)',
    excelShareHelp:'Downloads a ZIP with your current Excel photos/data. Extract on Windows and double-click the included creator to make an .xlsm for colleagues. Initial IT-approved VBA access may be needed; recipients must be permitted to run macros. Mobile Excel does not support them.',
    excelSharePackaging:'Preparing Excel sharing package',
    excelSharePackageDetail:'Packing labels, embedded photos and Windows conversion tools…',
    excelShareDone:'Share ZIP downloaded. On Windows, extract and double-click Create_Shareable_Excel.vbs to create a shareable .xlsm.',
    excelShareMissing:'Share package support files are missing. Deploy the complete V2.2 folder.',
  });
  Object.assign(TRANSLATIONS.ms,{
    excelShareButton:'↓ Excel untuk Dikongsi (Windows .xlsm)',
    excelShareHelp:'Muat turun ZIP berisi data Excel dan foto. Ekstrak pada Windows dan dwiklik alat disertakan untuk hasilkan .xlsm. Kebenaran akses VBA mungkin diperlukan sekali; penerima juga perlu dibenarkan menjalankan makro. Excel telefon tidak menyokongnya.',
    excelSharePackaging:'Menyediakan pakej perkongsian Excel',
    excelSharePackageDetail:'Memasukkan rekod, foto dan alat penukaran Windows…',
    excelShareDone:'ZIP perkongsian telah dimuat turun. Pada Windows, ekstrak dan dwiklik Create_Shareable_Excel.vbs untuk menghasilkan .xlsm.',
    excelShareMissing:'Fail sokongan pakej perkongsian tiada. Terbitkan semula folder V2.2 yang lengkap.',
  });
  // Additional interface strings for the optional Windows Excel macro companion.
  TRANSLATIONS.zh.excelZoomTool = '↗ Excel 照片放大工具（Windows）';
  TRANSLATIONS.en.excelZoomTool = '↗ Excel Photo Zoom Tool (Windows)';
  TRANSLATIONS.ms.excelZoomTool = '↗ Alat Zum Foto Excel (Windows)';
  TRANSLATIONS.zh.excelZoomHelp = 'Windows 电脑版 Excel：单击小照片放大，再次点击或约 9 秒后自动归位。需要在 .xlsm 工作簿中按说明启用宏；手机 Excel 不支持宏。';
  TRANSLATIONS.en.excelZoomHelp = 'Windows desktop Excel only: click a thumbnail to enlarge, click again or wait about 9 seconds to restore. Import the provided macro into an .xlsm workbook. Mobile Excel does not run VBA.';
  TRANSLATIONS.ms.excelZoomHelp = 'Excel desktop Windows sahaja: klik foto kecil untuk besarkan; klik semula atau tunggu kira-kira 9 saat untuk kembali ke saiz asal. Import makro ke buku kerja .xlsm. Excel mudah alih tidak menyokong VBA.';
  // V2.2: Export confirmation and safe batch cleanup (all three languages).
  Object.assign(TRANSLATIONS.zh, {
    exportStatusTitle:'导出与清理', exportedCount:'已确认导出：{n} 组',
    pendingExportCount:'等待确认：{n} 组', unexportedCount:'未导出：{n} 组',
    markExportedButton:'✓ 确认导出成功（{n}）', deleteExportedButton:'删除已导出记录（{n}）',
    cleanupHelp:'先导出文件并确认已保存，再删除已导出的记录和照片；未导出的不会删除。',
    exportedStatus:'已导出', pendingExportStatus:'待确认导出', notExportedStatus:'未导出',
    exportPendingToast:'下载已启动；请先检查文件，再点击「确认导出成功」。',
    confirmMarkExported:'确认这 {n} 组标签的导出文件已完整保存、照片可查看吗？\n\n普通 Excel：请确认 .xlsx 可以打开。\n共享版：请先在 Windows 成功生成并打开最终 .xlsm。\n\n仅确认本次实际导出的记录。',
    markedExportedToast:'已确认 {n} 组导出成功，可以选择删除。',
    noPendingExport:'目前没有待确认的导出记录。请先导出 Excel。',
    noExportedRecords:'没有可以删除的已导出记录。',
    confirmBulkDelete:'将永久删除 {n} 组已确认导出的标签及全部关联照片，不能撤销！\n\n请先确认 Excel / ZIP 文件已妥善保存。\n\n未导出的标签不会删除。确定继续吗？',
    deletedExportedToast:'已清理 {n} 组已导出标签及照片；未导出的已保留。',
    confirmSingleExportedDelete:'确定删除已导出的 Label {label} 及其全部照片吗？此操作无法撤销。',
    exportedSingleDeleted:'已删除该组已导出标签和照片。',
    exportPendingStatusHelp:'下载后不会直接清除资料。浏览器无法验证文件是否真的保存，因此须由你亲自确认。',
    errCleanup:'清理失败：{error}'
  });
  Object.assign(TRANSLATIONS.en, {
    exportStatusTitle:'Export status & cleanup', exportedCount:'Confirmed exported: {n}',
    pendingExportCount:'Awaiting confirmation: {n}', unexportedCount:'Not exported: {n}',
    markExportedButton:'✓ Confirm export successful ({n})', deleteExportedButton:'Delete exported records ({n})',
    cleanupHelp:'Export and verify the file first, then delete confirmed exported records and photos. Unexported records are kept.',
    exportedStatus:'Exported', pendingExportStatus:'Awaiting export confirmation', notExportedStatus:'Not exported',
    exportPendingToast:'Download initiated. Check your file, then select Confirm export successful.',
    confirmMarkExported:'Did you fully save and check the export file for these {n} records?\n\nNormal Excel: verify that the .xlsx opens.\nShareable version: first generate and check the final .xlsm in Windows.\n\nOnly records actually included in the export will be confirmed.',
    markedExportedToast:'Confirmed {n} exported records. You can now delete them.',
    noPendingExport:'No pending export. Export Excel first.', noExportedRecords:'No confirmed exported records to delete.',
    confirmBulkDelete:'Permanently delete {n} confirmed exported label groups and ALL their photos? This cannot be undone!\n\nPlease verify the Excel / ZIP files are safely saved.\n\nUnexported records will be preserved.',
    deletedExportedToast:'Deleted {n} exported label groups and photos; unexported records were kept.',
    confirmSingleExportedDelete:'Permanently delete exported Label {label} and all its photos?',
    exportedSingleDeleted:'Exported label and its photos deleted.',
    exportPendingStatusHelp:'Downloading never deletes data automatically. The browser cannot confirm file storage, so you must verify it yourself.',
    errCleanup:'Cleanup failed: {error}'
  });
  Object.assign(TRANSLATIONS.ms, {
    exportStatusTitle:'Status eksport & pembersihan', exportedCount:'Telah disahkan eksport: {n}',
    pendingExportCount:'Menunggu pengesahan: {n}', unexportedCount:'Belum dieksport: {n}',
    markExportedButton:'✓ Sahkan eksport berjaya ({n})', deleteExportedButton:'Padam rekod dieksport ({n})',
    cleanupHelp:'Eksport dan semak fail dahulu, kemudian padam rekod dan foto yang telah disahkan. Rekod belum dieksport dikekalkan.',
    exportedStatus:'Telah dieksport', pendingExportStatus:'Menunggu pengesahan eksport', notExportedStatus:'Belum dieksport',
    exportPendingToast:'Muat turun dimulakan. Semak fail, kemudian tekan Sahkan eksport berjaya.',
    confirmMarkExported:'Adakah anda sudah menyimpan dan menyemak fail eksport bagi {n} rekod ini?\n\nExcel biasa: pastikan fail .xlsx dapat dibuka.\nVersi perkongsian: hasilkan dan semak fail .xlsm akhir di Windows dahulu.\n\nHanya rekod yang terkandung dalam eksport akan disahkan.',
    markedExportedToast:'Eksport {n} rekod disahkan. Rekod kini boleh dipadam.',
    noPendingExport:'Tiada eksport menunggu pengesahan. Eksport Excel dahulu.',
    noExportedRecords:'Tiada rekod dieksport yang disahkan untuk dipadam.',
    confirmBulkDelete:'Padam kekal {n} kumpulan label yang telah disahkan dieksport dan SEMUA fotonya? Tidak boleh dibatalkan!\n\nPastikan fail Excel / ZIP telah disimpan dengan selamat.\n\nRekod belum dieksport akan dikekalkan.',
    deletedExportedToast:'{n} kumpulan label dieksport dan fotonya dipadam; rekod belum dieksport dikekalkan.',
    confirmSingleExportedDelete:'Padam kekal Label {label} yang dieksport dan semua fotonya?',
    exportedSingleDeleted:'Label dieksport dan fotonya telah dipadam.',
    exportPendingStatusHelp:'Muat turun tidak pernah memadam data secara automatik. Pelayar tidak dapat memastikan fail telah disimpan; anda mesti menyemaknya sendiri.',
    errCleanup:'Pembersihan gagal: {error}'
  });
  Object.assign(TRANSLATIONS.zh,{ocrQrTip:'批号、料号与重量优先使用标签 QR Code；品名、规格逐行读取，识别不清时请人工核对。',qrUnavailable:'未能确认 QR Code 资料，特别请检查完整 Lot No.（含字母与连字符）。'});
  Object.assign(TRANSLATIONS.en,{ocrQrTip:'Lot, part number and weight are read from the QR code first. Description and Spec are scanned line by line; review unclear results.',qrUnavailable:'QR data could not be verified. Please check the complete Lot No., including letters and hyphens.'});
  Object.assign(TRANSLATIONS.ms,{ocrQrTip:'Lot, nombor bahagian dan berat diutamakan daripada kod QR. Keterangan dan spesifikasi dibaca baris demi baris; semak jika tidak jelas.',qrUnavailable:'Data kod QR tidak dapat disahkan. Sila semak No. Lot lengkap, termasuk huruf dan tanda sengkang.'});
  const LANG_KEY = 'label_photo_register_language';
  let lang = (()=>{try{return localStorage.getItem(LANG_KEY)||'zh';}catch(_){return 'zh';}})();
  if(!Object.prototype.hasOwnProperty.call(TRANSLATIONS, lang))lang='zh';
  function t(key,params={}) {let s=TRANSLATIONS[lang][key]||TRANSLATIONS.zh[key]||key;return s.replace(/\{(\w+)\}/g,(_,name)=>params[name]===undefined?'':String(params[name]));}
  function applyLanguage(){
    document.documentElement.lang=lang==='zh'?'zh-Hans':lang;
    document.title=(lang==='zh'?'标签照片登记':lang==='ms'?'Pendaftaran Foto Label':'Label Photo Register')+' V2.3';
    document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n);});
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{el.placeholder=t(el.dataset.i18nPlaceholder);});
    document.querySelectorAll('[data-i18n-title]').forEach(el=>{el.title=t(el.dataset.i18nTitle);});
    document.querySelectorAll('[data-i18n-aria-label]').forEach(el=>{el.setAttribute('aria-label',t(el.dataset.i18nAriaLabel));});
    document.querySelectorAll('[data-i18n-content]').forEach(el=>{el.setAttribute('content',t(el.dataset.i18nContent));});
    $('language-select').value=lang;
    refreshExportControls();
  }
  function setLanguage(next){if(!TRANSLATIONS[next])return;if(busy){$('language-select').value=lang;return;}readForm();lang=next;
    try{localStorage.setItem(LANG_KEY,lang);}catch(_){}
    applyLanguage();loadToForm();renderList();notice('');toast(t('languageChanged'));
  }
  function freshRecord() {
    const fields = {};
    FIELD_KEYS.forEach(k => { fields[k] = ''; });
    return { id: (self.crypto && self.crypto.randomUUID ? self.crypto.randomUUID() : `${Date.now()}-${Math.random()}`), fields, photos:[null,null,null], createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(), ocrRaw:'', exportedAt:null, exportedVersion:null, pendingExportAt:null, pendingExportVersion:null };
  }
  function safeString(v) {return v === null || v === undefined ? '' : String(v);}
  function toast(text) { const el=$('toast'); el.textContent=text; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),4000); }
  function notice(text) {const el=$('notice');el.textContent=text;el.hidden=!text;}
  function setProgress(title,detail,pct=0) { $('progress-title').textContent=title; $('progress-detail').textContent=detail; $('progress-bar').style.width=`${Math.min(100,Math.max(0,pct))}%`; $('progress-overlay').hidden=false; }
  function hideProgress() {$('progress-overlay').hidden=true;}
  function setBusy(value) { busy=value; $('btn-save').disabled=value; $('btn-ocr').disabled=value; refreshExportControls(); }
  function photoUrl(blob) {if(!blob)return ''; let url=urlCache.get(blob);if(!url){url=URL.createObjectURL(blob);urlCache.set(blob,url);}return url;}

  function dbOpen(){return new Promise((resolve,reject)=>{
    if(!('indexedDB' in window))return reject(new Error(t('errNoIndexedDB')));
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE,{keyPath:'id'});};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });}
  function dbRequest(mode,fn){return new Promise((resolve,reject)=>{
    if(!db)return reject(new Error(t('errDbUnavailable')));
    const trx=db.transaction(STORE,mode);const store=trx.objectStore(STORE);
    const req=fn(store);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    trx.onerror=()=>reject(trx.error);
  });}
  const getAll=()=>dbRequest('readonly',store=>store.getAll());
  const putRecord=r=>dbRequest('readwrite',store=>store.put(r));
  const removeRecord=id=>dbRequest('readwrite',store=>store.delete(id));
  // Existing IndexedDB store name/version is unchanged: old labels and photo Blobs remain intact.
  const isExported = r => Boolean(r.exportedAt && r.exportedVersion && r.exportedVersion === r.updatedAt);
  const isPending = r => Boolean(r.pendingExportAt && r.pendingExportVersion && r.pendingExportVersion === r.updatedAt && !isExported(r));
  function txBatch(mutator){return new Promise((resolve,reject)=>{
    if(!db)return reject(new Error(t('errDbUnavailable')));
    const tx=db.transaction(STORE,'readwrite');
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error('Database transaction failed'));
    tx.onabort=()=>reject(tx.error||new Error('Database transaction aborted'));
    try{mutator(tx.objectStore(STORE));}catch(e){tx.abort();}
  });}
  async function registerPendingExport(snapshot){
    // A browser cannot verify a download has been saved: do NOT mark exported yet.
    const map=new Map(snapshot.map(v=>[v.id,v.updatedAt]));
    const rows=records.filter(r=>map.get(r.id)===r.updatedAt);
    await txBatch(store=>{for(const r of rows){store.put({...r,pendingExportAt:new Date().toISOString(),pendingExportVersion:r.updatedAt});}});
    await reload();toast(t('exportPendingToast'));
  }
  async function confirmExported(){
    if(busy)return;
    const pending=records.filter(r=>r.pendingExportAt && r.pendingExportVersion===r.updatedAt);
    if(!pending.length){toast(t('noPendingExport'));return;}
    if(!confirm(t('confirmMarkExported',{n:pending.length})))return;
    const date=new Date().toISOString();
    try{setBusy(true);await txBatch(store=>{for(const r of pending){store.put({...r,exportedAt:date,exportedVersion:r.updatedAt,pendingExportAt:null,pendingExportVersion:null});}});
      await reload();toast(t('markedExportedToast',{n:pending.length}));
    }catch(e){notice(t('errCleanup',{error:e.message}));}finally{setBusy(false);}
  }
  async function deleteExported(){
    if(busy)return;
    const targets=records.filter(isExported);
    if(!targets.length){toast(t('noExportedRecords'));return;}
    if(!confirm(t('confirmBulkDelete',{n:targets.length})))return;
    try{setBusy(true);await txBatch(store=>{for(const r of targets)store.delete(r.id);});
      if(targets.some(r=>r.id===draft.id))draft=freshRecord();
      await reload();loadToForm();notice('');toast(t('deletedExportedToast',{n:targets.length}));
    }catch(e){notice(t('errCleanup',{error:e.message}));}finally{setBusy(false);}
  }
  async function deleteExportedSingle(r){
    if(busy||!isExported(r))return;
    if(!confirm(t('confirmSingleExportedDelete',{label:r.fields.labelNo})))return;
    try{setBusy(true);await removeRecord(r.id);
      if(draft.id===r.id)draft=freshRecord();
      await reload();loadToForm();toast(t('exportedSingleDeleted'));
    }catch(e){notice(t('errCleanup',{error:e.message}));}finally{setBusy(false);}
  }
  function refreshExportControls(){
    const exported=records.filter(isExported).length;
    const pending=records.filter(isPending).length;
    const notExported=records.length-exported-pending;
    $('exported-count').textContent=t('exportedCount',{n:exported});
    $('pending-count').textContent=t('pendingExportCount',{n:pending});
    $('notexported-count').textContent=t('unexportedCount',{n:notExported});
    $('btn-mark-exported').textContent=t('markExportedButton',{n:pending});
    $('btn-delete-exported').textContent=t('deleteExportedButton',{n:exported});
    $('btn-mark-exported').disabled=!pending||busy;
    $('btn-delete-exported').disabled=!exported||busy;
  }
  async function reload(){records=(await getAll()).sort((a,b)=>safeString(b.updatedAt).localeCompare(safeString(a.updatedAt)));renderList();}

  function loadToForm(){FIELD_KEYS.forEach(k=>{form.elements.namedItem(k).value=safeString(draft.fields[k]);});$('ocr-raw').textContent=draft.ocrRaw||t('ocrNoText');$('ocr-status').textContent=draft.ocrRaw?t('ocrSaved'):t('ocrUploadInitial');renderPhotos();$('form-state').textContent=records.some(x=>x.id===draft.id)?t('formEditing'):t('formNew');$('btn-delete').hidden=!records.some(x=>x.id===draft.id);}
  function renderPhotos(){
    draft.photos.forEach((p,i)=>{
      const prev=$(`preview-${i}`); const name=$(`photo-name-${i}`); prev.replaceChildren();
      if(p&&p.blob){const img=document.createElement('img');img.src=photoUrl(p.blob);img.alt=[t('photoAltLabel'),t('photoAltMaterial'),t('photoAltOther')][i];prev.append(img);name.textContent=p.name||t('photoFallback',{n:i+1});}
      else {const icon=document.createElement('span');icon.className='photo-placeholder-icon';icon.textContent=i?'▧':'▦';const strong=document.createElement('b');strong.textContent=[t('photoLabel'),t('photoMaterial'),t('photoOptional')][i];const note=document.createElement('small');note.textContent=i===2?t('photoOptionalHelp'):(i===0?t('photoLabelHelp'):t('photoMaterialHelp'));prev.append(icon,strong,note);name.textContent=t('notSelected');}
      document.querySelector(`[data-photo-action="remove"][data-slot="${i}"]`).hidden=!p;
    });
    const n=draft.photos.filter(Boolean).length;
    $('photo-count').textContent=`${n} / 3 ${t('photoUnit')}`;
  }
  function renderList(){
    $('record-count').textContent=records.length;refreshExportControls();
    const search=$('search-records').value.trim().toLowerCase();
    const list=$('record-list');list.replaceChildren();
    const matched=records.filter(r=>['labelNo','lotNo','partNo','description'].some(k=>safeString(r.fields[k]).toLowerCase().includes(search)));
    if(!matched.length){const el=document.createElement('div');el.className='empty-side';el.textContent=search?t('searchNone'):t('noRecords');list.append(el);}
    matched.forEach(r=>{
      const item=document.createElement('button');item.type='button';item.className='record-item'+(r.id===draft.id?' active':'');item.addEventListener('click',()=>{readForm();draft={...r,fields:{...r.fields},photos:[...r.photos]};loadToForm();renderList();window.scrollTo({top:0,behavior:'smooth'});});
      const thumb=document.createElement('img');thumb.alt=t('previewAlt');if(r.photos[0]&&r.photos[0].blob)thumb.src=photoUrl(r.photos[0].blob);
      const meta=document.createElement('span');meta.className='record-meta';
      const strong=document.createElement('strong');strong.textContent=r.fields.labelNo||t('unnamedLabel');
      const lot=document.createElement('small');lot.textContent=`Lot: ${r.fields.lotNo||'—'} · Net: ${r.fields.netKg||'—'} KG`;
      const count=document.createElement('small');count.className='count';count.textContent=t('photosCount',{n:r.photos.filter(Boolean).length});
      const status=document.createElement('small');status.className='export-status '+(isExported(r)?'exported':isPending(r)?'pending':'unexported');
      status.textContent=t(isExported(r)?'exportedStatus':isPending(r)?'pendingExportStatus':'notExportedStatus');
      meta.append(strong,lot,count,status);item.append(thumb,meta);
      const wrapper=document.createElement('div');wrapper.className='record-list-row';wrapper.append(item);
      if(isExported(r)){
        const del=document.createElement('button');del.type='button';del.className='record-delete-button';
        del.setAttribute('aria-label',t('deleteExportedButton',{n:1})+' '+safeString(r.fields.labelNo));
        del.title=t('deleteExportedButton',{n:1});del.textContent='×';
        del.addEventListener('click',()=>deleteExportedSingle(r));wrapper.append(del);
      }
      list.append(wrapper);
    });
  }
  function readForm(){FIELD_KEYS.forEach(k=>{draft.fields[k]=form.elements.namedItem(k).value.trim();});}
  function newDraft(){draft=freshRecord();loadToForm();renderList();notice('');}

  async function imageToBitmap(blob){try{return await createImageBitmap(blob,{imageOrientation:'from-image'});}catch(_){return await new Promise((resolve,reject)=>{const i=new Image();const u=URL.createObjectURL(blob);i.onload=()=>{URL.revokeObjectURL(u);resolve(i);};i.onerror=()=>{URL.revokeObjectURL(u);reject(new Error(t('errReadPhoto')));};i.src=u;});}}
  async function resizePhoto(file,slot){
    const source=await imageToBitmap(file);
    try{
      const max=slot===0?2300:1700;
      const scale=Math.min(1,max/Math.max(source.width,source.height));
      const w=Math.max(1,Math.round(source.width*scale)),h=Math.max(1,Math.round(source.height*scale));
      const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
      const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(source,0,0,w,h);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',slot===0?.91:.85));
      if(!blob)throw new Error(t('errCompressPhoto'));
      return {name:(file.name||`photo-${slot+1}`).replace(/\.[^.]+$/,'')+'.jpg',blob,originalName:file.name||'',takenAt:new Date().toISOString()};
    }finally{if(source.close)source.close();}
  }

  async function setPhoto(slot,file){
    if(busy){toast(t('busyPhoto'));return;}
    if(!file || !file.type.startsWith('image/')){toast(t('chooseImage'));return;}
    if(file.size>35*1024*1024){toast(t('imageTooBig'));return;}
    readForm();
    try{
      setBusy(true);setProgress(t('loadingPhoto'),t('photoNumberFile',{n:slot+1,file:file.name}),15);
      const normalized=await resizePhoto(file,slot);draft.photos[slot]=normalized;renderPhotos();setBusy(false);hideProgress();
      toast(t('addedPhoto',{n:slot+1}));
      if(slot===0)await recognizeLabel(false);
    }catch(error){setBusy(false);hideProgress();notice(t('photoFail',{error:error.message}));}
  }
  function getRegex(text,reList){for(const re of reList){const match=text.match(re);if(match&&match[1])return match[1].trim();}return '';}
  function cleanLot(str){
    // Lots are identifiers, not numbers: FSL1809-2 and 50077-2606-02 must retain letters, dashes and leading zeroes.
    return safeString(str).toUpperCase().replace(/§/g,'5').replace(/[‐‑–—]/g,'-').replace(/\s*[-]\s*/g,'-')
      .replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/g,'').replace(/[^A-Z0-9-]/g,'');
  }
  function validLot(value){
    const s=cleanLot(value);
    return s.length>=5 && s.length<=32 && /\d/.test(s) && !/--/.test(s)
      && !/^(?:SOURCE|PART|LABEL|CONTAINER|GROSS|DATE|NET|WEIGHER)/i.test(s)
      && /^(?:[A-Z]{1,7}\d{3,}|\d{4,})(?:-[A-Z0-9]{1,10}){0,3}$/.test(s);
  }
  function lotFromRaw(text){
    const lines=safeString(text).replace(/[‐‑–—]/g,'-').split(/\r?\n/).map(s=>s.trim().replace(/§/g,'5'));
    const idx=lines.findIndex(l=>/\bLOT\s*(?:NO\.?|N0\.?)?/i.test(l));
    if(idx<0)return '';
    const match=lines[idx].match(/\bLOT\s*(?:NO\.?|N0\.?)?\s*[:;.,-]*\s*([A-Z0-9]{4,22}(?:\s*-\s*[A-Z0-9]{1,10}){0,3})/i);
    if(match&&validLot(match[1]))return cleanLot(match[1]);
    // On skewed labels Tesseract can print the lot value on the row BEFORE the caption.
    const prev=lines.slice(Math.max(0,idx-2),idx).join(' ');
    const candidates=prev.match(/(?:[A-Z]{1,6}\d{3,}|\d{4,})(?:-\w{1,10})+/gi)||[];
    return cleanLot(candidates.find(validLot)||'');
  }
  function sanitizeDetail(line){
    return safeString(line).replace(/[\u2018\u2019\u201c\u201d]/g,'').replace(/[|_]+\s*$/g,'')
      .replace(/\s+/g,' ').replace(/^\s*(?:pn|pp|on|\*|[#:;=]+)\s+(?=[A-Za-z])/i,'')
      .replace(/Cu[Il|]Ni/gi,'Cu/Ni').replace(/\bw\s*\/\s*au\b/gi,'w/Au')
      .replace(/\s+\)/g,')').replace(/\(\s+/g,'(')
      .replace(/^[^A-Za-z0-9(]+|[^A-Za-z0-9)]+$/g,'').trim();
  }
  function isFieldHeader(line){return /\b(?:Part\s*(?:No)?|Gross|Container|Net|Date|Weigher|Check|Source|Label|Lot\s*(?:No)?|Tax\s*Type|Code)\b/i.test(line);}
  function ocrParse(raw){
    const text=safeString(raw).replace(/\r/g,'').replace(/\u00a0/g,' ').replace(/[‐‑–—]/g,'-');
    const lines=text.split('\n').map(x=>x.trim().replace(/\s+/g,' ')).filter(Boolean);
    const out={};
    out.labelNo=getRegex(text,[/\bLABE[L1I]\s*[:;.\-]?\s*(\d{4,12})\b/i,/\bLABEL\s*(?:NO\.?)?\s*[:;.\-]?\s*(\d{4,12})/i]);
    // Prefer the value printed beside LOT No.; do not join a numeric lot fragment with Source or Part No.
    out.lotNo=lotFromRaw(text);
    out.partNo=getRegex(text,[/\bPART\s*(?:NO\.?)?\s*[:;.\-]?\s*(\d{9,18})\b/i,/\bPART\s*(?:NO\.?)?\s*[:;.\-]?\s*([\d\s]{10,22})/i]).replace(/\s/g,'');
    out.netKg=getRegex(text,[/\bNET\s*[:;.\-]?\s*(\d{1,8}(?:[.,]\d{1,4})?)\s*(?:K[GC]S?)?/i]).replace(',','.');
    out.containerKg=getRegex(text,[/\bCONTAINER\s*[:;.\-]?\s*(\d{1,8}(?:[.,]\d{1,4})?)\s*(?:K[GC]S?)?/i]).replace(',','.');
    out.grossKg=getRegex(text,[/\bGROSS\s*[:;.\-]?\s*(\d{1,8}(?:[.,]\d{1,4})?)\s*(?:K[GC]S?)?/i]).replace(',','.');
    out.date=getRegex(text,[/\bDATE\s*[:;.\-]?\s*((?:19|20)\d{2}[\/\-.]\d{1,2}[\/\-.]\d{1,2})/i]).replace(/[-.]/g,'/');
    out.weigher=getRegex(text,[/\bWEIGHER\s*[:;.\-]?\s*([A-Z0-9]{4,12})\b/i]);
    out.checker=getRegex(text,[/\bCHECK\s*[:;.\-]?\s*([A-Z0-9]{4,12})\b/i]);
    out.taxCode=getRegex(text,[/\bCODE\s*[:;.\-]?\s*(\d{1,4})\b/i]);
    const sourceLine=lines.find(l=>/\bSource\b/i.test(l));
    if(sourceLine){
      const v=sourceLine.replace(/^.*?\bSource\b\s*[:;.]?\s*/i,'').trim();
      const match=v.match(/\b[A-Z0-9]{2,16}\b/i);
      if(match)out.source=match[0];
    }
    // Look for text on the caption row. The secondary region scan below rescues
    // descriptions/specifications where whole-photo OCR does not see captions.
    const descIdx=lines.findIndex(l=>/\bDescription\b/i.test(l));
    const specIdx=lines.findIndex(l=>/\bSpec\b/i.test(l));
    if(descIdx>=0){
      const group=[];
      const after=lines[descIdx].replace(/^.*?\bDescription\b\s*[:;.\-]?\s*/i,'').trim();
      if(after&&!isFieldHeader(after))group.push(sanitizeDetail(after));
      if(specIdx>descIdx){
        for(let i=descIdx+1;i<specIdx;i++){
          if(isFieldHeader(lines[i]))break;
          const v=sanitizeDetail(lines[i]);if(v.length>=3)group.push(v);
        }
      }
      if(group.length)out.description=group.join(' ');
    }
    if(specIdx>=0){
      const group=[];
      const after=lines[specIdx].replace(/^.*?\bSpec\b\s*[:;.\-]?\s*/i,'').trim();
      if(after&&!isFieldHeader(after))group.push(sanitizeDetail(after));
      for(let i=specIdx+1;i<Math.min(lines.length,specIdx+4);i++){
        if(isFieldHeader(lines[i])||/\bDescription\b/i.test(lines[i]))break;
        const v=sanitizeDetail(lines[i]);if(v.length>=3)group.push(v);
      }
      if(group.length)out.spec=group.join(' ');
    }
    if(!out.spec && /\bMixed\b/i.test(text) && specIdx>=0)out.spec='Mixed';
    if(!out.labelNo){const l=lines.slice(0,9).join(' ').match(/\b(0\d{5,8})\b/);if(l)out.labelNo=l[1];}
    return out;
  }
  // V1.6: Use detected text geometry rather than photo-wide, fixed percentages.
  // The printed headings and the handwritten/typed values are not baseline-aligned:
  // Description values are *above* the caption; Spec can wrap onto a second row.
  function wordsFromTSV(tsv){
    return safeString(tsv).split(/\r?\n/).slice(1).map(line=>{
      const v=line.split('\t');
      if(v.length<12||v[0]!=='5')return null;
      return {text:v.slice(11).join('\t').trim(),x:Number(v[6]),y:Number(v[7]),w:Number(v[8]),h:Number(v[9]),conf:Number(v[10])};
    }).filter(v=>v&&v.text&&[v.x,v.y,v.w,v.h].every(Number.isFinite));
  }
  function labelGeometry(tsv,w,h){
    const words=wordsFromTSV(tsv);
    const low=s=>s.toLowerCase().replace(/[^a-z]/g,'');
    const desc=words.find(t=>t.x<.36*w&&t.y>.19*h&&t.y<.47*h&&/^desc(?:rip|rn|n|r|ri|)[a-z]*tion$|^description$/.test(low(t.text)))
      ||words.find(t=>t.x<.36*w&&t.y>.20*h&&t.y<.47*h&&low(t.text).startsWith('desc'));
    const part=words.find(t=>t.x>.21*w&&t.x<.49*w&&t.y>.35*h&&t.y<.65*h&&/^part$/.test(low(t.text)));
    const spec=words.find(t=>t.x<.30*w&&t.y>.30*h&&t.y<.57*h&&/^spec$/.test(low(t.text)));
    const dy=desc?.y??h*.290;
    let py=part?.y??h*.455;
    // Ignore anchors clearly out of order (misread caption elsewhere on the page).
    if(py-dy<h*.10||py-dy>h*.27)py=dy+h*.165;
    const gap=py-dy;
    let specY=spec?.y??(dy+gap*.48);
    if(specY<dy+gap*.34||specY>dy+gap*.70)specY=dy+gap*.48;
    // Use Part No. left edge as the most stable value-column boundary.
    // This prevents OCR from ingesting the printed English captions.
    const textX=Math.max(w*.23,Math.min(w*.32,part?part.x-4:(desc?desc.x+desc.w+1:w*.266)));
    return {descY:dy,specY,partY:py,gap,x0:textX,x1:Math.min(w*.88,textX+w*.61),located:!!(desc&&part)};
  }
  function cleanLine(s){
    return safeString(s).replace(/[\u2018\u2019\u201c\u201d]/g,'').replace(/\s+/g,' ').trim()
      .replace(/^(?:Description|Descnption|ption|Spec|Part\s*No\.?)\s*[:;.®]?\s*/i,'')
      .replace(/\s*[|_:]+\s*$/g,'').replace(/^[^A-Za-z0-9(]+/g,'').trim();
  }
  function cleanDetail(raw,kind){
    if(/^\s*(?:ption|Descnption|FINN\s+Ne)\b/i.test(safeString(raw)))return '';
    const rows=safeString(raw).split(/\r?\n/).map(cleanLine).filter(Boolean)
      .filter(s=>!(/^(?:Description|Descnption|Spec|Part\s*(?:No)?|Gross|Container|Net|Date|Weigher|Check|Source)\b/i.test(s)))
      .filter(s=>/[a-z]{2}/i.test(s)||/\bMixed\b/i.test(s));
    if(!rows.length)return '';
    let value=rows.reduce((s,v)=>s?(s.endsWith('-')?s+v:s+' '+v):v,'').trim();
    value=value.replace(/\s*\(CAT\s*/gi,' (CAT ').replace(/\s+\)/g,')')
      .replace(/(\bw\/Au)\s+(?:A\s*[iIl1]|[S|_])\s*$/i,'$1')
      .replace(/\s+(?:[|_]+|A\s+[il1])\s*$/i,'').trim();
    // A stray trailing glyph often accompanies the final slash-form metal name.
    value=value.replace(/(\bw\/Au)\s+(?:A\s*[iIl1]|[|_]+)$/i,'$1');
    if(kind==='spec'&&/\bPart\s*(?:No\.)?\s*\d{7,}/i.test(value))return '';
    if(/\b(?:Part\s*No|Gross|Container|NET\s*Weight)\b/i.test(value))return '';
    if(value.length<3||/^(?:Mixed\W*)?\d{8,}$/.test(value))return '';
    return value;
  }
  // V2.0 OCR: first detect the physical underline rules of printed TMC labels.
  // Each text row is cropped *between* lines, not by a fixed page percentage.
  // Separating rows before OCR prevents Spec from spilling into Description.
  function findRuledLines(image){
    const w=image.width,h=image.height;
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,w,h);
    const x0=Math.round(w*.42),x1=Math.round(w*.70),y0=Math.round(h*.19),y1=Math.round(h*.55);
    const {data}=ctx.getImageData(x0,y0,x1-x0,y1-y0);
    const rw=x1-x0, rows=[];
    for(let yy=0;yy<y1-y0;yy++){
      let dark=0,run=0,longest=0;
      for(let xx=0;xx<rw;xx++){
        const i=(yy*rw+xx)*4;
        const lum=.299*data[i]+.587*data[i+1]+.114*data[i+2];
        if(lum<165){dark++;run++;longest=Math.max(longest,run);}
        else run=0;
      }
      const fraction=dark/rw;
      // Long continuous dark run distinguishes a printed rule from bold words.
      if(fraction>.59&&longest>rw*.46)rows.push({y:yy+y0,fraction});
    }
    const clusters=[];
    for(const row of rows){
      let c=clusters[clusters.length-1];
      if(!c||row.y-c.end>4){c={start:row.y,end:row.y,peak:row};clusters.push(c);}
      else{c.end=row.y;if(row.fraction>c.peak.fraction)c.peak=row;}
    }
    const lines=clusters.map(c=>c.peak.y);
    // A rotated/occluded label may not have detectable straight rules.
    // In that case use the older geometry-based OCR rather than guessing bands.
    return lines.length>=5?{lines,ctx}:null;
  }
  function rowInkFraction(ctx,x0,x1,y0,y1){
    const sx=Math.max(0,Math.round(x0)),sy=Math.max(0,Math.round(y0));
    const sw=Math.max(4,Math.min(ctx.canvas.width-sx,Math.round(x1-x0)));
    const sh=Math.max(4,Math.min(ctx.canvas.height-sy,Math.round(y1-y0)));
    if(sw<=0||sh<=0)return 0;
    const {data}=ctx.getImageData(sx,sy,sw,sh);
    let dark=0, sampled=0;
    for(let yy=0;yy<sh;yy+=3)for(let xx=0;xx<sw;xx+=3){
      const i=(yy*sw+xx)*4;
      if(.299*data[i]+.587*data[i+1]+.114*data[i+2]<145)dark++;
      sampled++;
    }
    return dark/Math.max(1,sampled);
  }
  function findTextBands(image,g){
    const rules=findRuledLines(image);
    if(!rules)return null;
    const {lines,ctx}=rules,w=image.width,h=image.height;
    const spacing=lines.slice(1).map((v,i)=>v-lines[i]).filter(v=>v>h*.018&&v<h*.085).sort((a,b)=>a-b);
    const step=spacing[Math.floor(spacing.length/2)]||h*.032;
    if(step<24||step>h*.09)return null;
    const x0=Math.max(Math.round(w*.24),Math.round(g.x0));
    const x1=Math.min(Math.round(w*.80),Math.round(g.x1+20));
    const bands=[];
    for(let i=0;i<lines.length-1;i++){
      const start=lines[i],end=lines[i+1],dh=end-start;
      if(dh<step*.65||dh>step*1.75)continue;
      const center=(start+end)/2;
      const ink=rowInkFraction(ctx,x0,x1,start+Math.min(12,dh*.25),end-Math.min(10,dh*.23));
      bands.push({start,end,center,ink,nonempty:ink>.032});
    }
    const texts=bands.filter(b=>b.nonempty&&b.center>=g.descY-step*.35&&b.center<g.partY-step*.22);
    if(texts.length<2)return null;
    const descStart=texts.reduce((best,cur)=>Math.abs(cur.center-g.descY)<Math.abs(best.center-g.descY)?cur:best);
    const specTarget=g.specY-step*.78;
    // Spec's caption is frequently printed one row BELOW the first Spec value.
    const possible=texts.filter(b=>b.center>=descStart.center+step*.72&&b.center<g.partY-step*.28);
    if(!possible.length)return null;
    const specStart=possible.reduce((best,cur)=>Math.abs(cur.center-specTarget)<Math.abs(best.center-specTarget)?cur:best);
    if(specStart.center<=descStart.center)return null;
    const description=texts.filter(b=>b.center>=descStart.center-step*.12&&b.center<specStart.center-step*.40).slice(0,3);
    const specification=texts.filter(b=>b.center>=specStart.center-step*.12&&b.center<=g.specY+step*.84).slice(0,3);
    if(!description.length||!specification.length)return null;
    return {description,specification,spacing:step,x0,x1,lines};
  }
  // Adaptive local black/white preprocessing retains faded text (e.g. "Therm",
  // "without PM") despite uneven illumination; global contrast clips these glyphs.
  function makeTextStrip(image,box,mode='adaptive'){
    const [xx0,yy0,xx1,yy1]=box;
    const sx=Math.max(0,Math.floor(xx0)),sy=Math.max(0,Math.floor(yy0));
    const sw=Math.max(2,Math.min(image.width-sx,Math.ceil(xx1-xx0)));
    const sh=Math.max(2,Math.min(image.height-sy,Math.ceil(yy1-yy0)));
    const scale=Math.max(2.2,Math.min(3.4,1800/sw));
    const pad=20;
    const width=Math.round(sw*scale)+pad*2,height=Math.round(sh*scale)+pad*2;
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);
    ctx.drawImage(image,sx,sy,sw,sh,pad,pad,width-2*pad,height-2*pad);
    const pix=ctx.getImageData(0,0,width,height),bytes=pix.data, gray=new Uint8Array(width*height);
    for(let i=0;i<gray.length;i++){
      const z=i*4;gray[i]=.299*bytes[z]+.587*bytes[z+1]+.114*bytes[z+2];
    }
    // Integral image: constant-time neighborhood average per output pixel.
    const stride=width+1,integral=new Float64Array(stride*(height+1));
    for(let y=0;y<height;y++){
      let rowSum=0;
      for(let x=0;x<width;x++){
        rowSum+=gray[y*width+x];
        integral[(y+1)*stride+x+1]=integral[y*stride+x+1]+rowSum;
      }
    }
    const radius=mode==='adaptive'?41:27, offset=mode==='adaptive'?10:6;
    for(let y=0;y<height;y++){
      const ya=Math.max(0,y-radius),yb=Math.min(height,y+radius+1);
      for(let x=0;x<width;x++){
        const xa=Math.max(0,x-radius),xb=Math.min(width,x+radius+1);
        const sum=integral[yb*stride+xb]-integral[ya*stride+xb]-integral[yb*stride+xa]+integral[ya*stride+xa];
        const mean=sum/((xb-xa)*(yb-ya));
        const v=gray[y*width+x]<mean-offset?0:255;
        const z=(y*width+x)*4;bytes[z]=bytes[z+1]=bytes[z+2]=v;
      }
    }
    ctx.putImageData(pix,0,0);return canvas;
  }
  function detailQuality(text,confidence){
    const s=cleanDetail(text,'spec');
    if(!s)return -1e3;
    let score=Number.isFinite(confidence)?confidence:45;
    if(/[a-z]{3}/i.test(s))score+=9;
    if(/[®©¤�]/.test(s))score-=25;
    if(/\b(?:Description|Spec|Part\s*No|Gross|Container|Weigher|Check)\b/i.test(s))score-=40;
    if(/[|]{2,}|[_]{2,}/.test(s))score-=20;
    if(s.length<3)score-=20;
    return score;
  }
  async function readDetailStrip(worker,image,box,kind){
    await worker.setParameters({tessedit_pageseg_mode:'7'});
    const first=await worker.recognize(makeTextStrip(image,box,'adaptive'));
    let best={text:cleanDetail(first?.data?.text||'',kind),confidence:first?.data?.confidence??0};
    let score=detailQuality(best.text,best.confidence);
    if(score<78){
      const next=await worker.recognize(makeTextStrip(image,box,'soft'));
      const candidate={text:cleanDetail(next?.data?.text||'',kind),confidence:next?.data?.confidence??0};
      const nextScore=detailQuality(candidate.text,candidate.confidence);
      if(nextScore>score){best=candidate;score=nextScore;}
    }
    return {...best,score};
  }
  async function scanTextStrip(worker,image,box,{psm='7'}={}){
    await worker.setParameters({tessedit_pageseg_mode:psm});
    const r=await worker.recognize(makeTextStrip(image,box));
    return {text:r?.data?.text||'',confidence:r?.data?.confidence??0};
  }
  function mergeRecognizedLines(rows){
    return rows.filter(Boolean).reduce((out,s)=>out?(out.endsWith('-')?out+s:out+' '+s):s,'').trim();
  }
  async function scanDetailRegion(worker,photoBlob,tsv){
    const image=await imageToBitmap(photoBlob);
    try{
      const g=labelGeometry(tsv,image.width,image.height);
      const bands=findTextBands(image,g);
      if(bands){
        const results={description:[],spec:[]},failures={description:0,spec:0},raw=[];
        for(const [field,selection] of [['description',bands.description],['spec',bands.specification]]){
          for(let i=0;i<selection.length;i++){
            const row=selection[i];
            const box=[bands.x0,row.start+5,bands.x1,row.end-5];
            const candidate=await readDetailStrip(worker,image,box,field);
            raw.push(`[${field} row ${i+1}, y=${row.start}-${row.end}, confidence=${Math.round(candidate.confidence)}] ${candidate.text}`);
            // Low-confidence or polluted OCR must NOT silently become company data.
            if(candidate.score>=70&&candidate.text.length>=3)results[field].push(candidate.text);
            else failures[field]++;
          }
        }
        const description=failures.description?'':mergeRecognizedLines(results.description);
        const spec=failures.spec?'':mergeRecognizedLines(results.spec);
        return {parsed:{description,spec},raw:`[Ruled-line OCR] ${JSON.stringify({desc:g.descY,spec:g.specY,part:g.partY,spacing:bands.spacing})}\n${raw.join('\n')}`,geometry:g};
      }
      // Fallback for oblique, strongly skewed or non-ruled labels.
      const gap=g.gap,x0=g.x0,x1=g.x1;
      const desc=await scanTextStrip(worker,image,[x0,g.descY-gap*.18,x1,g.specY-gap*.18],{psm:'6'});
      const spec1=await scanTextStrip(worker,image,[x0,g.specY-gap*.21,x1,g.specY+gap*.015]);
      const spec2=await scanTextStrip(worker,image,[x0,g.specY-gap*.015,x1,g.specY+gap*.25]);
      let description=cleanDetail(desc.text,'description');
      let s1=cleanDetail(spec1.text,'spec'),s2=cleanDetail(spec2.text,'spec');
      if(s1&&s2&&(s1===s2||s1.includes(s2)))s2='';
      if(s1&&s2&&s2.includes(s1))s1='';
      const spec=mergeRecognizedLines([s1,s2]);
      if(detailQuality(description,desc.confidence)<65)description='';
      if(detailQuality(spec,Math.min(spec1.confidence,spec2.confidence))<65)return {parsed:{description,spec:''},raw:`[Fallback OCR]\n${desc.text}\n${spec1.text}\n${spec2.text}`,geometry:g};
      return {parsed:{description,spec},raw:`[Fallback OCR]\n${desc.text}\n${spec1.text}\n${spec2.text}`,geometry:g};
    }finally{
      await worker.setParameters({tessedit_pageseg_mode:'3'}).catch(()=>{});
      if(image.close)image.close();
    }
  }
  // V2.0: Read each field in its own neighborhood. On dusty labels the printed
  // horizontal rules may be nearly invisible, so relying only on rule detection
  // can drop the entire Description / Spec / Net region.
  function nearbyAnchor(tsv,image){
    const words=wordsFromTSV(tsv),h=image.height,w=image.width;
    const part=words.find(v=>v.x>.22*w&&v.x<.50*w&&v.y>.37*h&&v.y<.65*h&&/^part(?:no)?\.?$/i.test(v.text.replace(/[^A-Za-z]/g,'')));
    if(part)return part.y;
    const net=words.find(v=>v.x>.23*w&&v.x<.5*w&&v.y>.48*h&&v.y<.74*h&&/^net$/i.test(v.text.replace(/[^A-Za-z]/g,'')));
    if(net)return net.y-h*.093;
    const gross=words.find(v=>v.x>.23*w&&v.x<.5*w&&v.y>.45*h&&v.y<.7*h&&/^gross$/i.test(v.text.replace(/[^A-Za-z]/g,'')));
    if(gross)return gross.y-h*.035;
    return h*.470; // Fallback only for visibly similar printed label layouts.
  }
  function contrastCrop(image,rect){
    const [x0,y0,x1,y1]=rect,w=image.width,h=image.height;
    const sx=Math.max(0,Math.round(x0)),sy=Math.max(0,Math.round(y0));
    const sw=Math.max(8,Math.min(w-sx,Math.round(x1-x0))),sh=Math.max(8,Math.min(h-sy,Math.round(y1-y0)));
    const scale=Math.min(3,Math.max(2,1800/sw)),pad=16;
    const canvas=document.createElement('canvas');canvas.width=Math.round(sw*scale)+pad*2;canvas.height=Math.round(sh*scale)+pad*2;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    ctx.drawImage(image,sx,sy,sw,sh,pad,pad,Math.round(sw*scale),Math.round(sh*scale));
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),d=pixels.data,hist=new Uint32Array(256);
    const gray=new Uint8Array(d.length/4);
    for(let i=0;i<gray.length;i++){
      const k=i*4,g=Math.round(.299*d[k]+.587*d[k+1]+.114*d[k+2]);gray[i]=g;hist[g]++;
    }
    let sum=0,lo=0,hi=255;const total=gray.length;
    for(let i=0;i<256;i++){sum+=hist[i];if(sum>=total*.012){lo=i;break;}}
    sum=0;for(let i=255;i>=0;i--){sum+=hist[i];if(sum>=total*.012){hi=i;break;}}
    const range=Math.max(55,hi-lo);
    for(let i=0;i<gray.length;i++){
      const v=Math.max(0,Math.min(255,Math.round((gray[i]-lo)*255/range)));
      const k=i*4;d[k]=d[k+1]=d[k+2]=v;
    }
    ctx.putImageData(pixels,0,0);
    return {canvas,sx,sy,scale,pad};
  }
  function tsvTextRows(tsv,crop){
    const groups=new Map();
    const lines=safeString(tsv).split(/\r?\n/).slice(1);
    for(const line of lines){
      const v=line.split('\t');if(v.length<12||v[0]!=='5')continue;
      const word=v.slice(11).join('\t').trim();if(!word)continue;
      const x=Number(v[6]),y=Number(v[7]),hh=Number(v[9]),cf=Number(v[10]);
      if(![x,y,hh,cf].every(Number.isFinite))continue;
      const key=v[2]+'-'+v[3]+'-'+v[4];
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push({word,x,y,hh,cf});
    }
    return [...groups.values()].map(words=>{
      words.sort((a,b)=>a.x-b.x);
      const top=Math.min(...words.map(v=>v.y)),bot=Math.max(...words.map(v=>v.y+v.hh));
      const confidence=words.reduce((z,v)=>z+v.cf,0)/words.length;
      return {text:words.map(v=>v.word).join(' '),cy:crop.sy+((top+bot)/2-crop.pad)/crop.scale,confidence};
    }).sort((a,b)=>a.cy-b.cy);
  }
  function cleanFocusedText(text){
    let result=safeString(text).replace(/[“”‘’]/g,"'").replace(/\s+/g,' ').trim();
    // The tail of a wrapped chemical formula sometimes picks up underline noise.
    if(/^[a-z]\d[^ ]*\)/i.test(result))result=result.replace(/^(\S*\)).*$/,'$1');
    if(/^.{0,4}S-[A-Za-z]{2}/.test(result))result=result.slice(result.search(/S-[A-Za-z]{2}/));
    return result
      .replace(/^(?:Description|Depiction|Spec)\s*[:;.]?\s*/i,'')
      .replace(/^[^A-Za-z0-9$]+|[|_"'\s]+$/g,'').trim();
  }
  function acceptedFocusRow(row){
    const s=cleanFocusedText(row.text);
    if(s.length<3||row.confidence<27)return false;
    if(/(?:part\s*no|gross|container|weigher|check|source|lot\s*no|label)/i.test(s))return false;
    if(/^\d{7,}$/.test(s))return false;
    if(!/[A-Za-z]{2}/.test(s))return false;
    return true;
  }
  async function focusOCR(worker,image,rect,psm='6'){
    const crop=contrastCrop(image,rect);
    await worker.setParameters({tessedit_pageseg_mode:psm});
    const r=await worker.recognize(crop.canvas,{}, {text:true,tsv:true});
    return {text:safeString(r?.data?.text),confidence:r?.data?.confidence??0,rows:tsvTextRows(r?.data?.tsv||'',crop)};
  }
  function focusLot(text){
    const tokens=safeString(text).toUpperCase().replace(/[‐‑–—]/g,'-')
      .match(/(?:[A-Z]{1,7}\d{3,}|\d{4,})(?:\s*-\s*[A-Z0-9]{1,10}){0,3}/g)||[];
    return cleanLot(tokens.find(validLot)||'');
  }
  function focusedWeight(raw){
    const m=safeString(raw).replace(/,/g,'.').match(/\b(\d{1,7}[.]\d{2,3})\b/);
    if(!m)return '';
    const n=Number(m[1]);return Number.isFinite(n)&&n>=0&&n<1e7?n.toFixed(3):'';
  }
  async function recognizePriorityFields(worker,photoBlob,tsv,main){
    const image=await imageToBitmap(photoBlob),h=image.height,w=image.width;
    try{
      const partY=nearbyAnchor(tsv,image),splitY=partY-h*.121;
      // The printed content between 0.19h and 0.06h ABOVE Part No. is the
      // complete description followed by the specification, including wrapped lines.
      const roi=await focusOCR(worker,image,[w*.265,partY-h*.183,w*.788,partY-h*.057],'6');
      let rows=roi.rows.filter(acceptedFocusRow);
      // Some engines omit TSV when all text is very faint; retain text fallback.
      if(!rows.length&&roi.text.trim()){
        const lines=roi.text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
        rows=lines.map((text,i)=>({text,cy:partY-h*.17+i*h*.034,confidence:Math.max(30,roi.confidence)})).filter(acceptedFocusRow);
      }
      const descRows=rows.filter(r=>r.cy<splitY),specRows=rows.filter(r=>r.cy>=splitY);
      const cleaned=arr=>arr.map(r=>cleanFocusedText(r.text)).filter(Boolean);
      const descPieces=cleaned(descRows);
      let description='';
      for(const piece of descPieces){
        const continuous=description && (description.endsWith('-') || (/[0-9][A-Za-z]$/.test(description)&&/^[a-z]\d/i.test(piece)));
        description+=description?(continuous?'':' ')+piece:piece;
      }
      description=description.replace(/\s+([),])/g,'$1').replace(/([-/])\s+([A-Za-z0-9])/g,'$1$2');
      const spec=cleaned(specRows).join(' ').replace(/\s+([),])/g,'$1');
      // Read the actual LOT value independently; Source must never be joined to it.
      const lotScan=await focusOCR(worker,image,[w*.395,partY-h*.244,w*.79,partY-h*.213],'7');
      const focusedLot=focusLot(lotScan.text);
      const existingLot=main.lotNo||'';
      // Trust a focused alphanumeric lot to rescue a malformed numeric guess,
      // but never downgrade a complete whole-page value to a truncated crop.
      const lot=focusedLot&&(!validLot(existingLot)||(/[A-Z]/.test(focusedLot)&&!/[A-Z]/.test(existingLot))||focusedLot.startsWith(existingLot+'-'))
        ? focusedLot : (existingLot||focusedLot);
      // A low-contrast NET value might be missing from full-page OCR.
      let netKg=main.netKg||'';
      let netText='';
      if(!netKg){
        const weightScan=await focusOCR(worker,image,[w*.49,partY+h*.077,w*.72,partY+h*.11],'7');
        netText=weightScan.text;netKg=focusedWeight(weightScan.text);
      }
      // Never auto-fill an obviously polluted value; allow manual correction.
      const safeDesc=description.length>=4&&description.length<=250&&!/\b(?:LOT|Part No|NET)\b/i.test(description)?description:'';
      const specPolluted=/(?:\d[!|]\s+[a-z]{1,3}\b|[©®]|\bwithou[!'|]\b)/i.test(spec);
      const safeSpec=spec.length>=3&&spec.length<=250&&!specPolluted&&!/\b(?:LOT|Part No|NET)\b/i.test(spec)?spec:'';
      return {parsed:{lotNo:lot||main.lotNo||'',description:safeDesc,spec:safeSpec,netKg},raw:'[Field-specific OCR] '+
        `partY=${Math.round(partY)}, splitY=${Math.round(splitY)}\n`+
        `LOT candidate: ${lotScan.text.trim()}\n`+
        `Description/Spec rows:\n${roi.rows.map(r=>`${Math.round(r.cy)} (${Math.round(r.confidence)}%): ${r.text}`).join('\n')}\n`+
        `Net candidate: ${netText}`,failed:{description:!safeDesc,spec:!safeSpec}};
    }finally{
      await worker.setParameters({tessedit_pageseg_mode:'3'}).catch(()=>{});
      if(image.close)image.close();
    }
  }
  // V2.3: QR payload includes NO.xxxxxx | warehouse | storage | full Lot | Part | Net.
  // Prefer this structured source over OCR. E.g. long lots must never be truncated.
  function qrFields(payload){
    const raw=safeString(payload).trim();
    const pieces=raw.split('|').map(v=>v.trim());
    if(pieces.length<6)return null;
    const first=pieces[0].match(/^NO\.?\s*(\d{4,12})$/i);
    const part=pieces[pieces.length-2],net=pieces[pieces.length-1].replace(',','.');
    const lot=pieces[pieces.length-3];
    if(!first||!validLot(lot)||!/^[0-9]{9,18}$/.test(part)||!/^[0-9]{1,7}(?:\.[0-9]{1,4})?$/.test(net))return null;
    return {labelNo:first[1],lotNo:cleanLot(lot),partNo:part,netKg:Number(net).toFixed(3)};
  }
  function qrImageCanvas(image, maxSide=1650){
    const scale=Math.min(1,maxSide/Math.max(image.width,image.height));
    const c=document.createElement('canvas');c.width=Math.round(image.width*scale);c.height=Math.round(image.height*scale);
    const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(image,0,0,c.width,c.height);return c;
  }
  async function decodeQR(blob){
    const image=await imageToBitmap(blob);
    try{
      // Native BarcodeDetector on Chrome / Android; QR Code may appear twice.
      if('BarcodeDetector' in window){
        try{
          const detector=new BarcodeDetector({formats:['qr_code']});
          const found=await detector.detect(image);
          const strong=found.map(v=>v.rawValue).find(v=>qrFields(v));
          if(strong)return strong;
          if(found.length)return found[0].rawValue||'';
        }catch(e){console.warn('Native QR scan:',e);}
      }
      // JavaScript decoder fallback for browsers without BarcodeDetector.
      if(typeof window.jsQR==='function'){
        const c=qrImageCanvas(image),ctx=c.getContext('2d',{willReadFrequently:true});
        const d=ctx.getImageData(0,0,c.width,c.height);
        const result=window.jsQR(d.data,d.width,d.height,{inversionAttempts:'attemptBoth'});
        if(result?.data)return result.data;
        // Labels have a QR in the upper-right corner. A separate crop can
        // recover code detail when scaling the entire photo loses pixels.
        const x0=Math.round(image.width*.42), y0=0, sw=image.width-x0, sh=Math.round(image.height*.34);
        if(sw>60&&sh>60){
          const q=document.createElement('canvas');q.width=sw;q.height=sh;
          const cx=q.getContext('2d',{willReadFrequently:true});cx.drawImage(image,x0,y0,sw,sh,0,0,sw,sh);
          const pixels=cx.getImageData(0,0,sw,sh);
          return window.jsQR(pixels.data,sw,sh,{inversionAttempts:'attemptBoth'})?.data||'';
        }
      }
    }catch(err){console.warn('QR scan:',err);}
    finally{if(image.close)image.close();}
    return '';
  }
  function detailsFromTSV(tsv,image){
    const words=wordsFromTSV(tsv),w=image.width,h=image.height;
    const part=words.find(v=>v.x>.17*w&&v.x<.53*w&&v.y>.37*h&&v.y<.67*h&&/^part(?:no)?$/i.test(v.text.replace(/[^a-z]/gi,'')));
    const partY=part?.y??nearbyAnchor(tsv,image);
    const desc=words.find(v=>v.y>partY-h*.29&&v.y<partY-h*.105&&/^(?:description|depiction)/i.test(v.text));
    const spec=words.find(v=>v.x<.31*w&&v.y>partY-h*.17&&v.y<partY-h*.025&&/^spec\W*$/i.test(v.text));
    let valueX=part?part.x-w*.006:w*.267;
    if(desc){
      const prefix=/^description/i.test(desc.text)?'Description':'Depiction';
      const joined=desc.text.length>prefix.length+1;
      const guessed=desc.x+(joined?desc.w*(prefix.length/desc.text.length)-w*.022:desc.w-w*.003);
      valueX=Math.min(valueX,guessed);
    }
    valueX=Math.max(w*.17,Math.min(w*.37,valueX));
    const descStart=desc?desc.y-h*.022:partY-h*.21;
    const descEnd=spec?spec.y-h*.028:partY-h*.115;
    const specStart=spec?spec.y-h*.039:partY-h*.119;
    const specEnd=partY-h*.028;
    const group=(y0,y1,field)=>{
      const picked=words.filter(v=>v.y>=y0&&v.y<y1&&v.x<.85*w
        &&(v.x>=valueX-8||(field==='description'&&v===desc))
        &&v.text.length>=2&&(v.conf>=40||(field==='description'&&v===desc)||(/^(?:SW|S\W)\d{2,}/i.test(v.text)))
        &&!/^(?:description|depiction|spec|part|no|source|lot|gross|container|net)$/i.test(v.text));
      picked.sort((a,b)=>a.y-b.y||a.x-b.x);
      const groups=[];
      for(const v of picked){
        let g=groups.find(g=>Math.abs(g.y-v.y)<h*.018);
        if(!g){g={y:v.y,maxY:v.y+v.h,words:[]};groups.push(g);}
        g.y=Math.min(g.y,v.y);g.maxY=Math.max(g.maxY,v.y+v.h);g.words.push(v);
      }
      // One row can include multiple words; reject noise-only rows.
      return groups.filter(g=>g.words.some(v=>/[A-Za-z]{2}/.test(v.text)||/^(\d{1,3}[A-Za-z]{2,})/.test(v.text)))
        .slice(0,field==='description'?3:2)
        .map(g=>{
          const top=Math.max(0,g.y-4),bottom=Math.min(image.height,g.y+Math.min(h*.030,Math.max(h*.023,g.maxY-g.y+4)));
          const validWords=g.words.filter(v=>v.x>=valueX-8&&v.conf>=70).sort((a,b)=>a.x-b.x);
          const hasJoinedCaption=field==='description'&&g.words.some(v=>/^(?:description|depiction).{2,}/i.test(v.text));
          const avgConf=validWords.length&&!hasJoinedCaption?validWords.reduce((z,v)=>z+v.conf,0)/validWords.length:0;
          return {top,bottom,box:[valueX,top,Math.min(w*.86,valueX+w*.64),bottom],guess:g.words.map(v=>v.text).join(' '),tsvValue:validWords.map(v=>v.text).join(' '),tsvConf:avgConf};
        });
    };
    const description=group(descStart,Math.max(descStart+10,descEnd),'description');
    const specification=group(specStart,Math.max(specStart+10,specEnd),'spec');
    if(!description.length&&desc){
      const top=Math.max(0,desc.y-3);description.push({top,bottom:top+h*.030,box:[valueX,top,w*.85,top+h*.030],guess:desc.text});
    }
    // Dirty/faded labels can have a legible specification in the picture while
    // whole-photo OCR omits it from TSV (e.g. "SW104 - Used solder paste").
    // Crop the expected spec row separately instead of silently dropping it.
    if(!specification.length){
      const top=Math.max(0,partY-h*.113),bottom=Math.min(h,partY-h*.071);
      specification.push({top,bottom,box:[valueX,top,Math.min(w*.86,valueX+w*.64),bottom],guess:'[spec area fallback]',tsvValue:'',tsvConf:0});
    }
    return {description,specification,valueX,partY,descY:desc?.y,specY:spec?.y};
  }
  function acceptableFieldText(raw,kind){
    const v=cleanFocusedText(raw).replace(/\s*[-—_]{2,}\s*$/,'').replace(/\s+\|+\s*$/,'').trim();
    if(v.length<3||v.length>180||!/\w{2}/.test(v)||/^\d{7,}$/.test(v))return '';
    if(/\b(?:Description|Depiction|Spec|Part\s*No|Gross|Container|Weigher|Check|Source|Label|Lot)\b/i.test(v))return '';
    if(/[�©®¤]/.test(v)||/\b(?:FIVE we|dmi|ww ww)\b/i.test(v))return '';
    // Do not turn an uncertain OCR row into an apparently authoritative value.
    if(kind==='spec'&&v.startsWith('-----'))return '';
    return v;
  }
  async function recognizeStructuredDetails(worker,photoBlob,tsv){
    const image=await imageToBitmap(photoBlob);
    try{
      const areas=detailsFromTSV(tsv,image),output={description:'',spec:''},log=[];
      for(const [field,rows] of [['description',areas.description],['spec',areas.specification]]){
        const accepted=[];
        for(const row of rows){
          await worker.setParameters({tessedit_pageseg_mode:'7'});
          const softened=contrastCrop(image,row.box);
          const r=await worker.recognize(softened.canvas);
          let value=acceptableFieldText(r?.data?.text||'',field),confidence=r?.data?.confidence??0;
          // Full-photo TSV is often cleaner than a cropped reread of crisp text.
          // Prefer it when the entire row has strong confidence.
          const tsvClean=acceptableFieldText(row.tsvValue||'',field);
          if(tsvClean&&row.tsvConf>=85){value=tsvClean;confidence=row.tsvConf;}
          if((!value||confidence<55)&&typeof makeTextStrip==='function'){
            const b=await worker.recognize(makeTextStrip(image,row.box,'soft'));
            const alt=acceptableFieldText(b?.data?.text||'',field),altConf=b?.data?.confidence??0;
            if(alt&&altConf>confidence){value=alt;confidence=altConf;}
          }
          log.push(`[${field} y=${Math.round(row.top)} confidence=${Math.round(confidence)}] ${value||'(unclear)'} | OCR row: ${row.guess}`);
          if(value&&confidence>=53)accepted.push(value);
        }
        if(accepted.length&&accepted.length===rows.length){
          output[field]=mergeRecognizedLines(accepted).replace(/\s+([),])/g,'$1').replace(/-\s+/g,'-');
        }
      }
      return {parsed:output,raw:`[V2.3 row OCR; x=${Math.round(areas.valueX)}, part=${Math.round(areas.partY)}]\n${log.join('\n')}`};
    }finally{
      await worker.setParameters({tessedit_pageseg_mode:'3'}).catch(()=>{});
      if(image.close)image.close();
    }
  }
  async function recognizeLabel(force){
    if(busy)return;
    if(!draft.photos[0]){toast(t('needLabelPhoto'));return;}
    try{
      setBusy(true);setProgress(t('ocrInitializing'),t('ocrDownload'),5);
      if(!window.Tesseract)throw new Error(t('ocrLibraryMissing'));
      if(!workerPromise){workerPromise=window.Tesseract.createWorker('eng',1,{logger:e=>{
        if(e.status==='recognizing text'&&typeof e.progress==='number')setProgress(t('ocrRecognizing'),t('ocrPercent',{pct:Math.round(e.progress*100)}),15+Math.round(e.progress*62));
      }});}
      const worker=await workerPromise;
      setProgress(t('ocrRecognizing'),t('ocrReadFields'),20);
      const [result,qr]=await Promise.all([worker.recognize(draft.photos[0].blob,{}, {text:true,tsv:true}),decodeQR(draft.photos[0].blob)]);
      const raw=result?.data?.text||'';
      const parsed=ocrParse(raw);
      const qrParsed=qrFields(qr);
      if(qrParsed){Object.assign(parsed,qrParsed);} // Structured QR is authoritative for these four fields.
      else if(qr){const q=ocrParse(qr);Object.keys(q).forEach(k=>{if(!parsed[k])parsed[k]=q[k];});}
      // Independent right-hand region scan is essential for bilingual TMC labels:
      // the main OCR often loses Description and wrapped Spec completely.
      let detailRaw='';
      if(true){ // always inspect individual fields, even if whole-image OCR guessed them
        try{
          setProgress(t('ocrDetailTitle'),t('ocrDetailDesc'),78);
          const tsv=result?.data?.tsv||'';
          // A single OCR pass over an entire multilingual label is unreliable.
          // Crop the actual individual text rows before recognizing Description / Spec.
          const lineScan=await recognizeStructuredDetails(worker,draft.photos[0].blob,tsv);
          detailRaw=lineScan.raw;
          // The old priority scan remains a fallback only for a missing QR / NET.
          let priority=null;
          if(!qrParsed || !parsed.netKg){
            priority=await recognizePriorityFields(worker,draft.photos[0].blob,tsv,parsed);
            detailRaw+='\n'+priority.raw;
          }
          for(const k of ['description','spec']){
            parsed[k]=lineScan.parsed[k]||''; // avoid original polluted whole-page OCR
          }
          if(!qrParsed && priority){
            if(priority.parsed.lotNo)parsed.lotNo=priority.parsed.lotNo;
            if(priority.parsed.netKg)parsed.netKg=priority.parsed.netKg;
          }
          if(qrParsed)Object.assign(parsed,qrParsed);
        }catch(err){console.warn('Optional label-detail OCR:',err);parsed.description='';parsed.spec='';}
      }
      readForm();
      for(const [k,v] of Object.entries(parsed)){
        if(!FIELD_KEYS.includes(k)||!v)continue;
        const old=safeString(draft.fields[k]);
        // Rescue a prior OCR truncation e.g. 50077 -> 50077-2606-02.
        const completesLot=k==='lotNo'&&old&&!old.includes('-')&&v.startsWith(old+'-');
        if(force||!old||completesLot||(qrParsed&&['labelNo','lotNo','partNo','netKg'].includes(k))){draft.fields[k]=v;form.elements.namedItem(k).value=v;}
      }
      draft.ocrRaw=raw+(qr?`\n\n[QR Code ${qrParsed?'VERIFIED':'RAW'}]\n${qr}`:'')+(detailRaw?`\n\n[Description / Spec 区域复核]\n${detailRaw}`:'');
      $('ocr-raw').textContent=draft.ocrRaw||t('ocrNone');
      const picked=Object.entries(parsed).filter(([k,v])=>v&&FIELD_KEYS.includes(k)).length;
      const confidence=result?.data?.confidence;
      const missing=[['lotNo','Lot No.'],['description','Description'],['spec','Spec']].filter(([k])=>!draft.fields[k]).map(([,v])=>v);
      $('ocr-status').textContent=t('ocrStatusDone',{n:picked,confidence:Number.isFinite(confidence)?t('confidence',{pct:Math.round(confidence)}):''})
        +(qrParsed?' · QR: Label/Lot/Part/Net ✓':' · QR: —');
      if(missing.length)notice(t('ocrMissing',{fields:missing.join(', ')})+(!qrParsed?'\n'+t('qrUnavailable'):''));
      else if(picked<4)notice(t('ocrFew'));
      else if(!qrParsed)notice(t('qrUnavailable'));
      else notice('');
      toast(t('ocrFinished',{n:picked}));
    }catch(err){workerPromise=undefined;notice(t('ocrFailure',{error:err.message}));$('ocr-status').textContent=t('ocrFailureStatus');}
    finally{hideProgress();setBusy(false);}
  }

  async function save(){
    if(busy)return;readForm();
    const count=draft.photos.filter(Boolean).length;
    if(!draft.fields.labelNo){toast(t('needLabelNo'));form.elements.namedItem('labelNo').focus();return;}
    if(!draft.photos[0]||!draft.photos[1]||count<2){toast(t('needTwoPhotos'));notice(t('needTwoNotice'));return;}
    const others=records.filter(r=>r.id!==draft.id&&safeString(r.fields.labelNo)===draft.fields.labelNo);
    if(others.length&&!confirm(t('confirmDuplicate',{label:draft.fields.labelNo,n:others.length})))return;
    draft.updatedAt=new Date().toISOString();
    draft.exportedAt=null;draft.exportedVersion=null;draft.pendingExportAt=null;draft.pendingExportVersion=null;
    try{await putRecord(draft);await reload();$('form-state').textContent=t('savedState');$('btn-delete').hidden=false;toast(t('savedToast',{label:draft.fields.labelNo,n:count}));notice('');}
    catch(err){notice(t('saveFail',{error:err.message}));}
  }
  async function deleteCurrent(){
    if(!records.some(r=>r.id===draft.id))return;
    if(!confirm(t('confirmDelete',{label:draft.fields.labelNo})))return;
    await removeRecord(draft.id);newDraft();await reload();toast(t('deletedToast'));
  }
  function excelTheme(cell,isHeader=false){cell.alignment={vertical:'middle',wrapText:true};if(isHeader){cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1D4266'}};cell.font={bold:true,color:{argb:'FFFFFFFF'},size:10};}else{cell.font={color:{argb:'FF1E3651'},size:10};}}
  function numOrEmpty(value){return value!=='' && value!==null && Number.isFinite(Number(value))?Number(value):safeString(value);}
  // One record per row. The first 3 columns are reserved for inline photos;
  // the data fields begin in column D (Label No.).
  // One record per row. Photo placeholders belong to Excel columns A:C,
  // the six requested fields begin at D; legacy fields are not exported.
  function sheetRows(){return records.map(r=>{const f=r.fields;return [
    safeString(f.labelNo),safeString(f.lotNo),safeString(f.description),safeString(f.spec),safeString(f.partNo),numOrEmpty(f.netKg)
  ];});}
  async function imageForExcel(blob){
    // Use moderately compressed, high-enough resolution photos. Their displayed
    // dimensions in Excel are small, but recipients can still enlarge them.
    const image=await imageToBitmap(blob);
    try{
      const maxEdge=1000;
      const factor=Math.min(1,maxEdge/Math.max(image.width,image.height));
      const w=Math.max(1,Math.round(image.width*factor));
      const h=Math.max(1,Math.round(image.height*factor));
      const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
      const ctx=canvas.getContext('2d',{alpha:false});
      ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(image,0,0,w,h);
      return {base64:canvas.toDataURL('image/jpeg',0.80),width:w,height:h};
    }finally{if(image.close)image.close();}
  }
  function download(blob,fileName){const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=fileName;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),20000);}
  const timestamp=()=>new Date().toISOString().slice(0,10);

  async function exportExcel(mode='xlsx'){
    const share = mode==='share';
    if(busy)return;
    if(!records.length){toast(t('noExcelRecords'));return;}
    if(!window.ExcelJS){notice(t('excelMissing'));return;}
    if(share&&!window.JSZip){notice(t('zipMissing'));return;}
    const exportSnapshot=records.map(r=>({id:r.id,updatedAt:r.updatedAt}));
    let downloadStarted=false;
    try{
      setBusy(true);setProgress(t('excelTitle'),t('excelBuilding'),3);
      const wb=new window.ExcelJS.Workbook();
      wb.creator='Label Photo Register';wb.created=new Date();
      // Intentionally ONE worksheet: all photos and information stay in the same row.
      const sheet=wb.addWorksheet('Label Records',{views:[{state:'frozen',ySplit:3}]});
      const headers=[
        'Photo 1','Photo 2','Photo 3',
        'Label No.','Lot No.','Description','Spec','Part No.','Net (KG)'
      ];
      // Excel column widths 15 ≈ 110px; the image remains within a 1.03-inch square.
      const widths=[15,15,15,16,19,44,39,23,16];
      sheet.columns=headers.map((_,i)=>({key:`c${i}`,width:widths[i]}));
      sheet.mergeCells(1,1,1,headers.length);
      const title=sheet.getCell('A1');title.value='LABEL PHOTO REGISTER  |  PHOTOS + DETAILS';
      title.font={bold:true,color:{argb:'FFFFFFFF'},size:17};
      title.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF142D49'}};
      title.alignment={vertical:'middle',horizontal:'left',indent:1};
      sheet.getRow(1).height=37;
      sheet.mergeCells(2,1,2,headers.length);
      const subtitle=sheet.getCell('A2');
      subtitle.value=`Total Labels: ${records.length}   •   Photos 1–3 appear before Label No.   •   Exported: ${new Date().toLocaleString('en-MY')}`;
      subtitle.font={size:10,color:{argb:'FF58718B'}};subtitle.alignment={vertical:'middle',indent:1};
      sheet.getRow(2).height=23;
      const head=sheet.getRow(3);head.values=[,...headers];head.height=31;
      head.eachCell(c=>excelTheme(c,true));
      sheet.getRow(3).alignment={vertical:'middle',horizontal:'center',wrapText:true};
      const rows=sheetRows();
      rows.forEach((data,i)=>{
        const rowIndex=i+4;
        const wsRow=sheet.getRow(rowIndex);
        // Three blank photo cells (A:C), then Label No. begins at D.
        wsRow.values=[,'','','',...data];
        wsRow.height=74.16; // Excel points: 1.03 inch = 74.16 pt ≈ 99px
        wsRow.eachCell({includeEmpty:true},(c,col)=>{
          excelTheme(c);
          c.alignment={vertical:'middle',wrapText:true,horizontal:col<=3?'center':'left'};
          if(i%2===1)c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF3F7FB'}};
          if(col<=3)c.border={top:{style:'hair',color:{argb:'FFD6E3F0'}},bottom:{style:'hair',color:{argb:'FFD6E3F0'}},left:{style:'hair',color:{argb:'FFD6E3F0'}},right:{style:'hair',color:{argb:'FFD6E3F0'}}};
          if([4,5,8].includes(col))c.numFmt='@'; // keep leading-zero IDs as text
          if(col===9&&typeof c.value==='number')c.numFmt='0.000';
        });
        const label=wsRow.getCell(4);
        label.font={bold:true,color:{argb:'FF135FAD'},size:11};
        if(!records[i].photos[2]){
          wsRow.getCell(3).value='—';
          wsRow.getCell(3).font={size:10,color:{argb:'FF9AAABC'}};
        }
      });
      sheet.autoFilter={from:{row:3,column:1},to:{row:3,column:headers.length}};
      sheet.pageSetup={orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0};
      // Embed photos directly INTO A, B, C of the same row as each Label No.
      // Excel images are anchored to cells and preserve their aspect ratio.
      const colWidthPx=110; // Approximate rendered width of photo columns, each width 15.
      const rowHeightPx=74.16*4/3; // 1.03 inches at 96 pixels/inch.
      const maxPhotoW=98,maxPhotoH=98; // 1.03-inch square bounding box; preserve image aspect ratio.
      for(let i=0;i<records.length;i++){
        const r=records[i],rowIndex=i+4;
        setProgress(t('excelPhotoTitle'),t('excelPhotoDetail',{label:safeString(r.fields.labelNo),i:i+1,total:records.length}),10+Math.round(78*i/records.length));
        for(let j=0;j<3;j++){
          const p=r.photos[j];if(!p||!p.blob)continue;
          const img=await imageForExcel(p.blob);
          const fit=Math.min(maxPhotoW/img.width,maxPhotoH/img.height);
          const width=Math.max(1,Math.round(img.width*fit));
          const height=Math.max(1,Math.round(img.height*fit));
          const x=(colWidthPx-width)/2/colWidthPx;
          const y=(rowHeightPx-height)/2/rowHeightPx;
          const imageId=wb.addImage({base64:img.base64,extension:'jpeg'});
          // tl uses zero-based columns and rows; ext is a pixel-based thumbnail.
          sheet.addImage(imageId,{
            tl:{col:j+x,row:rowIndex-1+y},
            ext:{width,height},
            editAs:'oneCell'
          });
        }
      }
      setProgress(t('excelWrapping'),t('excelWrappingDesc'),92);
      const buffer=await wb.xlsx.writeBuffer();
      if(!share){
        download(new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`Label_Photos_Inline_${timestamp()}.xlsx`);
        downloadStarted=true;toast(t('excelDone',{n:records.length}));
      }else{
        setProgress(t('excelSharePackaging'),t('excelSharePackageDetail'),94);
        const files=['Create_Shareable_Excel.vbs','LabelPhotoZoom.bas','README_Shareable_Excel.txt'];
        const zip=new window.JSZip();
        zip.file('Label_Photos_Data.xlsx',buffer);
        for(const fileName of files){
          const res=await fetch('./'+fileName,{cache:'no-store'});
          if(!res.ok)throw new Error(t('excelShareMissing')+' '+fileName);
          zip.file(fileName,await res.arrayBuffer());
        }
        const zipBlob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:5}});
        download(zipBlob,`Label_Photos_Share_Package_${timestamp()}.zip`);
        downloadStarted=true;toast(t('excelShareDone'));
      }
    }catch(e){notice(t('excelFail',{error:e.message}));}
    finally{hideProgress();setBusy(false);}
    if(downloadStarted){try{await registerPendingExport(exportSnapshot);}catch(e){notice(t('errCleanup',{error:e.message}));}}
  }

  function fileSegment(str){return safeString(str).replace(/[^\w\-]/g,'_').slice(0,40)||'unknown';}
  function escCsv(v){const s=safeString(v);return /[",\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;}
  async function exportZip(){
    if(busy)return;if(!records.length){toast(t('noBackupRecords'));return;}
    if(!window.JSZip){notice(t('zipMissing'));return;}
    try{
      setBusy(true);setProgress(t('zipTitle'),t('zipDescription'),5);
      const zip=new window.JSZip();const manifest={app:'TMC Label Photo Register',version:'1.0',exportedAt:new Date().toISOString(),records:[]};
      for(let i=0;i<records.length;i++){
        const rec=records[i],clone={id:rec.id,fields:rec.fields,createdAt:rec.createdAt,updatedAt:rec.updatedAt,ocrRaw:rec.ocrRaw||'',exportedAt:rec.exportedAt||null,exportedVersion:rec.exportedVersion||null,pendingExportAt:rec.pendingExportAt||null,pendingExportVersion:rec.pendingExportVersion||null,photos:[null,null,null]};
        for(let j=0;j<3;j++){
          const p=rec.photos[j];if(!p)continue;
          const path=`photos/${String(i+1).padStart(4,'0')}_${fileSegment(rec.fields.labelNo)}/photo_${j+1}.jpg`;
          zip.file(path,p.blob);clone.photos[j]={path,name:p.name,takenAt:p.takenAt||''};
        }
        manifest.records.push(clone);
        setProgress(t('zipTitle'),t('zipProgress',{label:rec.fields.labelNo,i:i+1,total:records.length}),8+Math.round(35*(i+1)/records.length));
      }
      zip.file('records.json',JSON.stringify(manifest,null,2));
      // CSV can't contain inline photos; use relative filenames that match the ZIP photos.
      const csvHeaders=['Photo 1','Photo 2','Photo 3','Label No.','Lot No.','Description','Spec','Part No.','Net (KG)'];
      const csvRows=records.map((rec,i)=>[
        ...[0,1,2].map(j=>rec.photos[j]?`photos/${String(i+1).padStart(4,'0')}_${fileSegment(rec.fields.labelNo)}/photo_${j+1}.jpg`:''),
        ...sheetRows()[i]
      ]);
      zip.file('label_records.csv','\uFEFF'+[csvHeaders.map(escCsv).join(','),...csvRows.map(r=>r.map(escCsv).join(','))].join('\r\n'));
      const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:4}},meta=>setProgress(t('zipCompress'),t('zipPercent',{pct:Math.round(meta.percent)}),43+Math.round(meta.percent*.55)));
      download(blob,`TMC_Label_Backup_${timestamp()}.zip`);toast(t('zipDone'));
    }catch(e){notice(t('zipFail',{error:e.message}));}
    finally{hideProgress();setBusy(false);}
  }
  async function importZip(file){
    if(!file||busy)return;
    if(!window.JSZip){notice(t('zipMissing'));return;}
    try{
      setBusy(true);setProgress(t('importTitle'),t('importChecking'),5);
      const zip=await window.JSZip.loadAsync(file);const meta=zip.file('records.json');if(!meta)throw new Error(t('errNoManifest'));
      const manifest=JSON.parse(await meta.async('string'));
      if(manifest.app!=='TMC Label Photo Register'||!Array.isArray(manifest.records))throw new Error(t('errBadBackup'));
      if(!confirm(t('importConfirm',{n:manifest.records.length})))return;
      for(let i=0;i<manifest.records.length;i++){
        const m=manifest.records[i];const r={id:m.id||freshRecord().id,fields:{...freshRecord().fields,...m.fields},photos:[null,null,null],createdAt:m.createdAt||new Date().toISOString(),updatedAt:m.updatedAt||new Date().toISOString(),ocrRaw:m.ocrRaw||'',exportedAt:m.exportedAt||null,exportedVersion:m.exportedVersion||null,pendingExportAt:m.pendingExportAt||null,pendingExportVersion:m.pendingExportVersion||null};
        for(let j=0;j<3;j++){
          const p=m.photos&&m.photos[j];if(!p)continue;
          if(!p.path||p.path.includes('..')||p.path.startsWith('/'))throw new Error(t('errInvalidPhotoPath'));
          const f=zip.file(p.path);if(!f)throw new Error(t('errMissingPhoto',{path:p.path}));
          const blob=await f.async('blob');r.photos[j]={blob:new Blob([blob],{type:'image/jpeg'}),name:p.name||`photo_${j+1}.jpg`,takenAt:p.takenAt||''};
        }
        await putRecord(r);setProgress(t('importRestoring'),`${i+1} / ${manifest.records.length}`,10+Math.round(88*(i+1)/manifest.records.length));
      }
      await reload();newDraft();toast(t('importDone',{n:manifest.records.length}));notice('');
    }catch(err){notice(t('importFail',{error:err.message}));}
    finally{hideProgress();setBusy(false);$('zip-import-input').value='';}
  }
  function addDeleteButton(){const b=document.createElement('button');b.type='button';b.id='btn-delete';b.className='button button-outline';b.textContent=t('deleteButton');b.dataset.i18n='deleteButton';b.hidden=true;b.style.color='#aa4343';$('btn-clear').before(b);b.addEventListener('click',()=>deleteCurrent().catch(e=>notice(e.message)));}
  async function start(){
    addDeleteButton();applyLanguage();loadToForm();
    $('language-select').addEventListener('change', e => setLanguage(e.target.value));
    document.querySelectorAll('[data-photo-action]').forEach(b=>b.addEventListener('click',()=>{
      const slot=Number(b.dataset.slot),action=b.dataset.photoAction;
      if(action==='remove'){if(busy)return;draft.photos[slot]=null; if(slot===0){draft.ocrRaw='';$('ocr-raw').textContent=t('ocrNoText');$('ocr-status').textContent=t('ocrAfterRemove');}renderPhotos();return;}
      chosenSlot=slot;const input=action==='camera'?$('camera-input'):$('picker-input');input.value='';input.click();
    }));
    for(const input of [$('camera-input'),$('picker-input')])input.addEventListener('change',e=>{if(e.target.files&&e.target.files[0])setPhoto(chosenSlot,e.target.files[0]);});
    form.addEventListener('submit',event=>{event.preventDefault();save();});
    $('btn-new').addEventListener('click',newDraft);$('btn-side-new').addEventListener('click',newDraft);$('btn-clear').addEventListener('click',newDraft);
    $('btn-ocr').addEventListener('click',()=>recognizeLabel(true));
    $('btn-excel-share').addEventListener('click',()=>exportExcel('share'));
    $('btn-mark-exported').addEventListener('click',confirmExported);$('btn-delete-exported').addEventListener('click',deleteExported);
    $('btn-excel').addEventListener('click',()=>exportExcel('xlsx'));$('btn-zip').addEventListener('click',exportZip);$('btn-import').addEventListener('click',()=>$('zip-import-input').click());$('zip-import-input').addEventListener('change',e=>{if(e.target.files?.[0])importZip(e.target.files[0]);});
    $('search-records').addEventListener('input',renderList);
    try{db=await dbOpen();await reload();}catch(err){notice(t('errLocalStorage',{error:err.message}));}
    if(location.protocol==='file:')notice(t('warningFile'));
    if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js?v=2.3').catch(()=>{});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
