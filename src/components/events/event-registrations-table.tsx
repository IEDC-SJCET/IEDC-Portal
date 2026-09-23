"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileDown,
  FileText,
  Users,
  Loader2,
  Search,
  CheckCircle2,
  Clock,
  Eye,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buildAttendanceFileName, excludeNonStudents } from "@/lib/attendance-report";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export interface Registration {
  id: string;
  role: string;
  registeredAt: string;
  student: {
    id: string;
    name: string;
    department: string;
    batch: string;
    iecdId: string;
    admissionNumber?: string;
    phone?: string | null;
    /** Portal role of the account behind the profile (student, faculty, execom, nodal officer). */
    userRole?: string | null;
  };
  attended: boolean;
}

export interface EventRegistrationsTableProps {
  eventId: string;
  eventTitle?: string;
  startDatetime?: string;
  initialRegistrations?: Registration[];
  /** Volunteers may read the roster but not export it. */
  canExport?: boolean;
  /** Execom / Nodal Officer only: click a status to manually mark present or absent. */
  canEditAttendance?: boolean;
}

export function EventRegistrationsTable({
  eventId,
  eventTitle = "Event",
  startDatetime,
  initialRegistrations,
  canExport = true,
  canEditAttendance = false,
}: EventRegistrationsTableProps) {
  const [registrations, setRegistrations] = useState<Registration[]>(
    initialRegistrations || []
  );
  const [loading, setLoading] = useState(!initialRegistrations);
  const [downloading, setDownloading] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "attended" | "registered">("all");
  const [searchQuery, setSearchQuery] = useState("");
  // Row awaiting confirmation of a manual attendance change.
  const [attendanceTarget, setAttendanceTarget] = useState<Registration | null>(null);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");

  useEffect(() => {
    async function fetchRegistrations() {
      try {
        const res = await fetch(`/api/events/${eventId}/registrations`);
        if (res.ok) {
          const data = await res.json();
          setRegistrations(data.registrations || []);
        }
      } catch (error) {
        console.error("Failed to fetch registrations:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchRegistrations();
  }, [eventId]);

  // A preview URL is only valid while it is held, so release it on close and on unmount.
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const totalCount = registrations.length;
  const attendedCount = registrations.filter((r) => r.attended).length;
  const pendingCount = totalCount - attendedCount;

  const filteredRegistrations = registrations.filter((reg) => {
    const matchesFilter =
      statusFilter === "all"
        ? true
        : statusFilter === "attended"
          ? reg.attended
          : !reg.attended;

    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      reg.student.name.toLowerCase().includes(query) ||
      reg.student.department.toLowerCase().includes(query) ||
      reg.student.iecdId.toLowerCase().includes(query) ||
      reg.student.batch.toLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });

  const reportMeta = { title: eventTitle, startDatetime };
  const busy = downloading || downloadingDocx || previewing;
  // Shared Execom role mailboxes and faculty are not students, so they stay off the
  // roster even though the table below still shows them. Students who hold an Execom
  // title are still students and keep their row.
  const exportList = excludeNonStudents(filteredRegistrations);
  const canRunExport = exportList.length > 0;
  const pdfFileName = buildAttendanceFileName(eventTitle, "pdf", statusFilter);

  const buildPdf = async () => {
    const { generateAttendancePdf } = await import("@/lib/pdf-export");
    return generateAttendancePdf(reportMeta, exportList);
  };

  const downloadReport = async (
    format: "pdf" | "docx",
    setBusy: (value: boolean) => void
  ) => {
    if (!canRunExport) return;
    setBusy(true);
    try {
      const blob =
        format === "pdf"
          ? await buildPdf()
          : await (
            await import("@/lib/docx-export")
          ).generateAttendanceDocx(reportMeta, exportList);

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = buildAttendanceFileName(eventTitle, format, statusFilter);
      link.click();
      // Revoking in the same tick can cancel the download, so let it start first.
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (e) {
      console.error(`${format.toUpperCase()} generation failed:`, e);
      alert(`Failed to generate ${format.toUpperCase()}. Please try again.`);
    } finally {
      setBusy(false);
    }
  };

  const downloadPDF = () => downloadReport("pdf", setDownloading);
  const downloadDOCX = () => downloadReport("docx", setDownloadingDocx);

  /** Renders the same PDF the download produces and shows it in a modal. */
  const openPreview = async () => {
    if (!canRunExport) return;
    setPreviewing(true);
    try {
      const blob = await buildPdf();
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (e) {
      console.error("Report preview failed:", e);
      alert("Failed to build the preview. Please try again.");
    } finally {
      setPreviewing(false);
    }
  };

  // Clearing the URL closes the dialog; the effect above revokes it.
  const closePreview = () => setPreviewUrl(null);

  const openAttendanceDialog = (reg: Registration) => {
    setAttendanceError("");
    setAttendanceTarget(reg);
  };

  const closeAttendanceDialog = () => {
    if (savingAttendance) return;
    setAttendanceTarget(null);
  };

  /** Flips the target row's attendance on the server, then mirrors it locally. */
  const confirmAttendanceChange = async () => {
    if (!attendanceTarget) return;
    const studentId = attendanceTarget.student.id;
    const present = !attendanceTarget.attended;
    setSavingAttendance(true);
    setAttendanceError("");
    try {
      const res = await fetch(`/api/events/${eventId}/attendance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, present }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAttendanceError(data.error || "Failed to update attendance. Please try again.");
        return;
      }
      setRegistrations((prev) =>
        prev.map((r) => (r.student.id === studentId ? { ...r, attended: present } : r))
      );
      setAttendanceTarget(null);
    } catch (e) {
      console.error("Manual attendance update failed:", e);
      setAttendanceError("Failed to update attendance. Please try again.");
    } finally {
      setSavingAttendance(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-[32px] border border-gray-100/80 p-8 shadow-sm font-['Hanken_Grotesk'] text-[#1A0D0C] space-y-4">
        <div className="h-6 bg-gray-200/60 rounded-full w-48 animate-pulse" />
        <div className="h-32 bg-gray-200/60 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[32px] border border-gray-100/80 p-8 shadow-sm font-['Hanken_Grotesk'] text-[#1A0D0C] space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1A0D0C]">
              Registered Students
            </h3>
            <p className="text-xs font-medium text-gray-400">
              {totalCount} student{totalCount === 1 ? "" : "s"} total • {attendedCount} attended
            </p>
          </div>
        </div>

        {canExport && registrations.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <Button
              onClick={openPreview}
              disabled={busy || !canRunExport}
              className="h-9.5 px-4 rounded-full bg-white hover:bg-gray-50 border border-gray-200 text-[#1A0D0C] text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              {previewing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              <span>Preview</span>
            </Button>
            <Button
              onClick={downloadPDF}
              disabled={busy || !canRunExport}
              className="h-9.5 px-4 rounded-full bg-[#100A0A] hover:bg-[#2A2020] text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              <span>Download PDF</span>
            </Button>
            <Button
              onClick={downloadDOCX}
              disabled={busy || !canRunExport}
              className="h-9.5 px-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              {downloadingDocx ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <span>Download DOCX</span>
            </Button>
          </div>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      {registrations.length > 0 && (
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
          {/* Status Filter Tabs */}
          <div className="inline-flex items-center p-1 rounded-full bg-gray-100/80 border border-gray-200/60 w-full md:w-auto">
            <button
              onClick={() => setStatusFilter("all")}
              className={cn(
                "flex-1 md:flex-none px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer",
                statusFilter === "all"
                  ? "bg-white text-[#100A0A] shadow-xs"
                  : "text-gray-500 hover:text-[#100A0A]"
              )}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter("attended")}
              className={cn(
                "flex-1 md:flex-none px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                statusFilter === "attended"
                  ? "bg-emerald-500 text-white shadow-xs"
                  : "text-gray-500 hover:text-emerald-600"
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Attended ({attendedCount})
            </button>
            <button
              onClick={() => setStatusFilter("registered")}
              className={cn(
                "flex-1 md:flex-none px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                statusFilter === "registered"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-gray-500 hover:text-amber-600"
              )}
            >
              <Clock className="w-3.5 h-3.5" />
              Not Marked ({pendingCount})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student or dept..."
              className="pl-9 h-9 rounded-full text-xs bg-gray-50/60 border-gray-200 focus:bg-white"
            />
          </div>
        </div>
      )}

      {/* Table Content */}
      {registrations.length === 0 ? (
        <div className="p-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
          <p className="text-gray-400 text-xs font-medium">
            No student registrations recorded yet for this event.
          </p>
        </div>
      ) : filteredRegistrations.length === 0 ? (
        <div className="p-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
          <p className="text-gray-500 text-xs font-bold">No matching students found</p>
          <p className="text-gray-400 text-[11px] mt-1">
            Try changing the status filter tab or clear your search query.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100/80">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50/80 text-[#1A0D0C] font-bold uppercase text-[10px] tracking-wider border-b border-gray-100">
              <tr>
                <th className="px-5 py-3.5">Student Name</th>
                <th className="px-5 py-3.5">IECD ID</th>
                <th className="px-5 py-3.5">Dept & Year</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Attendance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/80 bg-white">
              {filteredRegistrations.map((reg) => (
                <tr key={reg.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5 font-bold text-[#1A0D0C]">
                    {reg.student.name}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 font-mono text-[11px]">
                    {reg.student.iecdId}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-gray-600">
                    {reg.student.department} ({reg.student.batch})
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${reg.role === "volunteer"
                        ? "bg-purple-50 text-purple-700 border-purple-100"
                        : "bg-blue-50 text-blue-700 border-blue-100"
                        }`}
                    >
                      {reg.role || "participant"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {canEditAttendance ? (
                      <button
                        type="button"
                        onClick={() => openAttendanceDialog(reg)}
                        title={reg.attended ? "Click to mark absent" : "Click to mark present"}
                        className={cn(
                          "px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase inline-flex items-center gap-1 cursor-pointer transition-colors",
                          reg.attended
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                            : "bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100"
                        )}
                      >
                        {reg.attended ? "Present ✓" : "Not Marked"}
                      </button>
                    ) : reg.attended ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold uppercase inline-flex items-center gap-1">
                        Present ✓
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-bold uppercase inline-flex items-center gap-1">
                        Not Marked
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Manual attendance override — Execom / Nodal Officer only. */}
      {canEditAttendance && (
        <Dialog
          open={!!attendanceTarget}
          onOpenChange={(open) => !open && closeAttendanceDialog()}
        >
          <DialogContent className="sm:max-w-md bg-white rounded-[32px] p-6 font-['Hanken_Grotesk'] text-[#1A0D0C]">
            {attendanceTarget && (
              <div className="flex flex-col gap-4">
                <div className="pr-10">
                  <DialogTitle className="text-lg font-bold text-[#1A0D0C]">
                    {attendanceTarget.attended ? "Mark as absent?" : "Mark as present?"}
                  </DialogTitle>
                  <DialogDescription className="text-xs font-medium text-gray-500 mt-1">
                    {attendanceTarget.student.name} ({attendanceTarget.student.iecdId})
                    {attendanceTarget.attended
                      ? " will be marked absent. Participation points for this event will be revoked."
                      : " will be checked in manually and receive this event's points."}
                  </DialogDescription>
                </div>

                {attendanceError && (
                  <p className="text-xs font-medium text-red-600">{attendanceError}</p>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button
                    onClick={closeAttendanceDialog}
                    disabled={savingAttendance}
                    className="h-9.5 px-4 rounded-full bg-white hover:bg-gray-50 border border-gray-200 text-[#1A0D0C] text-xs font-semibold cursor-pointer shadow-sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmAttendanceChange}
                    disabled={savingAttendance}
                    className={cn(
                      "h-9.5 px-4 rounded-full text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm",
                      attendanceTarget.attended
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    )}
                  >
                    {savingAttendance && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{attendanceTarget.attended ? "Mark Absent" : "Mark Present"}</span>
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Report preview — the same PDF the download button produces. */}
      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto bg-white rounded-[32px] p-6 font-['Hanken_Grotesk'] text-[#1A0D0C]">
          <div className="flex flex-col gap-4">
            <div className="pr-10">
              <DialogTitle className="text-lg font-bold text-[#1A0D0C]">
                Attendance Report Preview
              </DialogTitle>
              <DialogDescription className="text-xs font-medium text-gray-400 mt-1">
                {exportList.length} student
                {exportList.length === 1 ? "" : "s"}
                {statusFilter === "attended"
                  ? " • attended only"
                  : statusFilter === "registered"
                    ? " • not marked only"
                    : ""}
              </DialogDescription>
            </div>

            {previewUrl && (
              <iframe
                src={previewUrl}
                title="Attendance report preview"
                className="w-full h-[60vh] rounded-2xl border border-gray-200 bg-gray-50"
              />
            )}

            <div className="flex flex-wrap items-center justify-end gap-2">
              {/* Mobile browsers will not render a PDF inside an iframe. */}
              <a
                href={previewUrl ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="h-9.5 px-4 rounded-full bg-white hover:bg-gray-50 border border-gray-200 text-[#1A0D0C] text-xs font-semibold inline-flex items-center gap-2 transition-all shadow-sm"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open in new tab</span>
              </a>
              {/* Reuses the blob already built for the preview. */}
              <a
                href={previewUrl ?? undefined}
                download={pdfFileName}
                className="h-9.5 px-4 rounded-full bg-[#100A0A] hover:bg-[#2A2020] text-white text-xs font-semibold inline-flex items-center gap-2 transition-all shadow-sm"
              >
                <FileDown className="w-4 h-4" />
                <span>Download PDF</span>
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

