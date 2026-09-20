"use client";

import { cn } from "@/lib/utils";
import { ArrowUpRight, X } from "lucide-react";
import Link from "next/link";
import { useId } from "react";

export interface EventCardProps {
  id: string;
  title: string;
  eventType: string;
  venue?: string | null;
  startDatetime: string;
  endDatetime?: string;
  status?: string | null;
  participationPoints?: number | null;
  registrationCount?: number;
  registrationLimit?: number | null;
  linkPrefix?: string;
  className?: string;
  posterUrl?: string | null;
  description?: string | null;
  isClosed?: boolean;
}

const eventTypeColors: Record<string, string> = {
  workshop: "#1D4ED8",
  hackathon: "#6D28D9",
  bootcamp: "#C2410C",
  seminar: "#047857",
  competition: "#B91C1C",
  innovation_challenge: "#B45309",
  techy_pedia: "#D9383A",
  wednesday_cafe: "#0284C7",
  gbm: "#7C2D12",
};

export function formatCategoryName(type: string): string {
  if (!type) return "Event";
  if (type.toLowerCase() === "techy_pedia" || type.toLowerCase() === "techypedia") return "Techy Pedia";
  if (type.toLowerCase() === "wednesday_cafe" || type.toLowerCase() === "wednesdaycafe") return "Wednesday Cafe";
  if (type.toLowerCase() === "tech_events" || type.toLowerCase() === "techevents") return "Tech Events";
  if (type.toLowerCase() === "gbm") return "GBM";
  if (type.toLowerCase() === "hackathons" || type.toLowerCase() === "hackathon") return "Hackathons";
  return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export function EventCard({
  id,
  title,
  eventType,
  startDatetime,
  endDatetime,
  status,
  linkPrefix = "/student/events",
  className,
  posterUrl,
  description,
  isClosed,
}: EventCardProps) {
  const uniqueClipId = useId().replace(/:/g, "_");
  const clipId = `event-card-clip-${id || uniqueClipId}`;

  const startDate = new Date(startDatetime);
  const endDate = endDatetime ? new Date(endDatetime) : null;
  const now = new Date();
  const dateHasPassed = !isNaN(startDate.getTime()) && (endDate ? endDate < now : startDate < now);

  const formattedDate = isNaN(startDate.getTime())
    ? startDatetime
    : startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " " +
    startDate.toLocaleDateString("en-US", { weekday: "short" }) +
    ", " +
    startDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();

  const closed = isClosed || status === "completed" || status === "cancelled" || status === "closed" || dateHasPassed;
  const isOver = closed;
  const closedLabel = status === "cancelled" ? "Cancelled" : status === "completed" ? "Completed" : "Closed";
  const displayCategory = formatCategoryName(eventType);

  return (
    <Link href={`${linkPrefix}/${id}`} className="block group w-full">
      <div className={cn("flex flex-col w-full max-w-[247px] space-y-2 sm:space-y-3 font-['Hanken_Grotesk'] mx-auto", className)}>
        <div className="relative w-full aspect-[247/303] shrink-0 transition-transform duration-300 group-hover:-translate-y-1">
          <svg
            viewBox="0 0 247 303"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full drop-shadow-sm"
          >
            <defs>
              <clipPath id={clipId}>
                <path d="M15 1.5L226.336 1.5C230.154 1.50012 233.794 3.11752 236.354 5.95117L242.019 12.2227C244.259 14.7037 245.5 17.9282 245.5 21.2715V288C245.5 295.456 239.456 301.5 232 301.5H15C7.54417 301.5 1.50002 295.456 1.5 288L1.5 15C1.5 7.54416 7.54416 1.5 15 1.5Z" />
              </clipPath>
            </defs>
            <g clipPath={`url(#${clipId})`}>
              <rect width="247" height="303" fill="#1A1A2E" />
              {posterUrl ? (
                <image
                  href={posterUrl}
                  width="247"
                  height="303"
                  preserveAspectRatio="xMidYMid slice"
                />
              ) : (
                <g>
                  <rect width="247" height="303" fill={eventTypeColors[eventType] || "#1E293B"} />
                  <circle cx="123" cy="120" r="60" fill="white" fillOpacity="0.1" />
                  <text
                    x="123"
                    y="140"
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="22"
                    fontWeight="800"
                    fontFamily="Hanken Grotesk, sans-serif"
                  >
                    {title}
                  </text>
                </g>
              )}
            </g>
            <path
              d="M15 1.5L226.336 1.5C230.154 1.50012 233.794 3.11752 236.354 5.95117L242.019 12.2227C244.259 14.7037 245.5 17.9282 245.5 21.2715V288C245.5 295.456 239.456 301.5 232 301.5H15C7.54417 301.5 1.50002 295.456 1.5 288L1.5 15C1.5 7.54416 7.54416 1.5 15 1.5Z"
              fill="none"
              stroke="#E5E5E5"
              strokeWidth="3"
            />
          </svg>

          <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 bg-[#100A0A]/90 text-white text-[10px] sm:text-[12px] font-medium px-2 sm:px-3.5 py-0.5 sm:py-1 rounded-full backdrop-blur-sm z-10 truncate max-w-[85%]">
            {displayCategory}
          </div>
        </div>

        <div className="space-y-0.5 sm:space-y-1 pr-1">
          <h3 className="text-[15px] sm:text-[22px] font-bold text-[#1A0D0C] leading-snug tracking-[-0.5px] truncate">
            {title}
          </h3>
          <p className="text-[11px] sm:text-[13.5px] text-[#6E6E6E] leading-tight sm:leading-relaxed line-clamp-2">
            {description ||
              "Tech meetings in college are student-led gatherings focused on exploring new technology, coding, an...."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-0.5 sm:pt-1">
          <span
            className={cn(
              "text-[11px] sm:text-[13.5px] font-semibold truncate",
              isOver ? "text-[#D9383A]" : "text-emerald-600"
            )}
          >
            {formattedDate}
          </span>

          {closed ? (
            <span className="inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-[#A5A5A5] text-white text-[10px] sm:text-[13px] font-medium shrink-0 w-fit">
              {closedLabel} <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </span>
          ) : (
            <span className="inline-flex items-center justify-center gap-1 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-[#100A0A] text-white text-[10px] sm:text-[13px] font-medium group-hover:bg-[#2A2020] transition-colors shrink-0 w-fit">
              Register <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}