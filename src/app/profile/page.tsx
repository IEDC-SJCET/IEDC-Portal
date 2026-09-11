"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, UserPlus, LogIn, ExternalLink } from "lucide-react";
import { IdCard, ProfileData } from "@/components/profile/_components/id-card";

export default function PublicProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicProfile = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const targetId = searchParams.get("id");

        if (!targetId) {
          setError("No profile ID specified.");
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/student/profile?id=${encodeURIComponent(targetId)}`);
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        } else {
          setError("Profile not found or link is invalid.");
        }
      } catch (err) {
        console.error("Error fetching public profile:", err);
        setError("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchPublicProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0908] font-['Hanken_Grotesk'] text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-red-500" />
          <p className="text-xs text-white/60">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0c0908] p-4 font-['Hanken_Grotesk'] text-white text-center">
        <div className="rounded-3xl border border-white/10 bg-[#161211] p-8 shadow-2xl max-w-sm w-full">
          <h2 className="text-xl font-bold text-white mb-2">Profile Not Found</h2>
          <p className="text-xs text-white/60 mb-6">{error || "The requested profile link is unavailable."}</p>
          <button
            onClick={() => router.push("/auth/login")}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-linear-to-r from-red-600 to-red-700 px-6 py-3 text-xs font-bold text-white shadow-lg transition hover:from-red-500 hover:to-red-600 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>Join IEDC SJCET</span>
          </button>
        </div>
      </div>
    );
  }

  const avatar = profile.photoUrl || "/profile/avatar.webp";

  return (
    <div className="relative min-h-screen w-full bg-[#0c0908] font-['Hanken_Grotesk'] text-white flex flex-col justify-between p-4 sm:p-6 lg:p-8 overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-150 h-150 bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header */}
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between py-2 z-10">
        <button
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
            } else {
              router.push("/auth/login");
            }
          }}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <button
          onClick={() => router.push("/auth/login")}
          className="flex items-center gap-2 rounded-full border border-red-500/40 bg-linear-to-r from-red-600 to-red-700 px-5 py-2 text-xs font-bold text-white shadow-lg transition hover:from-red-500 hover:to-red-600 cursor-pointer"
        >
          <LogIn className="h-4 w-4" />
          <span>Join IEDC SJCET</span>
        </button>
      </div>

      {/* Main Profile Card Display */}
      <div className="my-auto flex w-full flex-col items-center justify-center py-6 z-10">
        <IdCard
          profile={profile}
          avatar={avatar}
        />

        {/* Join IEDC CTA Button replacing Edit & Share buttons */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3">
          <button
            onClick={() => router.push("/auth/login")}
            className="flex items-center gap-3 rounded-full border border-red-500/40 bg-linear-to-r from-red-600 via-red-700 to-amber-600 px-10 py-4 text-sm font-black text-white shadow-2xl backdrop-blur-md transition-all hover:scale-105 hover:shadow-red-900/50 cursor-pointer active:scale-95"
          >
            <UserPlus className="h-5 w-5" />
            <span className="tracking-wider uppercase">JOIN IEDC SJCET</span>
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="text-center py-2 text-[11px] text-white/40 font-light z-10">
        IEDC SJCET Portal • Official Public Profile
      </div>
    </div>
  );
}
