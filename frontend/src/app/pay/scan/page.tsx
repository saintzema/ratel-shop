"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import { ArrowLeft, QrCode, AlertTriangle, ExternalLink, Flashlight, FlashlightOff, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { nativeBridge } from "@/lib/native-bridge";

/**
 * FairPay QR Scan — camera-based scan-to-pay.
 *
 * A FairPay QR (generated at /seller/dashboard/payments) already encodes a
 * plain fairprice.ng URL, so it's technically scannable with any phone's own
 * Camera app already. This is the in-app equivalent for the Alipay-style
 * "Scan" tile on the account home, so a seller/buyer never has to leave
 * FairPrice to pay another seller.
 *
 * Decoding runs entirely on-device via jsQR against getUserMedia video
 * frames — no native plugin, works the same in the PWA and the Capacitor
 * shell (see NSCameraUsageDescription / android CAMERA permission).
 *
 * A scanned code is only auto-opened when it resolves to a fairprice.ng URL.
 * Anything else is shown as plain text with a manual confirm — a QR code is
 * untrusted input, and auto-navigating a WebView to an arbitrary scanned URL
 * is exactly the kind of thing a malicious sticker-swapped QR relies on.
 *
 * getUserMedia used to fire automatically on mount. iOS Safari/WKWebView in
 * particular can silently refuse (or never even surface the permission
 * prompt) for a camera request that isn't the direct result of a tap — which
 * is exactly what "scan doesn't work on mobile, camera never even asks"
 * was. Gating the first request behind an explicit "Enable Camera" tap fixes
 * that AND is the normal QR-scanner pattern users already expect. Once
 * granted, the browser's own permission grant persists for this origin —
 * "ask once, remember it" needs no code of ours, that's just how permissions
 * work; the old bug was that the ask was failing before it ever reached
 * that point.
 */
export default function ScanToPayPage() {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const rafRef = useRef<number | null>(null);

    const [phase, setPhase] = useState<"idle" | "starting" | "scanning" | "error">("idle");
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ raw: string; isFairPrice: boolean; url?: string } | null>(null);
    // Torch is a REAL device capability check, not a guess — iOS Safari/WKWebView
    // doesn't expose MediaStreamTrack torch control to web content at all, so this
    // button only appears where it can actually do something (mainly Android Chrome).
    const [torchSupported, setTorchSupported] = useState(false);
    const [torchOn, setTorchOn] = useState(false);
    const cancelledRef = useRef(false);

    const stopStream = () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    };

    useEffect(() => {
        cancelledRef.current = false;
        return () => { cancelledRef.current = true; stopStream(); };
    }, []);

    const startCamera = async () => {
        setError(null);
        setPhase("starting");

        if (!navigator.mediaDevices?.getUserMedia) {
            setPhase("error");
            setError("This browser doesn't support camera access. Try updating it, or use a different browser.");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                // A higher-resolution feed gives jsQR more pixels to work with for
                // a QR that's small in frame or a bit further away — "ideal" so a
                // device that can't do 720p still gets whatever it has, not a hard
                // failure.
                video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false,
            });
            if (cancelledRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play().catch(() => {});
            }
            const [track] = stream.getVideoTracks();
            if (track && "torch" in (track.getCapabilities?.() || {})) {
                setTorchSupported(true);
            }
            setPhase("scanning");
            tick();
        } catch (e: any) {
            setPhase("error");
            const name = e?.name || "";
            if (name === "NotAllowedError" || name === "PermissionDeniedError") {
                setError("Camera access was denied. Enable camera permission for FairPrice in your device settings, then try again.");
            } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
                setError("No camera was found on this device.");
            } else if (name === "NotReadableError" || name === "TrackStartError") {
                setError("Your camera is being used by another app. Close it and try again.");
            } else if (name === "SecurityError") {
                setError("Camera access needs a secure (https) connection.");
            } else {
                setError(`Couldn't access the camera${name ? ` (${name})` : ""}. Please try again.`);
            }
        }
    };

    const tick = () => {
        if (cancelledRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                // "dontInvert" only tried dark-on-light — a QR shown on a bright
                // phone screen, or under glare, can need the inverted read.
                // "attemptBoth" costs a bit more CPU per frame but this is the
                // single biggest lever for the "doesn't pick it up" complaint
                // that a pure-JS decoder actually has (native OS scanners use
                // hardware-accelerated detection this can't fully match).
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "attemptBoth",
                });
                if (code?.data) {
                    handleDecoded(code.data);
                    return;
                }
            }
        }
        rafRef.current = requestAnimationFrame(tick);
    };

    const handleDecoded = (raw: string) => {
        stopStream();

        let isFairPrice = false;
        let url: string | undefined;
        try {
            const parsed = new URL(raw);
            if (parsed.hostname === "www.fairprice.ng" || parsed.hostname === "fairprice.ng") {
                isFairPrice = true;
                url = parsed.toString();
            }
        } catch {
            // Not a URL at all — show as plain text below.
        }
        setResult({ raw, isFairPrice, url });

        if (isFairPrice && url) {
            setTimeout(() => router.push(url!.replace(/^https?:\/\/[^/]+/, "")), 600);
        }
    };

    const rescan = () => {
        setResult(null);
        setError(null);
        setPhase("idle");
    };

    const toggleTorch = async () => {
        const track = streamRef.current?.getVideoTracks()[0];
        if (!track) return;
        try {
            const next = !torchOn;
            await track.applyConstraints({ advanced: [{ torch: next } as any] });
            setTorchOn(next);
        } catch {
            // Capability said yes but the device refused mid-session — leave state as-is.
        }
    };

    return (
        <div className="min-h-screen bg-black flex flex-col">
            <div className="flex items-center justify-between gap-3 px-4 py-4 text-white">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-white/10">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h1 className="text-base font-bold flex items-center gap-2">
                        <QrCode className="h-4 w-4 text-brand-green-400" /> Scan to Pay
                    </h1>
                </div>
                {torchSupported && phase === "scanning" && (
                    <button
                        onClick={toggleTorch}
                        className={`p-2.5 rounded-full transition-colors ${torchOn ? "bg-brand-green-500 text-black" : "bg-white/10 hover:bg-white/20"}`}
                        aria-label="Toggle flashlight"
                    >
                        {torchOn ? <Flashlight className="h-4 w-4" /> : <FlashlightOff className="h-4 w-4" />}
                    </button>
                )}
            </div>

            <div className="relative flex-1 overflow-hidden">
                <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />

                {phase === "idle" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
                        <div className="h-16 w-16 rounded-full bg-brand-green-500/15 flex items-center justify-center">
                            <Camera className="h-7 w-7 text-brand-green-400" />
                        </div>
                        <p className="text-white font-bold">Scan a FairPay QR code</p>
                        <p className="text-white/60 text-sm max-w-xs">We'll ask for camera access once — your browser remembers it after that.</p>
                        <Button onClick={startCamera} className="bg-brand-green-500 hover:bg-brand-green-600 text-black font-bold rounded-full px-8 h-12 mt-2">
                            Enable Camera
                        </Button>
                    </div>
                )}

                {phase === "starting" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
                        <div className="h-8 w-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <p className="text-white/70 text-sm">Requesting camera access…</p>
                    </div>
                )}

                {phase === "scanning" && !error && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="h-64 w-64 rounded-3xl border-2 border-white/70" style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)" }} />
                    </div>
                )}

                {phase === "scanning" && !error && (
                    <p className="absolute bottom-8 inset-x-0 text-center text-white/80 text-sm font-semibold px-6">
                        Point your camera at a FairPay QR code
                    </p>
                )}

                {phase === "error" && error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
                        <AlertTriangle className="h-10 w-10 text-amber-400" />
                        <p className="text-white font-semibold">{error}</p>
                        <Button onClick={startCamera} className="bg-white text-black rounded-full">Try again</Button>
                    </div>
                )}

                {result && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 px-8 text-center">
                        {result.isFairPrice ? (
                            <>
                                <QrCode className="h-10 w-10 text-brand-green-400" />
                                <p className="text-white font-semibold">FairPay code found — opening…</p>
                            </>
                        ) : (
                            <>
                                <AlertTriangle className="h-10 w-10 text-amber-400" />
                                <p className="text-white font-semibold">This isn't a FairPrice QR code</p>
                                <p className="text-white/70 text-sm break-all max-w-xs">{result.raw}</p>
                                {result.url && (
                                    <button
                                        onClick={() => nativeBridge.openUrl(result.url!)}
                                        className="text-brand-green-400 text-sm font-bold flex items-center gap-1 underline"
                                    >
                                        Open link anyway <ExternalLink className="h-3.5 w-3.5" />
                                    </button>
                                )}
                                <Button onClick={rescan} className="bg-white text-black rounded-full mt-2">Scan again</Button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
