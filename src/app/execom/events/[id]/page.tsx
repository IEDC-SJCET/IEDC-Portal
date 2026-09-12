"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, CheckCircle2, Edit3, QrCode } from "lucide-react";
import Link from "next/link";
import { EventDetail, Registration } from "./types";
import { EventHeader } from "./_components/event-header";
import { StatusActions } from "./_components/status-actions";
import { EventRegistrationsTable } from "@/components/events/event-registrations-table";
import { EventAnalytics } from "@/components/events/event-analytics";
import { PosterUpload } from "@/components/events/poster-upload";
import { VolunteerManager } from "./_components/volunteer-manager";
import { CertificateManager } from "./_components/certificate-manager";
import { useSession } from "@/lib/auth-client";
import { isAdminRole } from "@/lib/roles";
import { useAdminSection } from "@/lib/admin-section";

export default function ExecomEventDetailPage() {
  const { base } = useAdminSection();
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState("");
  const [registrations, setRegistrations] = useState<Registration[]>([]);

  const { data: session } = useSession();
  const [registered, setRegistered] = useState(false);
  const [registeredRole, setRegisteredRole] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [regMessage, setRegMessage] = useState("");

  const userRole = (session?.user as Record<string, unknown> | undefined)?.role as string | undefined;
  // Execom and the Nodal Officer both manage events; the Nodal Officer outranks Execom.
  const canManage = isAdminRole(userRole);
  // A student who was granted volunteer access to this specific event.
  const isEventVolunteer = !canManage && registeredRole === "volunteer";

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editEventType, setEditEventType] = useState("");
  const [editVenue, setEditVenue] = useState("");
  const [editStartDatetime, setEditStartDatetime] = useState("");
  const [editEndDatetime, setEditEndDatetime] = useState("");
  const [editRegistrationLimit, setEditRegistrationLimit] = useState<number | "">("");
  const [editParticipationPoints, setEditParticipationPoints] = useState<number>(10);
  const [editVolunteerPoints, setEditVolunteerPoints] = useState<number>(20);
  const [editPosterUrl, setEditPosterUrl] = useState("");
  const [editRegistrationDeadline, setEditRegistrationDeadline] = useState("");

  const startEdit = () => {
    if (!event) return;
    setEditTitle(event.title);
    setEditDescription(event.description || "");
    setEditEventType(event.eventType);
    setEditVenue(event.venue || "");

    const formatForInput = (isoString: string) => {
      const d = new Date(isoString);
      const pad = (num: number) => String(num).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setEditStartDatetime(formatForInput(event.startDatetime));
    setEditEndDatetime(formatForInput(event.endDatetime));
    setEditRegistrationLimit(event.registrationLimit || "");
    setEditParticipationPoints(event.participationPoints || 10);
    setEditVolunteerPoints(event.volunteerPoints || 20);
    setEditPosterUrl(event.posterUrl || "");
    setEditRegistrationDeadline(event.registrationDeadline ? formatForInput(event.registrationDeadline) : "");
    setIsEditing(true);
    setMessage("");
  };

  const saveEventDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setMessage("");
    try {
      const body = {
        title: editTitle,
        description: editDescription || undefined,
        eventType: editEventType,
        venue: editVenue || undefined,
        startDatetime: new Date(editStartDatetime).toISOString(),
        endDatetime: new Date(editEndDatetime).toISOString(),
        registrationDeadline: editRegistrationDeadline ? new Date(editRegistrationDeadline).toISOString() : null,
        registrationLimit: editRegistrationLimit === "" ? null : Number(editRegistrationLimit),
        participationPoints: Number(editParticipationPoints),
        volunteerPoints: Number(editVolunteerPoints),
        posterUrl: editPosterUrl || null,
      };

      const res = await fetch(`/api/events/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const updated = await res.json();
        setEvent((prev) => (prev ? { ...prev, ...updated } : prev));
        setMessage("Event details updated successfully");
        setIsEditing(false);
      } else {
        const data = await res.json();
        setMessage(data.error || "Failed to update details");
      }
    } catch {
      setMessage("Something went wrong");
    } finally {
      setUpdating(false);
    }
  };

  const handleRegister = async () => {
    setRegistering(true);
    setRegMessage("");
    try {
      const res = await fetch(`/api/events/${params.id}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "participant" }),
      });
      const data = await res.json();
      if (res.ok) {
        setRegistered(true);
        setRegisteredRole("participant");
        setRegMessage("Successfully registered!");
        const regRes = await fetch(`/api/events/${params.id}/registrations`);
        if (regRes.ok) {
          const regData = await regRes.json();
          setRegistrations(regData.registrations || []);
        }
      } else {
        setRegMessage(data.error || "Registration failed");
      }
    } catch {
      setRegMessage("Something went wrong");
    } finally {
      setRegistering(false);
    }
  };

  const handleCancelRegistration = async (reasonInput?: string) => {
    let reason = typeof reasonInput === "string" ? reasonInput : "";
    if (!reason.trim()) {
      const promptReason = window.prompt("Please enter a reason for cancelling registration:");
      if (!promptReason || !promptReason.trim()) return;
      reason = promptReason.trim();
    }
    setRegistering(true);
    setRegMessage("");
    try {
      const res = await fetch(`/api/events/${params.id}/register`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (res.ok) {
        setRegistered(false);
        setRegisteredRole(null);
        setRegMessage("Registration cancelled");
        const regRes = await fetch(`/api/events/${params.id}/registrations`);
        if (regRes.ok) {
          const regData = await regRes.json();
          setRegistrations(regData.registrations || []);
        }
      } else {
        setRegMessage(data.error || "Failed to cancel registration");
      }
    } catch {
      setRegMessage("Something went wrong");
    } finally {
      setRegistering(false);
    }
  };

  // Re-pulls event totals + registrations, e.g. after the volunteer roster changes.
  const refreshEventData = async () => {
    try {
      const [eventRes, regRes] = await Promise.all([
        fetch(`/api/events/${params.id}`),
        fetch(`/api/events/${params.id}/registrations`),
      ]);
      if (eventRes.ok) {
        const data = await eventRes.json();
        setEvent(data);
        setRegistered(data.registered || false);
        setRegisteredRole(data.registeredRole || null);
      }
      if (regRes.ok) {
        const regData = await regRes.json();
        setRegistrations(regData.registrations || []);
      }
    } catch (error) {
      console.error("Failed to refresh event:", error);
    }
  };

  useEffect(() => {
    async function fetchEvent() {
      try {
        const [eventRes, regRes] = await Promise.all([
          fetch(`/api/events/${params.id}`),
          fetch(`/api/events/${params.id}/registrations`),
        ]);

        if (eventRes.ok) {
          const data = await eventRes.json();
          setEvent(data);
          setRegistered(data.registered || false);
          setRegisteredRole(data.registeredRole || null);
        }
        if (regRes.ok) {
          const regData = await regRes.json();
          setRegistrations(regData.registrations || []);
        }
      } catch (error) {
        console.error("Failed to fetch event:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();
  }, [params.id]);

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    setMessage("");
    try {
      const res = await fetch(`/api/events/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setEvent((prev) => (prev ? { ...prev, ...updated } : prev));
        setMessage(`Status updated to ${newStatus}`);
      } else {
        const data = await res.json();
        setMessage(data.error || "Failed to update");
      }
    } catch {
      setMessage("Something went wrong");
    } finally {
      setUpdating(false);
    }
  };

  const downloadPDF = async () => {
    if (!event) return;
    try {
      const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage([600, 800]);
      const { height } = page.getSize();

      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

      const drawHeader = (p: typeof page) => {
        p.drawText(event.title, {
          x: 50,
          y: height - 60,
          size: 18,
          font: fontBold,
          color: rgb(0.1, 0.1, 0.18),
        });

        const eventInfo = `Type: ${event.eventType.replace("_", " ").toUpperCase()}   |   Venue: ${event.venue || "N/A"}`;
        p.drawText(eventInfo, {
          x: 50,
          y: height - 80,
          size: 9,
          font: fontRegular,
          color: rgb(0.4, 0.4, 0.4),
        });

        const dateStr = `Date: ${new Date(event.startDatetime).toLocaleDateString("en-IN")}   |   Time: ${new Date(event.startDatetime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
        p.drawText(dateStr, {
          x: 50,
          y: height - 95,
          size: 9,
          font: fontRegular,
          color: rgb(0.4, 0.4, 0.4),
        });

        p.drawText("Registered Attendees List", {
          x: 50,
          y: height - 130,
          size: 12,
          font: fontBold,
          color: rgb(0.1, 0.1, 0.18),
        });

        const tableTop = height - 150;
        p.drawLine({
          start: { x: 50, y: tableTop },
          end: { x: 550, y: tableTop },
          thickness: 1,
          color: rgb(0.8, 0.8, 0.8),
        });

        const headers = ["Name", "Department", "Batch", "Status"];
        const colWidths = [180, 110, 100, 110];
        const startX = 50;

        let currentX = startX;
        for (let i = 0; i < headers.length; i++) {
          p.drawText(headers[i], {
            x: currentX,
            y: tableTop - 12,
            size: 9,
            font: fontBold,
            color: rgb(0.2, 0.2, 0.2),
          });
          currentX += colWidths[i];
        }

        p.drawLine({
          start: { x: 50, y: tableTop - 20 },
          end: { x: 550, y: tableTop - 20 },
          thickness: 1,
          color: rgb(0.8, 0.8, 0.8),
        });
      };

      drawHeader(page);

      const colWidths = [180, 110, 100, 110];
      const startX = 50;
      let currentY = height - 190;

      for (let index = 0; index < registrations.length; index++) {
        const reg = registrations[index];

        if (currentY < 50) {
          page = pdfDoc.addPage([600, 800]);
          drawHeader(page);
          currentY = height - 190;
        }

        let currentX = startX;

        // Name
        page.drawText(reg.student.name, {
          x: currentX,
          y: currentY,
          size: 9,
          font: fontRegular,
          color: rgb(0.1, 0.1, 0.1),
        });
        currentX += colWidths[0];

        // Dept
        page.drawText(reg.student.department, {
          x: currentX,
          y: currentY,
          size: 9,
          font: fontRegular,
          color: rgb(0.3, 0.3, 0.3),
        });
        currentX += colWidths[1];

        // Batch
        page.drawText(reg.student.batch, {
          x: currentX,
          y: currentY,
          size: 9,
          font: fontRegular,
          color: rgb(0.3, 0.3, 0.3),
        });
        currentX += colWidths[2];

        // Status
        const statusText = reg.attended ? "Attended" : "Registered";
        page.drawText(statusText, {
          x: currentX,
          y: currentY,
          size: 9,
          font: fontBold,
          color: reg.attended ? rgb(0.1, 0.6, 0.2) : rgb(0.5, 0.5, 0.5),
        });

        currentY -= 20;
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${event.title.replace(/\s+/g, "_")}_Attendance.pdf`;
      link.click();
    } catch (e) {
      console.error("PDF generation failed:", e);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-[1014px] mx-auto space-y-6 font-['Hanken_Grotesk'] pb-16">
        <div className="h-10 bg-gray-200/60 rounded-full w-36 animate-pulse" />
        <div className="h-96 bg-gray-200/60 rounded-[32px] animate-pulse" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="w-full max-w-[1014px] mx-auto py-24 text-center font-['Hanken_Grotesk'] space-y-4">
        <p className="text-gray-500 font-semibold text-lg">Event not found</p>
        <Button
          className="rounded-full bg-[#100A0A] text-white hover:bg-[#2A2020] px-6 h-11 text-xs font-semibold cursor-pointer"
          onClick={() => router.push(canManage ? `${base}/events` : "/student/events")}
        >
          Return to Events List
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1014px] mx-auto space-y-6 font-['Hanken_Grotesk'] text-[#1A0D0C] pb-16">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <Link
          href={canManage ? `${base}/events` : "/student/events"}
          className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white border border-gray-100/80 shadow-sm text-xs font-semibold text-gray-600 hover:text-[#100A0A] hover:bg-gray-50/80 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to events</span>
        </Link>
        {canManage && !isEditing && event.status !== "completed" && (
          <Button
            className="h-[44px] px-6 rounded-full bg-[#D9383A] text-white text-xs font-bold shadow-sm hover:bg-[#b82b2d] active:scale-98 transition-all cursor-pointer flex items-center gap-2"
            onClick={startEdit}
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Details</span>
          </Button>
        )}
      </div>

      {isEditing && canManage ? (
        <form onSubmit={saveEventDetails} className="bg-white rounded-[32px] border border-gray-100/80 p-8 md:p-10 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-2xl font-extrabold text-[#1A0D0C]">Edit Event Details</h2>
            <p className="text-xs text-gray-400 font-medium">Update event metadata, points allocation, and schedule.</p>
          </div>

          {message && (
            <div className="rounded-2xl px-4 py-3 text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
              {message}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="editTitle" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Title</Label>
            <Input id="editTitle" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required className="rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="editDescription" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Description</Label>
            <Textarea id="editDescription" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={4} className="resize-none rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5 flex flex-col justify-start">
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Event Poster (Optional)</Label>
              <PosterUpload
                value={editPosterUrl}
                onChange={(val) => setEditPosterUrl(val)}
                onRemove={() => setEditPosterUrl("")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editDeadline" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Registration Deadline (Optional)</Label>
              <Input id="editDeadline" type="datetime-local" value={editRegistrationDeadline} onChange={(e) => setEditRegistrationDeadline(e.target.value)} className="rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Event Type</Label>
              <Select value={editEventType} onValueChange={setEditEventType}>
                <SelectTrigger className="rounded-xl border-gray-200 bg-gray-50/50">
                  <SelectValue placeholder="Select Event Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="hackathon">Hackathon</SelectItem>
                  <SelectItem value="bootcamp">Bootcamp</SelectItem>
                  <SelectItem value="seminar">Seminar</SelectItem>
                  <SelectItem value="competition">Competition</SelectItem>
                  <SelectItem value="innovation_challenge">Innovation Challenge</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editVenue" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Venue</Label>
              <Input id="editVenue" value={editVenue} onChange={(e) => setEditVenue(e.target.value)} className="rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="editStart" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Start Date & Time</Label>
              <Input id="editStart" type="datetime-local" value={editStartDatetime} onChange={(e) => setEditStartDatetime(e.target.value)} required className="rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editEnd" className="text-xs font-bold text-gray-500 uppercase tracking-wider">End Date & Time</Label>
              <Input id="editEnd" type="datetime-local" value={editEndDatetime} onChange={(e) => setEditEndDatetime(e.target.value)} required className="rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="editPoints" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Participation Points</Label>
              <Input id="editPoints" type="number" value={editParticipationPoints} onChange={(e) => setEditParticipationPoints(Number(e.target.value))} required className="rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editVolPoints" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Volunteer Points</Label>
              <Input id="editVolPoints" type="number" value={editVolunteerPoints} onChange={(e) => setEditVolunteerPoints(Number(e.target.value))} required className="rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editLimit" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Registration Limit (Optional)</Label>
              <Input id="editLimit" type="number" value={editRegistrationLimit} onChange={(e) => setEditRegistrationLimit(e.target.value === "" ? "" : Number(e.target.value))} placeholder="No limit" className="rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white" />
            </div>
          </div>

          <div className="flex gap-3 pt-4 justify-end">
            <Button type="button" variant="outline" className="rounded-full px-6 h-11 text-xs font-bold border-gray-200" onClick={() => setIsEditing(false)} disabled={updating}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-full bg-[#100A0A] hover:bg-[#2A2020] text-white px-8 h-11 text-xs font-bold cursor-pointer" disabled={updating}>
              {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
            </Button>
          </div>
        </form>
      ) : (
        <>
          <EventHeader event={event} />

          {session?.user && (
            <div className="bg-white rounded-[32px] border border-gray-100/80 p-8 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-[#1A0D0C]">Your Registration Status</h3>
              {regMessage && (
                <div
                  className={`rounded-2xl px-4 py-3 text-xs font-semibold border ${registered
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : "bg-red-50 text-red-600 border-red-100"
                    }`}
                >
                  {regMessage}
                </div>
              )}

              {registeredRole === "volunteer" ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="bg-purple-50 border border-purple-200/70 rounded-full px-5 py-2.5 text-xs text-purple-800 font-bold inline-flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Registered as Volunteer</span>
                  </div>
                  <Link href={`${base}/events/${params.id}/scan`}>
                    <Button className="h-11 px-6 rounded-full bg-[#100A0A] hover:bg-[#2A2020] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm active:scale-98 transition-all">
                      <QrCode className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Scan QR Code</span>
                    </Button>
                  </Link>
                </div>
              ) : registeredRole === "participant" || registered ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="bg-emerald-50 border border-emerald-200/70 rounded-full px-5 py-2.5 text-xs text-emerald-800 font-bold inline-flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Registered as Participant</span>
                  </div>
                  {canManage && event.status !== "completed" && event.status !== "cancelled" && (!event.endDatetime || new Date() <= new Date(event.endDatetime)) && (
                    <Button
                      onClick={() => handleCancelRegistration()}
                      disabled={registering}
                      variant="outline"
                      className="rounded-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-10 px-5 text-xs font-bold cursor-pointer"
                    >
                      {registering ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Cancel Registration
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  onClick={handleRegister}
                  disabled={registering}
                  className="h-11 px-8 rounded-full bg-[#100A0A] hover:bg-[#2A2020] text-white text-xs font-bold cursor-pointer shadow-sm"
                >
                  {registering ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Register for Event
                </Button>
              )}
            </div>
          )}

          {canManage && (
            <StatusActions
              event={event}
              updating={updating}
              message={message}
              onUpdateStatus={updateStatus}
            />
          )}

          {canManage && (
            <VolunteerManager
              eventId={event.id}
              onVolunteersChanged={refreshEventData}
            />
          )}

          {canManage && (
            <CertificateManager
              eventId={event.id}
              eventStatus={event.status}
            />
          )}

          {(canManage || isEventVolunteer) && (
            <EventAnalytics
              eventId={event.id}
              subtitle={
                isEventVolunteer
                  ? "You have volunteer access to this event — view analytics and scan participant QR codes."
                  : undefined
              }
            />
          )}

          <EventRegistrationsTable
            canExport={canManage}
            eventId={event.id}
            eventTitle={event.title}
            eventType={event.eventType}
            venue={event.venue}
            startDatetime={event.startDatetime}
          />
        </>
      )}
    </div>
  );
}