"use client";

import { useState, useCallback, use } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, CheckCircle2, XCircle, ArrowLeft, Loader2, QrCode, Sparkles, UserCheck } from "lucide-react";
import Link from "next/link";
import { useAdminSection } from "@/lib/admin-section";
import { Scanner, useDevices } from "@yudiel/react-qr-scanner";
import type { IDetectedBarcode } from "@yudiel/react-qr-scanner";

interface ScanResult {
  success: boolean;
  message: string;
  studentName?: string;
  iecdId?: string;
}

export default function ExecomScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const { base } = useAdminSection();

  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [manualIecdId, setManualIecdId] = useState("");
  const [submittingManual, setSubmittingManual] = useState(false);

  const devices = useDevices();

  const handleScan = useCallback(
    async (detectedCodes: IDetectedBarcode[]) => {
      if (processing || !detectedCodes.length) return;
      const rawText = detectedCodes[0]?.rawValue?.trim();
      if (!rawText) return;

      // Instant haptic feedback (payment-app feel)
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(80);
        } catch {
          // Ignore if vibration is restricted
        }
      }

      setProcessing(true);
      try {
        const res = await fetch("/api/attendance/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId, qrData: rawText }),
        });
        const data = await res.json();

        setLastResult({
          success: data.success,
          message: data.message || (data.success ? "Marked present" : "Check-in failed"),
          studentName: data.studentName,
          iecdId: data.iecdId,
        });

        if (data.success) {
          setScanCount((prev) => prev + 1);
        }
      } catch {
        setLastResult({
          success: false,
          message: "Failed to connect to server",
        });
      } finally {
        // Cooldown before processing the next scan
        setTimeout(() => {
          setProcessing(false);
        }, 1500);
      }
    },
    [processing, eventId]
  );

  const handleManualCheckIn = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const idToSubmit = manualIecdId.trim();
      if (!idToSubmit || submittingManual) return;

      setSubmittingManual(true);
      try {
        const res = await fetch("/api/attendance/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId, iecdId: idToSubmit }),
        });
        const data = await res.json();

        setLastResult({
          success: data.success,
          message: data.message || (data.success ? "Marked present" : "Check-in failed"),
          studentName: data.studentName,
          iecdId: data.iecdId || idToSubmit,
        });

        if (data.success) {
          setScanCount((prev) => prev + 1);
          setManualIecdId("");
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            try {
              navigator.vibrate([60, 40, 60]);
            } catch {
              // Ignore
            }
          }
        }
      } catch {
        setLastResult({
          success: false,
          message: "Failed to connect to server",
        });
      } finally {
        setSubmittingManual(false);
      }
    },
    [manualIecdId, submittingManual, eventId]
  );

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-16 font-['Hanken_Grotesk'] text-[#1A0D0C]">
      {/* Top back button */}
      <Link
        href={`${base}/events/${eventId}`}
        className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white border border-gray-100/80 shadow-sm text-xs font-semibold text-gray-600 hover:text-[#100A0A] hover:bg-gray-50/80 transition-all cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to event details</span>
      </Link>

      {/* Header Info */}
      <div className="text-center space-y-2">
        <span className="px-3 py-1 rounded-full bg-red-50 text-[#D9383A] text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
          <QrCode className="w-3 h-3" /> Live Scanner
        </span>
        <h1 className="text-3xl font-extrabold text-[#1A0D0C] tracking-tight">Attendance QR Scanner</h1>
        <p className="text-xs font-medium text-gray-400">
          Point camera at a student&apos;s digital IEDC pass to record entry in real time.
        </p>
      </div>

      {/* Camera Selection Dropdown */}
      {devices.length > 1 && (
        <div className="bg-white rounded-[28px] border border-gray-100/80 p-5 shadow-sm space-y-2">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
            Select Camera Input
          </label>
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="w-full text-xs font-bold border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50/50 text-[#1A0D0C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#100A0A] cursor-pointer"
          >
            <option value="">Default (Rear Camera)</option>
            {devices.map((device, i) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${i + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Scanner Main Card */}
      <div className="bg-white rounded-[32px] border border-gray-100/80 overflow-hidden shadow-sm p-4 space-y-4">
        <div className="aspect-square relative bg-[#100A0A] rounded-[24px] overflow-hidden shadow-inner flex items-center justify-center">
          {!scanning ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#100A0A]/95 text-white p-8 text-center space-y-4 z-10">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                <Camera className="w-8 h-8 text-white/80" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold text-white">Camera Offline</p>
                <p className="text-xs text-white/50 max-w-xs leading-relaxed">
                  Position your camera over the student&apos;s digital IEDC QR pass.
                </p>
              </div>
              <Button
                onClick={() => {
                  setScanning(true);
                  setLastResult(null);
                }}
                className="h-[46px] px-8 rounded-full bg-white text-[#100A0A] hover:bg-gray-100 text-xs font-bold shadow-md cursor-pointer transition-all active:scale-98"
              >
                <Camera className="w-4 h-4 mr-2" />
                Activate Camera
              </Button>
            </div>
          ) : (
            <div className="w-full h-full relative">
              <Scanner
                onScan={handleScan}
                onError={(err) => {
                  console.warn("Scanner error:", err);
                }}
                formats={["qr_code"]}
                paused={processing}
                allowMultiple={true}
                scanDelay={1500}
                sound={true}
                constraints={
                  selectedDeviceId
                    ? { deviceId: { exact: selectedDeviceId } }
                    : { facingMode: "environment" }
                }
                components={{
                  finder: true,
                  torch: true,
                }}
                styles={{
                  container: {
                    width: "100%",
                    height: "100%",
                    borderRadius: "24px",
                    overflow: "hidden",
                  },
                  video: {
                    objectFit: "cover",
                    width: "100%",
                    height: "100%",
                  },
                }}
              />

              {processing && (
                <div className="absolute top-4 right-4 bg-[#100A0A]/85 backdrop-blur-md border border-white/15 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg z-20 animate-in fade-in">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>Verifying QR...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {scanning && (
          <div className="p-4 flex justify-between items-center bg-gray-50/60 rounded-2xl border border-gray-100/80">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-gray-600">
                Session Scans: <span className="font-extrabold text-[#1A0D0C]">{scanCount}</span>
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 rounded-full bg-white text-xs font-bold border-gray-200 hover:bg-gray-50 text-gray-700 cursor-pointer shadow-xs"
              onClick={() => setScanning(false)}
            >
              Stop Camera
            </Button>
          </div>
        )}
      </div>

      {/* Manual Check-in Fallback Card */}
      <div className="bg-white rounded-[28px] border border-gray-100/80 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <label htmlFor="manual-iedc-id" className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-[#D9383A]" /> Manual Check-in Fallback
          </label>
          <span className="text-[10px] text-gray-400 font-medium">If QR cannot be scanned</span>
        </div>
        <form onSubmit={handleManualCheckIn} className="flex gap-2">
          <Input
            id="manual-iedc-id"
            type="text"
            placeholder="Enter IEDC ID (e.g. IEDC-24-CS-001)"
            value={manualIecdId}
            onChange={(e) => setManualIecdId(e.target.value.toUpperCase())}
            disabled={submittingManual}
            className="h-11 rounded-xl bg-gray-50/50 border-gray-200 text-xs font-bold text-[#1A0D0C] placeholder:text-gray-400 placeholder:font-normal focus-visible:ring-[#100A0A] uppercase tracking-wider"
          />
          <Button
            type="submit"
            disabled={!manualIecdId.trim() || submittingManual}
            className="h-11 px-5 rounded-xl bg-[#100A0A] hover:bg-[#2B2B2B] text-white text-xs font-bold shrink-0 shadow-sm transition-all active:scale-98 cursor-pointer disabled:opacity-50"
          >
            {submittingManual ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Check In"
            )}
          </Button>
        </form>
      </div>

      {/* Result Alert Card */}
      {lastResult && (
        <div
          className={`rounded-[24px] border p-5 flex items-center gap-4 shadow-xs transition-all animate-in fade-in ${lastResult.success
            ? "bg-emerald-50/80 border-emerald-100 text-emerald-900"
            : "bg-red-50/80 border-red-100 text-red-900"
            }`}
        >
          {lastResult.success ? (
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <XCircle className="w-6 h-6" />
            </div>
          )}
          <div className="flex-1 space-y-0.5">
            <p className="font-extrabold text-sm tracking-tight">{lastResult.message}</p>
            {lastResult.studentName && (
              <p className={`text-xs font-bold ${lastResult.success ? "text-emerald-700" : "text-red-700"}`}>
                {lastResult.studentName} {lastResult.iecdId ? `• ${lastResult.iecdId}` : ""}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}