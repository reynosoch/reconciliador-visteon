// src/services/supabase.js
const SUPABASE_URL =
 import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY =
 import.meta.env.VITE_SUPABASE_ANON_KEY;

function validateConfig() {
 if (!SUPABASE_URL) {
   throw new Error(
     "Falta VITE_SUPABASE_URL en .env.local"
   );
 }
 if (!SUPABASE_ANON_KEY) {
   throw new Error(
     "Falta VITE_SUPABASE_ANON_KEY en .env.local"
   );
 }
}

function getHeaders(from, to) {
 return {
   apikey: SUPABASE_ANON_KEY,
   Authorization:
     `Bearer ${SUPABASE_ANON_KEY}`,
   "Range-Unit": "items",
   Range: `${from}-${to}`,
 };
}

/**
* Obtiene todos los registros vigentes
* de escaneos_4wall.
*
* Supabase / PostgREST normalmente limita
* los resultados a 1,000 filas.
*
* Por eso descargamos:
*
* 0-999
* 1000-1999
* 2000-2999
* ...
*/
export async function fetch4WallScans({
 signal,
 pageSize = 1000,
} = {}) {
 validateConfig();
 const allRows = [];
 let from = 0;
 let keepFetching = true;

 while (keepFetching) {
   const to =
     from + pageSize - 1;

   const endpoint =
     `${SUPABASE_URL}` +
     `/rest/v1/escaneos_4wall` +
     `?select=id,numero_parte,cantidad,area_escaneo` +
     `&order=id.asc`;

   const response =
     await fetch(
       endpoint,
       {
         method: "GET",
         headers:
           getHeaders(
             from,
             to
           ),
         signal,
       }
     );

   if (!response.ok) {
     const detail =
       await response
         .text()
         .catch(() => "");
     throw new Error(
       `Supabase HTTP ${response.status}: ${detail}`
     );
   }

   const chunk =
     await response.json();

   if (!Array.isArray(chunk)) {
     throw new Error(
       "Supabase regresó una respuesta inesperada."
     );
   }

   allRows.push(
     ...chunk
   );

   if (
     chunk.length <
     pageSize
   ) {
     keepFetching = false;
   } else {
     from += pageSize;
   }
 }

 return {
   rows: allRows,
   count:
     allRows.length,
   fetchedAt:
     new Date(),
 };
}

/**
* Función pequeña para verificar
* únicamente que Supabase responde.
*/
export async function checkSupabaseConnection({
 signal,
} = {}) {
 validateConfig();

 const endpoint =
   `${SUPABASE_URL}` +
   `/rest/v1/escaneos_4wall` +
   `?select=id&limit=1`;

 const response =
   await fetch(
     endpoint,
     {
       method: "GET",
       headers: {
         apikey:
           SUPABASE_ANON_KEY,
         Authorization:
           `Bearer ${SUPABASE_ANON_KEY}`,
       },
       signal,
     }
   );

 return response.ok;
}