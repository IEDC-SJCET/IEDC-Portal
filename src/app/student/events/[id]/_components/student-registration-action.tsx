"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, QrCode, XCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface StudentRegistrationActionProps {
  eventId: string;
  registered: boolean;
  registeredRole?: string | null;
  registering: boolean;
  /** Visitor opened a shared link without being signed in. */
  isGuest?: boolean;
  message: string;
  eventStatus?: string | null;
  endDatetime?: string | null;
  onRegister: () => Promise<void>;
  onCancelRegistration: (reason: string) => Promise<void>;
}

export function StudentRegistrationAction({
  eventId,
  registered,
  registeredRole,
  registering,
  isGuest = false,
  message,
  eventStatus,
  endDatetime,
  onRegister,
  onCancelRegistration,
}: StudentRegistrationActionProps) {
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const isCompleted =
    eventStatus === "completed" ||
    eventStatus === "cancelled" ||
    (endDatetime ? new Date() > new Date(endDatetime) : false);

  const handleOpenCancelModal = () => {
    setReason("");
    setReasonError("");
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setReasonError("Cancellation reason is required.");
      return;
    }

    setReasonError("");
    setCancelling(true);
    try {
      await onCancelRegistration(reason.trim());
      setIsCancelModalOpen(false);
      setReason("");
    } catch {
      setReasonError("Failed to cancel registration.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-[28px] border border-gray-100/90 p-6 md:p-8 shadow-xs font-['Hanken_Grotesk'] text-[#1A0D0C]">
        <h3 className="font-semibold text-[18px] text-[#1A0D0C] tracking-tight mb-4">Registration</h3>
        {message && (
          <div
            className={`mb-4 rounded-2xl px-4 py-3 text-sm font-medium flex items-center gap-2.5 transition-all ${registered
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200/70"
              : "bg-rose-50 text-rose-800 border border-rose-200/70"
              }`}
          >
            {registered && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            <span>{message}</span>
          </div>
        )}

        {registeredRole === "volunteer" ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-purple-50 border border-purple-200/70 rounded-full px-5 py-2.5 text-sm text-purple-800 font-semibold flex items-center gap-2 w-fit shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Registered as Volunteer</span>
              </div>
              {!isCompleted && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleOpenCancelModal}
                  className="h-11 px-5 rounded-full border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-medium flex items-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>Cancel Registration</span>
                </Button>
              )}
            </div>
            <Link href={`/execom/events/${eventId}/scan`}>
              <Button className="h-11 px-6 rounded-full bg-[#100A0A] hover:bg-[#2A2020] text-white font-medium flex items-center gap-2 cursor-pointer shadow-sm active:scale-98 transition-all">
                <QrCode className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Scan QR Code for Attendance</span>
              </Button>
            </Link>
          </div>
        ) : registered ? (
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-emerald-50 border border-emerald-200/70 rounded-full px-5 py-2.5 text-sm text-emerald-800 font-semibold flex items-center gap-2 w-fit shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Registered</span>
            </div>
            {!isCompleted && (
              <Button
                type="button"
                variant="outline"
                onClick={handleOpenCancelModal}
                className="h-11 px-5 rounded-full border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-medium flex items-center gap-2 cursor-pointer transition-all active:scale-98"
              >
                <XCircle className="w-4 h-4 shrink-0" />
                <span>Cancel Registration</span>
              </Button>
            )}
          </div>
        ) : (
          <Button
            onClick={onRegister}
            disabled={registering}
            className="w-full md:w-auto h-11 px-8 rounded-full bg-[#100A0A] hover:bg-[#2A2020] text-white font-medium cursor-pointer shadow-sm active:scale-98 transition-all"
          >
            {registering ? <Loader2 className="w-4 h-4 animate-spin mr-2 shrink-0" /> : null}
            {isGuest ? "Login to Register" : "Register for Event"}
          </Button>
        )}
        {isGuest && !registered && (
          <p className="mt-3 text-sm text-gray-500">
            Sign in with your SJCET college Google account to register for this event.
          </p>
        )}
      </div>

      {/* Mandatory Cancellation Reason Modal */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-[32px] border border-gray-100 p-6 md:p-8 shadow-2xl font-['Hanken_Grotesk'] text-[#1A0D0C]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#1A0D0C] tracking-tight">
              Cancel Registration
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-1">
              Please state why you are cancelling your event registration. This is a required field.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmCancel} className="space-y-4 pt-2">
            <div>
              <label htmlFor="cancel-reason" className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                Reason for Cancellation <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="cancel-reason"
                rows={3}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (e.target.value.trim()) setReasonError("");
                }}
                placeholder="e.g. Schedule conflict, academic exam, personal emergency..."
                className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 p-3.5 text-sm text-[#1A0D0C] placeholder:text-gray-400 outline-none transition-all focus:bg-white focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 resize-none"
              />
              {reasonError && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-rose-600 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{reasonError}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCancelModalOpen(false)}
                disabled={cancelling}
                className="h-10 px-5 rounded-full border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold cursor-pointer"
              >
                Keep Registration
              </Button>
              <Button
                type="submit"
                disabled={cancelling}
                className="h-10 px-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer shadow-sm active:scale-98 transition-all"
              >
                {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5 shrink-0" /> : null}
                Confirm Cancellation
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}