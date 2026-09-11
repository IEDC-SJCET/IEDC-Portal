"use client";

import React, { forwardRef, useEffect, useState } from "react";
import { ProfileData, getDepartmentLabel, DEFAULT_AVATAR, formatDesignation } from "./id-card";

interface ProfileDownloadCardProps {
  profile: ProfileData;
  avatar: string;
  githubRepos?: number | null;
}

const BACKGROUND_PATTERN = "/profile/background.webp";
const RECTANGLE_CUTOUT = "/profile/rectangle.webp";

export const ProfileDownloadCard = forwardRef<HTMLDivElement, ProfileDownloadCardProps>(
  ({ profile, avatar, githubRepos: initialGithubRepos }, ref) => {
    const role = formatDesignation(profile.role);
    const year = profile.batch || "3rd Year";
    const iecdId = profile.iecdId || "IEDC-2025-CSE-00001";

    const [repos, setRepos] = useState<number | null>(initialGithubRepos ?? null);

    useEffect(() => {
      if (initialGithubRepos !== undefined && initialGithubRepos !== null) {
        setRepos(initialGithubRepos);
        return;
      }

      if (!profile.githubUrl) return;

      const getUsername = (value?: string | null) => {
        if (!value) return "";
        return value.trim().replace(/^https?:\/\/(www\.)?[^\/]+\//, "").replace(/\/$/, "");
      };

      const username = getUsername(profile.githubUrl);
      if (!username) return;

      let active = true;
      fetch(`https://api.github.com/users/${username}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (active && data && typeof data.public_repos === "number") {
            setRepos(data.public_repos);
          }
        })
        .catch(() => { });

      return () => {
        active = false;
      };
    }, [profile.githubUrl, initialGithubRepos]);

    return (
      <div
        ref={ref}
        style={{ width: "1080px", height: "1350px" }}
        className="relative flex flex-col items-center justify-center overflow-hidden bg-[#070606] font-['Hanken_Grotesk'] text-white select-none"
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800;900&display=swap');
          * { font-family: 'Hanken Grotesk', sans-serif !important; }
        `}</style>

        {/* Ambient Glows */}
        <div className="absolute -top-32 -right-32 h-187.5 w-187.5 rounded-full bg-blue-600/25 blur-[180px] pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 h-187.5 w-187.5 rounded-full bg-red-600/30 blur-[180px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-212.5 w-212.5 rounded-full bg-amber-600/20 blur-[190px] pointer-events-none" />

        {/* Centered Scaled-Up Outer ID Card Container (780px width) */}
        <div className="relative z-10 w-195 overflow-hidden rounded-[60px] border-2 border-[#e8594c]/50 bg-[#0c0908] font-['Hanken_Grotesk'] shadow-[0px_45px_120px_-15px_rgba(0,0,0,0.98),0_0_65px_rgba(232,89,76,0.3)] flex flex-col">
          {/* Top ID Pill */}
          <div className="absolute left-1/2 top-0 z-20 flex h-14 w-max -translate-x-1/2 items-center justify-center whitespace-nowrap rounded-b-[28px] bg-linear-to-b from-red-600 to-red-800 px-12 font-bold text-white shadow-xl">
            <span className="text-base font-bold tracking-widest">{iecdId}</span>
          </div>

          {/* Graphic Banner */}
          <div className="relative mx-5 mt-5 h-96 shrink-0 overflow-hidden rounded-[52px] bg-red-950">
            <img
              src={BACKGROUND_PATTERN}
              alt="Background pattern"
              className="absolute inset-0 size-full object-cover opacity-90"
              crossOrigin="anonymous"
            />

            {/* Shape Cutout */}
            <div className="absolute bottom-0 left-1/2 h-14 w-80 -translate-x-1/2">
              <img
                src={RECTANGLE_CUTOUT}
                alt="Shape Cutout"
                className="size-full object-contain"
                crossOrigin="anonymous"
              />
            </div>

            {/* Glowing Avatar */}
            <div className="absolute left-1/2 top-14 h-56 w-56 -translate-x-1/2 rounded-full border-6 border-amber-500/90 bg-black p-2 shadow-2xl">
              <img
                src={avatar || DEFAULT_AVATAR}
                alt={profile.name}
                className="size-full rounded-full object-cover"
                onError={(e) => {
                  const t = e.currentTarget;
                  if (t.src !== DEFAULT_AVATAR) {
                    t.onerror = null;
                    t.src = DEFAULT_AVATAR;
                  }
                }}
              />
              <div className="absolute -right-2 top-2 rounded-full bg-amber-500 px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-black shadow-lg">
                {(profile.role || "Student").toUpperCase()}
              </div>
            </div>
          </div>

          {/* Main Card Information */}
          <div className="px-12 pt-6 text-center">
            <p className="text-base font-bold tracking-wider text-white/80 uppercase">
              {year}
            </p>

            <div className="mt-3 inline-block rounded-full bg-[#342624] px-6 py-1.5 max-w-110 truncate">
              <span className="text-sm font-semibold text-white/90">{role}</span>
            </div>

            {/* User Name */}
            <h1 className="mt-4 text-5xl font-black tracking-tight text-white drop-shadow-md font-['Hanken_Grotesk'] leading-tight wrap-break-word max-w-full">
              {profile.name}
            </h1>
            {profile.bio && (
              <p className="mx-auto mt-3 max-w-lg text-base font-light leading-relaxed text-white/90 line-clamp-2 italic">
                "{profile.bio}"
              </p>
            )}
          </div>

          {/* Stats Grid */}
          <div className="px-12 pb-11 pt-6">
            <div className="grid grid-cols-3 gap-5">
              <div className="rounded-[32px] border border-white/10 bg-[#1e1614] p-5 text-center shadow-inner">
                <p className="text-sm font-medium text-white/60">Points</p>
                <p className="mt-1.5 text-4xl font-black text-white">
                  {profile.totalPoints ?? 0}
                </p>
              </div>

              <div className="rounded-[32px] border border-white/10 bg-[#1e1614] p-5 text-center shadow-inner">
                <p className="text-sm font-medium text-white/60">Github repos</p>
                <p className="mt-1.5 text-4xl font-black text-white">
                  {repos ?? 0}
                </p>
              </div>

              <div className="rounded-[32px] border border-white/10 bg-[#1e1614] p-5 text-center shadow-inner">
                <p className="truncate text-sm font-medium text-white/60">
                  Events
                </p>
                <p className="mt-1.5 text-4xl font-black text-white">
                  {profile.eventsAttended ?? 0}
                </p>
              </div>
            </div>

            {/* Card Share Button Pill */}
            <div className="mt-8 flex justify-center">
              <div className="flex items-center gap-3 rounded-full border border-white/20 bg-white/15 px-10 py-3.5 text-sm font-extrabold text-white shadow-md backdrop-blur-md tracking-widest">
                <span>IEDC SJCET • STUDENT ID CARD</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Text below Card */}
        <p className="relative z-10 mt-10 text-base font-bold tracking-[0.3em] text-white/50 uppercase font-['Hanken_Grotesk']">
          IEDC 2026 SJCET • TECH TEAM
        </p>
      </div>
    );
  }
);

ProfileDownloadCard.displayName = "ProfileDownloadCard";
