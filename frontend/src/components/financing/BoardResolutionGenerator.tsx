"use client";

import { useState, useRef, useEffect, useCallback, useId } from "react";
import {
    X, Plus, Trash2, PenLine, RefreshCw, CheckCircle2,
    Download, ImagePlus, Building2, ChevronDown, ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Director {
    id: string;
    name: string;
    title: string;        // e.g. "Managing Director", "Director"
    idType: string;       // "NIN" | "International Passport" | "Drivers License"
    idNumber: string;
    bvn: string;          // optional — shown as "provided" in doc, not printed
    signatureDataUrl: string | null;
}

export interface BoardResolutionData {
    companyName: string;
    registrationNumber: string;
    companyLogoBase64: string | null;
    directors: Director[];
    resolvedAt: string;   // ISO date string
}

interface Props {
    productName: string;
    loanAmount: number;
    tenureMonths: number;
    initialData?: Partial<BoardResolutionData>;
    onSave: (data: BoardResolutionData) => void;
    onClose: () => void;
}

// ─── Mini Signature Pad ───────────────────────────────────────────────────────
function MiniSignaturePad({
    onSave,
    onClear,
    existing,
}: {
    onSave: (dataUrl: string) => void;
    onClear: () => void;
    existing: string | null;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);
    const lastPos = useRef<{ x: number; y: number } | null>(null);
    const [hasDrawn, setHasDrawn] = useState(false);
    const [open, setOpen] = useState(false);

    const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        const sx = canvas.width / rect.width;
        const sy = canvas.height / rect.height;
        if ("touches" in e) {
            return { x: (e.touches[0].clientX - rect.left) * sx, y: (e.touches[0].clientY - rect.top) * sy };
        }
        return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
    };

    const startDraw = useCallback((e: MouseEvent | TouchEvent) => {
        const c = canvasRef.current; if (!c) return;
        e.preventDefault(); isDrawing.current = true; lastPos.current = getPos(e, c);
    }, []);
    const draw = useCallback((e: MouseEvent | TouchEvent) => {
        if (!isDrawing.current) return;
        const c = canvasRef.current; const ctx = c?.getContext("2d");
        if (!c || !ctx) return; e.preventDefault();
        const pos = getPos(e, c);
        ctx.beginPath(); ctx.moveTo(lastPos.current!.x, lastPos.current!.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.stroke(); lastPos.current = pos; setHasDrawn(true);
    }, []);
    const endDraw = useCallback(() => { isDrawing.current = false; lastPos.current = null; }, []);

    useEffect(() => {
        const c = canvasRef.current;
        if (!c || !open) return;
        const rect = c.getBoundingClientRect();
        c.width = rect.width * devicePixelRatio; c.height = rect.height * devicePixelRatio;
        const ctx = c.getContext("2d")!;
        ctx.scale(devicePixelRatio, devicePixelRatio);
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
        c.addEventListener("mousedown", startDraw); c.addEventListener("mousemove", draw);
        c.addEventListener("mouseup", endDraw); c.addEventListener("mouseleave", endDraw);
        c.addEventListener("touchstart", startDraw, { passive: false }); c.addEventListener("touchmove", draw, { passive: false });
        c.addEventListener("touchend", endDraw);
        return () => {
            c.removeEventListener("mousedown", startDraw); c.removeEventListener("mousemove", draw);
            c.removeEventListener("mouseup", endDraw); c.removeEventListener("mouseleave", endDraw);
            c.removeEventListener("touchstart", startDraw); c.removeEventListener("touchmove", draw);
            c.removeEventListener("touchend", endDraw);
        };
    }, [open, startDraw, draw, endDraw]);

    const clearCanvas = () => {
        const c = canvasRef.current; const ctx = c?.getContext("2d"); if (!c || !ctx) return;
        ctx.clearRect(0, 0, c.width, c.height); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
        setHasDrawn(false);
    };
    const saveCanvas = () => {
        const c = canvasRef.current; if (!c || !hasDrawn) return;
        onSave(c.toDataURL("image/png")); setOpen(false); setHasDrawn(false);
    };

    if (existing) {
        return (
            <div className="flex items-center gap-2 mt-1">
                <img src={existing} alt="Signature" className="h-8 border border-gray-200 rounded bg-white" />
                <button onClick={() => { onClear(); setOpen(true); }} className="text-[9px] font-bold text-indigo-500 hover:text-indigo-700">Re-sign</button>
                <button onClick={onClear} className="text-[9px] font-bold text-red-400 hover:text-red-600">Remove</button>
            </div>
        );
    }

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="mt-1 flex items-center gap-1 text-[10px] font-bold text-indigo-600 border border-dashed border-indigo-200 rounded-lg px-2.5 py-1 hover:bg-indigo-50 transition-colors"
            >
                <PenLine className="h-3 w-3" /> Sign here
            </button>

            {open && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                            <h5 className="text-sm font-black text-gray-900">Director Signature</h5>
                            <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-gray-100">
                                <X className="h-3.5 w-3.5 text-gray-400" />
                            </button>
                        </div>
                        <div className="p-4">
                            <div className="relative rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden" style={{ height: 140 }}>
                                <canvas ref={canvasRef} className="w-full h-full cursor-crosshair touch-none" style={{ display: "block" }} />
                                {!hasDrawn && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <p className="text-xs text-gray-300">Sign here</p>
                                    </div>
                                )}
                                <div className="absolute bottom-8 left-4 right-4 border-b border-gray-200 pointer-events-none" />
                            </div>
                            <div className="flex gap-2 mt-3">
                                <button onClick={clearCanvas} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
                                    <RefreshCw className="h-3 w-3" /> Clear
                                </button>
                                <Button onClick={saveCanvas} disabled={!hasDrawn} className="flex-1 h-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-40">
                                    Save Signature
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// ─── Document Preview ─────────────────────────────────────────────────────────
function ResolutionPreview({ data, productName, loanAmount, tenureMonths }: {
    data: BoardResolutionData;
    productName: string;
    loanAmount: number;
    tenureMonths: number;
}) {
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });
    const authorised = data.directors[0];

    return (
        <div id="board-resolution-doc" className="bg-white font-serif text-gray-900 text-[10px] leading-relaxed" style={{ padding: "28px 32px", minHeight: 540 }}>
            {/* Letterhead */}
            <div className="flex items-start justify-between mb-4 pb-3 border-b-2 border-gray-800">
                <div className="flex-1">
                    <p className="text-base font-black uppercase tracking-wide text-gray-900">{data.companyName || "Company Name"}</p>
                    <p className="text-[9px] text-gray-500 mt-0.5">RC: {data.registrationNumber || "000000"}</p>
                </div>
                {data.companyLogoBase64 ? (
                    <img src={data.companyLogoBase64} alt="Logo" className="h-12 w-auto object-contain ml-4" />
                ) : (
                    <div className="h-12 w-12 rounded-lg border border-gray-200 flex items-center justify-center ml-4 shrink-0">
                        <Building2 className="h-5 w-5 text-gray-300" />
                    </div>
                )}
            </div>

            <p className="text-center text-xs font-black uppercase tracking-widest text-gray-700 mb-1">Board Resolution</p>
            <p className="text-center text-[9px] text-gray-400 mb-4">Passed by the Board of Directors of {data.companyName || "[Company Name]"}</p>

            <p className="mb-3"><strong>Date:</strong> {dateStr}</p>

            <p className="mb-3 leading-relaxed">
                We, the undersigned Directors of <strong>{data.companyName || "[Company Name]"}</strong> (RC: {data.registrationNumber || "[RC Number]"}),
                being all the Directors entitled to attend and vote at meetings of the Board, hereby
                unanimously pass the following resolutions:
            </p>

            <div className="mb-3 pl-3 border-l-2 border-gray-300 space-y-2">
                <p>
                    <strong>RESOLVED THAT</strong> the Company hereby makes application for product financing through
                    FairPrice.ng, powered by AltBank, for the acquisition of <em>{productName}</em> at a
                    financed amount of ₦{loanAmount.toLocaleString()} repayable over {tenureMonths} months.
                </p>
                {authorised && (
                    <p>
                        <strong>RESOLVED FURTHER THAT</strong> {authorised.name}, {authorised.title}, be and is
                        hereby authorised to execute all agreements, documents and undertakings necessary to
                        give effect to the above on behalf of the Company.
                    </p>
                )}
                <p>
                    <strong>RESOLVED FURTHER THAT</strong> any Director or the Company Secretary be and is
                    hereby authorised to take all such steps and execute all such documents as may be necessary
                    to implement these resolutions.
                </p>
            </div>

            <p className="mb-5 text-[9px] text-gray-500 italic">
                IN WITNESS WHEREOF, we have hereunto subscribed our names this {dateStr}.
            </p>

            {/* Director signature table */}
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(data.directors.length, 2)}, 1fr)` }}>
                {data.directors.map((d) => (
                    <div key={d.id} className="space-y-1">
                        {d.signatureDataUrl ? (
                            <img src={d.signatureDataUrl} alt="Signature" className="h-10 w-full object-contain object-left border-b border-gray-400" />
                        ) : (
                            <div className="h-10 border-b border-gray-400" />
                        )}
                        <p className="font-black text-[9px]">{d.name || "________________"}</p>
                        <p className="text-[8px] text-gray-600">{d.title || "Director"}</p>
                        {d.idNumber && <p className="text-[8px] text-gray-400">ID: {d.idType} {d.idNumber}</p>}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Main Generator ───────────────────────────────────────────────────────────
export function BoardResolutionGenerator({ productName, loanAmount, tenureMonths, initialData, onSave, onClose }: Props) {
    const uid = useId();
    const [data, setData] = useState<BoardResolutionData>({
        companyName: initialData?.companyName ?? "",
        registrationNumber: initialData?.registrationNumber ?? "",
        companyLogoBase64: initialData?.companyLogoBase64 ?? null,
        directors: initialData?.directors ?? [
            { id: `${uid}-0`, name: "", title: "Managing Director", idType: "NIN", idNumber: "", bvn: "", signatureDataUrl: null }
        ],
        resolvedAt: new Date().toISOString(),
    });
    const [showPreview, setShowPreview] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);

    const updateDirector = (idx: number, patch: Partial<Director>) => {
        setData(prev => ({
            ...prev,
            directors: prev.directors.map((d, i) => i === idx ? { ...d, ...patch } : d)
        }));
    };

    const addDirector = () => {
        setData(prev => ({
            ...prev,
            directors: [...prev.directors, {
                id: `${uid}-${prev.directors.length}`,
                name: "", title: "Director", idType: "NIN", idNumber: "", bvn: "", signatureDataUrl: null
            }]
        }));
    };

    const removeDirector = (idx: number) => {
        if (data.directors.length <= 1) return;
        setData(prev => ({ ...prev, directors: prev.directors.filter((_, i) => i !== idx) }));
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setData(prev => ({ ...prev, companyLogoBase64: reader.result as string }));
        reader.readAsDataURL(file);
    };

    const handlePrint = () => {
        const el = document.getElementById("board-resolution-doc");
        if (!el) return;
        const win = window.open("", "_blank", "width=800,height=600");
        if (!win) return;
        win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Board Resolution — ${data.companyName}</title>
                <style>
                    body { margin: 0; font-family: Georgia, serif; font-size: 11px; color: #111; }
                    @page { margin: 2cm; }
                    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
                </style>
            </head>
            <body>${el.innerHTML}</body>
            </html>
        `);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); win.close(); }, 400);
    };

    const isValid = data.companyName.trim() && data.registrationNumber.trim() &&
        data.directors.every(d => d.name.trim() && d.idNumber.trim()) &&
        data.directors.some(d => !!d.signatureDataUrl);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 overflow-y-auto">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden my-4">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <div>
                        <h3 className="text-base font-black text-gray-900">Board Resolution Generator</h3>
                        <p className="text-[10px] text-gray-400 mt-0.5">Fill in company & director details — we'll draft the resolution</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-200 transition-colors">
                        <X className="h-4 w-4 text-gray-500" />
                    </button>
                </div>

                <div className="overflow-y-auto max-h-[75vh]">
                    {!showPreview ? (
                        <div className="p-6 space-y-5">
                            {/* Company Info */}
                            <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50 space-y-3">
                                <h4 className="text-xs font-black text-gray-700 uppercase tracking-widest">Company Information</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 mb-1">Company Name *</label>
                                        <input
                                            type="text"
                                            value={data.companyName}
                                            onChange={e => setData(p => ({ ...p, companyName: e.target.value }))}
                                            placeholder="Acme Nigeria Ltd"
                                            className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 mb-1">RC Number *</label>
                                        <input
                                            type="text"
                                            value={data.registrationNumber}
                                            onChange={e => setData(p => ({ ...p, registrationNumber: e.target.value }))}
                                            placeholder="RC 123456"
                                            className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
                                        />
                                    </div>
                                </div>

                                {/* Logo upload */}
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Company Logo <span className="text-gray-400 font-normal">(optional — appears on letterhead)</span></label>
                                    <div className="flex items-center gap-3">
                                        {data.companyLogoBase64 ? (
                                            <div className="flex items-center gap-2">
                                                <img src={data.companyLogoBase64} alt="Logo" className="h-10 w-auto max-w-[120px] object-contain border border-gray-200 rounded-lg bg-white p-1" />
                                                <button onClick={() => setData(p => ({ ...p, companyLogoBase64: null }))} className="text-[9px] font-bold text-red-400 hover:text-red-600">Remove</button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => logoInputRef.current?.click()}
                                                className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 border border-dashed border-indigo-200 rounded-xl px-3 py-2 hover:bg-indigo-50 transition-colors"
                                            >
                                                <ImagePlus className="h-3.5 w-3.5" /> Upload Logo
                                            </button>
                                        )}
                                        <input ref={logoInputRef} type="file" accept="image/*" className="sr-only" onChange={handleLogoUpload} />
                                    </div>
                                </div>
                            </div>

                            {/* Directors */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-black text-gray-700 uppercase tracking-widest">Directors</h4>
                                    <button onClick={addDirector} className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-lg px-2.5 py-1 hover:bg-indigo-50 transition-colors">
                                        <Plus className="h-3 w-3" /> Add Director
                                    </button>
                                </div>

                                {data.directors.map((d, idx) => (
                                    <div key={d.id} className="p-4 rounded-2xl border border-gray-100 bg-white space-y-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Director {idx + 1}</span>
                                            {data.directors.length > 1 && (
                                                <button onClick={() => removeDirector(idx)} className="p-1 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors">
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 mb-1">Full Name *</label>
                                                <input
                                                    type="text"
                                                    value={d.name}
                                                    onChange={e => updateDirector(idx, { name: e.target.value })}
                                                    placeholder="Oluwaseun Adeyemi"
                                                    className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 mb-1">Title *</label>
                                                <select
                                                    value={d.title}
                                                    onChange={e => updateDirector(idx, { title: e.target.value })}
                                                    className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-indigo-400 bg-white"
                                                >
                                                    <option>Managing Director</option>
                                                    <option>Director</option>
                                                    <option>Executive Director</option>
                                                    <option>Chief Executive Officer</option>
                                                    <option>Chief Financial Officer</option>
                                                    <option>Company Secretary</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 mb-1">ID Type *</label>
                                                <select
                                                    value={d.idType}
                                                    onChange={e => updateDirector(idx, { idType: e.target.value })}
                                                    className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-indigo-400 bg-white"
                                                >
                                                    <option value="NIN">NIN</option>
                                                    <option value="International Passport">International Passport</option>
                                                    <option value="Drivers License">Driver's License</option>
                                                    <option value="Voters Card">Voter's Card</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 mb-1">ID Number *</label>
                                                <input
                                                    type="text"
                                                    value={d.idNumber}
                                                    onChange={e => updateDirector(idx, { idNumber: e.target.value })}
                                                    placeholder="12345678901"
                                                    className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-[10px] font-bold text-gray-500 mb-1">
                                                    BVN <span className="text-gray-400 font-normal">(optional — stored securely, not printed on document)</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={d.bvn}
                                                    onChange={e => updateDirector(idx, { bvn: e.target.value })}
                                                    placeholder="22xxxxxxxxx"
                                                    maxLength={11}
                                                    className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
                                                />
                                            </div>
                                        </div>

                                        {/* Director signature */}
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Signature *</label>
                                            <p className="text-[9px] text-gray-400 mb-1">Director {idx + 1} signs directly here on their device</p>
                                            <MiniSignaturePad
                                                existing={d.signatureDataUrl}
                                                onSave={(url) => updateDirector(idx, { signatureDataUrl: url })}
                                                onClear={() => updateDirector(idx, { signatureDataUrl: null })}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <p className="text-[9px] text-gray-400 text-center">
                                All director details are encrypted and shared only with AltBank for credit evaluation purposes.
                            </p>
                        </div>
                    ) : (
                        <div className="p-6">
                            <p className="text-[10px] text-gray-500 font-medium mb-3">Preview — this is how your board resolution will look</p>
                            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                <ResolutionPreview data={data} productName={productName} loanAmount={loanAmount} tenureMonths={tenureMonths} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer actions */}
                <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
                    <button
                        onClick={() => setShowPreview(p => !p)}
                        className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl px-3 py-2 hover:bg-white transition-colors"
                    >
                        {showPreview ? <><ChevronUp className="h-3 w-3" /> Edit</> : <><ChevronDown className="h-3 w-3" /> Preview Document</>}
                    </button>

                    {showPreview && (
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-1 text-xs font-bold text-gray-600 border border-gray-200 rounded-xl px-3 py-2 hover:bg-white transition-colors"
                        >
                            <Download className="h-3 w-3" /> Download PDF
                        </button>
                    )}

                    <Button
                        onClick={() => onSave(data)}
                        disabled={!isValid}
                        className="ml-auto h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold px-5 disabled:opacity-40"
                    >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                        Save Board Resolution
                    </Button>
                </div>
            </div>
        </div>
    );
}
