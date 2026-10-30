/* TMC Label Photo Register V1.3 — local-first photo grouping + browser OCR */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const form = $('record-form');
  const FIELD_KEYS = ['labelNo','lotNo','description','spec','partNo','netKg','containerKg','grossKg','date','weigher','checker','source','taxCode','warehouse','location','racking','row','remarks'];
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
    if(!('indexedDB' in window))return reject(new Error('此浏览器不支持本机数据库 IndexedDB'));
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE,{keyPath:'id'});};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });}
  function dbRequest(mode,fn){return new Promise((resolve,reject)=>{
    if(!db)return reject(new Error('数据库不可用，请在 HTTPS/GitHub Pages 上打开应用'));
    const trx=db.transaction(STORE,mode);const store=trx.objectStore(STORE);
    const req=fn(store);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    trx.onerror=()=>reject(trx.error);
  });}
  const getAll=()=>dbRequest('readonly',store=>store.getAll());
  const putRecord=r=>dbRequest('readwrite',store=>store.put(r));
  const removeRecord=id=>dbRequest('readwrite',store=>store.delete(id));
  async function reload(){records=(await getAll()).sort((a,b)=>safeString(b.updatedAt).localeCompare(safeString(a.updatedAt)));renderList();}

  function loadToForm(){FIELD_KEYS.forEach(k=>{form.elements.namedItem(k).value=safeString(draft.fields[k]);});$('ocr-raw').textContent=draft.ocrRaw||'暂无识别内容';$('ocr-status').textContent=draft.ocrRaw?'已保存上次识别结果，可重新识别。':'上传第 1 张照片后自动识别；识别后请核对资料。';renderPhotos();$('form-state').textContent=records.some(x=>x.id===draft.id)?'编辑已保存的记录':'当前为新记录';$('btn-delete').hidden=!records.some(x=>x.id===draft.id);}
  function renderPhotos(){
    draft.photos.forEach((p,i)=>{
      const prev=$(`preview-${i}`); const name=$(`photo-name-${i}`); prev.replaceChildren();
      if(p&&p.blob){const img=document.createElement('img');img.src=photoUrl(p.blob);img.alt=['标签','物料','其他角度'][i];prev.append(img);name.textContent=p.name||`照片 ${i+1}`;}
      else {const icon=document.createElement('span');icon.className='photo-placeholder-icon';icon.textContent=i?'▧':'▦';const strong=document.createElement('b');strong.textContent=['标签照片','物料照片','其他角度照片'][i];const note=document.createElement('small');note.textContent=i===2?'可选 · 最多 3 张':'必需 · '+(i===0?'用于自动识别':'与标签同一组');prev.append(icon,strong,note);name.textContent='尚未选择';}
      document.querySelector(`[data-photo-action="remove"][data-slot="${i}"]`).hidden=!p;
    });
    const n=draft.photos.filter(Boolean).length;
    $('photo-count').textContent=`${n} / 3 张`;
  }
  function renderList(){
    $('record-count').textContent=records.length;
    const search=$('search-records').value.trim().toLowerCase();
    const list=$('record-list');list.replaceChildren();
    const matched=records.filter(r=>['labelNo','lotNo','partNo','description'].some(k=>safeString(r.fields[k]).toLowerCase().includes(search)));
    if(!matched.length){const el=document.createElement('div');el.className='empty-side';el.textContent=search?'没有找到符合的标签。':'暂无记录。先拍一张标签照片吧。';list.append(el);}
    matched.forEach(r=>{
      const item=document.createElement('button');item.type='button';item.className='record-item'+(r.id===draft.id?' active':'');item.addEventListener('click',()=>{readForm();draft={...r,fields:{...r.fields},photos:[...r.photos]};loadToForm();renderList();window.scrollTo({top:0,behavior:'smooth'});});
      const thumb=document.createElement('img');thumb.alt='标签缩略图';if(r.photos[0]&&r.photos[0].blob)thumb.src=photoUrl(r.photos[0].blob);
      const meta=document.createElement('span');meta.className='record-meta';
      const strong=document.createElement('strong');strong.textContent=r.fields.labelNo||'未命名标签';
      const lot=document.createElement('small');lot.textContent=`Lot: ${r.fields.lotNo||'—'} · Net: ${r.fields.netKg||'—'} KG`;
      const count=document.createElement('small');count.className='count';count.textContent=`${r.photos.filter(Boolean).length} 张照片`;
      meta.append(strong,lot,count);item.append(thumb,meta);list.append(item);
    });
  }
  function readForm(){FIELD_KEYS.forEach(k=>{draft.fields[k]=form.elements.namedItem(k).value.trim();});}
  function newDraft(){draft=freshRecord();loadToForm();renderList();notice('');}

  async function imageToBitmap(blob){try{return await createImageBitmap(blob,{imageOrientation:'from-image'});}catch(_){return await new Promise((resolve,reject)=>{const i=new Image();const u=URL.createObjectURL(blob);i.onload=()=>{URL.revokeObjectURL(u);resolve(i);};i.onerror=()=>{URL.revokeObjectURL(u);reject(new Error('无法读取照片文件'));};i.src=u;});}}
  async function resizePhoto(file,slot){
    const source=await imageToBitmap(file);
    try{
      const max=slot===0?2300:1700;
      const scale=Math.min(1,max/Math.max(source.width,source.height));
      const w=Math.max(1,Math.round(source.width*scale)),h=Math.max(1,Math.round(source.height*scale));
      const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
      const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(source,0,0,w,h);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',slot===0?.91:.85));
      if(!blob)throw new Error('无法压缩照片');
      return {name:(file.name||`photo-${slot+1}`).replace(/\.[^.]+$/,'')+'.jpg',blob,originalName:file.name||'',takenAt:new Date().toISOString()};
    }finally{if(source.close)source.close();}
  }

  async function setPhoto(slot,file){
    if(busy){toast('正在处理照片，请完成当前操作。');return;}
    if(!file || !file.type.startsWith('image/')){toast('请选择照片图片文件。');return;}
    if(file.size>35*1024*1024){toast('图片超过 35MB，请先压缩。');return;}
    readForm();
    try{
      setBusy(true);setProgress('正在读取照片',`第 ${slot+1} 张：${file.name}`,15);
      const normalized=await resizePhoto(file,slot);draft.photos[slot]=normalized;renderPhotos();setBusy(false);hideProgress();
      toast(`第 ${slot+1} 张照片已加入当前标签组`);
      if(slot===0)await recognizeLabel(false);
    }catch(error){setBusy(false);hideProgress();notice(`读取照片失败：${error.message}`);}
  }
  function getRegex(text,reList){for(const re of reList){const match=text.match(re);if(match&&match[1])return match[1].trim();}return '';}
  function ocrParse(raw){
    const text=raw.replace(/\r/g,'').replace(/\u00a0/g,' ').replace(/[‐‑–—]/g,'-');
    const lines=text.split('\n').map(x=>x.trim().replace(/\s+/g,' ')).filter(Boolean);
    const out={};
    out.labelNo=getRegex(text,[/\bLABE[L1I]\s*[:;.\-]?\s*(\d{4,12})\b/i,/\bLABEL\s*(?:NO\.?)?\s*[:;.\-]?\s*(\d{4,12})/i]);
    out.lotNo=getRegex(text,[/\bLOT\s*(?:NO\.?)?\s*[:;.\-]?\s*(\d{5,15})\b/i]);
    out.partNo=getRegex(text,[/\bPART\s*(?:NO\.?)?\s*[:;.\-]?\s*(\d{9,18})\b/i,/\bPART\s*(?:NO\.?)?\s*[:;.\-]?\s*([\d\s]{10,22})/i]).replace(/\s/g,'');
    out.netKg=getRegex(text,[/\bNET\s*[:;.\-]?\s*(\d{1,8}(?:[.,]\d{1,4})?)\s*(?:K[GC]S?)?/i]).replace(',','.');
    out.containerKg=getRegex(text,[/\bCONTAINER\s*[:;.\-]?\s*(\d{1,8}(?:[.,]\d{1,4})?)\s*(?:K[GC]S?)?/i]).replace(',','.');
    out.grossKg=getRegex(text,[/\bGROSS\s*[:;.\-]?\s*(\d{1,8}(?:[.,]\d{1,4})?)\s*(?:K[GC]S?)?/i]).replace(',','.');
    out.date=getRegex(text,[/\bDATE\s*[:;.\-]?\s*((?:19|20)\d{2}[\/\-.]\d{1,2}[\/\-.]\d{1,2})/i]).replace(/[-.]/g,'/');
    out.weigher=getRegex(text,[/\bWEIGHER\s*[:;.\-]?\s*([A-Z0-9]{4,12})\b/i]);
    out.checker=getRegex(text,[/\bCHECK\s*[:;.\-]?\s*([A-Z0-9]{4,12})\b/i]);
    out.taxCode=getRegex(text,[/\bCODE\s*[:;.\-]?\s*(\d{1,4})\b/i]);
    const sourceLine=lines.find(l=>/\bSource\b/i.test(l));
    if(sourceLine)out.source=sourceLine.replace(/^.*?\bSource\b\s*[:;.]?\s*/i,'').trim();
    const descIdx=lines.findIndex(l=>/\bDescription\b/i.test(l));
    const specIdx=lines.findIndex(l=>/\bSpec\b/i.test(l));
    if(descIdx>=0){
      let group=[];
      const after=lines[descIdx].replace(/^.*?\bDescription\b\s*[:;.\-]?\s*/i,'').trim();
      if(after&&!/^(source|spec|gross|container|net|part|lot|label)\b/i.test(after))group.push(after);
      // Some TMC labels place the first line of the description ABOVE the printed "Description" caption.
      if(descIdx>0){const prev=lines[descIdx-1];if(prev.length>9&&!/(source|lot\s*no|label|weigher|\bdate\b|\bnet\b|\bpart\b|spec|gross|container)/i.test(prev))group.unshift(prev);}
      for(let i=descIdx+1;i<Math.min(lines.length,descIdx+5);i++){
        const line=lines[i];if(/^(?:spec|part\s*no|gross|container|net|date|weigher|check)\b/i.test(line))break;
        // Scanner sometimes reads "Mixed" on the same row as the spec label.
        if(/^(?:[A-Za-z]{0,4}\s+)?Mixed$/i.test(line) && specIdx>=0 && i+1===specIdx)break;
        if(line.length>=3 && !/^\W+$/.test(line))group.push(line);
      }
      if(group.length)out.description=group.join(' ').replace(/\s{2,}/g,' ').trim();
    }
    if(specIdx>=0){const after=lines[specIdx].replace(/^.*?\bSpec\b\s*[:;.\-]?\s*/i,'').trim();
      if(after && !/^(part|net|gross|container)\b/i.test(after))out.spec=after;
      else if(specIdx>0 && /^\s*(?:[A-Za-z]{1,4}\s+)?[A-Za-z][A-Za-z\d /-]{1,24}$/.test(lines[specIdx-1])){
        out.spec=lines[specIdx-1].replace(/^[A-Za-z]{1,4}\s+(?=Mixed$)/i,'').trim();
      }
    }
    if(!out.spec && /\bMixed\b/i.test(text))out.spec='Mixed';
    // Rescue net for a common recognition error such as "gE NET".
    if(!out.labelNo){const l=lines.slice(0,7).join(' ').match(/\b(0\d{5,8})\b/);if(l)out.labelNo=l[1];}
    return out;
  }
  async function decodeQR(blob){
    if(!('BarcodeDetector' in window))return '';
    try{const detector=new BarcodeDetector({formats:['qr_code']});const bitmap=await imageToBitmap(blob);try{const found=await detector.detect(bitmap);return found[0]?.rawValue||'';}finally{if(bitmap.close)bitmap.close();}}catch(_){return '';}
  }
  async function recognizeLabel(force){
    if(busy)return;
    if(!draft.photos[0]){toast('请先拍摄标签照片（第 1 张）。');return;}
    try{
      setBusy(true);setProgress('识别标签中','第一次使用需要下载 OCR 语言识别文件；照片只在本机处理。',5);
      if(!window.Tesseract)throw new Error('OCR 程序尚未载入，请确认设备有联网并刷新网页。');
      if(!workerPromise){workerPromise=window.Tesseract.createWorker('eng',1,{logger:e=>{
        if(e.status==='recognizing text'&&typeof e.progress==='number')setProgress('正在识别标签',`文字识别 ${Math.round(e.progress*100)}%`,15+Math.round(e.progress*78));
      }});}
      const worker=await workerPromise;
      setProgress('正在识别标签','读取标签的号码、日期、重量…',20);
      const [result,qr]=await Promise.all([worker.recognize(draft.photos[0].blob),decodeQR(draft.photos[0].blob)]);
      const raw=result?.data?.text||'';
      const parsed=ocrParse(raw);
      if(qr){const qrParsed=ocrParse(qr);Object.keys(qrParsed).forEach(k=>{if(!parsed[k])parsed[k]=qrParsed[k];});}
      readForm();
      for(const [k,v] of Object.entries(parsed)){
        if(!FIELD_KEYS.includes(k)||!v)continue;
        if(force||!draft.fields[k]){draft.fields[k]=v;form.elements.namedItem(k).value=v;}
      }
      draft.ocrRaw=raw + (qr?`\n\n[QR Code]\n${qr}`:'');
      $('ocr-raw').textContent=draft.ocrRaw||'未识别到文字';
      const picked=Object.entries(parsed).filter(([k,v])=>v&&FIELD_KEYS.includes(k)).length;
      const confidence=result?.data?.confidence;
      $('ocr-status').textContent=`已识别 ${picked} 个字段${Number.isFinite(confidence)?` · 文本置信度 ${Math.round(confidence)}%`:''}。请核对 Label / Lot / Part / Net。`;
      if(picked<4)notice('本张标签识别较少：请确保照片清楚、光线充足并正对标签，或在下方手动修改资料。');else notice('');
      toast(`自动识别完成：找到 ${picked} 项字段，请核对准确性。`);
    }catch(err){workerPromise=undefined;notice(`OCR 识别未完成：${err.message}。可手动输入标签资料，照片仍能保存。`);$('ocr-status').textContent='识别失败，可手动填写或重试。';}
    finally{hideProgress();setBusy(false);}
  }

  async function save(){
    if(busy)return;readForm();
    const count=draft.photos.filter(Boolean).length;
    if(!draft.fields.labelNo){toast('请填写 Label No.');form.elements.namedItem('labelNo').focus();return;}
    if(!draft.photos[0]||!draft.photos[1]||count<2){toast('每个标签必须包含：标签照片（1）和物料照片（2）；第 3 张可选。');notice('保存前须至少放入标签照片 + 物料照片，共 2 张；最多 3 张。');return;}
    const others=records.filter(r=>r.id!==draft.id&&safeString(r.fields.labelNo)===draft.fields.labelNo);
    if(others.length&&!confirm(`Label ${draft.fields.labelNo} 已保存过 ${others.length} 组。确定仍要新增另一组照片吗？`))return;
    draft.updatedAt=new Date().toISOString();
    try{await putRecord(draft);await reload();$('form-state').textContent='已保存 · 可继续修改';$('btn-delete').hidden=false;toast(`Label ${draft.fields.labelNo} 已保存（${count} 张照片）。`);notice('');}
    catch(err){notice('保存失败：'+err.message+'。可尝试减少照片大小、检查浏览器储存空间。');}
  }
  async function deleteCurrent(){
    if(!records.some(r=>r.id===draft.id))return;
    if(!confirm(`确定要删除 Label ${draft.fields.labelNo} 的整组记录和所有照片吗？删除后无法撤销。`))return;
    await removeRecord(draft.id);newDraft();await reload();toast('已删除这组标签和照片。');
  }
  function excelTheme(cell,isHeader=false){cell.alignment={vertical:'middle',wrapText:true};if(isHeader){cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1D4266'}};cell.font={bold:true,color:{argb:'FFFFFFFF'},size:10};}else{cell.font={color:{argb:'FF1E3651'},size:10};}}
  function numOrEmpty(value){return value!=='' && value!==null && Number.isFinite(Number(value))?Number(value):safeString(value);}
  // One record per row. The first 3 columns are reserved for inline photos;
  // the data fields begin in column D (Label No.).
  function sheetRows(){return records.map(r=>{const f=r.fields;return [
    safeString(f.labelNo),safeString(f.lotNo),safeString(f.description),safeString(f.spec),safeString(f.partNo),
    numOrEmpty(f.netKg),numOrEmpty(f.containerKg),numOrEmpty(f.grossKg),safeString(f.date),
    safeString(f.weigher),safeString(f.checker),safeString(f.source),safeString(f.taxCode),
    safeString(f.warehouse),safeString(f.location),safeString(f.racking),safeString(f.row),
    safeString(f.remarks),r.photos.filter(Boolean).length,
    safeString(r.updatedAt).replace('T',' ').slice(0,19)
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
    if(!records.length){toast('没有已保存的标签可导出。');return;}
    if(!window.ExcelJS){notice('Excel 程序未加载。请连接互联网后刷新网页重试。');return;}
    try{
      setBusy(true);setProgress('制作 Excel 文件','正在建立照片与标签同一行的表格…',3);
      const wb=new window.ExcelJS.Workbook();
      wb.creator='Label Photo Register';wb.created=new Date();
      // Intentionally ONE worksheet: all photos and information stay in the same row.
      const sheet=wb.addWorksheet('Label Records',{views:[{state:'frozen',ySplit:3}]});
      const headers=[
        'Photo 1 File','Photo 2 File','Photo 3 File',
        'Label No.','Lot No.','Description','Spec','Part No.',
        'Net (KG)','Container (KG)','Gross (KG)','Date','Weigher','Check',
        'Source','Tax Code','Warehouse','Location','Racking No.','Row No.',
        'Remarks','Photo Count','Last Saved'
      ];
      const widths=[17,17,17,16,17,41,20,23,15,16,15,17,15,15,21,12,16,16,15,13,28,14,23];
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
        wsRow.height=79; // small, consistently sized thumbnail rows (~105 px)
        wsRow.eachCell({includeEmpty:true},(c,col)=>{
          excelTheme(c);
          c.alignment={vertical:'middle',wrapText:true,horizontal:col<=3?'center':'left'};
          if(i%2===1)c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF3F7FB'}};
          if(col<=3)c.border={top:{style:'hair',color:{argb:'FFD6E3F0'}},bottom:{style:'hair',color:{argb:'FFD6E3F0'}},left:{style:'hair',color:{argb:'FFD6E3F0'}},right:{style:'hair',color:{argb:'FFD6E3F0'}}};
          if([4,5,8,16].includes(col))c.numFmt='@'; // keep leading-zero IDs as text
          if([9,10,11].includes(col)&&typeof c.value==='number')c.numFmt='0.000';
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
      const colWidthPx=124; // ExcelJS width 17 is approximately 124px
      const rowHeightPx=79*4/3; // Excel row height is expressed in points
      const maxPhotoW=110,maxPhotoH=94;
      for(let i=0;i<records.length;i++){
        const r=records[i],rowIndex=i+4;
        setProgress('正在把小照片插入 Excel',`Label ${safeString(r.fields.labelNo)} · 第 ${i+1}/${records.length} 组`,10+Math.round(78*i/records.length));
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
      setProgress('正在生成 Excel 文件','正在封装单张工作表及所有嵌入照片…',92);
      const buffer=await wb.xlsx.writeBuffer();
      download(new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`Label_Photos_Inline_${timestamp()}.xlsx`);
      toast(`Excel 导出完成：${records.length} 组，照片与资料全部在同一张工作表。`);
    }catch(e){notice('Excel 导出失败：'+e.message);}
    finally{hideProgress();setBusy(false);}
  }

  function fileSegment(str){return safeString(str).replace(/[^\w\-]/g,'_').slice(0,40)||'unknown';}
  function escCsv(v){const s=safeString(v);return /[",\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;}
  async function exportZip(){
    if(busy)return;if(!records.length){toast('没有已保存的标签可备份。');return;}
    if(!window.JSZip){notice('ZIP 程序未加载。请连接互联网后刷新重试。');return;}
    try{
      setBusy(true);setProgress('制作照片备份','包含应用保存的高清照片及完整记录',5);
      const zip=new window.JSZip();const manifest={app:'TMC Label Photo Register',version:'1.0',exportedAt:new Date().toISOString(),records:[]};
      for(let i=0;i<records.length;i++){
        const rec=records[i],clone={id:rec.id,fields:rec.fields,createdAt:rec.createdAt,updatedAt:rec.updatedAt,ocrRaw:rec.ocrRaw||'',photos:[null,null,null]};
        for(let j=0;j<3;j++){
          const p=rec.photos[j];if(!p)continue;
          const path=`photos/${String(i+1).padStart(4,'0')}_${fileSegment(rec.fields.labelNo)}/photo_${j+1}.jpg`;
          zip.file(path,p.blob);clone.photos[j]={path,name:p.name,takenAt:p.takenAt||''};
        }
        manifest.records.push(clone);
        setProgress('制作照片备份',`整理 Label ${rec.fields.labelNo} (${i+1}/${records.length})`,8+Math.round(35*(i+1)/records.length));
      }
      zip.file('records.json',JSON.stringify(manifest,null,2));
      zip.file('label_records.csv','\uFEFF'+[['Label No.','Lot No.','Description','Spec','Part No.','Net (KG)','Container (KG)','Gross (KG)','Date','Weigher','Check','Source','Tax Code','Warehouse','Location','Racking No.','Row No.','Remarks','Photo Count','Photo 1 File','Photo 2 File','Photo 3 File','Last Saved'].join(','),...sheetRows().map(r=>r.map(escCsv).join(','))].join('\r\n'));
      const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:4}},meta=>setProgress('正在压缩照片',`已完成 ${Math.round(meta.percent)}%`,43+Math.round(meta.percent*.55)));
      download(blob,`TMC_Label_Backup_${timestamp()}.zip`);toast('ZIP 备份完成，包含所有照片和资料。');
    }catch(e){notice('ZIP 导出失败：'+e.message);}
    finally{hideProgress();setBusy(false);}
  }
  async function importZip(file){
    if(!file||busy)return;
    if(!window.JSZip){notice('ZIP 程序未加载。请连接互联网后刷新重试。');return;}
    try{
      setBusy(true);setProgress('读取备份','正在检查 ZIP 内容',5);
      const zip=await window.JSZip.loadAsync(file);const meta=zip.file('records.json');if(!meta)throw new Error('ZIP 内没有 records.json，这不是 TMC 应用备份。');
      const manifest=JSON.parse(await meta.async('string'));
      if(manifest.app!=='TMC Label Photo Register'||!Array.isArray(manifest.records))throw new Error('备份格式不正确');
      if(!confirm(`备份包含 ${manifest.records.length} 组标签。导入后同编号 ID 的记录会更新，其他记录保留。是否继续？`))return;
      for(let i=0;i<manifest.records.length;i++){
        const m=manifest.records[i];const r={id:m.id||freshRecord().id,fields:{...freshRecord().fields,...m.fields},photos:[null,null,null],createdAt:m.createdAt||new Date().toISOString(),updatedAt:m.updatedAt||new Date().toISOString(),ocrRaw:m.ocrRaw||''};
        for(let j=0;j<3;j++){
          const p=m.photos&&m.photos[j];if(!p)continue;
          if(!p.path||p.path.includes('..')||p.path.startsWith('/'))throw new Error('备份照片路径不正确');
          const f=zip.file(p.path);if(!f)throw new Error('备份照片缺失：'+p.path);
          const blob=await f.async('blob');r.photos[j]={blob:new Blob([blob],{type:'image/jpeg'}),name:p.name||`photo_${j+1}.jpg`,takenAt:p.takenAt||''};
        }
        await putRecord(r);setProgress('恢复标签记录',`${i+1} / ${manifest.records.length}`,10+Math.round(88*(i+1)/manifest.records.length));
      }
      await reload();newDraft();toast(`备份导入完成：${manifest.records.length} 组标签。`);notice('');
    }catch(err){notice('导入备份失败：'+err.message);}
    finally{hideProgress();setBusy(false);$('zip-import-input').value='';}
  }
  function addDeleteButton(){const b=document.createElement('button');b.type='button';b.id='btn-delete';b.className='button button-outline';b.textContent='删除本组';b.hidden=true;b.style.color='#aa4343';$('btn-clear').before(b);b.addEventListener('click',()=>deleteCurrent().catch(e=>notice(e.message)));}
  async function start(){
    addDeleteButton();loadToForm();
    document.querySelectorAll('[data-photo-action]').forEach(b=>b.addEventListener('click',()=>{
      const slot=Number(b.dataset.slot),action=b.dataset.photoAction;
      if(action==='remove'){if(busy)return;draft.photos[slot]=null; if(slot===0){draft.ocrRaw='';$('ocr-raw').textContent='暂无识别内容';$('ocr-status').textContent='上传标签照片后自动识别。';}renderPhotos();return;}
      chosenSlot=slot;const input=action==='camera'?$('camera-input'):$('picker-input');input.value='';input.click();
    }));
    for(const input of [$('camera-input'),$('picker-input')])input.addEventListener('change',e=>{if(e.target.files&&e.target.files[0])setPhoto(chosenSlot,e.target.files[0]);});
    form.addEventListener('submit',event=>{event.preventDefault();save();});
    $('btn-new').addEventListener('click',newDraft);$('btn-side-new').addEventListener('click',newDraft);$('btn-clear').addEventListener('click',newDraft);
    $('btn-ocr').addEventListener('click',()=>recognizeLabel(true));
    $('btn-excel').addEventListener('click',exportExcel);$('btn-zip').addEventListener('click',exportZip);$('btn-import').addEventListener('click',()=>$('zip-import-input').click());$('zip-import-input').addEventListener('change',e=>{if(e.target.files?.[0])importZip(e.target.files[0]);});
    $('search-records').addEventListener('input',renderList);
    try{db=await dbOpen();await reload();}catch(err){notice('无法使用本机储存：'+err.message+'。请使用最新版 Chrome / Edge 并允许网站储存资料。');}
    if(location.protocol==='file:')notice('当前使用 file:// 方式打开；建议将整个文件夹部署到 GitHub Pages（HTTPS），以便 OCR、保存及 PWA 更稳定。');
    if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js?v=1.2').catch(()=>{});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
