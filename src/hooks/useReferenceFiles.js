// src/hooks/useReferenceFiles.js
import {
 useCallback,
 useMemo,
 useState,
} from "react";
import {
 parseDelimitedFile,
} from "../parsers/parseDelimitedFile";

const EMPTY_SOURCE = {
 file: null,
 fileName: "",
 rows: [],
 fields: [],
 delimiter: "",
 loading: false,
 loaded: false,
 error: null,
 loadedAt: null,
 fingerprint: "",
};

function createInitialState() {
 return {
   areas: {
     ...EMPTY_SOURCE,
   },
   qad: {
     ...EMPTY_SOURCE,
   },
   ispbb: {
     ...EMPTY_SOURCE,
   },
   bom: {
     ...EMPTY_SOURCE,
   },
   cost: {
     ...EMPTY_SOURCE,
   },
 };
}

/**
* Fuentes válidas del inventario.
*
* 4Wall LIVE no aparece aquí porque
* viene de Supabase mediante
* useInventoryEngine.
*/
export const REFERENCE_SOURCE_TYPES = {
 AREAS: "areas",
 QAD: "qad",
 ISPBB: "ispbb",
 BOM: "bom",
 COST: "cost",
};

export const REFERENCE_SOURCE_LABELS = {
 areas:
   "4Wall Areas",
 qad:
   "QAD 3.2",
 ispbb:
   "ISPBB / Phantoms",
 bom:
   "BOM Export",
 cost:
   "Cost Part Browse",
};

/**
* Hook responsable de los archivos
* congelados / referencia.
*
* NO interpreta las reglas de negocio.
*
* Su trabajo es únicamente:
*
* Archivo
*   ↓
* PapaParse
*   ↓
* Rows
*
* Después inventoryEngine procesa
* las filas.
*/
const REQUIRED_FIELDS = {
 areas: [["Nombre"], ["Localidad QAD"]],
 qad: [["Item Number"], ["Site"], ["Location"], ["Quantity On Hand"], ["Item Type"]],
 ispbb: [["Item Number"], ["Site"], ["Phantom"]],
 bom: [["Parent Item"], ["Component"], ["Usage"]],
 cost: [["Item Number"], ["Cost Total"], ["Status"]],
};
function validateRequiredFields(sourceType, fields = []) {
 const available = new Set(fields.map((field) => String(field).trim()));
 const missing = (REQUIRED_FIELDS[sourceType] || []).filter((group) => !group.some((field) => available.has(field))).map((group) => group.join(" / "));
 if (missing.length) throw new Error(`Archivo inválido para ${REFERENCE_SOURCE_LABELS[sourceType] || sourceType}. Faltan columnas: ${missing.join(", ")}.`);
}
async function fingerprintFile(file) {
 if (!globalThis.crypto?.subtle) {
   return "";
 }
 const buffer = await file.arrayBuffer();
 const digest = await globalThis.crypto.subtle.digest("SHA-256", buffer);
 return Array.from(new Uint8Array(digest))
   .map((byte) => byte.toString(16).padStart(2, "0"))
   .join("");
}

export function useReferenceFiles() {
 const [
   sources,
   setSources,
 ] = useState(
   createInitialState
 );

 // ==========================================
 // CARGAR ARCHIVO
 // ==========================================
 const loadFile =
   useCallback(
     async (
       sourceType,
       file
     ) => {
       if (
         !Object.values(
           REFERENCE_SOURCE_TYPES
         ).includes(sourceType)
       ) {
         throw new Error(
           `Fuente desconocida: ${sourceType}`
         );
       }

       if (!file) {
         throw new Error(
           "No se seleccionó ningún archivo."
         );
       }

       // Primero marcamos loading.
       setSources(
         (previous) => ({
           ...previous,
           [sourceType]: {
             ...previous[
               sourceType
             ],
             file,
             fileName:
               file.name,
             loading:
               true,
             error:
               null,
           },
         })
       );

       try {
         const [parsed, fingerprint] =
           await Promise.all([
             parseDelimitedFile(file),
             fingerprintFile(file),
           ]);

         validateRequiredFields(sourceType, parsed.fields);\n         const required=(REQUIRED_FIELDS[sourceType]||[]).flat();\n         const ambiguous=(parsed.duplicateHeaders||[]).filter(name=>required.includes(name));\n         if(ambiguous.length) throw new Error(`Archivo ambiguo: la columna necesaria ${ambiguous.join(", ")} aparece más de una vez.`);

         const seriousErrors =
           (
             parsed.errors ?? []
           ).filter(
             (error) =>
               error.type !==
               "FieldMismatch"
           );

         /**
          * PapaParse puede reportar
          * algunos FieldMismatch en
          * archivos exportados por QAD.
          *
          * No detenemos automáticamente
          * toda la carga por eso.
          */
         if (
           seriousErrors.length >
           0
         ) {
           console.warn(
             `Advertencias parseando ${file.name}:`,
             seriousErrors
           );
         }

         setSources(
           (previous) => ({
             ...previous,
             [sourceType]: {
               file,
               fileName:
                 parsed.fileName,
               rows:
                 parsed.rows,
               fields:
                 parsed.fields,
               delimiter:
                 parsed.delimiter,
               loading:
                 false,
               loaded:
                 true,
               error:
                 null,
               loadedAt:
                 new Date(),
               fingerprint,
             },
           })
         );

         return {
           sourceType,
           fileName:
             parsed.fileName,
           rowCount:
             parsed.rows.length,
           fields:
             parsed.fields,
           delimiter:
             parsed.delimiter,
           fingerprint,
           parseErrors:
             parsed.errors ?? [],
         };
       } catch (error) {
         console.error(
           `Error cargando ${sourceType}:`,
           error
         );

         setSources(
           (previous) => ({
             ...previous,
             [sourceType]: {
               ...EMPTY_SOURCE,
               file,
               fileName:
                 file.name,
               error:
                 error instanceof Error
                   ? error
                   : new Error(
                       "Error desconocido leyendo archivo."
                     ),
             },
           })
         );

         throw error;
       }
     },
     []
   );

 // ==========================================
 // LIMPIAR UNA FUENTE
 // ==========================================
 const clearFile =
   useCallback(
     (sourceType) => {
       if (
         !Object.values(
           REFERENCE_SOURCE_TYPES
         ).includes(sourceType)
       ) {
         return;
       }

       setSources(
         (previous) => ({
           ...previous,
           [sourceType]: {
             ...EMPTY_SOURCE,
           },
         })
       );
     },
     []
   );

 // ==========================================
 // LIMPIAR TODO
 // ==========================================
 const clearAll =
   useCallback(() => {
     setSources(
       createInitialState()
     );
   }, []);

 // ==========================================
 // ATAJOS DE ROWS
 // ==========================================
 const areaRows =
   sources.areas.rows;
 const qadRows =
   sources.qad.rows;
 const ispbbRows =
   sources.ispbb.rows;
 const bomRows =
   sources.bom.rows;
 const costRows =
   sources.cost.rows;

 // ==========================================
 // ESTADO GENERAL
 // ==========================================
 const status =
   useMemo(() => {
     const entries =
       Object.entries(
         sources
       );

     const loaded =
       entries.filter(
         ([, source]) =>
           source.loaded
       );

     const loading =
       entries.filter(
         ([, source]) =>
           source.loading
       );

     const errors =
       entries.filter(
         ([, source]) =>
           Boolean(
             source.error
           )
       );

     const missing =
       entries.filter(
         ([, source]) =>
           !source.loaded
       );

     return {
       totalSources:
         entries.length,
       loadedCount:
         loaded.length,
       loadingCount:
         loading.length,
       errorCount:
         errors.length,
       missingCount:
         missing.length,
       allLoaded:
         loaded.length ===
         entries.length,
       hasErrors:
         errors.length > 0,
       loadedSources:
         loaded.map(
           ([key]) => key
         ),
       missingSources:
         missing.map(
           ([key]) => key
         ),
       errorSources:
         errors.map(
           ([key]) => key
         ),
     };
   }, [sources]);

 // ==========================================
 // SALIDA
 // ==========================================
 return {
   sources,
   status,

   // Filas listas para inventoryEngine.
   areaRows,
   qadRows,
   ispbbRows,
   bomRows,
   costRows,

   // Acciones.
   loadFile,
   clearFile,
   clearAll,
 };
}