"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, QrCode, AlertTriangle, ExternalLink, Flashlight, FlashlightOff, Camera, ImageIcon, Wallet, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { nativeBridge } from "@/lib/native-bridge";
import { playDingSound } from "@/lib/audio";
import { DataSyncService } from "@/lib/sync-store";

/**
 * FairPay QR Scan — camera-based scan-to-pay, restyled after the Alipay/
 * WeChat scanner in the reference screenshots: a bottom bar with an Album
 * picker (for a screenshotted QR someone sent you) on the right, and a
 * context-aware action on the left — flashlight for a regular visitor,
 * "My QR" for a seller who wants to flip straight to receiving payment
 * instead of scanning one.
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
    const albumInputRef = useRef<HTMLInputElement | null>(null);
    const frameCountRef = useRef(0);
    // tick() is a single closure captured once per scan session and then
    // re-invoked via requestAnimationFrame — it never sees a state update
    // that happens after it started, so torchSupported must be read from a
    // ref here, not the state value the closure was created with.
    const torchSupportedRef = useRef(false);
    // The decoder is fetched in parallel with the camera instead of being part of the page
    // bundle, so the camera (the thing the user is waiting on) is never delayed by it. Chromium
    // (all Android WebViews/Chrome) also has a native, hardware-accelerated BarcodeDetector,
    // which is far faster than jsQR — used when present, jsQR is the fallback (iOS Safari).
    const jsQRRef = useRef<any>(null);
    const detectorRef = useRef<any>(null);
    const loadDecoder = () => {
        if (!jsQRRef.current) import("jsqr").then(m => { jsQRRef.current = m.default; }).catch(() => {});
        try {
            const BD = (window as any).BarcodeDetector;
            if (BD && !detectorRef.current) detectorRef.current = new BD({ formats: ["qr_code"] });
        } catch { /* unsupported format list — jsQR handles it */ }
    };

    const [phase, setPhase] = useState<"idle" | "starting" | "scanning" | "error">("idle");
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ raw: string; isFairPrice: boolean; url?: string } | null>(null);
    const [decodingAlbum, setDecodingAlbum] = useState(false);
    const [albumError, setAlbumError] = useState<string | null>(null);
    // Torch is a REAL device capability check, not a guess — iOS Safari/WKWebView
    // doesn't expose MediaStreamTrack torch control to web content at all, so this
    // button only appears where it can actually do something (mainly Android Chrome).
    const [torchSupported, setTorchSupported] = useState(false);
    const [torchOn, setTorchOn] = useState(false);
    const [lowLight, setLowLight] = useState(false);
    const [isSeller, setIsSeller] = useState(false);
    const cancelledRef = useRef(false);

    useEffect(() => {
        try { setIsSeller(!!DataSyncService.getCurrentSellerId()); } catch { /* not signed in as a seller */ }
    }, []);

    const stopStream = () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    };

    useEffect(() => {
        cancelledRef.current = false;
        // Try starting the camera immediately on arrival, no tap required —
        // this is what actually fixes "I already granted permission but I'm
        // still asked to tap Enable Camera every single time." It only
        // succeeds silently when the browser already has a recorded grant;
        // otherwise it falls straight back to the normal tap-to-enable idle
        // screen with zero visible difference from before.
        // Camera first (it's what the user is waiting on), decoder loads alongside it.
        startCamera(true);
        loadDecoder();
        return () => { cancelledRef.current = true; stopStream(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // `silent` powers the auto-attempt on mount below: if permission was
    // already granted on a previous visit, most browsers (including the
    // WKWebView shell) will hand the stream straight over with NO fresh user
    // gesture required at all — the gesture requirement only really bites on
    // the very FIRST-ever request for an origin. So this tries once,
    // unprompted, on arrival; if that fails for any reason (permission
    // genuinely not granted yet, gesture requirement, denied, etc.) it falls
    // back to the idle "Enable Camera" screen exactly as before rather than
    // showing a scary error state for what is, for a first-time visitor, an
    // entirely expected outcome.
    const startCamera = async (silent = false) => {
        setError(null);
        setPhase("starting");
        torchSupportedRef.current = false;

        if (!navigator.mediaDevices?.getUserMedia) {
            if (silent) { setPhase("idle"); return; }
            setPhase("error");
            setError("This browser doesn't support camera access. Try updating it, or use a different browser.");
            return;
        }

        // If the browser/app already says "denied", don't wait on a request that can never
        // succeed — explain how to re-enable right away. (Granted/prompt fall through: a grant
        // is remembered by the browser/OS for good, so this only ever asks once.)
        try {
            const perm = await (navigator as any).permissions?.query?.({ name: "camera" });
            if (perm?.state === "denied") {
                setPhase("error");
                setError("Camera access is turned off for FairPrice. Enable it in your device settings (or the site's permissions), then come back.");
                return;
            }
        } catch { /* Permissions API unavailable (older iOS) — just ask */ }

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
                torchSupportedRef.current = true;
                setTorchSupported(true);
            }
            setPhase("scanning");
            frameCountRef.current = 0;
            tick();
        } catch (e: any) {
            if (silent) { setPhase("idle"); return; }
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

    // Cheap sparse-sample average brightness — every 20th pixel, every 15th
    // frame — enough to reliably tell "dim room" from "daylight" without
    // adding real per-frame cost to the scan loop.
    const sampleBrightness = (imageData: ImageData) => {
        const data = imageData.data;
        let total = 0, count = 0;
        for (let i = 0; i < data.length; i += 80) {
            total += (data[i] + data[i + 1] + data[i + 2]) / 3;
            count++;
        }
        const avg = count ? total / count : 255;
        setLowLight(avg < 60);
    };

    const tick = () => {
        if (cancelledRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
            frameCountRef.current++;
            const detector = detectorRef.current;
            // Native detector: no canvas copy, no pixel loop.
            if (detector && frameCountRef.current % 2 === 0) {
                detector.detect(video).then((codes: any[]) => {
                    if (codes?.[0]?.rawValue && !cancelledRef.current) handleDecoded(codes[0].rawValue);
                }).catch(() => {});
            }
            const needCanvas = torchSupportedRef.current && frameCountRef.current % 15 === 0;
            if (jsQRRef.current && (!detector || needCanvas) && frameCountRef.current % 2 === 0) {
                // Decode on a downscaled frame (≤800px wide): jsQR cost is per pixel, and a QR
                // that fills a good part of the frame reads fine at this size.
                const scale = Math.min(1, 800 / video.videoWidth);
                const w = Math.round(video.videoWidth * scale), h = Math.round(video.videoHeight * scale);
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext("2d", { willReadFrequently: true });
                if (ctx) {
                    ctx.drawImage(video, 0, 0, w, h);
                    const imageData = ctx.getImageData(0, 0, w, h);
                    if (needCanvas) sampleBrightness(imageData);
                    if (!detector) {
                        const code = jsQRRef.current(imageData.data, w, h, { inversionAttempts: "attemptBoth" });
                        if (code?.data) { handleDecoded(code.data); return; }
                    }
                }
            }
        }
        rafRef.current = requestAnimationFrame(tick);
    };

    const handleDecoded = (raw: string) => {
        stopStream();
        // The instant "got it" confirmation the reference screenshots show —
        // fires the moment a code is actually decoded, before whatever
        // happens next (auto-navigate or the manual-confirm screen).
        playDingSound();

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
            setTimeout(() => router.push(url!.replace(/^https?:\/\/[^/]+/, "")), 500);
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

    // For a screenshotted QR sitting in the photo library instead of on a
    // physical surface in front of the camera — the same "Album" affordance
    // the WeChat/Alipay scanners show, decoded with the exact same jsQR pass
    // the live camera loop uses, just against a static image instead of
    // consecutive video frames.
    const handleAlbumFile = async (file: File) => {
        setAlbumError(null);
        setDecodingAlbum(true);
        try {
            const dataUrl: string = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                const el = new Image();
                el.onload = () => resolve(el);
                el.onerror = reject;
                el.src = dataUrl;
            });
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("no canvas context");
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            if (!jsQRRef.current) jsQRRef.current = (await import("jsqr")).default;
            const code = jsQRRef.current(imageData.data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" });
            if (code?.data) {
                handleDecoded(code.data);
            } else {
                setAlbumError("No QR code found in that image — try a clearer screenshot.");
            }
        } catch {
            setAlbumError("Couldn't read that image — try another one.");
        } finally {
            setDecodingAlbum(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex flex-col">
            {/* This full-screen page has no shared Navbar, so nothing else was
                accounting for the iOS status bar (clock/battery) — it was
                rendering right on top of "Scan to Pay" instead of below it. */}
            <div
                className="flex items-center justify-between gap-3 px-4 pb-4 text-white"
                style={{ paddingTop: "max(1rem, calc(env(safe-area-inset-top) + 0.5rem))" }}
            >
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-white/10">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h1 className="text-base font-bold flex items-center gap-2">
                        <QrCode className="h-4 w-4 text-brand-green-400" /> Scan to Pay
                    </h1>
                </div>
                {/* A dedicated close, not just Back — this is a full-screen camera
                    takeover, the kind of surface people expect an X to dismiss
                    outright. Goes straight to "/" rather than history.back() so
                    it can never land back on this same page's transient states. */}
                <button
                    onClick={() => router.push("/")}
                    aria-label="Close"
                    className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>
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
                        <Button onClick={() => startCamera()} className="bg-brand-green-500 hover:bg-brand-green-600 text-black font-bold rounded-full px-8 h-12 mt-2">
                            Enable Camera
                        </Button>
                        {/* Already have the code as a screenshot — this needs no
                            camera permission at all, so lead with it as the
                            reliable fallback rather than a button someone
                            only discovers after the camera has already failed them. */}
                        <button
                            onClick={() => albumInputRef.current?.click()}
                            className="text-white/70 text-xs font-bold underline underline-offset-2 mt-1"
                        >
                            Or pick a screenshot from your Album instead
                        </button>
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
                    <p className="absolute bottom-28 inset-x-0 text-center text-white/80 text-sm font-semibold px-6">
                        Point your camera at a FairPay QR code
                    </p>
                )}

                {/* Surfaced automatically once the frame reads as dark, rather than
                    leaving a torch-capable phone's flash as a button someone has to
                    already know to look for. */}
                {phase === "scanning" && !error && torchSupported && lowLight && !torchOn && (
                    <button
                        onClick={toggleTorch}
                        className="absolute bottom-40 left-1/2 -translate-x-1/2 bg-white/90 text-black text-xs font-bold rounded-full px-4 py-2 flex items-center gap-1.5 shadow-lg animate-pulse"
                    >
                        <Flashlight className="h-3.5 w-3.5" /> Low light — tap to turn on flash
                    </button>
                )}

                {phase === "error" && error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
                        <AlertTriangle className="h-10 w-10 text-amber-400" />
                        <p className="text-white font-semibold">{error}</p>
                        <Button onClick={() => startCamera()} className="bg-white text-black rounded-full">Try again</Button>
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

                {/* Bottom action bar — Album (right) for a screenshotted QR, and a
                    left action that means something different depending on who's
                    holding the phone: a torch toggle for a regular visitor, or a
                    one-tap shortcut to a seller's OWN receiving QR for when they'd
                    rather show a code than scan one. */}
                {!result && (
                    // bottom-24, not bottom-6 — the app's own bottom tab bar
                    // (Home/Categories/Sell/Messages/Global) is a separate,
                    // globally-fixed element that sits on top of every page
                    // including this full-screen one, and was covering these
                    // buttons enough that Album/Torch were barely tappable.
                    <div className="absolute bottom-24 inset-x-0 flex items-center justify-center gap-16 px-8">
                        {isSeller ? (
                            <button
                                onClick={() => router.push("/seller/dashboard/payments")}
                                className="flex flex-col items-center gap-1.5 text-white/90"
                            >
                                <span className="h-14 w-14 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
                                    <Wallet className="h-6 w-6" />
                                </span>
                                <span className="text-xs font-bold">My QR / Receive</span>
                            </button>
                        ) : (
                            <button
                                onClick={toggleTorch}
                                disabled={!torchSupported || phase !== "scanning"}
                                className="flex flex-col items-center gap-1.5 text-white/90 disabled:opacity-40"
                            >
                                <span className={`h-14 w-14 rounded-full backdrop-blur flex items-center justify-center ${torchOn ? "bg-brand-green-500 text-black" : "bg-white/10"}`}>
                                    {torchOn ? <Flashlight className="h-6 w-6" /> : <FlashlightOff className="h-6 w-6" />}
                                </span>
                                <span className="text-xs font-bold">Flashlight</span>
                            </button>
                        )}

                        <button
                            onClick={() => albumInputRef.current?.click()}
                            disabled={decodingAlbum}
                            className="flex flex-col items-center gap-1.5 text-white/90"
                        >
                            <span className="h-14 w-14 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
                                {decodingAlbum ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImageIcon className="h-6 w-6" />}
                            </span>
                            <span className="text-xs font-bold">Album</span>
                        </button>
                        <input
                            ref={albumInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => e.target.files?.[0] && handleAlbumFile(e.target.files[0])}
                        />
                    </div>
                )}

                {albumError && !result && (
                    <p className="absolute bottom-44 inset-x-0 text-center text-amber-300 text-xs font-semibold px-8">{albumError}</p>
                )}
            </div>
        </div>
    );
}
