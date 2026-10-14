"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCard } from "@/components/badges/badge-card";
import type { BadgeCriteria } from "@/lib/points";
import { Sparkles, RefreshCw, Shield, Trophy, Wrench, Users, Zap, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchJson, studentQueryKeys } from "@/lib/student-queries";

interface BadgeData {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  criteria: BadgeCriteria;
  earnedAt: string | null;
}

const CRITERIA_TYPE_META: Record<
  string,
  { label: string; icon: typeof Trophy; color: string; bg: string }
> = {
  points: { label: "Points", icon: Trophy, color: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10" },
  event_count: { label: "Events", icon: Sparkles, color: "text-[#6EA2F8]", bg: "bg-[#6EA2F8]/10" },
  project_count: { label: "Projects", icon: Wrench, color: "text-[#84C974]", bg: "bg-[#84C974]/10" },
  volunteer_count: { label: "Volunteering", icon: Users, color: "text-[#A78BFA]", bg: "bg-[#A78BFA]/10" },
  streak: { label: "Streak", icon: Zap, color: "text-[#D8615C]", bg: "bg-[#D8615C]/10" },
};

export default function StudentBadgesPage() {
  const queryClient = useQueryClient();
  const { data: badges = [], isPending: loading } = useQuery({
    queryKey: studentQueryKeys.badges,
    queryFn: async () => {
      const data = await fetchJson<{ badges?: BadgeData[] }>("/api/badges");
      return data.badges || [];
    },
  });
  const [checking, setChecking] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  async function handleCheck() {
    setChecking(true);
    try {
      const res = await fetch("/api/badges/check", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.newlyAwarded?.length > 0) {
          await queryClient.invalidateQueries({ queryKey: studentQueryKeys.badges });
        }
      }
    } catch (e) {
      console.error("Badge check failed", e);
    } finally {
      setChecking(false);
    }
  }

  const earnedBadges = badges.filter((b) => b.earnedAt);
  const unearnedBadges = badges.filter((b) => !b.earnedAt);

  const filteredEarned =
    filter === "all"
      ? earnedBadges
      : earnedBadges.filter((b) => b.criteria.type === filter);
  const filteredUnearned =
    filter === "all"
      ? unearnedBadges
      : unearnedBadges.filter((b) => b.criteria.type === filter);

  const criteriaTypes = [...new Set(badges.map((b) => b.criteria.type))];
  const progressPercent =
    badges.length > 0 ? Math.round((earnedBadges.length / badges.length) * 100) : 0;

  if (loading) {
    return (
      <div className="w-full space-y-6 font-['Hanken_Grotesk'] text-[#1A0D0C] max-w-[1014px] animate-pulse">
        <div className="h-[203px] bg-white rounded-[38px] border border-gray-100 p-8" />
        <div className="h-28 bg-white rounded-[38px] border border-gray-100 p-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-[26px] border border-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 font-['Hanken_Grotesk'] text-[#1A0D0C] pb-16">
      {/* Hero Header Banner */}
      <div className="relative w-full max-w-[1014px] min-h-[203px] bg-white rounded-[38px] border border-gray-100/80 p-8 md:p-10 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden font-['Hanken_Grotesk']">
        {/* Top Right Ribbon Tag */}
        <div className="absolute top-0 right-0 w-[240.16px] h-[37.24px] rounded-bl-[65px] bg-gradient-to-b from-[#FF0000] to-[#990000] flex items-center justify-center text-white font-['Hanken_Grotesk'] text-[15.2px] font-semibold tracking-[-0.456px] z-10 shadow-sm">
          ACHIEVEMENTS
        </div>

        <div className="space-y-1 pt-2 md:pt-0 max-w-xl font-['Hanken_Grotesk']">
          <h1 className="text-[36px] sm:text-[46px] font-semibold text-[#1A0D0C] tracking-[-1.38px] leading-tight font-['Hanken_Grotesk']">
            Student Badges
          </h1>
          <p className="text-[16px] sm:text-[20px] font-semibold text-[#B0B0B0] tracking-[-0.6px] leading-snug font-['Hanken_Grotesk']">
            Unlock achievements by attending events, earning points, and submitting projects
          </p>
        </div>

        {/* Badges Stat Pill & Check Action */}
        <div className="flex items-center gap-3 shrink-0 pt-2 md:pt-0 font-['Hanken_Grotesk']">
          <div className="flex flex-col justify-end items-start w-[145px] h-[101px] p-[14px_20px_10px_20px] rounded-[20px] bg-[#1E1614] gap-[5px] shadow-sm font-['Hanken_Grotesk']">
            <span className="text-[#FFFFFF] text-[15px] font-normal tracking-[-0.5px] leading-none truncate max-w-full font-['Hanken_Grotesk']">
              Unlocked
            </span>
            <span className="text-[#FFFFFF] text-[38px] font-bold tracking-[-1.14px] leading-none font-['Hanken_Grotesk']">
              {earnedBadges.length}/{badges.length}
            </span>
          </div>

          <button
            id="check-badges-btn"
            onClick={handleCheck}
            disabled={checking ? true : undefined}
            suppressHydrationWarning
            className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors shadow-xs cursor-pointer disabled:opacity-50 font-['Hanken_Grotesk']"
            title="Check for new badges"
          >
            <RefreshCw className={cn("w-4 h-4", checking && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="max-w-[1014px] bg-white rounded-[38px] border border-gray-100/90 p-6 md:p-8 shadow-sm space-y-3 font-['Hanken_Grotesk']">
        <div className="flex items-center justify-between font-['Hanken_Grotesk']">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400 font-['Hanken_Grotesk'] flex items-center gap-2">
            <Award className="w-4 h-4 text-[#990000]" /> Overall Badges Completion
          </span>
          <span className="text-sm font-bold text-[#1A0D0C] font-['Hanken_Grotesk']">
            {progressPercent}% Unlocked ({earnedBadges.length} of {badges.length})
          </span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#990000] to-[#1A0D0C] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      {criteriaTypes.length > 1 && (
        <div className="max-w-[1014px] flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none font-['Hanken_Grotesk']">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer font-['Hanken_Grotesk']",
              filter === "all"
                ? "bg-[#1A0D0C] text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200/80 hover:bg-gray-50"
            )}
          >
            All Badges ({badges.length})
          </button>
          {criteriaTypes.map((type) => {
            const meta = CRITERIA_TYPE_META[type];
            const typeCount = badges.filter((b) => b.criteria.type === type).length;
            const Icon = meta?.icon || Shield;
            return (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer font-['Hanken_Grotesk']",
                  filter === type
                    ? "bg-[#1A0D0C] text-white shadow-sm"
                    : "bg-white text-gray-600 border border-gray-200/80 hover:bg-gray-50"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>
                  {meta?.label || type} ({typeCount})
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Earned Badges Section */}
      {filteredEarned.length > 0 && (
        <div className="max-w-[1014px] space-y-4 font-['Hanken_Grotesk']">
          <h2 className="text-xl font-bold text-[#1A0D0C] flex items-center gap-2.5 font-['Hanken_Grotesk'] tracking-tight">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Earned Badges</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-['Hanken_Grotesk']">
            {filteredEarned.map((badge) => (
              <BadgeCard key={badge.id} {...badge} />
            ))}
          </div>
        </div>
      )}

      {/* Locked Badges Section */}
      {filteredUnearned.length > 0 && (
        <div className="max-w-[1014px] space-y-4 font-['Hanken_Grotesk']">
          <h2 className="text-xl font-bold text-[#1A0D0C] flex items-center gap-2.5 font-['Hanken_Grotesk'] tracking-tight">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
            <span>Locked Badges</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-['Hanken_Grotesk']">
            {filteredUnearned.map((badge) => (
              <BadgeCard key={badge.id} {...badge} />
            ))}
          </div>
        </div>
      )}

      {/* Empty Filter State */}
      {filteredEarned.length === 0 && filteredUnearned.length === 0 && (
        <div className="max-w-[1014px] bg-white rounded-[38px] border border-gray-100/90 p-12 md:p-16 text-center shadow-sm flex flex-col items-center justify-center space-y-3 font-['Hanken_Grotesk']">
          <Shield className="w-10 h-10 text-gray-300 mb-2" />
          <p className="text-lg font-bold text-[#1A0D0C] font-['Hanken_Grotesk']">
            No badges in this category
          </p>
          <p className="text-xs text-gray-400 font-['Hanken_Grotesk']">
            Try selecting a different filter above
          </p>
        </div>
      )}

      <div className="max-w-[1014px] pt-12 flex justify-end font-['Hanken_Grotesk']">
        <p className="w-[242px] h-[26px] text-[#AAA] text-right font-['Hanken_Grotesk'] text-[16px] font-normal leading-[94.331%] tracking-[-0.48px]">
          IEDC 2026 SJCET - TECH TEAM
        </p>
      </div>
    </div>
  );
}