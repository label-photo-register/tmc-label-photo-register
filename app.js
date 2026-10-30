/* TMC Label Photo Register V1.9 — local-first photo grouping + browser OCR */
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

  const TRANSLATIONS = {"zh":{"brandSub":"智能标签照片登记 · V1.9","localOnly":"仅储存在本机","language":"语言","eyebrow":"仓库 · 标签照片记录","heroMain":"一个标签，一组照片，","heroEm":"自动填写资料。","heroDesc":"拍摄标签照片自动读取 Label / Lot / Part / Net 等字段，再加入 1–2 张物料照片。每个标签固定为独立一组，导出 Excel 时 2–3 张小照片直接放在 Label No. 前面，整组资料都在同一行。","newLabel":"＋ 新增标签","savedLabels":"已保存的标签","groupsUnit":"组资料","searchPlaceholder":"搜索 Label / Lot / Part…","searchAria":"搜索记录","noRecords":"暂无记录。先拍一张标签照片吧。","exportHeading":"批量导出","excelButton":"↓ Excel（照片与资料同一行）","zipButton":"↓ 照片 + 资料 ZIP 备份","importButton":"↑ 导入 ZIP 备份","backupHelp":"支持每组 2–3 张照片。建议定期备份；浏览器资料不会自动同步到其他设备。","captureHeading":"拍摄 / 选择照片","captureDesc":"第 1 张是标签，另外 1–2 张是同一物料的照片。","photoLabel":"标签照片","photoMaterial":"物料照片","photoOptional":"其他角度照片","photoLabelHelp":"必需 · 用于自动识别","photoMaterialHelp":"必需 · 与标签同一组","photoOptionalHelp":"可选 · 最多 3 张","notSelected":"尚未选择","camera":"拍照","upload":"上传","remove":"删除","ocrHeading":"标签识别（OCR）","ocrIntro":"上传标签照片后，系统会定位横线并逐行加强识别品名与规格。","ocrAgain":"↻ 重新识别","ocrRawSummary":"查看识别原文（用于检查不清楚的字段）","ocrNoText":"暂无识别内容","detailsHeading":"标签资料","detailsDesc":"自动填写后仍可手动修正。重量、料号与批号会按原格式保存。","required":"* 必填","fieldDescription":"Description / 品名","fieldSpec":"Spec / 规格","fieldPart":"Part No. / 料号","fieldNet":"Net Weight (KG)","phLabel":"例如 000001","phLot":"例如 50077-2606-02","phDesc":"识别到的完整品名","phSpec":"例如 Mixed","phPart":"例如 1234567890123","phNet":"例如 100.000","formNew":"当前为新记录","clearButton":"清空 / 新增","saveButton":"✓ 保存这一组（2–3 张）","footerPrivacy":"图片自动识别在本机浏览器执行，图片不会上传至服务器。OCR 及 Excel 导出所需程序首次使用时需联网加载。","footerCaution":"识别可能受拍照角度、光线及标签字体影响，请在保存前检查关键字段。","progressProcessing":"处理中…","progressWait":"请勿关闭页面","pageDescription":"标签拍照识别，每个标签绑定 2–3 张照片，导出含照片的 Excel。","photoUnit":"张","photoShortUnit":"张照片","photoAltLabel":"标签","photoAltMaterial":"物料","photoAltOther":"其他角度","photoFallback":"照片 {n}","searchNone":"没有找到符合的标签。","previewAlt":"标签缩略图","unnamedLabel":"未命名标签","photosCount":"{n} 张照片","ocrSaved":"已保存上次识别结果，可重新识别。","ocrUploadInitial":"上传第 1 张照片后自动识别；识别后请核对资料。","formEditing":"编辑已保存的记录","errNoIndexedDB":"此浏览器不支持本机数据库 IndexedDB","errDbUnavailable":"数据库不可用，请在 HTTPS/GitHub Pages 上打开应用","errReadPhoto":"无法读取照片文件","errCompressPhoto":"无法压缩照片","busyPhoto":"正在处理照片，请完成当前操作。","chooseImage":"请选择照片图片文件。","imageTooBig":"图片超过 35MB，请先压缩。","loadingPhoto":"正在读取照片","photoNumberFile":"第 {n} 张：{file}","addedPhoto":"第 {n} 张照片已加入当前标签组","photoFail":"读取照片失败：{error}","needLabelPhoto":"请先拍摄标签照片（第 1 张）。","ocrInitializing":"识别标签中","ocrDownload":"第一次使用需要下载 OCR 语言识别文件；照片只在本机处理。","ocrLibraryMissing":"OCR 程序尚未载入，请确认设备有联网并刷新网页。","ocrRecognizing":"正在识别标签","ocrPercent":"文字识别 {pct}%","ocrReadFields":"读取标签的号码、日期、重量…","ocrDetailTitle":"加强品名与规格识别","ocrDetailDesc":"正在定位标签横线、逐行增强识别 Description 和 Spec…","ocrNone":"未识别到文字","ocrStatusDone":"已识别 {n} 个字段{confidence}。请核对 Lot / Description / Spec / Part / Net。","confidence":" · 文本置信度 {pct}%","ocrMissing":"仍未可靠读取：{fields}。请看标签照片核对并手动填写，不会猜测缺失内容。","ocrFew":"本张标签识别较少：请确保照片清楚、光线充足并正对标签，或在下方手动修改资料。","ocrFinished":"自动识别完成：找到 {n} 项字段，请核对准确性。","ocrFailure":"OCR 识别未完成：{error}。可手动输入标签资料，照片仍能保存。","ocrFailureStatus":"识别失败，可手动填写或重试。","needLabelNo":"请填写 Label No.","needTwoPhotos":"每个标签必须包含：标签照片（1）和物料照片（2）；第 3 张可选。","needTwoNotice":"保存前须至少放入标签照片 + 物料照片，共 2 张；最多 3 张。","confirmDuplicate":"Label {label} 已保存过 {n} 组。确定仍要新增另一组照片吗？","savedState":"已保存 · 可继续修改","savedToast":"Label {label} 已保存（{n} 张照片）。","saveFail":"保存失败：{error}。可尝试减少照片大小、检查浏览器储存空间。","confirmDelete":"确定要删除 Label {label} 的整组记录和所有照片吗？删除后无法撤销。","deletedToast":"已删除这组标签和照片。","noExcelRecords":"没有已保存的标签可导出。","excelMissing":"Excel 程序未加载。请连接互联网后刷新网页重试。","excelTitle":"制作 Excel 文件","excelBuilding":"正在建立照片与标签同一行的表格…","excelPhotoTitle":"正在把小照片插入 Excel","excelPhotoDetail":"Label {label} · 第 {i}/{total} 组","excelWrapping":"正在生成 Excel 文件","excelWrappingDesc":"正在封装单张工作表及所有嵌入照片…","excelDone":"Excel 导出完成：{n} 组，照片与资料全部在同一张工作表。","excelFail":"Excel 导出失败：{error}","noBackupRecords":"没有已保存的标签可备份。","zipMissing":"ZIP 程序未加载。请连接互联网后刷新重试。","zipTitle":"制作照片备份","zipDescription":"包含应用保存的高清照片及完整记录","zipProgress":"整理 Label {label} ({i}/{total})","zipCompress":"正在压缩照片","zipPercent":"已完成 {pct}%","zipDone":"ZIP 备份完成，包含所有照片和资料。","zipFail":"ZIP 导出失败：{error}","importTitle":"读取备份","importChecking":"正在检查 ZIP 内容","errNoManifest":"ZIP 内没有 records.json，这不是 TMC 应用备份。","errBadBackup":"备份格式不正确","importConfirm":"备份包含 {n} 组标签。导入后同编号 ID 的记录会更新，其他记录保留。是否继续？","errInvalidPhotoPath":"备份照片路径不正确","errMissingPhoto":"备份照片缺失：{path}","importRestoring":"恢复标签记录","importDone":"备份导入完成：{n} 组标签。","importFail":"导入备份失败：{error}","deleteButton":"删除本组","ocrAfterRemove":"上传标签照片后自动识别。","errLocalStorage":"无法使用本机储存：{error}。请使用最新版 Chrome / Edge 并允许网站储存资料。","warningFile":"当前使用 file:// 方式打开；建议将整个文件夹部署到 GitHub Pages（HTTPS），以便 OCR、保存及 PWA 更稳定。","languageChanged":"语言已切换。"},"en":{"brandSub":"Smart Label Photo Register · V1.9","localOnly":"Saved on this device only","language":"Language","eyebrow":"WAREHOUSE · LABEL PHOTO RECORD","heroMain":"One label, one photo group,","heroEm":"details filled automatically.","heroDesc":"Photograph the label to read Label / Lot / Part / Net automatically, then add 1–2 photos of the same material. Each label is saved as its own group. In Excel, 2–3 small photos appear before Label No., all on one row.","newLabel":"＋ New label","savedLabels":"Saved labels","groupsUnit":"groups","searchPlaceholder":"Search Label / Lot / Part…","searchAria":"Search records","noRecords":"No records yet. Start by photographing a label.","exportHeading":"Export & backup","excelButton":"↓ Excel (photos and details in one row)","zipButton":"↓ ZIP backup (photos + data)","importButton":"↑ Import ZIP backup","backupHelp":"2–3 photos per group. Back up regularly; browser data is not automatically synced to other devices.","captureHeading":"Take / choose photos","captureDesc":"Photo 1 is the label; photos 2–3 show the same material.","photoLabel":"Label photo","photoMaterial":"Material photo","photoOptional":"Another angle","photoLabelHelp":"Required · for automatic OCR","photoMaterialHelp":"Required · same label group","photoOptionalHelp":"Optional · maximum 3 photos","notSelected":"Not selected","camera":"Camera","upload":"Upload","remove":"Remove","ocrHeading":"Label recognition (OCR)","ocrIntro":"Photo 1 is recognized automatically. Description and Spec use line-by-line scanning between printed rules.","ocrAgain":"↻ Recognize again","ocrRawSummary":"Show raw OCR text (to review unclear fields)","ocrNoText":"No OCR text yet","detailsHeading":"Label details","detailsDesc":"Automatically filled details can still be edited. Weight, part number and lot number keep their original formatting.","required":"* Required","fieldDescription":"Description","fieldSpec":"Spec","fieldPart":"Part No.","fieldNet":"Net Weight (KG)","phLabel":"e.g. 000001","phLot":"e.g. 50077-2606-02","phDesc":"Full description from OCR","phSpec":"e.g. Mixed","phPart":"e.g. 1234567890123","phNet":"e.g. 100.000","formNew":"New record","clearButton":"Clear / new","saveButton":"✓ Save group (2–3 photos)","footerPrivacy":"Image recognition runs in your browser. Photos are not uploaded to our server. An internet connection is required to load OCR and Excel libraries for first use.","footerCaution":"OCR accuracy depends on camera angle, lighting and label print. Check important fields before saving.","progressProcessing":"Processing…","progressWait":"Do not close this page","pageDescription":"Recognize labels, save 2–3 photos per label, and export them together to Excel.","photoUnit":"photos","photoShortUnit":"photos","photoAltLabel":"Label","photoAltMaterial":"Material","photoAltOther":"Another angle","photoFallback":"Photo {n}","searchNone":"No matching labels found.","previewAlt":"Label thumbnail","unnamedLabel":"Unnamed label","photosCount":"{n} photos","ocrSaved":"Previous OCR result is saved; you can recognize again.","ocrUploadInitial":"Upload Photo 1 to start OCR; check the details afterward.","formEditing":"Editing saved record","errNoIndexedDB":"This browser does not support IndexedDB local storage","errDbUnavailable":"Database unavailable. Open the app on HTTPS/GitHub Pages","errReadPhoto":"Cannot read image file","errCompressPhoto":"Cannot compress image","busyPhoto":"A photo is being processed. Finish the current task first.","chooseImage":"Please select an image file.","imageTooBig":"Image exceeds 35 MB. Compress it first.","loadingPhoto":"Reading photo","photoNumberFile":"Photo {n}: {file}","addedPhoto":"Photo {n} added to the current label group","photoFail":"Could not read photo: {error}","needLabelPhoto":"Photograph the label first (Photo 1).","ocrInitializing":"Recognizing label","ocrDownload":"OCR language files download on first use. Photos are processed locally.","ocrLibraryMissing":"OCR library not loaded. Check internet access and refresh.","ocrRecognizing":"Recognizing label","ocrPercent":"Text recognition {pct}%","ocrReadFields":"Reading label number, date and weight…","ocrDetailTitle":"Improving Description & Spec","ocrDetailDesc":"Detecting printed rules and enhancing Description / Spec line by line…","ocrNone":"No text recognized","ocrStatusDone":"{n} fields recognized{confidence}. Check Lot / Description / Spec / Part / Net.","confidence":" · text confidence {pct}%","ocrMissing":"Could not reliably read: {fields}. Check the photo and enter these fields manually; missing values will not be guessed.","ocrFew":"Only a few fields were recognized. Use a clear, well-lit, straight-on photo or edit the details manually.","ocrFinished":"OCR complete: {n} fields found. Please verify their accuracy.","ocrFailure":"OCR could not finish: {error}. You can enter details manually and still save the photos.","ocrFailureStatus":"OCR failed. Enter details manually or retry.","needLabelNo":"Please enter Label No.","needTwoPhotos":"Each label requires a label photo (1) and a material photo (2); Photo 3 is optional.","needTwoNotice":"Add both a label photo and a material photo before saving (2–3 photos total).","confirmDuplicate":"Label {label} already has {n} saved group(s). Create another group anyway?","savedState":"Saved · you may edit again","savedToast":"Label {label} saved ({n} photos).","saveFail":"Save failed: {error}. Try smaller photos or check browser storage.","confirmDelete":"Delete Label {label} and all its photos? This cannot be undone.","deletedToast":"Label group and photos deleted.","noExcelRecords":"No saved labels to export.","excelMissing":"Excel library not loaded. Connect to the internet and refresh.","excelTitle":"Creating Excel file","excelBuilding":"Preparing photos and details in the same row…","excelPhotoTitle":"Inserting small photos into Excel","excelPhotoDetail":"Label {label} · group {i}/{total}","excelWrapping":"Generating Excel file","excelWrappingDesc":"Finishing the single worksheet and embedded photos…","excelDone":"Excel exported: {n} groups, photos and details on one worksheet.","excelFail":"Excel export failed: {error}","noBackupRecords":"No saved labels to back up.","zipMissing":"ZIP library not loaded. Connect to the internet and refresh.","zipTitle":"Creating photo backup","zipDescription":"Including full-resolution saved photos and complete records","zipProgress":"Preparing Label {label} ({i}/{total})","zipCompress":"Compressing photos","zipPercent":"Completed {pct}%","zipDone":"ZIP backup complete with all photos and data.","zipFail":"ZIP export failed: {error}","importTitle":"Reading backup","importChecking":"Checking ZIP contents","errNoManifest":"No records.json in ZIP. This is not an app backup.","errBadBackup":"Invalid backup format","importConfirm":"This backup contains {n} label groups. Records with the same ID will be updated; all others remain. Continue?","errInvalidPhotoPath":"Invalid backup photo path","errMissingPhoto":"Backup photo missing: {path}","importRestoring":"Restoring label records","importDone":"Backup imported: {n} label groups.","importFail":"Backup import failed: {error}","deleteButton":"Delete group","ocrAfterRemove":"Upload a label photo for automatic recognition.","errLocalStorage":"Local storage unavailable: {error}. Use the latest Chrome / Edge and allow site storage.","warningFile":"You opened a file:// URL. Deploy the folder on GitHub Pages (HTTPS) for more reliable OCR, storage and PWA.","languageChanged":"Language changed."},"ms":{"brandSub":"Pendaftaran Foto Label Pintar · V1.9","localOnly":"Disimpan pada peranti ini sahaja","language":"Bahasa","eyebrow":"GUDANG · REKOD FOTO LABEL","heroMain":"Satu label, satu kumpulan foto,","heroEm":"maklumat diisi secara automatik.","heroDesc":"Ambil gambar label untuk membaca Label / Lot / Part / Net secara automatik, kemudian tambah 1–2 foto bahan yang sama. Setiap label disimpan dalam kumpulan berasingan. Dalam Excel, 2–3 foto kecil diletakkan sebelum Label No., semuanya dalam satu baris.","newLabel":"＋ Label baharu","savedLabels":"Label yang disimpan","groupsUnit":"kumpulan","searchPlaceholder":"Cari Label / Lot / Part…","searchAria":"Cari rekod","noRecords":"Belum ada rekod. Mulakan dengan mengambil foto label.","exportHeading":"Eksport & sandaran","excelButton":"↓ Excel (foto dan maklumat sebaris)","zipButton":"↓ Sandaran ZIP (foto + data)","importButton":"↑ Import sandaran ZIP","backupHelp":"2–3 foto setiap kumpulan. Buat sandaran secara berkala; data pelayar tidak disegerakkan ke peranti lain secara automatik.","captureHeading":"Ambil / pilih foto","captureDesc":"Foto pertama ialah label; 1–2 foto lagi menunjukkan bahan yang sama.","photoLabel":"Foto label","photoMaterial":"Foto bahan","photoOptional":"Sudut lain","photoLabelHelp":"Wajib · untuk pengecaman automatik","photoMaterialHelp":"Wajib · kumpulan label yang sama","photoOptionalHelp":"Pilihan · maksimum 3 foto","notSelected":"Belum dipilih","camera":"Kamera","upload":"Muat naik","remove":"Buang","ocrHeading":"Pengecaman label (OCR)","ocrIntro":"Foto pertama dikenal pasti secara automatik. Description dan Spec dibaca mengikut bahagian masing-masing pada label.","ocrAgain":"↻ Kenal pasti semula","ocrRawSummary":"Lihat teks OCR asal (untuk semak medan tidak jelas)","ocrNoText":"Belum ada teks OCR","detailsHeading":"Maklumat label","detailsDesc":"Maklumat yang diisi secara automatik masih boleh diedit. Berat, nombor bahagian dan nombor lot dikekalkan dalam format asal.","required":"* Wajib","fieldDescription":"Keterangan","fieldSpec":"Spesifikasi","fieldPart":"No. Bahagian","fieldNet":"Berat Bersih (KG)","phLabel":"cth. 000001","phLot":"cth. 50077-2606-02","phDesc":"Keterangan penuh daripada OCR","phSpec":"cth. Mixed","phPart":"cth. 1234567890123","phNet":"cth. 100.000","formNew":"Rekod baharu","clearButton":"Kosongkan / baharu","saveButton":"✓ Simpan kumpulan (2–3 foto)","footerPrivacy":"Pengecaman imej dijalankan dalam pelayar pada peranti anda. Foto tidak dimuat naik ke pelayan kami. Sambungan internet diperlukan untuk memuatkan modul OCR dan Excel pada penggunaan pertama.","footerCaution":"Ketepatan OCR bergantung pada sudut kamera, pencahayaan dan cetakan label. Semak medan penting sebelum menyimpan.","progressProcessing":"Sedang diproses…","progressWait":"Jangan tutup halaman ini","pageDescription":"Kenal pasti label, simpan 2–3 foto bagi setiap label dan eksport bersama ke Excel.","photoUnit":"foto","photoShortUnit":"foto","photoAltLabel":"Label","photoAltMaterial":"Bahan","photoAltOther":"Sudut lain","photoFallback":"Foto {n}","searchNone":"Tiada label yang sepadan.","previewAlt":"Lakaran kecil label","unnamedLabel":"Label tanpa nama","photosCount":"{n} foto","ocrSaved":"Hasil OCR terdahulu disimpan; anda boleh mengenal pasti semula.","ocrUploadInitial":"Muat naik Foto 1 untuk memulakan OCR; semak maklumat selepas itu.","formEditing":"Mengedit rekod yang disimpan","errNoIndexedDB":"Pelayar ini tidak menyokong storan setempat IndexedDB","errDbUnavailable":"Pangkalan data tidak tersedia. Buka aplikasi melalui HTTPS/GitHub Pages","errReadPhoto":"Tidak dapat membaca fail imej","errCompressPhoto":"Tidak dapat memampatkan imej","busyPhoto":"Foto sedang diproses. Selesaikan operasi semasa dahulu.","chooseImage":"Sila pilih fail imej.","imageTooBig":"Imej melebihi 35 MB. Mampatkan dahulu.","loadingPhoto":"Membaca foto","photoNumberFile":"Foto {n}: {file}","addedPhoto":"Foto {n} ditambah ke kumpulan label semasa","photoFail":"Gagal membaca foto: {error}","needLabelPhoto":"Ambil foto label terlebih dahulu (Foto 1).","ocrInitializing":"Mengenal pasti label","ocrDownload":"Fail bahasa OCR dimuat turun semasa penggunaan pertama. Foto diproses pada peranti.","ocrLibraryMissing":"Modul OCR belum dimuatkan. Semak internet dan muat semula.","ocrRecognizing":"Mengenal pasti label","ocrPercent":"Pengecaman teks {pct}%","ocrReadFields":"Membaca nombor label, tarikh dan berat…","ocrDetailTitle":"Memperbaik Keterangan & Spesifikasi","ocrDetailDesc":"Membaca Keterangan dan Spesifikasi daripada baris cetakan berasingan…","ocrNone":"Tiada teks dikenal pasti","ocrStatusDone":"{n} medan dikenal pasti{confidence}. Semak Lot / Description / Spec / Part / Net.","confidence":" · keyakinan teks {pct}%","ocrMissing":"Tidak dapat membaca dengan yakin: {fields}. Semak foto dan isi secara manual; nilai yang tiada tidak akan diteka.","ocrFew":"Hanya beberapa medan dikenal pasti. Gunakan foto yang jelas, terang dan lurus atau edit secara manual.","ocrFinished":"OCR selesai: {n} medan ditemui. Sila semak ketepatannya.","ocrFailure":"OCR tidak berjaya: {error}. Anda masih boleh mengisi maklumat secara manual dan menyimpan foto.","ocrFailureStatus":"OCR gagal. Isi secara manual atau cuba lagi.","needLabelNo":"Sila masukkan Label No.","needTwoPhotos":"Setiap label memerlukan foto label (1) dan foto bahan (2); Foto 3 adalah pilihan.","needTwoNotice":"Tambah foto label dan foto bahan sebelum menyimpan (jumlah 2–3 foto).","confirmDuplicate":"Label {label} sudah mempunyai {n} kumpulan tersimpan. Tetap cipta kumpulan baharu?","savedState":"Disimpan · boleh diedit lagi","savedToast":"Label {label} disimpan ({n} foto).","saveFail":"Gagal menyimpan: {error}. Cuba foto lebih kecil atau semak ruang storan pelayar.","confirmDelete":"Padam Label {label} bersama semua fotonya? Tindakan ini tidak boleh dibatalkan.","deletedToast":"Kumpulan label dan foto telah dipadam.","noExcelRecords":"Tiada label tersimpan untuk dieksport.","excelMissing":"Modul Excel belum dimuatkan. Sambung ke internet dan muat semula.","excelTitle":"Menjana fail Excel","excelBuilding":"Menyusun foto dan maklumat dalam baris yang sama…","excelPhotoTitle":"Memasukkan foto kecil ke dalam Excel","excelPhotoDetail":"Label {label} · kumpulan {i}/{total}","excelWrapping":"Menjana fail Excel","excelWrappingDesc":"Menyiapkan satu lembaran kerja dan foto terbenam…","excelDone":"Excel berjaya dieksport: {n} kumpulan, foto dan maklumat dalam satu lembaran kerja.","excelFail":"Eksport Excel gagal: {error}","noBackupRecords":"Tiada label tersimpan untuk disandarkan.","zipMissing":"Modul ZIP belum dimuatkan. Sambung ke internet dan muat semula.","zipTitle":"Menyediakan sandaran foto","zipDescription":"Merangkumi foto resolusi tinggi dan rekod lengkap yang disimpan","zipProgress":"Menyediakan Label {label} ({i}/{total})","zipCompress":"Memampatkan foto","zipPercent":"Selesai {pct}%","zipDone":"Sandaran ZIP selesai dengan semua foto dan maklumat.","zipFail":"Eksport ZIP gagal: {error}","importTitle":"Membaca sandaran","importChecking":"Menyemak kandungan ZIP","errNoManifest":"Tiada records.json dalam ZIP. Ini bukan sandaran aplikasi.","errBadBackup":"Format sandaran tidak sah","importConfirm":"Sandaran ini mengandungi {n} kumpulan label. Rekod dengan ID sama akan dikemas kini; rekod lain dikekalkan. Teruskan?","errInvalidPhotoPath":"Laluan foto sandaran tidak sah","errMissingPhoto":"Foto sandaran tiada: {path}","importRestoring":"Memulihkan rekod label","importDone":"Sandaran diimport: {n} kumpulan label.","importFail":"Import sandaran gagal: {error}","deleteButton":"Padam kumpulan","ocrAfterRemove":"Muat naik foto label untuk pengecaman automatik.","errLocalStorage":"Storan setempat tidak tersedia: {error}. Gunakan Chrome / Edge terkini dan benarkan storan laman.","warningFile":"Anda membuka URL file://. Terbitkan folder melalui GitHub Pages (HTTPS) untuk OCR, storan dan PWA yang lebih stabil.","languageChanged":"Bahasa telah ditukar."}};
  const LANG_KEY = 'label_photo_register_language';
  let lang = (()=>{try{return localStorage.getItem(LANG_KEY)||'zh';}catch(_){return 'zh';}})();
  if(!Object.prototype.hasOwnProperty.call(TRANSLATIONS, lang))lang='zh';
  function t(key,params={}) {let s=TRANSLATIONS[lang][key]||TRANSLATIONS.zh[key]||key;return s.replace(/\{(\w+)\}/g,(_,name)=>params[name]===undefined?'':String(params[name]));}
  function applyLanguage(){
    document.documentElement.lang=lang==='zh'?'zh-Hans':lang;
    document.title=(lang==='zh'?'标签照片登记':lang==='ms'?'Pendaftaran Foto Label':'Label Photo Register')+' V1.9';
    document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n);});
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{el.placeholder=t(el.dataset.i18nPlaceholder);});
    document.querySelectorAll('[data-i18n-title]').forEach(el=>{el.title=t(el.dataset.i18nTitle);});
    document.querySelectorAll('[data-i18n-aria-label]').forEach(el=>{el.setAttribute('aria-label',t(el.dataset.i18nAriaLabel));});
    document.querySelectorAll('[data-i18n-content]').forEach(el=>{el.setAttribute('content',t(el.dataset.i18nContent));});
    $('language-select').value=lang;
  }
  function setLanguage(next){if(!TRANSLATIONS[next])return;if(busy){$('language-select').value=lang;return;}readForm();lang=next;
    try{localStorage.setItem(LANG_KEY,lang);}catch(_){}
    applyLanguage();loadToForm();renderList();notice('');toast(t('languageChanged'));
  }
  function freshRecord() {
    const fields = {};
    FIELD_KEYS.forEach(k => { fields[k] = ''; });
    return { id: (self.crypto && self.crypto.randomUUID ? self.crypto.randomUUID() : `${Date.now()}-${Math.random()}`), fields, photos:[null,null,null], createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(), ocrRaw:'' };
  }
  function safeString(v) {return v === null || v === undefined ? '' : String(v);}
  function toast(text) { const el=$('toast'); el.textContent=text; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),4000); }
  function notice(text) {const el=$('notice');el.textContent=text;el.hidden=!text;}
  function setProgress(title,detail,pct=0) { $('progress-title').textContent=title; $('progress-detail').textContent=detail; $('progress-bar').style.width=`${Math.min(100,Math.max(0,pct))}%`; $('progress-overlay').hidden=false; }
  function hideProgress() {$('progress-overlay').hidden=true;}
  function setBusy(value) { busy=value; $('btn-save').disabled=value; $('btn-ocr').disabled=value; }
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
    $('record-count').textContent=records.length;
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
      meta.append(strong,lot,count);item.append(thumb,meta);list.append(item);
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
    // Repeated label variants: 50077-2606-02, 20260617, etc.
    // Preserve hyphens and leading zeros; OCR can mistake 5/0/1 for S/O/I.
    const digits=safeString(str).replace(/[§Ss]/g,'5').replace(/[Oo]/g,'0').replace(/[Il|]/g,'1')
      .replace(/[Bb]/g,'8').replace(/\s*-\s*/g,'-').replace(/\s+/g,'').replace(/[^0-9-]/g,'');
    return digits.replace(/^-+|-+$/g,'');
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
    // The previous version only captured the first numeric group of a hyphenated lot.
    const directLot=getRegex(text,[/\bLOT\s*(?:NO\.?)?\s*[:;.\-]?\s*([\dSs§OoIl|]{4,14}(?:\s*-\s*[\dSs§OoIl|]{2,8}){0,3})/i]);
    const hybridLots=[];
    // Whole-image OCR sometimes reads the value before the printed 'LOT No.' caption.
    // A hyphenated number is more useful than a truncated prefix, but search only
    // in the top section so that other warehouse codes aren't mistaken for Lot.
    for(const l of lines.slice(0,Math.max(9,Math.ceil(lines.length*.55)))){
      const candidates=l.match(/[\dSs§OoIl|]{4,14}(?:\s*-\s*[\dSs§OoIl|]{2,8}){1,3}/g)||[];
      candidates.forEach(x=>{const v=cleanLot(x);if(/^\d{4,14}(?:-\d{2,8}){1,3}$/.test(v))hybridLots.push(v);});
    }
    out.lotNo=cleanLot(directLot);
    if(hybridLots.length){
      hybridLots.sort((x,y)=>y.length-x.length);
      // Use the extended lot if the OCR prefixes agree, or a plausible OCR-substituted prefix.
      const full=hybridLots.find(v=>!out.lotNo||v.startsWith(out.lotNo)||out.lotNo.startsWith(v.split('-')[0]));
      if(full)out.lotNo=full;
    }
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
  // V1.9 OCR: first detect the physical underline rules of printed TMC labels.
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
  async function decodeQR(blob){
    if(!('BarcodeDetector' in window))return '';
    try{const detector=new BarcodeDetector({formats:['qr_code']});const bitmap=await imageToBitmap(blob);try{const found=await detector.detect(bitmap);return found[0]?.rawValue||'';}finally{if(bitmap.close)bitmap.close();}}catch(_){return '';}
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
      if(qr){const qrParsed=ocrParse(qr);Object.keys(qrParsed).forEach(k=>{if(!parsed[k])parsed[k]=qrParsed[k];});}
      // Independent right-hand region scan is essential for bilingual TMC labels:
      // the main OCR often loses Description and wrapped Spec completely.
      let detailRaw='';
      if(true){ // always inspect individual fields, even if whole-image OCR guessed them
        try{
          setProgress(t('ocrDetailTitle'),t('ocrDetailDesc'),78);
          const detail=await scanDetailRegion(worker,draft.photos[0].blob,result?.data?.tsv||'');
          detailRaw=detail.raw;
          ['description','spec'].forEach(k=>{
            // Cropped result takes priority; retain only clean whole-image fallback.
            const v=detail.parsed[k];
            if(v){parsed[k]=v;return;}
            // Never copy untrusted whole-photo OCR fragments into the wrong field.
            parsed[k]='';
          });
        }catch(err){console.warn('Optional label-detail OCR:',err);}
      }
      readForm();
      for(const [k,v] of Object.entries(parsed)){
        if(!FIELD_KEYS.includes(k)||!v)continue;
        const old=safeString(draft.fields[k]);
        // Rescue a prior OCR truncation e.g. 50077 -> 50077-2606-02.
        const completesLot=k==='lotNo'&&old&&!old.includes('-')&&v.startsWith(old+'-');
        if(force||!old||completesLot){draft.fields[k]=v;form.elements.namedItem(k).value=v;}
      }
      draft.ocrRaw=raw+(detailRaw?`\n\n[Description / Spec 区域复核]\n${detailRaw}`:'')+(qr?`\n\n[QR Code]\n${qr}`:'');
      $('ocr-raw').textContent=draft.ocrRaw||t('ocrNone');
      const picked=Object.entries(parsed).filter(([k,v])=>v&&FIELD_KEYS.includes(k)).length;
      const confidence=result?.data?.confidence;
      const missing=[['lotNo','Lot No.'],['description','Description'],['spec','Spec']].filter(([k])=>!draft.fields[k]).map(([,v])=>v);
      $('ocr-status').textContent=t('ocrStatusDone',{n:picked,confidence:Number.isFinite(confidence)?t('confidence',{pct:Math.round(confidence)}):''});
      if(missing.length)notice(t('ocrMissing',{fields:missing.join(', ')}));
      else if(picked<4)notice(t('ocrFew'));
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

  async function exportExcel(){
    if(busy)return;
    if(!records.length){toast(t('noExcelRecords'));return;}
    if(!window.ExcelJS){notice(t('excelMissing'));return;}
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
      download(new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`Label_Photos_Inline_${timestamp()}.xlsx`);
      toast(t('excelDone',{n:records.length}));
    }catch(e){notice(t('excelFail',{error:e.message}));}
    finally{hideProgress();setBusy(false);}
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
        const rec=records[i],clone={id:rec.id,fields:rec.fields,createdAt:rec.createdAt,updatedAt:rec.updatedAt,ocrRaw:rec.ocrRaw||'',photos:[null,null,null]};
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
        const m=manifest.records[i];const r={id:m.id||freshRecord().id,fields:{...freshRecord().fields,...m.fields},photos:[null,null,null],createdAt:m.createdAt||new Date().toISOString(),updatedAt:m.updatedAt||new Date().toISOString(),ocrRaw:m.ocrRaw||''};
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
    $('btn-excel').addEventListener('click',exportExcel);$('btn-zip').addEventListener('click',exportZip);$('btn-import').addEventListener('click',()=>$('zip-import-input').click());$('zip-import-input').addEventListener('change',e=>{if(e.target.files?.[0])importZip(e.target.files[0]);});
    $('search-records').addEventListener('input',renderList);
    try{db=await dbOpen();await reload();}catch(err){notice(t('errLocalStorage',{error:err.message}));}
    if(location.protocol==='file:')notice(t('warningFile'));
    if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js?v=1.8').catch(()=>{});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
