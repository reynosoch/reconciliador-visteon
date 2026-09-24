// src/parsers/parseDelimitedFile.js
import Papa from "papaparse";
function decodeBuffer(buffer) {
 const bytes = new Uint8Array(buffer);
 // Primer intento: UTF-8
 const utf8 = new TextDecoder("utf-8", {
   fatal: false,
 }).decode(bytes);
 // Si aparecen caracteres de reemplazo,
 // probablemente es ANSI / Windows-1252.
 if (utf8.includes("�")) {
   return new TextDecoder("windows-1252").decode(bytes);
 }
 return utf8;
}
export async function parseDelimitedFile(file) {
 if (!file) {
   throw new Error("No se recibió ningún archivo.");
 }
 const buffer = await file.arrayBuffer();
 const text = decodeBuffer(buffer);
 return new Promise((resolve, reject) => {
   Papa.parse(text, {
     header: true,
     // PapaParse detecta automáticamente:
     // coma, tabulador, punto y coma, etc.
     delimiter: "",
     skipEmptyLines: true,
     transformHeader: (header) =>
       String(header ?? "").trim(),
     complete: (results) => {
       resolve({
         fileName: file.name,
         rows: results.data,
         fields: results.meta.fields ?? [],
         delimiter: results.meta.delimiter,
         errors: results.errors ?? [],
       });
     },
     error: (error) => {
       reject(error);
     },
   });
 });
}