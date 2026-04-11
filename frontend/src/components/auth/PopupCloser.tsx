"use client";

import { useEffect } from "react";

/**
 * A tiny client component to close the window if it's the OAuth popup
 * returning from Google/Apple so the parent window can detect completion.
 */
export function PopupCloser() {
    useEffect(() => {
        if (typeof window !== "undefined" && window.name === "OAuthLogin" && window.opener) {
            window.close();
        }
    }, []);

    return null;
}
