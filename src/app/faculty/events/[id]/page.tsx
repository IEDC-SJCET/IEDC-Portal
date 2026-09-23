"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ArrowLeft,
  TrendingUp,
  UserCheck,
  Award,
  Sparkles,
} from "lucide-react";
import { formatCategoryName } from "@/components/events/event-card";

interface EventDetail {
  id: string;
  title: string;
  description: string | null;
  eventType: string;
  venue: string | null;
  startDatetime: string;
  endDatetime: string;
  status: string | null;
  participationPoints: number | null;
  volunteerPoints: number | null;
  registrationLimit: number | null;
  registrationCount: number;
  attendanceCount: number;
  posterUrl?: string | null;
}

export default function FacultyEventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await fetch(`/api/events/${params.id}`);
        if (res.ok) {
          setEvent(await res.json());
        }
      } catch (error) {
        console.error("Failed to fetch event:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();
  }, [params.id]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse max-w-3xl font-['Hanken_Grotesk'] text-[#1A0D0C]">
        <div className="h-6 bg-gray-200 rounded-xl w-32" />
        <div className="h-10 bg-gray-200 rounded-xl w-3/4" />
        <div className="h-64 bg-gray-200 rounded-3xl" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-16 font-['Hanken_Grotesk'] text-[#1A0D0C]">
        <p className="text-gray-500 font-medium">Event not found</p>
        <Button
          variant="outline"
          className="mt-4 rounded-xl font-['Hanken_Grotesk']"
          onClick={() => router.back()}
        >
          Go back
        </Button>
      </div>
    );
  }

  const start = new Date(event.startDatetime);
  const end = new Date(event.endDatetime);

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    published: "bg-blue-50 text-blue-700 border border-blue-200",
    ongoing: "bg-green-50 text-green-700 border border-green-200",
    completed: "bg-purple-50 text-purple-700 border border-purple-200",
    cancelled: "bg-rose-50 text-rose-700 border border-rose-200",
  };

  return (
    <div className="max-w-[1014px] space-y-6 font-['Hanken_Grotesk'] text-[#1A0D0C] pb-16">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-[#1A0D0C] transition-colors cursor-pointer font-['Hanken_Grotesk']"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to events</span>
      </button>

      {/* Main Container */}
      <div className="bg-white rounded-[38px] border border-gray-100/90 p-8 md:p-10 shadow-sm space-y-6 font-['Hanken_Grotesk']">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full bg-[#1A0D0C] text-white text-xs font-bold uppercase tracking-wider">
              {formatCategoryName(event.eventType)}
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1A0D0C] tracking-tight leading-snug font-['Hanken_Grotesk']">
              {event.title}
            </h1>
          </div>
          <span
            className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize shrink-0 font-['Hanken_Grotesk'] ${statusColors[event.status || "draft"]}`}
          >
            {event.status}
          </span>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 font-['Hanken_Grotesk']">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50/80 border border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#990000] shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                Event Date
              </span>
              <p className="text-sm font-bold text-[#1A0D0C]">
                {start.toLocaleDateString("en-US", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50/80 border border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-blue-600 shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                Timing
              </span>
              <p className="text-sm font-bold text-[#1A0D0C]">
                {start.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                –{" "}
                {end.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          {event.venue && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50/80 border border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-600 shadow-xs">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Venue
                </span>
                <p className="text-sm font-bold text-[#1A0D0C]">{event.venue}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50/80 border border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-purple-600 shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                Registrations
              </span>
              <p className="text-sm font-bold text-[#1A0D0C]">
                {event.registrationCount} Registered
                {event.registrationLimit
                  ? ` (Limit: ${event.registrationLimit})`
                  : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex flex-wrap gap-3 pt-2 font-['Hanken_Grotesk']">
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-4 py-2 rounded-2xl text-xs font-bold border border-emerald-200/70">
            <Award className="w-4 h-4 text-emerald-600" />
            <span>+{event.participationPoints ?? 10} Pts (Participant)</span>
          </div>
          {event.volunteerPoints != null && (
            <div className="flex items-center gap-2 bg-blue-50 text-blue-800 px-4 py-2 rounded-2xl text-xs font-bold border border-blue-200/70">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>+{event.volunteerPoints} Pts (Volunteer)</span>
            </div>
          )}
          <div className="flex items-center gap-2 bg-purple-50 text-purple-800 px-4 py-2 rounded-2xl text-xs font-bold border border-purple-200/70">
            <UserCheck className="w-4 h-4 text-purple-600" />
            <span>{event.attendanceCount} Scanned Attendance</span>
          </div>
        </div>

        {/* Description */}
        {event.description && (
          <div className="mt-6 pt-6 border-t border-gray-100 space-y-2 font-['Hanken_Grotesk']">
            <h3 className="font-bold text-[#1A0D0C] text-base font-['Hanken_Grotesk']">
              About Event
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] font-normal font-['Hanken_Grotesk']">
              {event.description}
            </p>
          </div>
        )}
      </div>

      <div className="max-w-[1014px] pt-12 flex justify-end font-['Hanken_Grotesk']">
        <p className="w-[242px] h-[26px] text-[#AAA] text-right font-['Hanken_Grotesk'] text-[16px] font-normal leading-[94.331%] tracking-[-0.48px]">
          IEDC 2026 SJCET - TECH TEAM
        </p>
      </div>
    </div>
  );
}