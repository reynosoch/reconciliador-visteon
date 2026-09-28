import {normalizePartNumber,normalizeText,toNumber} from "../domain/normalize.js";
import {resolve4WallArea} from "./parse4WallAreas.js";
function getPartNumber(row){return normalizePartNumber(row["Número Parte QAD"]??row["Numero Parte QAD"]??row.numero_parte??row["Numero de parte"]??"");}
function parseQuantity(value){const raw=String(value??"").trim();if(!raw)return {valid:false,value:null,raw};const cleaned=raw.replace(/,/g,"").trim();const parsed=Number(cleaned);return Number.isFinite(parsed)?{valid:true,value:parsed,raw}:{valid:false,value:null,raw};}
function getArea(row){return normalizeText(row["AreaName"]??row.area_escaneo??"");}
export function parse4WallScans(rows=[],areaCatalog){
 const byPart=new Map(),unmappedAreaNames=new Set(),invalidQuantityRows=[];let scanCount=0,totalPhysicalQty=0;
 rows.forEach((row,index)=>{
  const partNumber=getPartNumber(row);if(!partNumber)return;
  const parsedQty=parseQuantity(row["Quantity"]??row.cantidad);
  if(!parsedQty.valid){invalidQuantityRows.push({rowNumber:index+2,partNumber,rawQuantity:parsedQty.raw});return;}
  const quantity=parsedQty.value,areaName=getArea(row),areaInfo=resolve4WallArea(areaName,areaCatalog);
  if(!areaInfo.found||!areaInfo.qadLocation)unmappedAreaNames.add(areaName||"(SIN ÁREA)");
  const qadLocation=areaInfo.qadLocation||"UNMAPPED";
  if(!byPart.has(partNumber))byPart.set(partNumber,{partNumber,physicalTotal:0,locations:new Map(),areas:new Set(),scanCount:0,standardCost4Wall:0,sourceRows:[]});
  const part=byPart.get(partNumber);part.physicalTotal+=quantity;part.scanCount++;part.areas.add(areaName);part.locations.set(qadLocation,(part.locations.get(qadLocation)||0)+quantity);
  const standardCost=toNumber(row["Costo Estándar"]??0);if(standardCost>0)part.standardCost4Wall=standardCost;
  part.sourceRows.push({ticket:row["Ticket/FIFO"]??null,areaName,qadLocation,quantity,scannedBy:row["Escaneador"]??null,auditor:row["auditor"]??null,responsible:row["Responsable"]??null,date:row["Fecha agregado"]??null});
  scanCount++;totalPhysicalQty+=quantity;
 });
 return {byPart,scanCount,totalPhysicalQty,unmappedAreaNames:[...unmappedAreaNames],unmappedAreaCount:unmappedAreaNames.size,invalidQuantityRows,invalidQuantityCount:invalidQuantityRows.length};
}
