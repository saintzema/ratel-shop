"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { CheckCircle2, UploadCloud, Loader2, Save, Files, Download, PenLine, RefreshCw, X, FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ApplicantType } from "./Step1-ApplicantType";
import { BoardResolutionGenerator, type BoardResolutionData } from "./BoardResolutionGenerator";

// A doc value can be a single File, an array of Files, or null
export type DocValue = File | File[] | null;
export type DocumentUploads = Record<string, DocValue>;

// Signature stored as data-URL or null
export type SignatureData = string | null;

interface DocDef {
    key: string;
    label: string;
    hint: string;
    accept: string;
    multiple?: boolean;
}

const SALARY_DOCS: DocDef[] = [
    { key: 'bankStatement', label: '6 Months Bank Statement', hint: 'PDF or image', accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'payslip', label: 'Recent Payslip (3–6 months)', hint: 'PDF or image', accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'confirmationLetter', label: 'Confirmation / Employment Letter', hint: 'PDF or image', accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'altbankForm', label: 'Filled AltBank Salary Form', hint: 'Download below, fill & upload here', accept: '.pdf,.jpg,.jpeg,.png' },
];

const BUSINESS_DOCS: DocDef[] = [
    { key: 'cac', label: 'CAC Documents (Form 1 & 2)', hint: 'Select both forms at once (PDF or image)', accept: '.pdf,.jpg,.jpeg,.png', multiple: true },
    { key: 'auditedFinancials', label: '1–2 Years Audited Financials', hint: 'PDF', accept: '.pdf' },
    { key: 'bankStatement', label: '1 Year Bank Statement', hint: 'PDF or image', accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'altbankForm', label: 'Filled AltBank Business Form', hint: 'Download below, fill & upload here', accept: '.pdf,.jpg,.jpeg,.png' },
];

const ALTBANK_FORMS: Record<ApplicantType, { label: string; path: string }> = {
    salary_earner: {
        label: 'AltBank Salary Earner Form',
        path: '/assets/financing/altpower-salary-form.pdf',
    },
    business_owner: {
        label: 'AltBank Business Owner Form',
        path: '/assets/financing/altpower-business-form.pdf',
    },
};

function fileCount(val: DocValue): number {
    if (!val) return 0;
    return Array.isArray(val) ? val.length : 1;
}

function fileName(val: DocValue): string {
    if (!val) return '';
    if (Array.isArray(val)) {
        return val.length === 1 ? val[0].name : `${val.length} files selected`;
    }
    return val.name;
}

// ─── Signature Canvas Component ───────────────────────────────────────────────
interface SignatureCanvasProps {
    onSave: (dataUrl: string) => void;
    onClear: () => void;
    existingSignature: SignatureData;
}

function SignatureCanvas({ onSave, onClear, existingSignature }: SignatureCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);
    const lastPos = useRef<{ x: number; y: number } | null>(null);
    const [hasDrawn, setHasDrawn] = useState(false);
    const [showPad, setShowPad] = useState(false);

    const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        if ('touches' in e) {
            return {
                x: (e.touches[0].clientX - rect.left) * scaleX,
                y: (e.touches[0].clientY - rect.top) * scaleY,
            };
        }
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    };

    const startDraw = useCallback((e: MouseEvent | TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        e.preventDefault();
        isDrawing.current = true;
        lastPos.current = getPos(e, canvas);
    }, []);

    const draw = useCallback((e: MouseEvent | TouchEvent) => {
        if (!isDrawing.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        e.preventDefault();

        const pos = getPos(e, canvas);
        ctx.beginPath();
        ctx.moveTo(lastPos.current!.x, lastPos.current!.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        lastPos.current = pos;
        setHasDrawn(true);
    }, []);

    const endDraw = useCallback(() => {
        isDrawing.current = false;
        lastPos.current = null;
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !showPad) return;

        // Set canvas resolution
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        canvas.addEventListener('mousedown', startDraw);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', endDraw);
        canvas.addEventListener('mouseleave', endDraw);
        canvas.addEventListener('touchstart', startDraw, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        canvas.addEventListener('touchend', endDraw);

        return () => {
            canvas.removeEventListener('mousedown', startDraw);
            canvas.removeEventListener('mousemove', draw);
            canvas.removeEventListener('mouseup', endDraw);
            canvas.removeEventListener('mouseleave', endDraw);
            canvas.removeEventListener('touchstart', startDraw);
            canvas.removeEventListener('touchmove', draw);
            canvas.removeEventListener('touchend', endDraw);
        };
    }, [showPad, startDraw, draw, endDraw]);

    const handleClearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setHasDrawn(false);
    };

    const handleSave = () => {
        const canvas = canvasRef.current;
        if (!canvas || !hasDrawn) return;
        const dataUrl = canvas.toDataURL('image/png');
        onSave(dataUrl);
        setShowPad(false);
        setHasDrawn(false);
    };

    const handleClearSignature = () => {
        onClear();
        setShowPad(false);
    };

    return (
        <div className="mt-3">
            {existingSignature ? (
                <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-emerald-500 flex items-center justify-center">
                                <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                            </div>
                            <span className="text-xs font-bold text-emerald-700">Signature captured</span>
                        </div>
                        <div className="flex gap-1.5">
                            <button
                                onClick={() => setShowPad(true)}
                                className="text-[10px] font-bold px-2 py-1 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                            >
                                Re-sign
                            </button>
                            <button
                                onClick={handleClearSignature}
                                className="text-[10px] font-bold px-2 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                    <img src={existingSignature} alt="Your signature" className="max-h-16 border border-gray-100 rounded-lg bg-white" />
                </div>
            ) : (
                <button
                    onClick={() => setShowPad(true)}
                    className="w-full flex items-center gap-2 p-3 rounded-xl border border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all"
                >
                    <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <PenLine className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="text-left">
                        <p className="text-xs font-bold text-gray-700">Add Your Signature</p>
                        <p className="text-[10px] text-gray-400">Sign directly on screen — applied to your application</p>
                    </div>
                </button>
            )}

            {/* Signature pad modal overlay */}
            {showPad && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                            <div>
                                <h4 className="text-sm font-black text-gray-900">Sign Your Application</h4>
                                <p className="text-[10px] text-gray-400 mt-0.5">Draw your signature below</p>
                            </div>
                            <button onClick={() => setShowPad(false)} className="p-1 rounded-lg hover:bg-gray-100">
                                <X className="h-4 w-4 text-gray-400" />
                            </button>
                        </div>

                        <div className="p-4">
                            <div className="relative rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden" style={{ height: 180 }}>
                                <canvas
                                    ref={canvasRef}
                                    className="w-full h-full cursor-crosshair touch-none"
                                    style={{ display: 'block' }}
                                />
                                {!hasDrawn && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <p className="text-xs text-gray-300 font-medium">Sign here</p>
                                    </div>
                                )}
                                {/* Baseline */}
                                <div className="absolute bottom-10 left-6 right-6 border-b border-gray-200 pointer-events-none" />
                            </div>

                            <div className="flex gap-2 mt-3">
                                <button
                                    onClick={handleClearCanvas}
                                    className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50"
                                >
                                    <RefreshCw className="h-3 w-3" /> Clear
                                </button>
                                <Button
                                    onClick={handleSave}
                                    disabled={!hasDrawn}
                                    className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-40"
                                >
                                    Save Signature
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────
interface Props {
    applicantType: ApplicantType;
    initialDocuments: DocumentUploads;
    productName?: string;
    loanAmount?: number;
    tenureMonths?: number;
    onNext: (documents: DocumentUploads, signature: SignatureData, boardResolution?: BoardResolutionData) => void;
    onBack: () => void;
    onSaveProgress: (documents: DocumentUploads) => Promise<void>;
}

export function Step3DocumentUpload({ applicantType, initialDocuments, productName = "Product", loanAmount = 0, tenureMonths = 12, onNext, onBack, onSaveProgress }: Props) {
    const [documents, setDocuments] = useState<DocumentUploads>(initialDocuments);
    const [signature, setSignature] = useState<SignatureData>(null);
    const [boardResolution, setBoardResolution] = useState<BoardResolutionData | null>(null);
    const [showBoardResolutionGenerator, setShowBoardResolutionGenerator] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [savedAt, setSavedAt] = useState<Date | null>(null);

    const requiredDocs = applicantType === 'salary_earner' ? SALARY_DOCS : BUSINESS_DOCS;
    const uploadedCount = requiredDocs.filter(d => fileCount(documents[d.key]) > 0).length;
    const boardResolutionRequired = applicantType === 'business_owner';
    const boardResolutionDone = !boardResolutionRequired || !!boardResolution;
    const allUploaded = uploadedCount === requiredDocs.length && !!signature && boardResolutionDone;

    const altbankForm = ALTBANK_FORMS[applicantType];

    const handleFile = (key: string, multiple: boolean | undefined, files: FileList | null) => {
        if (!files || files.length === 0) return;
        if (multiple) {
            setDocuments(prev => ({ ...prev, [key]: Array.from(files) }));
        } else {
            setDocuments(prev => ({ ...prev, [key]: files[0] }));
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        await onSaveProgress(documents);
        setSavedAt(new Date());
        setIsSaving(false);
    };

    return (
        <>
        {showBoardResolutionGenerator && (
            <BoardResolutionGenerator
                productName={productName}
                loanAmount={loanAmount}
                tenureMonths={tenureMonths}
                initialData={boardResolution ?? undefined}
                onSave={(res) => { setBoardResolution(res); setShowBoardResolutionGenerator(false); }}
                onClose={() => setShowBoardResolutionGenerator(false)}
            />
        )}
        <div className="flex flex-col h-full">
            <div className="mb-4">
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Upload Documents</h2>
                <p className="text-gray-500 text-sm mt-1">
                    {uploadedCount} of {requiredDocs.length} documents uploaded
                </p>
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${(uploadedCount / requiredDocs.length) * 100}%` }}
                    />
                </div>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pb-2">
                {/* AltBank partnership notice + form download */}
                <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/60">
                    <div className="flex items-start gap-2 mb-2">
                        <span className="text-base shrink-0 mt-0.5">🏦</span>
                        <div>
                            <p className="text-xs font-black text-blue-800">Powered by AltBank</p>
                            <p className="text-[10px] text-blue-600 leading-relaxed mt-0.5">
                                AltBank is FairPrice's trusted financing partner. Download your personalised form below, fill in your details, and upload it with your documents.
                            </p>
                        </div>
                    </div>
                    <a
                        href={altbankForm.path}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Download className="h-3 w-3" />
                        Download {altbankForm.label}
                    </a>
                </div>

                {/* Required document uploads */}
                {requiredDocs.map((doc) => {
                    const val = documents[doc.key];
                    const uploaded = fileCount(val) > 0;
                    const isMulti = !!doc.multiple;
                    const isAltbank = doc.key === 'altbankForm';

                    return (
                        <div
                            key={doc.key}
                            className={`p-3 rounded-xl border transition-all ${uploaded ? 'border-emerald-200 bg-emerald-50/50' : isAltbank ? 'border-blue-100 bg-blue-50/30 hover:border-blue-200' : 'border-gray-100 bg-white hover:border-indigo-200'}`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${uploaded ? 'bg-emerald-500' : isAltbank ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                    {uploaded
                                        ? <CheckCircle2 className="h-4 w-4 text-white" />
                                        : isMulti
                                            ? <Files className="h-4 w-4 text-gray-400" />
                                            : isAltbank
                                                ? <UploadCloud className="h-4 w-4 text-blue-400" />
                                                : <UploadCloud className="h-4 w-4 text-gray-400" />
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-bold ${uploaded ? 'text-emerald-700' : isAltbank ? 'text-blue-700' : 'text-gray-800'}`}>
                                        {doc.label}
                                    </p>
                                    {uploaded
                                        ? <p className="text-[10px] text-emerald-600 mt-0.5 truncate">{fileName(val)}</p>
                                        : <p className={`text-[10px] mt-0.5 ${isAltbank ? 'text-blue-400' : 'text-gray-400'}`}>{doc.hint}</p>
                                    }
                                </div>
                                <label className="shrink-0 cursor-pointer">
                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${uploaded ? 'border-emerald-300 text-emerald-600 hover:bg-emerald-100' : isAltbank ? 'border-blue-200 text-blue-600 hover:bg-blue-50' : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50'}`}>
                                        {uploaded ? 'Change' : 'Upload'}
                                    </span>
                                    <input
                                        type="file"
                                        accept={doc.accept}
                                        multiple={isMulti}
                                        className="sr-only"
                                        onChange={(e) => handleFile(doc.key, doc.multiple, e.target.files)}
                                    />
                                </label>
                            </div>
                        </div>
                    );
                })}

                {/* Board Resolution — business owners only */}
                {boardResolutionRequired && (
                    <div className={`rounded-xl border p-3 ${boardResolution ? 'border-emerald-200 bg-emerald-50/40' : 'border-amber-100 bg-amber-50/30'}`}>
                        <div className="flex items-start gap-3">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${boardResolution ? 'bg-emerald-500' : 'bg-amber-100'}`}>
                                {boardResolution
                                    ? <CheckCircle2 className="h-4 w-4 text-white" />
                                    : <FileSignature className="h-4 w-4 text-amber-500" />
                                }
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-xs font-bold ${boardResolution ? 'text-emerald-700' : 'text-amber-800'}`}>
                                    Board Resolution
                                </p>
                                {boardResolution ? (
                                    <p className="text-[10px] text-emerald-600 mt-0.5">
                                        {boardResolution.companyName} · {boardResolution.directors.length} director{boardResolution.directors.length !== 1 ? 's' : ''} signed
                                    </p>
                                ) : (
                                    <p className="text-[10px] text-amber-600 mt-0.5">Required for business applications — auto-generated</p>
                                )}
                            </div>
                            <button
                                onClick={() => setShowBoardResolutionGenerator(true)}
                                className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${boardResolution ? 'border-emerald-300 text-emerald-600 hover:bg-emerald-100' : 'border-amber-300 text-amber-700 hover:bg-amber-100'}`}
                            >
                                {boardResolution ? 'Edit' : 'Generate'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Applicant signature */}
                <div className="rounded-xl border border-gray-100 bg-white p-3">
                    <p className="text-xs font-black text-gray-800 mb-0.5">Applicant Signature</p>
                    <p className="text-[10px] text-gray-400 mb-1">Sign below — this will be attached to your application</p>
                    <SignatureCanvas
                        onSave={(dataUrl) => setSignature(dataUrl)}
                        onClear={() => setSignature(null)}
                        existingSignature={signature}
                    />
                </div>

                {/* Vendor invoice notice */}
                <div className="px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl">
                    <p className="text-[10px] text-blue-600 font-medium">
                        📄 Vendor invoice is auto-generated by FairPrice upon order completion and will be sent to your email.
                    </p>
                </div>
            </div>

            {/* Save progress */}
            <div className="mt-3 flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving || uploadedCount === 0}
                    className="flex items-center gap-1.5 text-xs font-bold"
                >
                    {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    Save Progress
                </Button>
                {savedAt && (
                    <span className="text-[10px] text-gray-400">
                        Saved at {savedAt.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                )}
            </div>

            <div className="mt-3">
                <Button
                    onClick={() => onNext(documents, signature, boardResolution ?? undefined)}
                    disabled={!allUploaded}
                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-100 disabled:opacity-50"
                >
                    Review Application
                </Button>
                {!allUploaded && (
                    <p className="text-center text-[10px] text-gray-400 mt-1.5">
                        {uploadedCount < requiredDocs.length && `Upload all ${requiredDocs.length} documents`}
                        {uploadedCount >= requiredDocs.length && !boardResolutionDone && 'Generate your board resolution'}
                        {uploadedCount >= requiredDocs.length && boardResolutionDone && !signature && 'Add your signature'}
                        {' '}to continue
                    </p>
                )}
            </div>
        </div>
        </>
    );
}
