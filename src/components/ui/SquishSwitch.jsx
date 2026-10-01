import { motion, useReducedMotion } from "motion/react";

/**
 * React Bits-style squish switch, adapted to Visteon's UI.
 * Kept local so React Bits does not become a global runtime dependency.
 */
export default function SquishSwitch({
  checked = false,
  onChange,
  disabled = false,
  ariaLabel = "Alternar opción",
  className = "",
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`vi-squish-switch ${checked ? "is-on" : ""} ${className}`}
      onClick={() => onChange?.(!checked)}
      whileTap={reduceMotion || disabled ? undefined : { scale: 0.97 }}
    >
      <motion.span
        className="vi-squish-thumb"
        animate={{
          x: checked ? 18 : 0,
          scaleX: reduceMotion ? 1 : checked ? 1.08 : 1,
        }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 560, damping: 36, mass: 0.55 }
        }
      />
    </motion.button>
  );
}
