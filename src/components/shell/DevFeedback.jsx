import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import OverlayPortal from "./OverlayPortal.jsx";
import { RubberDrawer } from "../visual/ScrollEffects.jsx";
import { submitDevelopmentFeedback } from "../../services/supabase.js";

const TYPES = [
  "Sin especificar",
  "Bug",
  "Funcionalidad",
  "Lógica",
  "Datos / Fuente",
  "Sugerencia",
];

const AREAS = [
  "Sin especificar",
  "Navbar / navegación",
  "Estado de datos",
  "Finanzas",
  "Discrepancias",
  "Inventario / tabla",
  "Phantom Radar",
  "Obsoletos +",
  "Fuentes de referencia",
  "Notificaciones",
  "Bot escaneo 4Wall",
  "Historial / juntas",
  "Trazador de pieza",
  "Visor Excel / evidencia",
  "LAB / guía del motor",
  "Myke / organización virtual",
  "Ayuda",
  "Exportación Excel",
  "Rendimiento / animaciones",
  "Scroll / rubber-band",
  "Menús laterales / vidrio",
  "Footer",
  "Móvil / responsive",
  "Otra",
];

function FeedbackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M5 4.5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4.5 3v-3H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" />
      <path d="M9 8.5 7.5 10 9 11.5M15 8.5l1.5 1.5-1.5 1.5M12.8 7.8l-1.6 4.4" />
    </svg>
  );
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith("image/")) {
      reject(new Error("Selecciona una imagen."));
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      reject(
        new Error(
          "La imagen es demasiado grande. Usa una captura menor a 12 MB.",
        ),
      );
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No pudimos leer la imagen."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("No pudimos procesar la imagen."));
      image.onload = () => {
        const max = 1600;
        const scale = Math.min(1, max / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
        if (dataUrl.length > 2_700_000) {
          reject(
            new Error(
              "La captura sigue siendo muy grande. Recórtala o usa una imagen más pequeña.",
            ),
          );
          return;
        }
        resolve(dataUrl);
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function DevFeedback({
  inventoryId,
  open = false,
  onOpenChange,
}) {
  const setOpen = onOpenChange;
  const fileInput = useRef(null);
  const inFlight = useRef(false);
  const [type, setType] = useState(TYPES[0]);
  const [area, setArea] = useState(AREAS[0]);
  const [opportunity, setOpportunity] = useState("");
  const [logic, setLogic] = useState("");
  const [screenshot, setScreenshot] = useState("");
  const [imageError, setImageError] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");

  const addImage = async (file) => {
    setImageError("");
    try {
      setScreenshot(await readImage(file));
    } catch (error) {
      setImageError(error.message || "No pudimos agregar la captura.");
    }
  };

  useEffect(() => {
    if (!open) return undefined;
    const paste = (event) => {
      const image = [...(event.clipboardData?.items || [])].find((item) =>
        item.type.startsWith("image/"),
      );
      const file = image?.getAsFile();
      if (file) {
        event.preventDefault();
        addImage(file);
      }
    };
    document.addEventListener("paste", paste);
    return () => document.removeEventListener("paste", paste);
  }, [open]);

  const reset = () => {
    setType(TYPES[0]);
    setArea(AREAS[0]);
    setOpportunity("");
    setLogic("");
    setScreenshot("");
    setImageError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    if (inFlight.current) return;
    if (!opportunity.trim()) {
      setStatus("Escribe qué encontraste o qué oportunidad ves.");
      return;
    }
    inFlight.current = true;
    setSending(true);
    setStatus("");
    try {
      await submitDevelopmentFeedback({
        report_type: type,
        app_area: area,
        opportunity: opportunity.trim(),
        expected_logic: logic.trim() || null,
        screenshot_data_url: screenshot || null,
        page_path: `${location.pathname}${location.search}${location.hash}`,
        inventory_id: inventoryId || null,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          scrollY: Math.round(window.scrollY),
        },
      });
      reset();
      setStatus("Reporte enviado. Gracias.");
    } catch (error) {
      setStatus(
        error.message ||
          "No pudimos enviar el reporte. No se borró lo que escribiste.",
      );
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  };

  return (
    <>
      {open && (
        <OverlayPortal className="vi-feedback-root" onClose={() => setOpen(false)}>
          <div
            className="vi-feedback-overlay"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <RubberDrawer
              className="vi-dev-feedback-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Reportar oportunidad de desarrollo"
            >
              <header className="vi-dev-feedback-head">
                <div>
                  <p className="vi-eyebrow">FASE DE DESARROLLO</p>
                  <h2>Reportar algo que mejorar</h2>
                  <p>
                    Bug, funcionalidad, lógica, fuente de datos o sugerencia.
                  </p>
                </div>
                <button
                  type="button"
                  className="vi-icon-close"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar reporte"
                >
                  ×
                </button>
              </header>

              <form className="vi-dev-feedback-form" onSubmit={submit}>
                <div className="vi-dev-feedback-grid">
                  <label>
                    <span>TIPO DE REPORTE</span>
                    <select
                      value={type}
                      onChange={(event) => setType(event.target.value)}
                    >
                      {TYPES.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>¿EN QUÉ ÁREA LO VES?</span>
                    <select
                      value={area}
                      onChange={(event) => setArea(event.target.value)}
                    >
                      {AREAS.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <label>
                  <span>ÁREA DE OPORTUNIDAD / ¿QUÉ ENCONTRASTE?</span>
                  <textarea
                    value={opportunity}
                    onChange={(event) => setOpportunity(event.target.value)}
                    rows="4"
                    maxLength="4000"
                    placeholder="Ej. Al abrir Estado de datos no puedo volver al dashboard..."
                  />
                </label>

                <label>
                  <span>¿QUÉ DEBERÍA PASAR? / LÓGICA ESPERADA</span>
                  <textarea
                    value={logic}
                    onChange={(event) => setLogic(event.target.value)}
                    rows="3"
                    maxLength="4000"
                    placeholder="Ej. Al tocar regresar debería conservar la tabla y la posición..."
                  />
                </label>

                <div className="vi-feedback-evidence">
                  <div>
                    <strong>CAPTURA DE PANTALLA</strong>
                    <span>
                      Pega una imagen con Ctrl+V o selecciónala desde tu equipo.
                    </span>
                  </div>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) addImage(file);
                      event.target.value = "";
                    }}
                  />
                  {screenshot ? (
                    <div className="vi-feedback-preview">
                      <img src={screenshot} alt="Captura adjunta al reporte" />
                      <button type="button" onClick={() => setScreenshot("")}>
                        QUITAR IMAGEN
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="vi-feedback-upload"
                      onClick={() => fileInput.current?.click()}
                    >
                      <span aria-hidden="true">+</span>
                      <strong>PEGAR O ELEGIR IMAGEN</strong>
                    </button>
                  )}
                  {imageError && (
                    <p className="vi-feedback-error">{imageError}</p>
                  )}
                </div>

                {status && (
                  <p
                    className={
                      status.startsWith("Reporte enviado")
                        ? "vi-feedback-status is-ok"
                        : "vi-feedback-status"
                    }
                  >
                    {status}
                  </p>
                )}
                <button
                  type="submit"
                  className="vi-feedback-submit"
                  disabled={sending}
                >
                  {sending ? "ENVIANDO…" : "ENVIAR REPORTE"}
                </button>
              </form>
            </RubberDrawer>
          </div>
        </OverlayPortal>
      )}

      {createPortal(
        <div className="vi-dev-feedback">
          <button
            type="button"
            aria-expanded={open}
            className={
              open
                ? "vi-dev-feedback-trigger is-open"
                : "vi-dev-feedback-trigger"
            }
            onClick={() => {
              setOpen((value) => !value);
              setStatus("");
            }}
            aria-label={
              open ? "Ocultar reporte de desarrollo" : "Reportar bug o mejora"
            }
            title="Reportar bug, lógica o mejora"
          >
            <FeedbackIcon />
            <span>REPORTAR</span>
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}
