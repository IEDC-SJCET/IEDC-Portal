"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { IdCard, ProfileData } from "@/components/profile/_components/id-card";

interface StudentProfile {
  name?: string;
  role?: string;
  iecdId?: string;
  admissionNumber?: string;
  department?: string;
  batch?: string;
  designation?: string;
  phone?: string | null;
  bio?: string | null;
  totalPoints?: number;
  githubUrl?: string;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
  eventsParticipatedCount?: number;
  projectsCount?: number;
  certificatesCount?: number;
}

interface EventItem {
  id: string;
  title: string;
  eventType: string;
  startDatetime: string;
  posterUrl?: string | null;
}

export default function StudentDashboard() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [certificatesCount, setCertificatesCount] = useState<number>(0);
  const [eventsParticipatedCount, setEventsParticipatedCount] = useState<number>(0);
  const [githubReposCount, setGithubReposCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [profileRes, eventsRes, qrRes] = await Promise.all([
          fetch("/api/student/profile"),
          fetch("/api/events?upcoming=true&limit=30"),
          fetch("/api/student/qr"),
        ]);

        if (profileRes.ok) {
          const profileData: StudentProfile = await profileRes.json();
          setProfile(profileData);

          if (typeof profileData.eventsParticipatedCount === "number") {
            setEventsParticipatedCount(profileData.eventsParticipatedCount);
          }
          if (typeof profileData.certificatesCount === "number") {
            setCertificatesCount(profileData.certificatesCount);
          }

          let reposCount = profileData.projectsCount || 0;
          if (profileData.githubUrl) {
            const match = profileData.githubUrl.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#]+)/i);
            const username = match ? match[1] : (!profileData.githubUrl.includes("/") ? profileData.githubUrl.trim() : null);
            if (username) {
              try {
                const ghRes = await fetch(`https://api.github.com/users/${username}`);
                if (ghRes.ok) {
                  const ghData = await ghRes.json();
                  if (typeof ghData.public_repos === "number") {
                    reposCount = ghData.public_repos;
                  }
                }
              } catch (e) {
                console.error("Failed to fetch GitHub repos count:", e);
              }
            }
          }
          setGithubReposCount(reposCount);
        }

        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          const now = new Date();
          const upcomingEvents = (eventsData.events || []).filter((e: Record<string, unknown>) => {
            if (e.status === "completed" || e.status === "cancelled") return false;
            const dateStr = (e.endDatetime as string) || (e.startDatetime as string);
            if (dateStr) {
              const d = new Date(dateStr);
              if (!isNaN(d.getTime()) && d < now) return false;
            }
            return true;
          });
          setEvents(upcomingEvents);
        }

        if (qrRes.ok) {
          const qrData = await qrRes.json();
          if (qrData.qrDataUrl) {
            setQrUrl(qrData.qrDataUrl);
          }
        }
      } catch (err) {
        console.error("Failed to load dashboard profile/events:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const studentName = profile?.name || session?.user?.name || "Student";
  const iecdId = profile?.iecdId || profile?.admissionNumber || "IEDC SJCET";
  const points = profile?.totalPoints ?? 0;

  const profileCardData: ProfileData = {
    name: studentName,
    role: profile?.role || "Student",
    email: session?.user?.email || undefined,
    iecdId: iecdId,
    department: profile?.department || undefined,
    batch: profile?.batch || undefined,
    designation: profile?.designation || undefined,
    phone: profile?.phone ?? null,
    bio: profile?.bio ?? null,
    linkedinUrl: profile?.linkedinUrl ?? null,
    githubUrl: profile?.githubUrl ?? null,
    portfolioUrl: profile?.portfolioUrl ?? null,
    totalPoints: points,
    eventsAttended: eventsParticipatedCount,
  };
  const avatar = session?.user?.image || "/profile/avatar.webp";

  if (loading) {
    return (
      <div className="w-full space-y-6 font-['Hanken_Grotesk'] text-[#1A0D0C] pb-16 animate-pulse">
        <div className="w-full max-w-[1014px] h-[220px] bg-white rounded-[38px] border border-gray-100" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_480px] gap-6 max-w-[1014px]">
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="h-[210px] bg-[#FAE9CF]/60 rounded-[38px]" />
              <div className="h-[210px] bg-[#CFDEFB]/60 rounded-[38px]" />
            </div>
            <div className="h-[210px] bg-[#FBCFCF]/60 rounded-[38px]" />
          </div>
          <div className="h-[550px] bg-[#0c0908]/90 rounded-[44px] border border-[#e8594c]/30" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 font-['Hanken_Grotesk'] text-[#1A0D0C] pb-16">
      <div className="relative w-full max-w-[1014px] bg-white rounded-[38px] border border-gray-100/80 p-8 md:p-10 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-[240.16px] h-[37.24px] rounded-bl-[65px] bg-gradient-to-b from-[#FF0000] to-[#990000] flex items-center justify-center text-white font-['Hanken_Grotesk'] text-[15.2px] font-semibold tracking-[-0.456px] z-10 shadow-sm">
          {iecdId}
        </div>

        <div className="space-y-1 pt-2 md:pt-0">
          <h1 className="text-[36px] sm:text-[46px] font-semibold text-[#1A0D0C] tracking-[-1.38px] leading-tight">
            Hello {studentName}
          </h1>
          <p className="text-[18px] sm:text-[20px] font-semibold text-[#B0B0B0] tracking-[-0.6px] leading-snug">
            Monitor your performance here
          </p>
        </div>

        {/* Right side 3 Dark Stat Pills */}
        <div className="flex flex-wrap items-center gap-3 shrink-0 pt-2 md:pt-0">
          <div className="flex flex-col justify-end items-start w-[140.377px] h-[101.119px] p-[14.274px_20.221px_8.294px_20.221px] rounded-[20.128px] bg-[#1E1614] gap-[5.552px] shadow-sm">
            <span className="text-[#FFFFFF] text-[17.459px] font-normal tracking-[-0.524px] leading-none">
              Points
            </span>
            <span className="text-[#FFFFFF] text-[38.068px] font-bold tracking-[-1.142px] leading-none">
              {points}
            </span>
          </div>

          <div className="flex flex-col justify-end items-start w-[142.757px] h-[101.119px] p-[14.277px_20.224px_8.292px_20.224px] rounded-[20.128px] bg-[#1E1614] gap-[5.55px] shadow-sm">
            <span className="text-[#FFFFFF] text-[17.459px] font-normal tracking-[-0.524px] leading-none">
              Github repos
            </span>
            <span className="text-[#FFFFFF] text-[38.068px] font-bold tracking-[-1.142px] leading-none">
              {githubReposCount}
            </span>
          </div>

          <div className="flex flex-col justify-end items-start w-[142.757px] h-[101.119px] p-[14.277px_20.224px_8.292px_20.224px] rounded-[20.128px] bg-[#1E1614] gap-[5.55px] shadow-sm">
            <span className="text-[#FFFFFF] text-[17.459px] font-normal tracking-[-0.524px] leading-none truncate max-w-full">
              Event partici..
            </span>
            <span className="text-[#FFFFFF] text-[38.068px] font-bold tracking-[-1.142px] leading-none">
              {eventsParticipatedCount}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Dashboard Cards & Profile Card Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_480px] xl:grid-cols-[1fr_540px] gap-6 max-w-[1014px]">
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="w-full h-[210px] rounded-[38px] bg-[#FAE9CF] p-7 flex flex-col justify-between relative shadow-sm border border-amber-100/50">
              <h3 className="w-[209px] text-[#000000] text-[25px] font-medium leading-[94.331%] tracking-[-0.75px]">
                Total Certificates
              </h3>
              <div className="flex items-end justify-between">
                <span className="w-[120px] text-[#0F0A0A] text-[64px] font-semibold leading-[94.331%] tracking-[-1.92px]">
                  {certificatesCount}
                </span>
                <Link
                  href="/student/certificates"
                  className="flex items-center justify-between w-[158px] h-[34px] pl-[21.186px] pr-[8px] py-[4.46px] rounded-[31.221px] text-white text-[15.013px] font-semibold tracking-[-0.45px] transition-transform active:scale-95 shadow-sm shrink-0"
                  style={{
                    background:
                      "radial-gradient(133.5% 127.27% at 48.91% 127.27%, rgba(89, 7, 8, 0.23) 0%, rgba(102, 102, 102, 0.00) 100%), #0F0A0A",
                  }}
                >
                  <span>My Certificates</span>
                  <span className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center">
                    <ArrowUpRight className="w-3.5 h-3.5 text-black" />
                  </span>
                </Link>
              </div>
            </div>

            <div className="w-full h-[210px] rounded-[38px] bg-[#CFDEFB] p-7 flex flex-col justify-between relative shadow-sm border border-blue-100/50">
              <h3 className="w-[209px] text-[#000000] text-[25px] font-normal leading-[94.331%] tracking-[-0.75px]">
                Total Events<br />Participated
              </h3>
              <div className="flex items-end justify-between">
                <span className="w-[120px] text-[#0F0A0A] text-[64px] font-semibold leading-[94.331%] tracking-[-1.92px]">
                  {eventsParticipatedCount}
                </span>
                <Link
                  href="/student/events"
                  className="flex items-center justify-between w-[141px] h-[34px] pl-[21.186px] pr-[8px] py-[4.46px] rounded-[31.221px] text-white text-[15.013px] font-semibold tracking-[-0.45px] transition-transform active:scale-95 shadow-sm shrink-0"
                  style={{
                    background:
                      "radial-gradient(133.5% 127.27% at 48.91% 127.27%, rgba(89, 7, 8, 0.23) 0%, rgba(102, 102, 102, 0.00) 100%), #0F0A0A",
                  }}
                >
                  <span>Live Events</span>
                  <span className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center">
                    <ArrowUpRight className="w-3.5 h-3.5 text-black" />
                  </span>
                </Link>
              </div>
            </div>
          </div>

          <div className="w-full h-[210px] rounded-[38px] bg-[#FBCFCF] p-5 sm:p-7 flex items-center justify-between relative overflow-hidden shadow-sm border border-red-100/50">
            <div className="flex flex-col justify-between h-full z-10 shrink-0">
              <h3 className="text-[#1A0D0C] text-[20px] sm:text-[25px] font-semibold tracking-[-0.75px]">
                Upcoming Events
              </h3>
              <div className="flex items-baseline gap-2 sm:gap-4">
                <span className="text-[#0F0A0A] text-[48px] sm:text-[64px] font-semibold leading-[94.331%] tracking-[-1.92px]">
                  {events.length}
                </span>
                <Link
                  href="/student/events"
                  className="flex items-center justify-between w-[125px] sm:w-[141px] h-[32px] sm:h-[34px] pl-[14px] sm:pl-[21.186px] pr-[6px] sm:pr-[8px] py-[4.46px] rounded-[31.221px] text-white text-[13px] sm:text-[15.013px] font-semibold tracking-[-0.45px] transition-transform active:scale-95 shadow-sm shrink-0"
                  style={{
                    background:
                      "radial-gradient(133.5% 127.27% at 48.91% 127.27%, rgba(89, 7, 8, 0.23) 0%, rgba(102, 102, 102, 0.00) 100%), #0F0A0A",
                  }}
                >
                  <span>Live Events</span>
                  <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white text-black flex items-center justify-center">
                    <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-black" />
                  </span>
                </Link>
              </div>
            </div>

            <div className="flex relative items-center justify-end pr-1 sm:pr-2 h-full w-[115px] sm:w-[240px] shrink-0">
              <div className="flex items-center -space-x-[42px] sm:-space-x-12 hover:-space-x-6 transition-all duration-300">
                {events.slice(0, 4).map((event, idx) => (
                  <div
                    key={event.id || idx}
                    className={cn(
                      "w-[68px] h-[95px] sm:w-[85px] sm:h-[115px] rounded-[10px] sm:rounded-[14px] border-[1.5px] sm:border-2 border-white shadow-xl overflow-hidden shrink-0 transition-transform duration-300 cursor-pointer bg-slate-900 flex flex-col justify-between p-1.5 sm:p-2 text-white text-center",
                      idx === 0 && "-rotate-6 hover:rotate-0 z-40 hover:z-50",
                      idx === 1 && "rotate-6 hover:rotate-0 z-30 hover:z-50",
                      idx === 2 && "-rotate-3 hover:rotate-0 z-20 hover:z-50",
                      idx === 3 && "rotate-8 hover:rotate-0 z-10 hover:z-50"
                    )}
                  >
                    {event.posterUrl ? (
                      <img
                        src={event.posterUrl}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#1E293B] to-[#0F172A] p-1.5 sm:p-2 flex flex-col items-center justify-center text-center">
                        <span className="text-[9px] sm:text-[10px] font-bold leading-tight uppercase line-clamp-2">
                          {event.title}
                        </span>
                        <span className="text-[7px] sm:text-[8px] opacity-75 mt-1 capitalize">
                          {event.eventType}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-[720px] flex justify-center lg:justify-start">
          <IdCard profile={profileCardData} avatar={avatar} />
        </div>
      </div>

      <div className="max-w-[1014px] pt-12 flex justify-end">
        <p className="w-[242px] h-[26px] text-[#AAA] text-right font-['Hanken_Grotesk'] text-[16px] font-normal leading-[94.331%] tracking-[-0.48px]">
          IEDC 2026 SJCET - TECH TEAM
        </p>
      </div>
    </div>
  );
}