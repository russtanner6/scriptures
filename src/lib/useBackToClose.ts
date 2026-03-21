import { useEffect, useRef } from "react";

/**
 * Push a history entry when a panel/modal opens, and call `onClose`
 * when the user presses the mobile back button or swipe-back gesture.
 *
 * Usage:  useBackToClose(onClose);
 *
 * The hook pushes a state `{ panel: true }` on mount and pops it on
 * unmount (if still present). On `popstate` it calls `onClose()`.
 */
export function useBackToClose(onClose: () => void) {
  const closedByPop = useRef(false);

  useEffect(() => {
    // Push a dummy history entry so "back" pops it instead of leaving the page
    window.history.pushState({ panel: true }, "");

    const handlePop = () => {
      closedByPop.current = true;
      onClose();
    };

    window.addEventListener("popstate", handlePop);

    return () => {
      window.removeEventListener("popstate", handlePop);
      // If the panel is being closed by something other than back-button
      // (close button, backdrop click, escape key, swipe), we need to
      // remove the history entry we pushed so the stack stays clean.
      if (!closedByPop.current) {
        // Only remove our entry if it's still on top AND we're not
        // navigating (e.g., user clicked a Next.js Link inside the panel).
        // Using replaceState instead of back() avoids cancelling pending
        // navigations triggered by Link clicks.
        if (window.history.state?.panel) {
          window.history.replaceState(null, "");
        }
      }
    };
  }, [onClose]);
}
