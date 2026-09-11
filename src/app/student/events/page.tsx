"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { EventCard, EventCardProps } from "@/components/events/event-card";
import { cn } from "@/lib/utils";

const FILTER_ITEMS = [
  { key: "all", label: "All events" },
  { key: "techy_pedia", label: "Techy Pedia" },
  { key: "wednesday_cafe", label: "Wednesday Cafe" },
  { key: "hackathon", label: "Hackathons" },
  { key: "gbm", label: "GBM" },
  { key: "tech_events", label: "Tech Events" },
  { key: "completed", label: "Completed" },
];

function StudentEventsContent() {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<EventCardProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  const searchQuery = searchParams.get("q") || "";

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch("/api/events?status=all&limit=50");
        if (res.ok) {
          const data = await res.json();
          if (data.events) {
            const now = new Date();
            const apiEvents: EventCardProps[] = data.events.map(
              (e: Record<string, unknown>) => {
                const startStr = (e.startDatetime as string) || "";
                const endStr = (e.endDatetime as string) || "";
                const startDate = startStr ? new Date(startStr) : null;
                const endDate = endStr ? new Date(endStr) : null;
                const dateHasPassed =
                  startDate && !isNaN(startDate.getTime())
                    ? endDate && !isNaN(endDate.getTime())
                      ? endDate < now
                      : startDate < now
                    : false;

                return {
                  id: e.id as string,
                  title: e.title as string,
                  eventType: (e.eventType as string) || "workshop",
                  venue: (e.venue as string) || "IDEALab",
                  startDatetime: startStr,
                  endDatetime: endStr,
                  description: (e.description as string) || "",
                  posterUrl: (e.posterUrl as string) || null,
                  status: (e.status as string) || "published",
                  isClosed:
                    e.status === "completed" ||
                    e.status === "cancelled" ||
                    e.status === "closed" ||
                    dateHasPassed,
                };
              }
            );
            setEvents(apiEvents);
          }
        }
      } catch (error) {
        console.error("Failed to fetch events:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  const upcomingEvents = events.filter((event) => {
    if (
      event.status === "completed" ||
      event.status === "cancelled" ||
      event.status === "closed" ||
      event.isClosed
    ) {
      return false;
    }
    const eventTimeStr = event.endDatetime || event.startDatetime;
    if (eventTimeStr) {
      const eventDate = new Date(eventTimeStr);
      if (!isNaN(eventDate.getTime()) && eventDate < new Date()) {
        return false;
      }
    }
    return true;
  });

  const filtered = events.filter((event) => {
    const eventTypeLower = event.eventType.toLowerCase();
    const titleLower = event.title.toLowerCase();
    const activeTabLower = activeTab.toLowerCase();

    if (activeTabLower === "completed") {
      return (
        event.isClosed && titleLower.includes(searchQuery.toLowerCase())
      );
    }
    if (event.isClosed) return false;

    let matchesTab = activeTab === "all";
    if (!matchesTab) {
      if (activeTabLower === "techy_pedia") {
        matchesTab =
          eventTypeLower.includes("techy") || titleLower.includes("techy pedia");
      } else if (activeTabLower === "wednesday_cafe") {
        matchesTab =
          eventTypeLower.includes("wednesday") ||
          titleLower.includes("wednesday cafe");
      } else if (activeTabLower === "hackathon") {
        matchesTab =
          eventTypeLower.includes("hackathon") || titleLower.includes("hackathon");
      } else if (activeTabLower === "gbm") {
        matchesTab = eventTypeLower.includes("gbm") || titleLower.includes("gbm");
      } else if (activeTabLower === "tech_events") {
        matchesTab =
          eventTypeLower.includes("tech") ||
          eventTypeLower.includes("workshop") ||
          eventTypeLower.includes("seminar") ||
          eventTypeLower.includes("bootcamp") ||
          titleLower.includes("tech");
      }
    }

    const matchesSearch = event.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const toPosterInfo = (list: EventCardProps[]) =>
    list
      .filter((e) => Boolean(e.posterUrl))
      .map((e) => ({ url: e.posterUrl as string, title: e.title }));

  const upcomingPosters = toPosterInfo(upcomingEvents);

  const completedEventsByRecency = events
    .filter((e) => e.isClosed)
    .sort((a, b) => {
      const aTime = new Date(a.endDatetime || a.startDatetime || 0).getTime();
      const bTime = new Date(b.endDatetime || b.startDatetime || 0).getTime();
      return bTime - aTime;
    });

  const completedPosters = toPosterInfo(completedEventsByRecency);

  const bannerPosters = (
    upcomingPosters.length > 0 ? upcomingPosters : completedPosters
  ).slice(0, 4);

  return (
    <div className="w-full space-y-6 font-['Hanken_Grotesk'] text-[#1A0D0C] pb-16">
      <div className="w-full max-w-[1014px] min-h-[203px] rounded-[38px] bg-white p-8 md:p-10 flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden shadow-sm border border-gray-100/80 my-8 gap-6 group">
        <div className="z-10 max-w-lg space-y-2">
          <h2 className="text-[36px] md:text-[46px] font-semibold text-[#1A0D0C] tracking-[-1.38px] leading-tight">
            Upcoming Events
          </h2>
          <p className="text-[16px] md:text-[20px] font-semibold text-[#B0B0B0] tracking-[-0.6px] leading-snug">
            Register and Attend upcoming events from IEDC SJCET
          </p>
        </div>

        {bannerPosters.length > 0 && (
          <div className="relative flex items-center justify-end pr-4 py-2 md:py-0 w-full md:w-auto h-[160px] shrink-0 overflow-visible">
            <div className="flex items-center -space-x-12 hover:-space-x-6 transition-all duration-300">
              {bannerPosters.map((poster, idx) => (
                <div
                  key={poster.url + idx}
                  className={cn(
                    "w-[110px] h-[145px] rounded-[16px] border-2 border-white shadow-xl overflow-hidden shrink-0 transition-transform duration-300 cursor-pointer bg-slate-900",
                    idx === 0 && "-rotate-6 hover:rotate-0 z-40 hover:z-50",
                    idx === 1 && "rotate-6 hover:rotate-0 z-30 hover:z-50",
                    idx === 2 && "-rotate-3 hover:rotate-0 z-20 hover:z-50",
                    idx === 3 && "rotate-8 hover:rotate-0 z-10 hover:z-50"
                  )}
                >
                  <img
                    src={poster.url}
                    alt={poster.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-hide max-w-[1014px]">
        {FILTER_ITEMS.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={cn(
                "inline-flex items-center justify-center px-4 py-1.5 rounded-[26.92px] border text-[13.026px] font-normal tracking-[-0.391px] whitespace-nowrap transition-all duration-200 cursor-pointer h-[36px]",
                isActive
                  ? "bg-[#100A0A] border-[#A5A5A5] text-white shadow-sm"
                  : "bg-[#E2E2E2] border-[#A5A5A5] text-[#3C3C3C] hover:bg-gray-200"
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6 md:gap-8 max-w-[1014px] pt-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="w-full max-w-[247px] h-[280px] sm:h-[380px] bg-white rounded-3xl animate-pulse border border-gray-100 mx-auto"
            />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6 md:gap-8 max-w-[1014px] pt-4">
          {filtered.map((event) => (
            <EventCard key={event.id} {...event} />
          ))}
        </div>
      ) : (
        <div className="max-w-[1014px] bg-white rounded-3xl border border-gray-100 p-16 text-center shadow-sm my-6">
          <p className="text-gray-600 font-bold text-lg">No events found</p>
          <p className="text-gray-400 text-sm mt-1">
            Try adjusting your search or selecting another category filter.
          </p>
        </div>
      )}

      <div className="max-w-[1014px] pt-12 flex justify-end">
        <p
          className="w-[242px] h-[26px] text-[#AAA] text-right font-['Hanken_Grotesk'] text-[16px] font-normal leading-[94.331%] tracking-[-0.48px]"
        >
          IEDC 2026 SJCET - TECH TEAM
        </p>
      </div>
    </div>
  );
}

export default function StudentEventsPage() {
  return (
    <Suspense fallback={null}>
      <StudentEventsContent />
    </Suspense>
  );
}