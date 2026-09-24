// src/hooks/useInventoryEngine.js

import {

  useCallback,

  useEffect,

  useMemo,

  useRef,

  useState,

} from "react";

import {

  fetch4WallScans,

} from "../services/supabase";

import {

  buildInventoryEngine,

} from "../domain/inventoryEngine";


const DEFAULT_REFRESH_MS =

  3 * 60 * 1000;


/**

 * Hook principal del reconciliador.

 *

 * Responsabilidades:

 *

 * 1. Consultar 4Wall vivo desde Supabase.

 * 2. Actualizar aproximadamente cada 3 minutos.

 * 3. Combinar el físico LIVE con las fuentes

 *    congeladas de QAD.

 * 4. Ejecutar el motor financiero.

 *

 * NO contiene fórmulas financieras.

 * Esas viven en /domain.

 */

export function useInventoryEngine({

  areaRows = [],

  qadRows = [],

  ispbbRows = [],

  bomRows = [],

  costRows = [],

  refreshMs =

    DEFAULT_REFRESH_MS,

  criticalUsdThreshold =

    10000,

  enabled = true,

} = {}) {

  // ========================================

  // LIVE 4WALL

  // ========================================

  const [

    scanRows,

    setScanRows,

  ] = useState([]);


  const [

    loading,

    setLoading,

  ] = useState(false);


  const [

    error,

    setError,

  ] = useState(null);


  const [

    lastUpdated,

    setLastUpdated,

  ] = useState(null);


  const [

    scanCount,

    setScanCount,

  ] = useState(0);


  const abortControllerRef =

    useRef(null);


  // ========================================

  // FETCH MANUAL / AUTOMÁTICO

  // ========================================

  const refresh =

    useCallback(async () => {

      if (!enabled) {

        return;

      }


      /**

       * Cancelamos la consulta anterior

       * si todavía estuviera viva.

       */

      if (

        abortControllerRef.current

      ) {

        abortControllerRef

          .current

          .abort();

      }


      const controller =

        new AbortController();

      abortControllerRef.current =

        controller;


      try {

        setLoading(true);

        setError(null);


        const result =

          await fetch4WallScans({

            signal:

              controller.signal,

          });


        setScanRows(

          result.rows

        );


        setScanCount(

          result.count

        );


        setLastUpdated(

          result.fetchedAt

        );

      } catch (err) {

        /**

         * AbortError no significa

         * que Supabase falló.

         */

        if (

          err?.name ===

          "AbortError"

        ) {

          return;

        }


        console.error(

          "Error actualizando 4Wall:",

          err

        );


        setError(

          err instanceof Error

            ? err

            : new Error(

                "Error desconocido consultando 4Wall."

              )

        );

      } finally {

        if (

          !controller

            .signal

            .aborted

        ) {

          setLoading(false);

        }

      }

    }, [enabled]);


  // ========================================

  // POLLING

  // ========================================

  useEffect(() => {

    if (!enabled) {

      return undefined;

    }


    /**

     * Primera consulta inmediata.

     */

    refresh();


    /**

     * Después actualizamos aproximadamente

     * cada 3 minutos.

     */

    const intervalId =

      window.setInterval(

        refresh,

        refreshMs

      );


    return () => {

      window.clearInterval(

        intervalId

      );


      if (

        abortControllerRef.current

      ) {

        abortControllerRef

          .current

          .abort();

      }

    };

  }, [

    enabled,

    refresh,

    refreshMs,

  ]);


  // ========================================

  // MOTOR DE RECONCILIACIÓN

  // ========================================

  const engine =

    useMemo(() => {

      try {

        return buildInventoryEngine({

          areaRows,

          scanRows,

          qadRows,

          ispbbRows,

          bomRows,

          costRows,

          options: {

            site:

              "179A",

            criticalUsdThreshold,

            filterQadItemTypes:

              true,

          },

        });

      } catch (err) {

        console.error(

          "Error ejecutando inventoryEngine:",

          err

        );


        return {

          reconciliation: [],

          summary: {

            netUsd: 0,

            grossLossUsd: 0,

            grossGainUsd: 0,

            swingUsd: 0,

            obsoleteGainUsd: 0,

            phantomCount: 0,

            criticalCount: 0,

            totalParts: 0,

          },

          diagnostics: null,

          sources: null,

        };

      }

    }, [

      areaRows,

      scanRows,

      qadRows,

      ispbbRows,

      bomRows,

      costRows,

      criticalUsdThreshold,

    ]);


  // ========================================

  // ESTADO DE CONEXIÓN PARA UI

  // ========================================

  const connectionStatus =

    useMemo(() => {

      if (error) {

        return {

          state:

            "ERROR",

          label:

            "4Wall desconectado",

          detail:

            error.message,

        };

      }


      if (

        loading &&

        !lastUpdated

      ) {

        return {

          state:

            "LOADING",

          label:

            "Conectando con 4Wall",

          detail:

            "Consultando Supabase...",

        };

      }


      if (lastUpdated) {

        return {

          state:

            "LIVE",

          label:

            "4Wall LIVE",

          detail:

            `${scanCount.toLocaleString()} escaneos`,

        };

      }


      return {

        state:

          "WAITING",

        label:

          "Esperando datos",

        detail:

          "",

      };

    }, [

      error,

      loading,

      lastUpdated,

      scanCount,

    ]);


  // ========================================

  // SALIDA DEL HOOK

  // ========================================

  return {

    // Motor completo

    engine,


    // Atajos frecuentes

    reconciliation:

      engine.reconciliation,

    summary:

      engine.summary,

    diagnostics:

      engine.diagnostics,


    // LIVE

    scanRows,

    scanCount,

    lastUpdated,

    loading,

    error,

    connectionStatus,


    // Botón "Actualizar ahora"

    refresh,

  };

}
 