"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Trophy,
  Star,
  Loader2,
  Medal,
  Globe,
  Calendar,
  CalendarDays,
  Infinity,
  ScanSearch,
} from "lucide-react";
import { LinkedinIcon, GithubIcon } from "@/components/ui/icons";
import { cn, getGithubUsername } from "@/lib/utils";
import { fetchJson, studentQueryKeys } from "@/lib/student-queries";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type Scope = "overall" | "monthly" | "weekly";

interface LeaderboardUser {
  iecdId: string;
  fullName: string;
  points: number;
  rank: number;
}

interface MeProfile {
  iecdId: string;
  name: string;
  totalPoints: number;
  department: string;
  admissionNumber?: string;
  batch?: string;
  bio?: string | null;
  skills?: string[];
  interests?: string[];
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
}

const SCOPES: { id: Scope; label: string; icon: React.ReactNode }[] = [
  { id: "overall", label: "Overall", icon: <Infinity size={14} strokeWidth={2.5} /> },
  { id: "monthly", label: "Monthly", icon: <Calendar size={14} strokeWidth={2.5} /> },
  { id: "weekly", label: "Weekly", icon: <CalendarDays size={14} strokeWidth={2.5} /> },
];

function SkeletonRow() {
  return (
    <div className="w-full bg-white rounded-[24px] border border-gray-100/80 p-4 flex items-center gap-4 animate-pulse shadow-sm">
      <div className="w-8 h-5 bg-gray-200 rounded-md" />
      <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-4 bg-gray-200 rounded-md w-36" />
        <div className="h-3 bg-gray-100 rounded-md w-24" />
      </div>
      <div className="w-16 h-7 bg-gray-200 rounded-full" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const [scope, setScope] = useState<Scope>("overall");
  const leaderboardQuery = useQuery({
    queryKey: studentQueryKeys.leaderboard(scope),
    queryFn: async () => {
      const data = await fetchJson<{
        leaderboard?: { iecdId: string; name: string; points: number; rank: number }[];
      }>(`/api/leaderboard?scope=${scope}&limit=50`);
      return mapEntries(data.leaderboard ?? []);
    },
  });
  const meQuery = useQuery({
    queryKey: studentQueryKeys.profile,
    queryFn: () => fetchJson<MeProfile>("/api/student/profile"),
  });
  const champions = leaderboardQuery.data ?? [];
  const me = meQuery.data ?? null;
  // Full-page skeleton only for the initial (overall) load; switching to a
  // scope that isn't cached yet shows the list skeleton instead.
  const isLoading =
    meQuery.isPending || (scope === "overall" && leaderboardQuery.isPending);
  const isScopeLoading = leaderboardQuery.isPending;
  const [findMeActive, setFindMeActive] = useState(false);

  // Profile modal states
  const [selectedProfile, setSelectedProfile] = useState<MeProfile | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  const myRowRef = useRef<HTMLDivElement>(null);

  // ── Scope change ─────────────────────────────────────────────────────────────
  const handleScopeChange = (newScope: Scope) => {
    if (newScope === scope) return;
    setScope(newScope);
    setFindMeActive(false);
  };

  // ── Find Me ──────────────────────────────────────────────────────────────────
  const handleFindMe = () => {
    const next = !findMeActive;
    setFindMeActive(next);
    if (next) {
      requestAnimationFrame(() => {
        myRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  };

  // ── Profile click ─────────────────────────────────────────────────────────────
  const handleUserClick = async (iecdId: string) => {
    setIsProfileOpen(true);
    setIsProfileLoading(true);
    try {
      const res = await fetch(`/api/student/profile?iecdId=${encodeURIComponent(iecdId)}`);
      if (res.ok) {
        setSelectedProfile(await res.json());
      } else {
        setSelectedProfile(null);
      }
    } catch {
      setSelectedProfile(null);
    } finally {
      setIsProfileLoading(false);
    }
  };

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const topThree = champions.slice(0, 3);
  const others = champions.slice(3);
  const myEntry = me ? champions.find((c) => c.iecdId === me.iecdId) : null;
  const myRankInList = myEntry?.rank ?? null;
  const iAmInList = myEntry != null;

  // ─── Loading ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="w-full max-w-[1014px] space-y-6 font-['Hanken_Grotesk'] text-[#1A0D0C] pb-16 animate-pulse">
        <div className="w-full h-[200px] bg-white rounded-[38px] border border-gray-100" />
        <div className="h-10 w-64 bg-gray-200 rounded-full" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 font-['Hanken_Grotesk'] text-[#1A0D0C] pb-16">
      {/* ── Header Card ── */}
      <div className="w-full max-w-[1014px] bg-white rounded-[38px] border border-gray-100/80 p-8 md:p-10 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden">
        <div className="space-y-1">
          <h1 className="text-[36px] sm:text-[46px] font-semibold text-[#1A0D0C] tracking-[-1.38px] leading-tight flex items-center gap-3">
            <Trophy className="w-9 h-9 sm:w-11 sm:h-11 text-[#D9383A]" />
            Leaderboard
          </h1>
          <p className="text-[18px] sm:text-[20px] font-semibold text-[#B0B0B0] tracking-[-0.6px] leading-snug">
            See how you stack up against your peers across IEDC SJCET
          </p>
        </div>

        {/* Find Me button */}
        {me && (
          <button
            id="leaderboard-find-me-btn"
            onClick={handleFindMe}
            className={cn(
              "inline-flex items-center gap-2 px-5 py-2.5 rounded-full border text-xs font-semibold tracking-[-0.3px] transition-all duration-200 cursor-pointer h-[42px] shrink-0 shadow-sm",
              findMeActive
                ? "bg-[#D9383A] border-[#D9383A] text-white"
                : "bg-[#100A0A] border-[#100A0A] text-white hover:bg-[#2A2020]"
            )}
          >
            <ScanSearch className="w-4 h-4" />
            <span>Find Me</span>
            {myRankInList && (
              <span
                className={cn(
                  "px-2 py-0.5 text-[11px] font-bold rounded-full ml-1",
                  findMeActive ? "bg-white/20 text-white" : "bg-white text-[#100A0A]"
                )}
              >
                #{myRankInList}
              </span>
            )}
          </button>
        )}
      </div>

      {/* ── Scope Filter Tabs ── */}
      <div
        id="leaderboard-scope-tabs"
        className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide max-w-[1014px]"
      >
        {SCOPES.map((s) => {
          const isActive = scope === s.id;
          return (
            <button
              key={s.id}
              id={`leaderboard-tab-${s.id}`}
              onClick={() => handleScopeChange(s.id)}
              className={cn(
                "inline-flex items-center gap-2 px-5 py-2 rounded-full border text-xs font-semibold tracking-[-0.3px] transition-all duration-200 cursor-pointer h-[38px]",
                isActive
                  ? "bg-[#100A0A] border-[#100A0A] text-white shadow-sm"
                  : "bg-[#E2E2E2] border-[#A5A5A5] text-[#3C3C3C] hover:bg-gray-200"
              )}
            >
              {s.icon}
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Scope-level loading overlay ── */}
      {isScopeLoading ? (
        <div className="space-y-3 max-w-[1014px]">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : (
        <div className="max-w-[1014px] space-y-8">
          {/* ── Podium ── */}
          {topThree.length > 0 && (
            <div className="grid grid-cols-3 gap-3 sm:gap-6 items-end pt-6 pb-2 max-w-2xl mx-auto">
              {topThree[1] && (
                <PodiumCard
                  user={topThree[1]}
                  rank={2}
                  color="bg-slate-100/90"
                  badgeBg="bg-slate-500"
                  height="h-32 sm:h-36"
                  iconColor="text-slate-500"
                  isMe={topThree[1].iecdId === me?.iecdId}
                  onClick={() => handleUserClick(topThree[1].iecdId)}
                />
              )}
              {topThree[0] && (
                <PodiumCard
                  user={topThree[0]}
                  rank={1}
                  color="bg-gradient-to-b from-amber-100 to-amber-200/80"
                  badgeBg="bg-amber-500"
                  height="h-44 sm:h-48"
                  iconColor="text-amber-600"
                  isWinner
                  isMe={topThree[0].iecdId === me?.iecdId}
                  onClick={() => handleUserClick(topThree[0].iecdId)}
                />
              )}
              {topThree[2] && (
                <PodiumCard
                  user={topThree[2]}
                  rank={3}
                  color="bg-orange-100/70"
                  badgeBg="bg-orange-600"
                  height="h-24 sm:h-28"
                  iconColor="text-orange-700"
                  isMe={topThree[2].iecdId === me?.iecdId}
                  onClick={() => handleUserClick(topThree[2].iecdId)}
                />
              )}
            </div>
          )}

          {/* ── Rankings list ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-base font-bold text-[#1A0D0C] tracking-tight">
                Top 50 Rankings
              </h2>
              <span className="text-xs font-semibold text-gray-400">
                {champions.length} Students
              </span>
            </div>

            <div className="space-y-2.5">
              {others.map((user) => (
                <RankRow
                  key={user.iecdId}
                  ref={user.iecdId === me?.iecdId ? myRowRef : undefined}
                  user={user}
                  rank={user.rank}
                  isMe={user.iecdId === me?.iecdId}
                  highlightMe={findMeActive && user.iecdId === me?.iecdId}
                  onClick={() => handleUserClick(user.iecdId)}
                />
              ))}

              {champions.length === 0 && (
                <div className="max-w-[1014px] bg-white rounded-3xl border border-gray-100 p-16 text-center shadow-sm my-6">
                  <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 font-bold text-lg">No rankings yet</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Participate in events to earn points!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── "Find Me" — out-of-list banner ── */}
          {findMeActive && me && !iAmInList && (
            <div
              id="leaderboard-find-me-banner"
              className="bg-amber-50 border border-amber-200 rounded-[24px] p-4 flex items-center gap-4 shadow-sm"
            >
              <div className="font-extrabold text-lg text-amber-600 italic w-8 shrink-0">
                —
              </div>
              <div className="w-10 h-10 rounded-full bg-[#100A0A] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                {initials(me.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-[#1A0D0C] truncate">
                  {me.name}
                  <span className="ml-2 bg-[#D9383A] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    YOU
                  </span>
                </p>
                <p className="text-xs text-gray-400 font-medium">
                  Not in Top 50 for this period
                </p>
              </div>
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-50 text-[#D9383A] font-semibold text-xs border border-red-100/80 shrink-0">
                <Star className="w-3.5 h-3.5 fill-[#D9383A]" />
                <span>{me.totalPoints} pts</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Footer Branding ── */}
      <div className="max-w-[1014px] pt-12 flex justify-end">
        <p className="w-[242px] h-[26px] text-[#AAA] text-right font-['Hanken_Grotesk'] text-[16px] font-normal leading-[94.331%] tracking-[-0.48px]">
          IEDC 2026 SJCET - TECH TEAM
        </p>
      </div>

      {/* ── Profile Detail Dialog ── */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-gray-100 rounded-[32px] p-6 md:p-8 shadow-xl text-[#1A0D0C] font-['Hanken_Grotesk']">
          <DialogTitle className="sr-only">Student Profile</DialogTitle>
          <DialogDescription className="sr-only">
            Detailed profile information for this student.
          </DialogDescription>
          {isProfileLoading ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#D9383A]" strokeWidth={3} />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider animate-pulse">
                Loading Profile...
              </p>
            </div>
          ) : selectedProfile ? (
            <div className="space-y-6 min-w-0 w-full">
              <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                <div className="w-14 h-14 rounded-2xl bg-[#100A0A] text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                  {initials(selectedProfile.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-bold tracking-tight text-[#1A0D0C] truncate">
                    {selectedProfile.name}
                  </h3>
                  <p className="text-xs font-semibold text-gray-400 mt-0.5">
                    {selectedProfile.iecdId}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 block mb-0.5 font-medium">Department</span>
                  <span className="font-bold text-[#1A0D0C]">{selectedProfile.department}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5 font-medium">Graduation Year</span>
                  <span className="font-bold text-[#1A0D0C]">{selectedProfile.batch || "—"}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5 font-medium">Admission No.</span>
                  <span className="font-bold text-[#1A0D0C]">{selectedProfile.admissionNumber || "—"}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5 font-medium">Total Points</span>
                  <span className="font-bold text-[#D9383A] flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-[#D9383A]" />
                    {selectedProfile.totalPoints || 0}
                  </span>
                </div>
              </div>

              {selectedProfile.bio && (
                <div className="bg-gray-50/80 border border-gray-100 rounded-2xl p-4 text-xs leading-relaxed text-gray-600">
                  <span className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-wider">
                    Bio
                  </span>
                  {selectedProfile.bio}
                </div>
              )}

              {selectedProfile.skills && selectedProfile.skills.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Skills
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProfile.skills.map((skill: string, idx: number) => (
                      <span
                        key={idx}
                        className="text-[11px] font-semibold bg-gray-100 border border-gray-200 px-2.5 py-0.5 rounded-full text-gray-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Social Links */}
              {(selectedProfile.linkedinUrl || selectedProfile.githubUrl || selectedProfile.portfolioUrl) && (
                <div className="flex items-center gap-3 pt-3 border-t border-gray-100 justify-center">
                  {selectedProfile.linkedinUrl && (
                    <a
                      href={selectedProfile.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 hover:bg-[#100A0A] hover:text-white transition-all text-[#100A0A] shadow-xs flex items-center justify-center cursor-pointer"
                      title="LinkedIn"
                    >
                      <LinkedinIcon size={18} strokeWidth={2} />
                    </a>
                  )}
                  {selectedProfile.githubUrl && (
                    <a
                      href={selectedProfile.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 hover:bg-[#100A0A] hover:text-white transition-all text-[#100A0A] shadow-xs flex items-center justify-center cursor-pointer"
                      title="GitHub"
                    >
                      <GithubIcon size={18} strokeWidth={2} />
                    </a>
                  )}
                  {selectedProfile.portfolioUrl && (
                    <a
                      href={selectedProfile.portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 hover:bg-[#100A0A] hover:text-white transition-all text-[#100A0A] shadow-xs flex items-center justify-center cursor-pointer"
                      title="Portfolio"
                    >
                      <Globe size={18} strokeWidth={2} />
                    </a>
                  )}
                </div>
              )}

              {selectedProfile.githubUrl && getGithubUsername(selectedProfile.githubUrl) && (
                <div className="pt-4 border-t border-gray-100 space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    GitHub Contributions
                  </span>
                  <div className="w-full overflow-x-auto bg-gray-50/50 border border-gray-100 rounded-2xl p-3">
                    <div className="min-w-[670px] flex justify-center items-center py-1">
                      <img
                        src={`https://ghchart.rshah.org/D9383A/${getGithubUsername(selectedProfile.githubUrl)}`}
                        alt={`${selectedProfile.name}'s GitHub contributions`}
                        className="w-full h-auto"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500 font-medium">Failed to load profile details</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function initials(name: string): string {
  return (name || "Student")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function mapEntries(
  raw: { iecdId: string; name: string; points: number; rank: number }[]
): LeaderboardUser[] {
  return raw.map((u) => ({ ...u, fullName: u.name }));
}

// ─── PodiumCard ───────────────────────────────────────────────────────────────

function PodiumCard({
  user,
  rank,
  color,
  badgeBg,
  height,
  iconColor,
  isWinner = false,
  isMe = false,
  onClick,
}: {
  user: LeaderboardUser;
  rank: number;
  color: string;
  badgeBg: string;
  height: string;
  iconColor: string;
  isWinner?: boolean;
  isMe?: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="flex flex-col items-center space-y-3 group w-full cursor-pointer transition-transform duration-200 hover:-translate-y-1"
    >
      <div className="relative">
        <div
          className={cn(
            "w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#100A0A] text-white flex items-center justify-center font-semibold text-lg sm:text-xl shadow-md border-2 border-white transition-all",
            isWinner && "w-16 h-16 sm:w-20 sm:h-20 border-amber-400 shadow-lg",
            isMe && "ring-4 ring-[#D9383A]/30"
          )}
        >
          {initials(user.fullName)}
        </div>
        <div
          className={cn(
            "absolute -top-2 -right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shadow-md border-2 border-white text-white font-bold text-xs",
            badgeBg
          )}
        >
          {rank === 1 ? (
            <Trophy className="w-4 h-4 text-amber-300" />
          ) : (
            <Medal className="w-4 h-4 text-white" />
          )}
        </div>
        {isMe && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#D9383A] text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">
            YOU
          </div>
        )}
      </div>

      <div className="text-center w-full px-1 space-y-0.5">
        <p className="font-bold text-sm sm:text-base text-[#1A0D0C] truncate max-w-full group-hover:text-[#D9383A] transition-colors">
          {user.fullName}
        </p>
        <div className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-[#D9383A] font-semibold text-xs border border-red-100/80">
          <Star className="w-3 h-3 fill-[#D9383A]" />
          <span>{user.points} pts</span>
        </div>
      </div>

      <div
        className={cn(
          "w-full rounded-t-[24px] flex flex-col items-center justify-center shadow-sm border border-gray-100/80",
          height,
          color
        )}
      >
        <span className="font-extrabold text-2xl sm:text-3xl text-gray-700/60">
          #{rank}
        </span>
      </div>
    </div>
  );
}

// ─── RankRow ──────────────────────────────────────────────────────────────────

import React from "react";

const RankRow = React.forwardRef<
  HTMLDivElement,
  {
    user: LeaderboardUser;
    rank: number;
    isMe: boolean;
    highlightMe: boolean;
    onClick: () => void;
  }
>(function RankRow({ user, rank, isMe, highlightMe, onClick }, ref) {
  return (
    <div
      ref={ref}
      onClick={onClick}
      className={cn(
        "w-full bg-white rounded-[24px] border border-gray-100/80 p-4 sm:px-6 flex items-center justify-between gap-4 transition-all duration-200 hover:shadow-md cursor-pointer group",
        highlightMe
          ? "ring-2 ring-[#D9383A] bg-red-50/40 border-red-200 shadow-md scale-[1.01]"
          : isMe
            ? "bg-amber-50/50 border-amber-200"
            : "hover:border-gray-200"
      )}
    >
      <div className="font-extrabold text-base sm:text-lg text-gray-400 w-8 shrink-0">
        #{rank}
      </div>
      <div className="w-10 h-10 rounded-full bg-[#100A0A] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
        {initials(user.fullName)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm sm:text-base text-[#1A0D0C] group-hover:text-[#D9383A] transition-colors truncate">
          {user.fullName}
          {isMe && (
            <span className="ml-2 bg-[#D9383A] text-white text-[10px] font-bold px-2 py-0.5 rounded-full inline-block">
              YOU
            </span>
          )}
        </p>
        <p className="text-xs text-gray-400 font-medium">
          Active Student
        </p>
      </div>
      <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-50 text-[#D9383A] font-semibold text-xs border border-red-100/80 shrink-0">
        <Star className="w-3.5 h-3.5 fill-[#D9383A]" />
        <span>{user.points} pts</span>
      </div>
    </div>
  );
});