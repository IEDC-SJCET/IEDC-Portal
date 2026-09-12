"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Award,
  CheckCircle2,
  Eye,
  ImagePlus,
  Loader2,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TemplateMode = "default" | "custom";

interface TemplateState {
  mode: TemplateMode;
  backgroundUrl: string | null;
  heading: string;
  signatoryName: string;
  signatoryDesignation: string;
  namePosX: number;
  namePosY: number;
  nameFontSize: number;
  nameColor: string;
  showDetailLine: boolean;
  detailPosY: number;
  detailFontSize: number;
}

interface Attendee {
  studentId: string;
  name: string;
  department: string;
  batch: string;
  iecdId: string;
  registrationRole: string | null;
  certificateId: string | null;
  certificateNumber: string | null;
  issuedAt: string | null;
}

interface Stats {
  eligible: number;
  issued: number;
  pending: number;
  lastIssuedAt: string | null;
}

const FALLBACK_TEMPLATE: TemplateState = {
  mode: "default",
  backgroundUrl: null,
  heading: "Certificate of Participation",
  signatoryName: "Nodal Officer",
  signatoryDesignation: "IEDC, SJCET Palai",
  namePosX: 50,
  namePosY: 52,
  nameFontSize: 34,
  nameColor: "#1A0D0C",
  showDetailLine: true,
  detailPosY: 45,
  detailFontSize: 13,
};

/** The renderer sizes custom artwork against a nominal 842pt-wide page. */
const NOMINAL_PAGE_WIDTH = 842;

interface CertificateManagerProps {
  eventId: string;
  eventStatus: string | null;
}

export function CertificateManager({
  eventId,
  eventStatus,
}: CertificateManagerProps) {
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<TemplateState>(FALLBACK_TEMPLATE);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [stats, setStats] = useState<Stats>({
    eligible: 0,
    issued: 0,
    pending: 0,
    lastIssuedAt: null,
  });

  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    tone: "success" | "error";
  } | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Blob URLs must be revoked manually or the tab leaks a PDF per preview.
  const previewUrlRef = useRef<string | null>(null);

  const isCompleted = eventStatus === "completed";

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/certificates`);
      if (!res.ok) return;
      const data = await res.json();
      setTemplate({ ...FALLBACK_TEMPLATE, ...cleanTemplate(data.template) });
      setAttendees(data.attendees || []);
      setStats(data.stats);
    } catch (err) {
      console.error("Failed to load certificate panel:", err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    async function init() {
      await load();
    }
    init();
  }, [load]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const patch = (changes: Partial<TemplateState>) =>
    setTemplate((prev) => ({ ...prev, ...changes }));

  const buildPayload = () => ({
    mode: template.mode,
    backgroundUrl: template.backgroundUrl,
    heading: template.heading || null,
    signatoryName: template.signatoryName || null,
    signatoryDesignation: template.signatoryDesignation || null,
    namePosX: template.namePosX,
    namePosY: template.namePosY,
    nameFontSize: template.nameFontSize,
    nameColor: template.nameColor,
    showDetailLine: template.showDetailLine,
    detailPosY: template.detailPosY,
    detailFontSize: template.detailFontSize,
  });

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Downscale large artwork: the name is drawn as vector text on top, so
        // 2000px keeps print quality while staying small enough for one row.
        const MAX_WIDTH = 2000;
        const scale = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Flatten transparency onto white so PNG cut-outs do not render black.
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          patch({
            backgroundUrl: canvas.toDataURL("image/jpeg", 0.92),
            mode: "custom",
          });
        }
        setUploading(false);
      };
      img.onerror = () => {
        setUploading(false);
        setMessage({ text: "That image could not be read.", tone: "error" });
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setUploading(false);
      setMessage({ text: "That image could not be read.", tone: "error" });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const saveTemplate = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/events/${eventId}/certificates/template`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (res.ok) {
        setTemplate({ ...FALLBACK_TEMPLATE, ...cleanTemplate(data.template) });
        setMessage({ text: "Certificate template saved.", tone: "success" });
      } else {
        setMessage({ text: data.error || "Failed to save.", tone: "error" });
      }
    } catch {
      setMessage({ text: "Something went wrong.", tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  const openPreview = async () => {
    setPreviewing(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/events/${eventId}/certificates/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: buildPayload() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage({
          text: data.error || "Failed to render preview.",
          tone: "error",
        });
        return;
      }
      const blob = await res.blob();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      setPreviewUrl(url);
    } catch {
      setMessage({ text: "Failed to render preview.", tone: "error" });
    } finally {
      setPreviewing(false);
    }
  };

  const sendCertificates = async () => {
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/events/${eventId}/certificates`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: data.message, tone: "success" });
        await load();
      } else {
        setMessage({
          text: data.error || "Failed to send certificates.",
          tone: "error",
        });
      }
    } catch {
      setMessage({ text: "Something went wrong.", tone: "error" });
    } finally {
      setSending(false);
      setConfirmOpen(false);
    }
  };

  /** Click anywhere on the artwork to drop the name there. */
  const placeName = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    patch({
      namePosX: Math.round(clamp(x, 0, 100) * 10) / 10,
      namePosY: Math.round(clamp(y, 0, 100) * 10) / 10,
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-[32px] border border-gray-100/80 p-8 shadow-sm">
        <div className="h-6 w-52 bg-gray-100 rounded-full animate-pulse" />
        <div className="h-28 mt-5 bg-gray-100 rounded-3xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[32px] border border-gray-100/80 p-8 shadow-sm font-['Hanken_Grotesk'] text-[#1A0D0C] space-y-6">
      {/* Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#FAE9CF] flex items-center justify-center text-[#990000] shrink-0">
            <Award className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1A0D0C]">
              Certificate Generation
            </h3>
            <p className="text-xs text-gray-400 font-medium">
              Issue certificates to students who registered and were marked
              present.
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-xs font-semibold border",
            message.tone === "success"
              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
              : "bg-red-50 text-red-600 border-red-100"
          )}
        >
          {message.text}
        </div>
      )}

      {/* Counters */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Eligible" value={stats.eligible} icon={<Users />} />
        <StatTile label="Issued" value={stats.issued} tone="emerald" />
        <StatTile label="Pending" value={stats.pending} tone="amber" />
      </div>

      {!isCompleted && (
        <div className="rounded-2xl px-4 py-3 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
          Mark this event as <strong>completed</strong> to send certificates. You
          can still design and preview the template now.
        </div>
      )}

      {/* Template mode */}
      <div className="space-y-3">
        <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Certificate Template
        </Label>
        <div className="flex flex-wrap gap-2.5">
          {(
            [
              { key: "default", label: "Default IEDC Template" },
              { key: "custom", label: "Custom Upload" },
            ] as const
          ).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => patch({ mode: option.key })}
              className={cn(
                "px-5 h-[38px] rounded-full border text-xs font-bold transition-all cursor-pointer",
                template.mode === option.key
                  ? "bg-[#100A0A] border-[#100A0A] text-white shadow-sm"
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {template.mode === "default" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Heading
            </Label>
            <Input
              value={template.heading}
              onChange={(e) => patch({ heading: e.target.value })}
              placeholder="Certificate of Participation"
              className="rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Signatory Name
            </Label>
            <Input
              value={template.signatoryName}
              onChange={(e) => patch({ signatoryName: e.target.value })}
              placeholder="Nodal Officer"
              className="rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Signatory Designation
            </Label>
            <Input
              value={template.signatoryDesignation}
              onChange={(e) => patch({ signatoryDesignation: e.target.value })}
              placeholder="IEDC, SJCET Palai"
              className="rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleUpload}
            className="hidden"
          />
          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              variant="outline"
              className="h-11 px-5 rounded-full border-gray-200 text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImagePlus className="w-4 h-4 text-[#990000]" />
              )}
              <span>
                {template.backgroundUrl ? "Replace Artwork" : "Upload Artwork"}
              </span>
            </Button>
            {template.backgroundUrl && (
              <Button
                type="button"
                variant="outline"
                onClick={() => patch({ backgroundUrl: null })}
                className="h-11 px-4 rounded-full border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove</span>
              </Button>
            )}
          </div>

          {template.backgroundUrl ? (
            <>
              <p className="text-xs text-gray-400 font-medium">
                Click anywhere on the artwork to place the participant name. Only
                the name and class line are added — the rest of your design is
                untouched.
              </p>
              <NamePlacementCanvas
                template={template}
                onPlace={placeName}
              />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <NumberField
                  label="Name X (%)"
                  value={template.namePosX}
                  min={0}
                  max={100}
                  onChange={(v) => patch({ namePosX: v })}
                />
                <NumberField
                  label="Name Y (%)"
                  value={template.namePosY}
                  min={0}
                  max={100}
                  onChange={(v) => patch({ namePosY: v })}
                />
                <NumberField
                  label="Font Size"
                  value={template.nameFontSize}
                  min={8}
                  max={120}
                  onChange={(v) => patch({ nameFontSize: v })}
                />
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Text Colour
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={template.nameColor}
                      onChange={(e) => patch({ nameColor: e.target.value })}
                      className="h-10 w-12 rounded-lg border border-gray-200 bg-white cursor-pointer p-1"
                    />
                    <span className="font-mono text-xs text-gray-500">
                      {template.nameColor.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-4">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer select-none h-10">
                  <input
                    type="checkbox"
                    checked={template.showDetailLine}
                    onChange={(e) =>
                      patch({ showDetailLine: e.target.checked })
                    }
                    className="w-4 h-4 accent-[#990000] cursor-pointer"
                  />
                  <span>Show class line (department &amp; batch)</span>
                </label>
                {template.showDetailLine && (
                  <>
                    <NumberField
                      label="Class Y (%)"
                      value={template.detailPosY}
                      min={0}
                      max={100}
                      onChange={(v) => patch({ detailPosY: v })}
                    />
                    <NumberField
                      label="Class Size"
                      value={template.detailFontSize}
                      min={6}
                      max={60}
                      onChange={(v) => patch({ detailFontSize: v })}
                    />
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 px-6 py-10 text-center">
              <p className="text-xs text-gray-400 font-medium">
                Upload a PNG or JPEG certificate design. Participant names will be
                placed on top of it automatically.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-1">
        <Button
          type="button"
          onClick={openPreview}
          disabled={previewing}
          variant="outline"
          className="h-11 px-6 rounded-full border-gray-200 text-xs font-bold flex items-center gap-2 cursor-pointer"
        >
          {previewing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Eye className="w-4 h-4 text-gray-500" />
          )}
          <span>Preview Certificate</span>
        </Button>

        <Button
          type="button"
          onClick={saveTemplate}
          disabled={saving}
          variant="outline"
          className="h-11 px-6 rounded-full border-gray-200 text-xs font-bold cursor-pointer"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          Save Template
        </Button>

        <Button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={!isCompleted || sending || stats.pending === 0}
          className="h-11 px-7 rounded-full bg-[#100A0A] hover:bg-[#2A2020] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span>
            {stats.pending > 0
              ? `Send ${stats.pending} Certificate${stats.pending === 1 ? "" : "s"}`
              : "All Certificates Sent"}
          </span>
        </Button>
      </div>

      {/* Recipient roster */}
      {attendees.length > 0 && (
        <div className="pt-2 space-y-3">
          <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Eligible Recipients ({attendees.length})
          </Label>
          <div className="rounded-2xl border border-gray-100 overflow-hidden">
            <div className="max-h-[320px] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/80 sticky top-0">
                  <tr className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                    <th className="px-4 py-2.5">Name</th>
                    <th className="px-4 py-2.5 hidden sm:table-cell">Class</th>
                    <th className="px-4 py-2.5">Certificate</th>
                  </tr>
                </thead>
                <tbody>
                  {attendees.map((a) => (
                    <tr
                      key={a.studentId}
                      className="border-t border-gray-100 text-xs"
                    >
                      <td className="px-4 py-2.5 font-semibold text-[#1A0D0C]">
                        {a.name}
                        <span className="block font-mono text-[10px] text-gray-400 font-normal">
                          {a.iecdId}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell">
                        {a.department}
                        <span className="block text-[10px] text-gray-400">
                          Batch {a.batch}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {a.certificateId ? (
                          <a
                            href={`/api/certificates/${a.certificateId}/file`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-emerald-700 font-bold hover:underline"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span className="font-mono text-[10px]">
                              {a.certificateNumber}
                            </span>
                          </a>
                        ) : (
                          <span className="text-amber-600 font-semibold">
                            Not sent
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {attendees.length === 0 && (
        <p className="text-xs text-gray-400 font-medium">
          No eligible recipients yet. Students appear here once they are
          registered and scanned in as present.
        </p>
      )}

      {/* Preview dialog */}
      <Dialog
        open={!!previewUrl}
        onOpenChange={(open) => {
          if (!open) setPreviewUrl(null);
        }}
      >
        <DialogContent className="sm:max-w-3xl rounded-[28px]">
          <DialogHeader>
            <DialogTitle>Certificate Preview</DialogTitle>
            <DialogDescription>
              A sample rendered with the current design. Recipient names are
              filled in per student when you send.
            </DialogDescription>
          </DialogHeader>
          {previewUrl && (
            <iframe
              src={previewUrl}
              title="Certificate preview"
              className="w-full h-[60vh] rounded-2xl border border-gray-200 bg-gray-50"
            />
          )}
          <DialogFooter>
            <a
              href={previewUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-gray-600 hover:text-[#100A0A] px-4 py-2"
            >
              Open in new tab
            </a>
            <Button
              type="button"
              className="rounded-full bg-[#100A0A] hover:bg-[#2A2020] text-white text-xs font-bold px-6"
              onClick={() => setPreviewUrl(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send confirmation */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="rounded-[28px]">
          <DialogHeader>
            <DialogTitle>Send certificates?</DialogTitle>
            <DialogDescription>
              {stats.pending} certificate{stats.pending === 1 ? "" : "s"} will be
              issued to students who registered and attended. They appear
              immediately in each student&apos;s Certificates page. Students who
              already hold one are skipped.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-full text-xs font-bold"
              onClick={() => setConfirmOpen(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-full bg-[#100A0A] hover:bg-[#2A2020] text-white text-xs font-bold px-6"
              onClick={sendCertificates}
              disabled={sending}
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Yes, send them
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

/**
 * Live WYSIWYG overlay. Font size is scaled by the ratio between the rendered
 * width and the renderer's nominal page width, so what is shown here matches
 * the generated PDF.
 */
function NamePlacementCanvas({
  template,
  onPlace,
}: {
  template: TemplateState;
  onPlace: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const [width, setWidth] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  const scale = width / NOMINAL_PAGE_WIDTH;

  return (
    <div
      ref={boxRef}
      onClick={onPlace}
      className="relative w-full rounded-2xl overflow-hidden border border-gray-200 cursor-crosshair select-none bg-gray-50"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={template.backgroundUrl || ""}
        alt="Certificate template"
        className="w-full h-auto block pointer-events-none"
      />
      <span
        className="absolute whitespace-nowrap pointer-events-none font-bold"
        style={{
          left: `${template.namePosX}%`,
          top: `${template.namePosY}%`,
          transform: "translate(-50%, -100%)",
          fontSize: `${Math.max(6, template.nameFontSize * scale)}px`,
          color: template.nameColor,
          fontFamily: "Helvetica, Arial, sans-serif",
        }}
      >
        Participant Name
      </span>
      {template.showDetailLine && (
        <span
          className="absolute whitespace-nowrap pointer-events-none"
          style={{
            left: `${template.namePosX}%`,
            top: `${template.detailPosY}%`,
            transform: "translate(-50%, -100%)",
            fontSize: `${Math.max(5, template.detailFontSize * scale)}px`,
            color: template.nameColor,
            fontFamily: "Helvetica, Arial, sans-serif",
          }}
        >
          Computer Science &amp; Engineering - Batch 2027
        </span>
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
        {label}
      </Label>
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (Number.isFinite(next)) onChange(clamp(next, min, max));
        }}
        className="rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white h-10"
      />
    </div>
  );
}

function StatTile({
  label,
  value,
  tone = "slate",
  icon,
}: {
  label: string;
  value: number;
  tone?: "slate" | "emerald" | "amber";
  icon?: React.ReactNode;
}) {
  const tones = {
    slate: "bg-gray-50 text-[#1A0D0C] border-gray-100",
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-100",
    amber: "bg-amber-50 text-amber-800 border-amber-100",
  };
  return (
    <div className={cn("rounded-2xl border px-4 py-3.5", tones[tone])}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold opacity-70">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-2xl font-extrabold mt-0.5">{value}</p>
    </div>
  );
}

// ============================================================
// HELPERS
// ============================================================

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Drops nulls so saved values fall back to the defaults instead of blanking inputs. */
function cleanTemplate(
  raw: Partial<Record<keyof TemplateState, unknown>> | null | undefined
): Partial<TemplateState> {
  if (!raw) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    // backgroundUrl is meaningfully null (no artwork uploaded); everything else
    // should fall through to its default when unset.
    if (value === null && key !== "backgroundUrl") continue;
    if (value === undefined) continue;
    out[key] = value;
  }
  return out as Partial<TemplateState>;
}
