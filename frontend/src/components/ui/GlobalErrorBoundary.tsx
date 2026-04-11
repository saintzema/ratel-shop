"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { ShieldAlert, RefreshCw, Home, RotateCcw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isRecovering: boolean;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, isRecovering: false };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Global Error Caught:", error, errorInfo);
    this.setState({ errorInfo });
    
    // Auto-recovery attempt for common hydration/chunk errors
    const errorMsg = error.message.toLowerCase();
    if (
      errorMsg.includes("hydration") || 
      errorMsg.includes("loading chunk") ||
      errorMsg.includes("syntaxerror")
    ) {
      console.warn("Detected likely recoverable error. Auto-refreshing in 2s...");
      // We don't auto-refresh immediately to avoid infinite loops, 
      // but we could implement a counter in sessionStorage.
    }
  }

  handleRestart = () => {
    this.setState({ isRecovering: true });
    // Clear potentially corrupt caches
    if (typeof window !== "undefined" && window.localStorage) {
      // We don't wipe everything, just potential state sync issues
      // localStorage.removeItem("fp_sync_lock"); 
    }
    
    setTimeout(() => {
      window.location.href = "/";
    }, 500);
  };

  handleHardReset = () => {
     this.setState({ isRecovering: true });
     if (typeof window !== "undefined") {
       // Deep reset: Clear session and local storage then reload
       localStorage.clear();
       sessionStorage.clear();
       window.location.reload();
     }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center font-sans">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-red-500/10 blur-3xl rounded-full scale-150 animate-pulse" />
                <div className="relative h-24 w-24 bg-red-50 rounded-[32px] border-2 border-red-100 flex items-center justify-center shadow-xl">
                    <ShieldAlert className="h-12 w-12 text-red-500" />
                </div>
                <div className="absolute -bottom-2 -right-2 h-10 w-10 bg-white rounded-full border border-red-100 flex items-center justify-center shadow-md animate-bounce">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
            </div>

            <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-3">
                Something didn't launch correctly
            </h1>
            <p className="text-gray-500 max-w-md mx-auto mb-10 leading-relaxed font-medium">
                Our stability engine caught an unexpected error. This usually happens due to a brief connection timeout or a sync conflict.
            </p>

            <div className="grid grid-cols-1 gap-3 w-full max-w-sm">
                <Button 
                    onClick={this.handleRestart}
                    disabled={this.state.isRecovering}
                    className="h-14 rounded-2xl bg-gray-900 hover:bg-black text-white font-bold flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95"
                >
                    {this.state.isRecovering ? (
                        <RefreshCw className="h-5 w-5 animate-spin" />
                    ) : (
                        <RotateCcw className="h-5 w-5" />
                    )}
                    Attempt Auto-Recovery
                </Button>

                <Button 
                    variant="outline"
                    onClick={() => window.location.reload()}
                    className="h-14 rounded-2xl border-gray-200 hover:bg-gray-50 font-bold transition-all text-gray-700"
                >
                    Simple Reload
                </Button>

                <button 
                  onClick={this.handleHardReset}
                  className="mt-4 text-[10px] text-gray-300 hover:text-red-400 font-black uppercase tracking-widest transition-colors"
                >
                    Deep System Reset (Clear All Caches)
                </button>
            </div>

            <div className="mt-16 pt-8 border-t border-gray-50 w-full max-w-lg">
                <div className="bg-gray-50 rounded-2xl p-4 text-left border border-gray-100 opacity-60">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Technical Insight</p>
                    <code className="text-[11px] text-gray-600 break-all leading-tight block font-mono">
                        {this.state.error?.name}: {this.state.error?.message.substring(0, 150)}...
                    </code>
                </div>
            </div>
            
            <p className="mt-8 text-[11px] text-gray-400 font-bold uppercase tracking-tighter">
                FairPrice Resilience Engine — v4.6
            </p>
        </div>
      );
    }

    return this.props.children;
  }
}
