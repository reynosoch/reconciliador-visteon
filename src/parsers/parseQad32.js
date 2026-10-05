import {normalizePartNumber,normalizeQadLocation,normalizeSite,normalizeText,toNumber} from "../domain/normalize.js";
const DEFAULT_ITEM_TYPES=new Set(["PP","MP","FP"]);
function parseQuantity(value){const raw=String(value??"").trim();if(!raw)return {valid:false,value:null,raw};const parsed=Number(raw.replace(/,/g,"").replace(/\$/g,"").trim());return Number.isFinite(parsed)?{valid:true,value:parsed,raw}:{valid:false,value:null,raw};}
export function parseQad32(rows=[],options={}){
 const {site="179A",filterItemTypes=true}=options,targetSite=normalizeSite(site),byPart=new Map(),invalidQuantityRows=[];let acceptedRows=0,ignoredRows=0;
 rows.forEach((row,index)=>{
  const rowSite=normalizeSite(row["Site"]);if(targetSite&&rowSite!==targetSite){ignoredRows++;return;}
  const itemType=normalizeText(row["Item Type"]);if(filterItemTypes&&!DEFAULT_ITEM_TYPES.has(itemType)){ignoredRows++;return;}
  const partNumber=normalizePartNumber(row["Item Number"]);if(!partNumber){ignoredRows++;return;}
  const parsedQty=parseQuantity(row["Quantity On Hand"]);if(!parsedQty.valid){invalidQuantityRows.push({rowNumber:index+2,partNumber,site:rowSite,rawQuantity:parsedQty.raw});ignoredRows++;return;}
  const location=normalizeQadLocation(row["Location"])||"NO_LOCATION",quantity=parsedQty.value,invMasterQty=toNumber(row["Qty On Hand - Inv Mstr"]);
  if(!byPart.has(partNumber))byPart.set(partNumber,{partNumber,site:rowSite,itemType,status:normalizeText(row["Status"]),sourceIndices:[],locations:new Map(),qadTotal:0,qadWarehouse:0,qadWip:0,invMasterQty,inventoryStatuses:new Set()});
  const item=byPart.get(partNumber);item.sourceIndices.push(index);item.locations.set(location,(item.locations.get(location)||0)+quantity);item.qadTotal+=quantity;if(location==="ZWHSE")item.qadWarehouse+=quantity;if(location==="ZWIP")item.qadWip+=quantity;
  const inventoryStatus=normalizeText(row["Inventory Status"]);if(inventoryStatus)item.inventoryStatuses.add(inventoryStatus);if(item.invMasterQty===0&&invMasterQty!==0)item.invMasterQty=invMasterQty;acceptedRows++;
 });
 for(const item of byPart.values())item.detailVsInvMasterDelta=item.qadTotal-item.invMasterQty;
 return {byPart,acceptedRows,ignoredRows,totalParts:byPart.size,invalidQuantityRows,invalidQuantityCount:invalidQuantityRows.length};
}
