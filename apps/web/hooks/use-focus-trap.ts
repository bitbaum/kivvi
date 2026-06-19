import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps keyboard focus within a container element.
 * On activation, focuses the first focusable element inside the container.
 * On deactivation, returns focus to the previously focused element.
 * Tab and Shift+Tab cycle within the container.
 *
 * @param ref - Ref to the container element
 * @param active - Whether the trap is active (default: true). Use this for conditional modals.
 * @param onEscape - Optional handler invoked when Escape is pressed inside the trap.
 *                   Pass the dialog's close callback to get standard Esc-to-close behaviour.
 */
export function useFocusTrap<T extends HTMLElement>(
  ref: RefObject<T | null>,
  active = true,
  onEscape?: () => void,
) {
  const previousFocusRef = useRef<Element | null>(null);
  // Keep the latest onEscape without re-running the effect (and thus
  // re-stealing focus) every render when callers pass an inline function.
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;

    previousFocusRef.current = document.activeElement;

    // Focus first focusable element
    const focusableElements =
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (onEscapeRef.current) {
          e.preventDefault();
          onEscapeRef.current();
        }
        return;
      }

      if (e.key !== "Tab") return;

      const focusable =
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      // Return focus to previously focused element
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, [ref, active]);
}
