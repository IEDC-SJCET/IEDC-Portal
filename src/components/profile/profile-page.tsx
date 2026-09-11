"use client";

import { useEffect, useState, useRef } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Loader2, QrCode, LogOut, Share2, ArrowLeft, Check } from "lucide-react";
import { toPng } from "html-to-image";
import { IdCard, ProfileData, formatDesignation } from "./_components/id-card";
import { QrDialog } from "./_components/qr-dialog";
import { ProfileDownloadCard } from "./_components/profile-download-card";

export default function ProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const downloadCardRef = useRef<HTMLDivElement>(null);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [editData, setEditData] = useState<Partial<ProfileData>>({});
  const [modalQrUrl, setModalQrUrl] = useState("");
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/student/profile");
        if (res.ok) setProfile(await res.json());
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/auth/login");
            router.refresh();
          },
        },
      });
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const openQR = async () => {
    setQrLoading(true);
    setIsQRModalOpen(true);
    try {
      const res = await fetch("/api/student/qr");
      if (res.ok) {
        const { qrDataUrl } = await res.json();
        setModalQrUrl(qrDataUrl);
      }
    } catch (err) {
      console.error("Failed to load QR code", err);
    } finally {
      setQrLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/student/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      if (res.ok) {
        setProfile(await res.json());
        setEditing(false);
        setEditData({});
      }
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = () => {
    if (!profile) return;
    if (editing) {
      setEditing(false);
      setEditData({});
    } else {
      setEditing(true);
      setEditData({
        name: profile.name || "",
        bio: profile.bio || "",
        phone: profile.phone || "",
        department: profile.department || "",
        linkedinUrl: profile.linkedinUrl || "",
        githubUrl: profile.githubUrl || "",
        behanceUrl: profile.behanceUrl || "",
        portfolioUrl: profile.portfolioUrl || "",
      });
    }
  };

  const handleShareProfile = async () => {
    if (!downloadCardRef.current || sharing) return;
    setSharing(true);
    setFeedbackMessage(null);
    try {
      const dataUrl = await toPng(downloadCardRef.current, {
        cacheBust: false,
        pixelRatio: 2,
        quality: 0.98,
        fontEmbedCSS: "",
      });

      const sanitizedName = (profile?.name || "profile")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_");

      const userUUID = profile?.id || profile?.userId || session?.user?.id || "";
      const profileUrl = typeof window !== "undefined"
        ? (userUUID ? `${window.location.origin}/profile?id=${userUUID}` : `${window.location.origin}/auth/login`)
        : "";

      const hasRole = profile?.role && profile.role.toLowerCase() !== "student";
      const roleTitle = hasRole ? formatDesignation(profile.role) : "";
      const intro = roleTitle
        ? `I am ${profile?.name}, ${roleTitle} at IEDC SJCET.`
        : `I am ${profile?.name}.`;

      const domainUrl = typeof window !== "undefined" ? window.location.origin : "https://iedc.sjcet.in";
      const shareText = `${intro}\nView profile: ${profileUrl}\nJoin IEDC SJCET: ${domainUrl}`;

      let sharedNatively = false;

      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], `${sanitizedName}_iedc_profile.png`, {
            type: "image/png",
          });

          if (navigator.canShare && navigator.canShare({ files: [file], text: shareText })) {
            await navigator.share({
              title: `${profile?.name}'s Profile`,
              text: shareText,
              files: [file],
            });
            sharedNatively = true;
          } else if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `${profile?.name}'s Profile`,
              text: shareText,
              files: [file],
            });
            sharedNatively = true;
          } else {
            await navigator.share({
              title: `${profile?.name}'s Profile`,
              text: shareText,
            });
            sharedNatively = true;
          }
        } catch {
          // Native share cancelled or failed
        }
      }

      if (!sharedNatively) {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(shareText);
        }
        const link = document.createElement("a");
        link.download = `${sanitizedName}_iedc_profile_card.png`;
        link.href = dataUrl;
        link.click();
        setFeedbackMessage("Profile link copied to clipboard & image downloaded");
        setTimeout(() => setFeedbackMessage(null), 4000);
      }
    } catch (err) {
      console.error("Failed to share profile:", err);
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-white font-['Hanken_Grotesk'] text-slate-800">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-white font-['Hanken_Grotesk'] text-slate-800">
        <p className="text-xl font-medium text-slate-600">Profile not found</p>
      </div>
    );
  }

  const avatar = profile?.photoUrl || session?.user?.image || "/profile/avatar.webp";
  const nameUpper = profile?.name ? profile.name.toUpperCase() : "STUDENT NAME";

  return (
    <div className="relative min-h-screen w-full bg-white/10 font-['Hanken_Grotesk'] text-slate-900 flex flex-col justify-between p-4 sm:p-6 lg:p-8 overflow-hidden">
      {/* Hidden Downloadable Card Canvas for html-to-image capture */}
      <div className="fixed top-[-9999px] left-[-9999px] pointer-events-none opacity-100">
        {profile && (
          <ProfileDownloadCard
            ref={downloadCardRef}
            profile={profile}
            avatar={avatar}
          />
        )}
      </div>

      {/* Top Header Actions Bar */}
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between py-2">
        <button
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
            } else {
              router.push("/student/dashboard");
            }
          }}
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-200 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={openQR}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
          >
            <QrCode className="h-4 w-4" /> My QR
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </div>

      {/* Main Profile Card Area */}
      <div className="my-auto flex w-full flex-col items-center justify-center py-4">
        <IdCard
          profile={profile}
          avatar={avatar}
          editing={editing}
          editData={editData}
          setEditData={setEditData}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
          onStartEdit={handleStartEdit}
          saving={saving}
        />

        {/* Share Profile Action Outside Card */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3">
          <button
            onClick={handleShareProfile}
            disabled={sharing}
            className="flex items-center gap-3 rounded-full border border-red-500/40 bg-linear-to-r from-red-600 to-red-700 px-8 py-4 text-sm font-bold text-white shadow-xl backdrop-blur-md transition-all hover:from-red-500 hover:to-red-600 hover:scale-105 hover:shadow-red-900/40 disabled:opacity-60 cursor-pointer active:scale-95"
          >
            {sharing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Share2 className="h-5 w-5" />
            )}
            <span className="tracking-wide">{sharing ? "Preparing Share..." : "Share Profile"}</span>
          </button>

          {feedbackMessage && (
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-400 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
              <Check className="h-4 w-4" />
              <span>{feedbackMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* QR Dialog Component */}
      <QrDialog
        isOpen={isQRModalOpen}
        onOpenChange={setIsQRModalOpen}
        loading={qrLoading}
        qrUrl={modalQrUrl}
      />
    </div>
  );
}
