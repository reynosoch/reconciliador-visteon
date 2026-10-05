import {normalizePartNumber,normalizeStatus,normalizeText,isObsoleteStatus,toNumber} from "../domain/normalize.js";
function parseCostValue(value){
 const raw=String(value??"").trim();if(!raw)return {value:0,valid:false,raw};
 const negativeParentheses=raw.startsWith("(")&&raw.endsWith(")");
 const cleaned=raw.replace(/,/g,"").replace(/\$/g,"").replace(/%/g,"").replace(/\(/g,"").replace(/\)/g,"").trim();
 if(!cleaned)return {value:0,valid:false,raw};
 const parsed=Number(cleaned);if(!Number.isFinite(parsed))return {value:0,valid:false,raw};
 return {value:negativeParentheses?-Math.abs(parsed):parsed,valid:true,raw};
}
export function parseCostPart(rows=[]){
 const byPart=new Map(),duplicateParts=[],duplicateSeen=new Set(),conflictingDuplicateSeen=new Set(),invalidCostRows=[],sites=new Set();let acceptedRows=0,ignoredRows=0,zeroCostRows=0;
 rows.forEach((row,index)=>{
  const partNumber=normalizePartNumber(row["Item Number"]);if(!partNumber){ignoredRows++;return;}
  const site=normalizeText(row["Site"]);if(site)sites.add(site);const status=normalizeStatus(row["Status"]),parsedCost=parseCostValue(row["Cost Total"]);
  if(!parsedCost.valid)invalidCostRows.push({rowNumber:index+2,partNumber,site,rawCost:parsedCost.raw});else if(parsedCost.value===0)zeroCostRows++;
  const item={sourceIndices:[index],partNumber,site,description:String(row["Description"]??"").trim(),unitOfMeasure:normalizeText(row["Unit of Measure"]),productLine:normalizeText(row["Prod Line"]),itemType:normalizeText(row["Item Type"]),status,isObsolete:isObsoleteStatus(status),purchaseManufacture:normalizeText(row["Purchase/Manufacture"]),costTotal:parsedCost.value,hasValidCost:parsedCost.valid,rawCostTotal:parsedCost.raw,costConflict:false,costState:parsedCost.valid?"VALID":"INVALID",costBreakdown:{material:toNumber(row["Material"]),materialLL:toNumber(row["Material LL"]),subcontract:toNumber(row["Subcontract"]),subcontractLL:toNumber(row["Subcontract LL"]),overhead:toNumber(row["Overhead"]),overheadLL:toNumber(row["Overhead LL"]),labor:toNumber(row["Labor"]),laborLL:toNumber(row["Labor LL"]),burden:toNumber(row["Burden"]),burdenLL:toNumber(row["Burden LL"])}};
  const existing=byPart.get(partNumber);
  if(existing){
   existing.sourceIndices.push(index);
   if(!duplicateSeen.has(partNumber)){duplicateSeen.add(partNumber);duplicateParts.push({partNumber,firstSite:existing.site,duplicateSite:site,firstCost:existing.costTotal,duplicateCost:item.costTotal});}
   const conflicts=existing.site!==item.site||existing.status!==item.status||existing.hasValidCost!==item.hasValidCost||existing.costTotal!==item.costTotal;
   if(conflicts){conflictingDuplicateSeen.add(partNumber);existing.hasValidCost=false;existing.costConflict=true;existing.costState="CONFLICT";}
   acceptedRows++;return;
  }
  byPart.set(partNumber,item);acceptedRows++;
 });
 return {byPart,acceptedRows,ignoredRows,totalParts:byPart.size,obsoleteParts:[...byPart.values()].filter(x=>x.isObsolete).length,sites:[...sites].sort(),invalidCostRows,invalidCostCount:invalidCostRows.length,zeroCostRows,duplicateParts,duplicatePartCount:duplicateSeen.size,conflictingDuplicatePartCount:conflictingDuplicateSeen.size};
}
