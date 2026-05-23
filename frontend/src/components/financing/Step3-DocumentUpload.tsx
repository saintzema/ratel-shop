"use client";

import { useState } from "react";
import { CheckCircle2, UploadCloud, Loader2, Save, Files } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ApplicantType } from "./Step1-ApplicantType";

// A doc value can be a single File, an array of Files, or null
export type DocValue = File | File[] | null;
export type DocumentUploads = Record<string, DocValue>;

interface DocDef {
    key: string;
    label: string;
    hint: string;
    accept: string;
    multiple?: boolean; // allows multiple files for this field
}

const SALARY_DOCS: DocDef[] = [
    { key: 'bankStatement', label: '6 Months Bank Statement', hint: 'PDF or image', accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'payslip', label: 'Recent Payslip (3–6 months)', hint: 'PDF or image', accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'confirmationLetter', label: 'Confirmation / Employment Letter', hint: 'PDF or image', accept: '.pdf,.jpg,.jpeg,.png' },
];

const BUSINESS_DOCS: DocDef[] = [
    { key: 'cac', label: 'CAC Documents (Form 1 & 2)', hint: 'Select both forms at once (PDF or image)', accept: '.pdf,.jpg,.jpeg,.png', multiple: true },
    { key: 'auditedFinancials', label: '1–2 Years Audited Financials', hint: 'PDF', accept: '.pdf' },
    { key: 'bankStatement', label: '1 Year Bank Statement', hint: 'PDF or image', accept: '.pdf,.jpg,.jpeg,.png' },
];

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

interface Props {
    applicantType: ApplicantType;
    initialDocuments: DocumentUploads;
    onNext: (documents: DocumentUploads) => void;
    onBack: () => void;
    onSaveProgress: (documents: DocumentUploads) => Promise<void>;
}

export function Step3DocumentUpload({ applicantType, initialDocuments, onNext, onBack, onSaveProgress }: Props) {
    const [documents, setDocuments] = useState<DocumentUploads>(initialDocuments);
    const [isSaving, setIsSaving] = useState(false);
    const [savedAt, setSavedAt] = useState<Date | null>(null);

    const requiredDocs = applicantType === 'salary_earner' ? SALARY_DOCS : BUSINESS_DOCS;
    const uploadedCount = requiredDocs.filter(d => fileCount(documents[d.key]) > 0).length;
    const allUploaded = uploadedCount === requiredDocs.length;

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
        <div className="flex flex-col h-full">
            <div className="mb-4">
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Upload Documents</h2>
                <p className="text-gray-500 text-sm mt-1">
                    {uploadedCount} of {requiredDocs.length} documents uploaded
                </p>
                {/* Progress bar */}
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${(uploadedCount / requiredDocs.length) * 100}%` }}
                    />
                </div>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pb-2">
                {requiredDocs.map((doc) => {
                    const val = documents[doc.key];
                    const uploaded = fileCount(val) > 0;
                    const isMulti = !!doc.multiple;

                    return (
                        <div
                            key={doc.key}
                            className={`p-3 rounded-xl border transition-all ${uploaded ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-100 bg-white hover:border-indigo-200'}`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${uploaded ? 'bg-emerald-500' : 'bg-gray-100'}`}>
                                    {uploaded
                                        ? <CheckCircle2 className="h-4 w-4 text-white" />
                                        : isMulti
                                            ? <Files className="h-4 w-4 text-gray-400" />
                                            : <UploadCloud className="h-4 w-4 text-gray-400" />
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-bold ${uploaded ? 'text-emerald-700' : 'text-gray-800'}`}>
                                        {doc.label}
                                    </p>
                                    {uploaded
                                        ? <p className="text-[10px] text-emerald-600 mt-0.5 truncate">{fileName(val)}</p>
                                        : <p className="text-[10px] text-gray-400 mt-0.5">{doc.hint}</p>
                                    }
                                </div>
                                <label className="shrink-0 cursor-pointer">
                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${uploaded ? 'border-emerald-300 text-emerald-600 hover:bg-emerald-100' : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50'}`}>
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
            </div>

            {/* Vendor invoice notice */}
            <div className="mt-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-[10px] text-blue-600 font-medium">
                    📄 Vendor invoice is auto-generated by FairPrice upon order completion and will be sent to your email.
                </p>
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
                    onClick={() => onNext(documents)}
                    disabled={!allUploaded}
                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-100 disabled:opacity-50"
                >
                    Review Application
                </Button>
                {!allUploaded && (
                    <p className="text-center text-[10px] text-gray-400 mt-1.5">
                        Upload all {requiredDocs.length} documents to continue
                    </p>
                )}
            </div>
        </div>
    );
}
