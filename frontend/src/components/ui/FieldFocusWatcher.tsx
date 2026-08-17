"use client";

import { useEffect } from "react";

/**
 * Marks <body> while the user is typing, so floating widgets can get out of
 * the way (see .fp-floating-widget in globals.css).
 *
 * On phones the on-screen keyboard shrinks the visual viewport and shoves
 * bottom-anchored widgets upward — Ziva's avatar ended up sitting on top of
 * the field being typed into on the sign-in page. Watching focus rather than
 * keyboard height keeps this working on desktop and in the Capacitor WebView,
 * neither of which reports keyboard events consistently.
 */
export function FieldFocusWatcher() {
    useEffect(() => {
        const isField = (el: EventTarget | null) => {
            if (!(el instanceof HTMLElement)) return false;
            const tag = el.tagName;
            return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
        };

        const onFocusIn = (e: FocusEvent) => {
            if (isField(e.target)) document.body.classList.add("fp-field-focused");
        };
        const onFocusOut = (e: FocusEvent) => {
            // relatedTarget is where focus is heading — moving between two fields
            // should not flash the widgets back in between them.
            if (isField(e.target) && !isField((e as any).relatedTarget)) {
                document.body.classList.remove("fp-field-focused");
            }
        };

        document.addEventListener("focusin", onFocusIn);
        document.addEventListener("focusout", onFocusOut);
        return () => {
            document.removeEventListener("focusin", onFocusIn);
            document.removeEventListener("focusout", onFocusOut);
            document.body.classList.remove("fp-field-focused");
        };
    }, []);

    return null;
}
