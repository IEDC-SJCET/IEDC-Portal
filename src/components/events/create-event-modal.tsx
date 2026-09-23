"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { PosterUpload } from "@/components/events/poster-upload";
import { Calendar, Clock, MapPin, Sparkles, Trophy, Users, X, Loader2, Plus } from "lucide-react";

const EVENT_TYPES = [
  { value: "workshop", label: "Workshop" },
  { value: "hackathon", label: "Hackathon" },
  { value: "bootcamp", label: "Bootcamp" },
  { value: "seminar", label: "Seminar" },
  { value: "competition", label: "Competition" },
  { value: "innovation_challenge", label: "Innovation Challenge" },
  { value: "techy_pedia", label: "Techy Pedia" },
  { value: "wednesday_cafe", label: "Wednesday Cafe" },
  { value: "gbm", label: "GBM" },
];

interface CreateEventModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateEventModal({
  isOpen,
  onOpenChange,
  onSuccess,
}: CreateEventModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [posterPreview, setPosterPreview] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    eventType: "workshop",
    venue: "IDEALab",
    startDatetime: "",
    endDatetime: "",
    registrationDeadline: "",
    registrationLimit: "",
    participationPoints: "10",
    volunteerPoints: "20",
    posterUrl: "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!form.title.trim() || form.title.trim().length < 3) {
      setError("Event title must be at least 3 characters.");
      setLoading(false);
      return;
    }

    if (!form.startDatetime) {
      setError("Start date and time is required.");
      setLoading(false);
      return;
    }

    if (!form.endDatetime) {
      setError("End date and time is required.");
      setLoading(false);
      return;
    }

    const startDate = new Date(form.startDatetime);
    const endDate = new Date(form.endDatetime);

    if (isNaN(startDate.getTime())) {
      setError("Invalid start date and time.");
      setLoading(false);
      return;
    }

    if (isNaN(endDate.getTime())) {
      setError("Invalid end date and time.");
      setLoading(false);
      return;
    }

    if (endDate <= startDate) {
      setError("End date & time must be after the start date & time.");
      setLoading(false);
      return;
    }

    if (form.registrationDeadline) {
      const regDate = new Date(form.registrationDeadline);
      if (!isNaN(regDate.getTime()) && regDate > endDate) {
        setError("Registration deadline cannot be after the event end date & time.");
        setLoading(false);
        return;
      }
    }

    try {
      const body = {
        ...form,
        title: form.title.trim(),
        posterUrl: form.posterUrl || undefined,
        startDatetime: startDate.toISOString(),
        endDatetime: endDate.toISOString(),
        registrationDeadline:
          form.registrationDeadline && !isNaN(new Date(form.registrationDeadline).getTime())
            ? new Date(form.registrationDeadline).toISOString()
            : undefined,
        registrationLimit:
          form.registrationLimit && !isNaN(parseInt(form.registrationLimit))
            ? parseInt(form.registrationLimit)
            : undefined,
        participationPoints: Number.isNaN(parseInt(form.participationPoints)) ? 10 : parseInt(form.participationPoints),
        volunteerPoints: Number.isNaN(parseInt(form.volunteerPoints)) ? 20 : parseInt(form.volunteerPoints),
      };

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setForm({
          title: "",
          description: "",
          eventType: "workshop",
          venue: "IDEALab",
          startDatetime: "",
          endDatetime: "",
          registrationDeadline: "",
          registrationLimit: "",
          participationPoints: "10",
          volunteerPoints: "20",
          posterUrl: "",
        });
        setPosterPreview("");
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create event");
      }
    } catch (err) {
      console.error("Create event error:", err);
      setError("Something went wrong while creating the event.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-2xl bg-[#0C0908] border border-[#e8594c]/30 rounded-[36px] p-6 sm:p-8 shadow-[0px_25px_70px_-15px_rgba(0,0,0,0.9)] text-white font-['Hanken_Grotesk'] max-h-[90vh] overflow-y-auto relative custom-scrollbar"
      >
        <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-all z-20 cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="relative z-10 flex flex-col items-start mb-6">
          <span className="px-3.5 py-1 rounded-full bg-gradient-to-b from-[#FF0000] to-[#990000] text-white text-[10px] font-bold tracking-widest uppercase shadow-md mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> IEDC SJCET • EVENT CREATOR
          </span>
          <DialogTitle className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Create New Event
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-white/70 mt-1 leading-relaxed">
            Fill in the details to publish a new event, assign points, and enable instant QR attendance logging.
          </DialogDescription>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="relative z-10 space-y-5">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-white/80 uppercase tracking-wider">
              Event Title <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              className="bg-white/5 border-white/15 text-white placeholder-white/40 rounded-2xl h-11 px-4 focus:border-[#e8594c] focus:ring-1 focus:ring-[#e8594c]"
              placeholder="e.g. AI & ML Workshop 2026"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-white/80 uppercase tracking-wider">
              Description
            </Label>
            <Textarea
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              className="bg-white/5 border-white/15 text-white placeholder-white/40 rounded-2xl p-4 resize-none focus:border-[#e8594c] focus:ring-1 focus:ring-[#e8594c]"
              rows={3}
              placeholder="What's this event about? Mention key highlights, eligibility, or speaker details."
            />
          </div>

          {/* Poster Upload */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-white/80 uppercase tracking-wider">
              Event Poster (Optional)
            </Label>
            <PosterUpload
              value={posterPreview}
              onChange={(val) => {
                setPosterPreview(val);
                handleChange("posterUrl", val);
              }}
              onRemove={() => {
                setPosterPreview("");
                handleChange("posterUrl", "");
              }}
            />
          </div>

          {/* Type & Venue Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-white/80 uppercase tracking-wider">
                Event Category
              </Label>
              <Select
                value={form.eventType}
                onValueChange={(val) => handleChange("eventType", val)}
              >
                <SelectTrigger className="bg-white/5 border-white/15 text-white rounded-2xl h-11 px-4 focus:border-[#e8594c]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent position="popper" className="bg-[#181110] border-white/15 text-white rounded-2xl shadow-2xl z-[1100]">
                  {EVENT_TYPES.map((type) => (
                    <SelectItem
                      key={type.value}
                      value={type.value}
                      className="focus:bg-white/10 focus:text-white cursor-pointer"
                    >
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-white/80 uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#e8594c]" /> Venue
              </Label>
              <Input
                value={form.venue}
                onChange={(e) => handleChange("venue", e.target.value)}
                className="bg-white/5 border-white/15 text-white placeholder-white/40 rounded-2xl h-11 px-4 focus:border-[#e8594c]"
                placeholder="e.g. IDEALab / Main Auditorium"
              />
            </div>
          </div>

          {/* Start & End DateTime */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-white/80 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#e8594c]" /> Start Date & Time <span className="text-red-500">*</span>
              </Label>
              <Input
                type="datetime-local"
                value={form.startDatetime}
                onChange={(e) => handleChange("startDatetime", e.target.value)}
                className="bg-white/5 border-white/15 text-white rounded-2xl h-11 px-4 focus:border-[#e8594c] [color-scheme:dark]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-white/80 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#e8594c]" /> End Date & Time <span className="text-red-500">*</span>
              </Label>
              <Input
                type="datetime-local"
                value={form.endDatetime}
                min={form.startDatetime || undefined}
                onChange={(e) => handleChange("endDatetime", e.target.value)}
                className="bg-white/5 border-white/15 text-white rounded-2xl h-11 px-4 focus:border-[#e8594c] [color-scheme:dark]"
                required
              />
            </div>
          </div>

          {/* Points & Registration Limits */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-white/80 uppercase tracking-wider">
                Registration Deadline
              </Label>
              <Input
                type="datetime-local"
                value={form.registrationDeadline}
                max={form.endDatetime || undefined}
                onChange={(e) =>
                  handleChange("registrationDeadline", e.target.value)
                }
                className="bg-white/5 border-white/15 text-white rounded-2xl h-11 px-4 focus:border-[#e8594c] [color-scheme:dark]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-white/80 uppercase tracking-wider flex items-center gap-1">
                <Users className="w-3 h-3 text-[#e8594c]" /> Max Seats
              </Label>
              <Input
                type="number"
                value={form.registrationLimit}
                onChange={(e) =>
                  handleChange("registrationLimit", e.target.value)
                }
                className="bg-white/5 border-white/15 text-white placeholder-white/40 rounded-2xl h-11 px-4 focus:border-[#e8594c]"
                placeholder="Unlimited"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-white/80 uppercase tracking-wider flex items-center gap-1">
                <Trophy className="w-3 h-3 text-[#e8594c]" /> Points
              </Label>
              <Input
                type="number"
                value={form.participationPoints}
                onChange={(e) =>
                  handleChange("participationPoints", e.target.value)
                }
                className="bg-white/5 border-white/15 text-white rounded-2xl h-11 px-4 focus:border-[#e8594c]"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 text-red-400 text-xs rounded-xl px-4 py-3 border border-red-500/20">
              {error}
            </div>
          )}

          {/* Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 mt-2 rounded-2xl bg-gradient-to-r from-[#FF0000] to-[#990000] hover:from-[#E60000] hover:to-[#800000] text-white font-semibold text-base shadow-lg shadow-red-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating Event...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Publish Event
              </>
            )}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}