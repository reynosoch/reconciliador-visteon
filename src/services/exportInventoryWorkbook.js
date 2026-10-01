import { rawScanObject } from "../domain/scanView.js";
const enc = new TextEncoder();
const xml = (value) => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
const safe = (value) => value == null ? "" : typeof value === "boolean" ? (value ? "Sí" : "No") : String(value);
const n = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const col = (index) => { let x=index+1,out=""; while(x){ const r=(x-1)%26; out=String.fromCharCode(65+r)+out; x=Math.floor((x-1)/26); } return out; };
const ref = (r,c) => `${col(c)}${r+1}`;
const cleanSheet = (name) => String(name).replace(/[\\/?*[\]:]/g," ").slice(0,31) || "Hoja";

function crc32(bytes){let crc=0xffffffff;for(const b of bytes){crc^=b;for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function u16(v){return new Uint8Array([v&255,(v>>>8)&255]);}
function u32(v){return new Uint8Array([v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255]);}
function concat(parts){const size=parts.reduce((s,p)=>s+p.length,0),out=new Uint8Array(size);let at=0;for(const p of parts){out.set(p,at);at+=p.length;}return out;}
function zip(entries){const locals=[],centrals=[];let offset=0;for(const entry of entries){const name=enc.encode(entry.name),data=typeof entry.data==="string"?enc.encode(entry.data):entry.data,crc=crc32(data);const local=concat([u32(0x04034b50),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name,data]);locals.push(local);centrals.push(concat([u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]));offset+=local.length;}const central=concat(centrals);return concat([...locals,central,u32(0x06054b50),u16(0),u16(0),u16(entries.length),u16(entries.length),u32(central.length),u32(offset),u16(0)]);}

const STYLES={normal:0,title:1,section:2,header:3,text:4,integer:5,decimal:6,money:7,negativeMoney:8,positiveMoney:9,note:10,label:11,warning:12,good:13,muted:14};
function cell(value,rowIndex,colIndex,style="normal"){
  const r=ref(rowIndex,colIndex),s=STYLES[style]??0;
  if(value===null||value===undefined||value==="") return `<c r="${r}" s="${s}"/>`;
  if(typeof value==="number"&&Number.isFinite(value)) return `<c r="${r}" s="${s}"><v>${value}</v></c>`;
  return `<c r="${r}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xml(safe(value))}</t></is></c>`;
}
function sheetXml({rows,widths=[],merges=[],freeze=0,autoFilter=null}){
  const body=rows.map((row,ri)=>`<row r="${ri+1}"${row.height?` ht="${row.height}" customHeight="1"`:""}>${row.cells.map((c,ci)=>cell(c.value,ri,ci,c.style)).join("")}</row>`).join("");
  const cols=widths.length?`<cols>${widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join("")}</cols>`:"";
  const pane=freeze?`<sheetViews><sheetView workbookViewId="0"><pane ySplit="${freeze}" topLeftCell="A${freeze+1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`:`<sheetViews><sheetView workbookViewId="0"/></sheetViews>`;
  const mergeXml=merges.length?`<mergeCells count="${merges.length}">${merges.map(m=>`<mergeCell ref="${m}"/>`).join("")}</mergeCells>`:"";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${pane}<sheetFormatPr defaultRowHeight="18"/>${cols}<sheetData>${body}</sheetData>${autoFilter?`<autoFilter ref="${autoFilter}"/>`:""}${mergeXml}<pageMargins left="0.35" right="0.35" top="0.5" bottom="0.5" header="0.2" footer="0.2"/></worksheet>`;
}
const row=(cells,height)=>({cells:cells.map(c=>typeof c==="object"&&c&&"value" in c?c:{value:c,style:"normal"}),height});
const C=(value,style="text")=>({value,style});

function objectSheet(title,description,objects,preferred=[]){
  const keys=preferred.length?preferred:Array.from(new Set(objects.flatMap(o=>Object.keys(o))));
  const rows=[row([C(title,"title"),...Array(Math.max(0,keys.length-1)).fill(C("","title"))],30),row([C(description,"note"),...Array(Math.max(0,keys.length-1)).fill(C("","note"))],34),row(keys.map(k=>C(k,"header")),34)];
  for(const obj of objects){rows.push(row(keys.map(k=>{const v=obj[k];const money=/USD|Costo unitario/.test(k);const integer=/piezas|Físico|QAD|Escaneos/.test(k)&&!money;return C(v,money?(Number(v)<0?"negativeMoney":Number(v)>0?"positiveMoney":"money"):integer?"decimal":"text");})));}
  return {name:cleanSheet(title),rows,widths:keys.map(k=>Math.min(42,Math.max(13,k.length+3))),merges:[`A1:${col(Math.max(0,keys.length-1))}1`,`A2:${col(Math.max(0,keys.length-1))}2`],freeze:3,autoFilter:objects.length?`A3:${col(keys.length-1)}${objects.length+3}`:null};
}
function flattenRows(rows=[]){return rows.map(item=>({
  "Part Number":item.partNumber,
  "Descripción (Cost Part / ISPBB)":item.master?.description||"",
  "Estado (motor)":item.flags?.financialStatus||"",
  "Físico total (4Wall + BOM)":n(item.physical?.total),
  "Cantidad escaneada original (4Wall)":n(item.physical?.scannedTotal ?? item.physical?.directTotal),
  "Físico directo (4Wall)":n(item.physical?.directTotal),
  "Ajuste BOM (BOM + ISPBB)":n(item.physical?.bomContribution),
  "QAD total (QAD 3.2)":n(item.qad?.total),
  "Diferencia piezas (Físico − QAD)":n(item.financial?.netPieces),
  "Costo unitario (Cost Part)":item.master?.hasCost?n(item.master?.unitCost):null,
  "Estado costo (Cost Part)":item.master?.costState||"",
  "NET USD (Físico/QAD/Cost Part)":item.master?.hasCost?n(item.financial?.netUsd):null,
  "Pérdida USD (motor)":item.master?.hasCost?n(item.financial?.grossLossUsd):null,
  "Ganancia USD (motor)":item.master?.hasCost?n(item.financial?.grossGainUsd):null,
  "SWING piezas (4Wall vs QAD por localidad)":n(item.financial?.swingPieces),
  "SWING USD (SWING × Cost Part)":item.master?.hasCost?n(item.financial?.swingUsd):null,
  "Obsoleto (Cost Part)":item.flags?.isObsolete===true,
  "Phantom (ISPBB)":item.flags?.isPhantom===true,
  "Inesperado (4Wall/QAD)":item.flags?.isUnexpectedMaterial===true,
  "Sin físico (QAD vs 4Wall)":item.flags?.isMissingPhysical===true,
  "Área sin mapear (4Wall-Area)":item.flags?.hasUnmappedPhysicalLocation===true,
  "Referencia BOM (BOM)":item.flags?.hasBomReference===true,
  "Escaneos (4Wall)":n(item.physical?.scanCount),
  "Áreas 4Wall (4Wall)":(item.physical?.areas||[]).join(" | ")
}));}
function locationRows(rows=[]){
  const out=[];
  for(const item of rows){
    const sourceRows=item.trace?.sourceRows||[];
    for(const loc of item.trace?.swingByLocation||[]){
      const matched=sourceRows.filter(r=>String(r.qadLocation||"").toUpperCase()===String(loc.location||"").toUpperCase());
      const areas=[...new Set(matched.map(r=>r.areaName).filter(Boolean))];
      out.push({
        "Part Number":item.partNumber,
        "Área 4Wall (archivo 4Wall)":areas.join(" | ")||"Sin área física para esta localidad",
        "Localidad QAD normalizada (diccionario 4Wall-Area)":loc.location,
        "Físico (4Wall)":n(loc.physicalQty),
        "QAD (QAD 3.2)":n(loc.qadQty),
        "Diferencia (Físico − QAD)":n(loc.delta),
        "SWING piezas":n(loc.swingPieces),
        "Costo unitario (Cost Part)":item.master?.hasCost?n(item.master?.unitCost):null,
        "Impacto diferencia USD":item.master?.hasCost?n(loc.delta)*n(item.master?.unitCost):null,
        "SWING USD":item.master?.hasCost?n(loc.swingPieces)*n(item.master?.unitCost):null
      });
    }
  }
  return out;
}
function findingRows(findings=[]){return findings.map(f=>({
  "Part Number":f.partNumber,"Tipo":f.ruleCode,"Categoría":f.category,"Etiquetas":(f.tags||[]).join(" | "),"NET piezas":n(f.netPieces),"NET USD":f.netUsd,"Localidades":(f.locations||[]).join(" | "),"Qué encontramos":f.whatFound,"Qué podría explicarlo":f.possibleExplanation,"Qué revisar":f.nextAction,"Valoración":f.valuationState,"Estado de conteo":f.countState
}));}
function rawScanRows(scanRows=[]) {
  return scanRows.map(row => {
    const raw = rawScanObject(row);
    return {...raw, "[USADO] Part Number":raw["Número Parte QAD"], "[USADO] Cantidad":raw.Quantity, "[USADO] Área":raw.AreaName};
  });
}

function buildPackage(sheets,title,filePrefix){
  const entries=[];
  entries.push({name:"[Content_Types].xml",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`});
  entries.push({name:"_rels/.rels",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`});
  entries.push({name:"xl/workbook.xml",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${sheets.map((s,i)=>`<sheet name="${xml(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join("")}</sheets></workbook>`});
  entries.push({name:"xl/_rels/workbook.xml.rels",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`});
  entries.push({name:"xl/styles.xml",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="3"><numFmt numFmtId="164" formatCode="$#,##0.00;[Red]-$#,##0.00"/><numFmt numFmtId="165" formatCode="$#,##0.00"/><numFmt numFmtId="166" formatCode="#,##0.00"/></numFmts><fonts count="5"><font><sz val="10"/><name val="Aptos"/><color rgb="FF0F172A"/></font><font><b/><sz val="20"/><name val="Aptos Display"/><color rgb="FFFFFFFF"/></font><font><b/><sz val="11"/><name val="Aptos"/><color rgb="FFFFFFFF"/></font><font><b/><sz val="10"/><name val="Aptos"/><color rgb="FF00293F"/></font><font><sz val="9"/><name val="Aptos"/><color rgb="FF475569"/></font></fonts><fills count="7"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF00293F"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF5821F"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEFF6FA"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF3CD"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE7F7ED"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD9E2E8"/></left><right style="thin"><color rgb="FFD9E2E8"/></right><top style="thin"><color rgb="FFD9E2E8"/></top><bottom style="thin"><color rgb="FFD9E2E8"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="15"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFill="1" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFill="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="3" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/><xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/><xf numFmtId="164" fontId="0" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/><xf numFmtId="165" fontId="0" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="4" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFill="1" applyFont="1" applyBorder="1"/><xf numFmtId="0" fontId="3" fillId="5" borderId="1" xfId="0" applyFill="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment wrapText="1"/></xf><xf numFmtId="0" fontId="3" fillId="6" borderId="1" xfId="0" applyFill="1" applyFont="1" applyBorder="1"/><xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyBorder="1"/></cellXfs></styleSheet>`});
  sheets.forEach((s,i)=>entries.push({name:`xl/worksheets/sheet${i+1}.xml`,data:sheetXml(s)}));
  const iso=new Date().toISOString();
  entries.push({name:"docProps/core.xml",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xml(title)}</dc:title><dc:creator>Visteon Inventory Reconciler</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${iso}</dcterms:created></cp:coreProperties>`});
  entries.push({name:"docProps/app.xml",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Visteon Inventory Reconciler</Application></Properties>`});
  const bytes=zip(entries),blob=new Blob([bytes],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  const stamp=new Date().toISOString().replace(/[:.]/g,"-").slice(0,19);a.href=url;a.download=`${filePrefix}-${stamp}.xlsx`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  return {fileName:a.download,bytes:bytes.length,sheets:sheets.length};
}

export async function exportInventoryWorkbook({inventory,summary,rows=[],findings=[],scanRows=[],sources={},snapshotMeta,lastUpdated,diagnostics}){
  const generated=new Date(),generatedText=generated.toLocaleString("es-MX",{dateStyle:"full",timeStyle:"medium"});
  const sourceList=["areas","qad","ispbb","bom","cost"].map(type=>({Fuente:type.toUpperCase(),Archivo:sources[type]?.fileName||"No cargado",Filas:sources[type]?.rows?.length??"",Huella:sources[type]?.fingerprint||"",Estado:sources[type]?.loaded?"Cargado":"Pendiente"}));
  const explanations=[
    ["Diferencia total en dólares","Suma del NET valorado. NET = físico total menos QAD total, multiplicado por costo. Si faltan costos, este total no representa esas diferencias sin valorar."],
    ["Pérdida bruta","Suma de los NET negativos valorados. Durante el conteo, un PN de QAD sin físico todavía puede estar pendiente de contar; no equivale automáticamente a pérdida confirmada."],
    ["Ganancia bruta","Suma de los NET positivos valorados. Es una diferencia para investigar, no una ganancia contable confirmada."],
    ["SWING","Suma de las diferencias absolutas por localidad. Sirve para encontrar material que podría estar físicamente en una localidad distinta de la registrada en QAD. No se divide entre dos."],
    ["Phantoms","Cantidad de Part Numbers identificados como Phantom por ISPBB. No se identifican por prefijos."],
    ["Sin valorar","Part Numbers con diferencia en piezas pero sin un costo confiable. No se muestran como USD 0 porque su impacto monetario es desconocido."],
    ["Sin físico registrado","QAD tiene cantidad positiva y el corte actual no tiene físico reconocido. En intradía puede significar que aún no termina el conteo."],
    ["Material inesperado","Existe físico pero QAD total es cero. Requiere revisar alcance, Site, localidad y registro."],
  ];
  const dashboard=[
    row([C("Visteon | Reconciliación de inventario","title"),C("","title"),C("","title")],34),
    row([C("Reporte de inventario","section"),C("","section"),C("","section")],24),
    row([C("Inventario","label"),C(inventory?.name||"Inventario actual","text"),C(generatedText,"text")]),
    row([C("Última consulta 4Wall","label"),C(lastUpdated?new Date(lastUpdated).toLocaleString("es-MX"):"No disponible","text"),C(snapshotMeta?.snapshotId||snapshotMeta?.consistencyToken||"Snapshot no expuesto","text")]),
    row([C("Advertencia","warning"),C("Los archivos usados en esta etapa son de prueba. Este reporte apoya la investigación y no confirma pérdidas reales de planta.","warning"),C("","warning")],34),
    row([C("Indicador","header"),C("Valor","header"),C("Qué significa","header")],28),
  ];
  const kpis=[
    ["Diferencia total en dólares",summary?.netUsd,"money",explanations[0][1]],
    ["Pérdida bruta",summary?.grossLossUsd,"negativeMoney",explanations[1][1]],
    ["Ganancia bruta",summary?.grossGainUsd,"positiveMoney",explanations[2][1]],
    ["SWING USD",summary?.swingUsd,"money",explanations[3][1]],
    ["SWING piezas",summary?.swingPieces,"integer",explanations[3][1]],
    ["Phantoms",summary?.phantomCount,"integer",explanations[4][1]],
    ["PN sin valorar",summary?.unvaluedPartCount,"integer",explanations[5][1]],
    ["QAD sin físico registrado",summary?.qadOnlyCount,"integer",explanations[6][1]],
    ["Material inesperado",summary?.unexpectedCount,"integer",explanations[7][1]],
    ["Part Numbers evaluados",summary?.totalParts,"integer","Universo consolidado de Part Numbers incluido en la conciliación actual."],
  ];
  for(const [label,value,style,meaning] of kpis) dashboard.push(row([C(label,"label"),C(n(value),style),C(meaning,"note")],42));

  const reconciliation=flattenRows(rows);
  const localities=locationRows(rows);
  const scans=rawScanRows(scanRows);
  const sheets=[
    {name:"Dashboard",rows:dashboard,widths:[31,24,72],merges:["A1:C1","A2:C2","B5:C5"],freeze:6},
    objectSheet("Conciliacion","Cada encabezado indica entre paréntesis la fuente usada para producir esa columna.",reconciliation,Object.keys(reconciliation[0]||{})),
    objectSheet("Localidades","Área 4Wall se traduce a Localidad QAD mediante el diccionario 4Wall-Area; así puede compararse contra la misma localidad del archivo QAD.",localities,Object.keys(localities[0]||{})),
    objectSheet("Hallazgos","Discrepancias para investigar. Varias etiquetas del mismo PN no duplican su NET.",findingRows(findings),["Part Number","Tipo","Categoría","Etiquetas","NET piezas","NET USD","Localidades","Qué encontramos","Qué podría explicarlo","Qué revisar","Valoración","Estado de conteo"]),
    objectSheet("4Wall actual","Cuando el pipeline conserva raw_record, se muestran todas las columnas del archivo original. Las columnas prefijadas [USADO] son las que alimentan la conciliación.",scans,Object.keys(scans[0]||{})),
    objectSheet("Fuentes","Archivos de referencia y huellas utilizados en este corte.",sourceList,["Fuente","Archivo","Filas","Huella","Estado"]),
    objectSheet("Guia","Definiciones del reporte.",explanations.map(([Indicador,Explicacion])=>({Indicador,Explicacion})),["Indicador","Explicacion"]),
  ];
  const result=buildPackage(sheets,"Visteon Inventory Reconciliation","Visteon-Inventario");
  return {...result,diagnostics};
}

export async function exportDiscrepanciesWorkbook({findings=[],inventoryName="Inventario",lastUpdated=null}={}){
  const generated=new Date();
  const summaryRows=[
    row([C("Visteon | Discrepancias por investigar","title"),C("","title"),C("","title")],34),
    row([C("Inventario","label"),C(inventoryName,"text"),C(generated.toLocaleString("es-MX"),"text")]),
    row([C("Última consulta 4Wall","label"),C(lastUpdated?new Date(lastUpdated).toLocaleString("es-MX"):"No disponible","text"),C("","text")]),
    row([C("Total de hallazgos","header"),C(findings.length,"integer"),C("Un PN puede tener más de un hallazgo.","note")],28),
  ];
  const details=findingRows(findings);
  const sheets=[
    {name:"Resumen",rows:summaryRows,widths:[30,34,64],merges:["A1:C1"]},
    objectSheet("Discrepancias","Detalle exportado directamente desde Discrepancias por investigar.",details,["Part Number","Tipo","Categoría","Etiquetas","NET piezas","NET USD","Localidades","Qué encontramos","Qué podría explicarlo","Qué revisar","Valoración","Estado de conteo"])
  ];
  return buildPackage(sheets,"Visteon Discrepancias","Visteon-Discrepancias");
}
