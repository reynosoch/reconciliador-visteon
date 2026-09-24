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
         const parsed =
           await parseDelimitedFile(
             file
           );

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