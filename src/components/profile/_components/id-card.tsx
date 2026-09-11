"use client";

import { useEffect, useState } from "react";
import {
  Globe,
  Code2,
  Share2,
  FolderGit2,
  ExternalLink,
  Edit3,
  Save,
  Loader2,
  X,
  User,
  Phone,
  Building,
  Briefcase,
  FileText,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { EditProfileDrawer } from "./edit-profile-drawer";

export interface ProfileData {
  id?: string;
  userId?: string;
  name: string;
  role?: string;
  email?: string;
  photoUrl?: string | null;
  iecdId?: string;
  admissionNumber?: string;
  department?: string;
  batch?: string;
  designation?: string;
  phone: string | null;
  bio?: string | null;
  skills?: string[];
  interests?: string[];
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  behanceUrl?: string | null;
  portfolioUrl?: string | null;
  qrCodeUrl?: string | null;
  totalPoints?: number | null;
  eventsAttended?: number | null;
}

interface ContributionDay {
  date: string;
  count: number;
  level: number;
}

interface IdCardProps {
  profile: ProfileData;
  avatar: string;
  editing?: boolean;
  editData?: Partial<ProfileData>;
  setEditData?: React.Dispatch<React.SetStateAction<Partial<ProfileData>>>;
  onSave?: () => void;
  onCancel?: () => void;
  onStartEdit?: () => void;
  saving?: boolean;
  className?: string;
}

const BACKGROUND_PATTERN = "/profile/background.webp";
const RECTANGLE_CUTOUT = "/profile/rectangle.webp";
export const DEFAULT_AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-3.8-1.04-4.84-2.61.03-1.6 3.19-2.48 4.84-2.48s4.81.88 4.84 2.48C15.8 18.96 14.03 20 12 20z'/%3E%3C/svg%3E";

export const DEPARTMENTS = [
  { value: "CSE", label: "Computer Science & Engineering - CSE" },
  { value: "CA", label: "Computer Science & Engineering (Artificial Intelligence) - CA" },
  { value: "CC", label: "Computer Science & Engineering (Cyber Security) - CC" },
  { value: "AD", label: "Artificial Intelligence & Data Science - AD" },
  { value: "CE", label: "Civil Engineering - CE" },
  { value: "ME", label: "Mechanical Engineering - ME" },
  { value: "ECE", label: "Electronics & Communication Engineering - ECE" },
  { value: "ER", label: "Electronics & Computer Engineering - ER" },
  { value: "EEE", label: "Electrical & Electronics Engineering - EEE" },
  { value: "MCA", label: "Computer Applications - MCA" },
  { value: "Int.MCA", label: "Integrated MCA - Int.MCA" },
  { value: "MBA", label: "Masters in Business Administration - MBA" },
];

export function getDepartmentLabel(dept: string | null | undefined): string {
  if (!dept) return "N/A";
  const trimmed = dept.trim();
  const upper = trimmed.toUpperCase();
  const found = DEPARTMENTS.find(
    (d) => d.value.toUpperCase() === upper || d.label.toUpperCase() === upper
  );
  return found ? found.label : trimmed;
}

export function formatDesignation(desig?: string | null): string {
  if (!desig) return "Student";
  const trimmed = desig.trim();
  const lower = trimmed.toLowerCase();

  const mapping: Record<string, string> = {
    nodal_officer: "Nodal Officer",
    ceo: "Chief Executive Officer",
    cto: "Chief Technical Officer",
    cco: "Chief Creative Officer",
    cfo: "Chief Finance Officer",
    coo: "Chief Operations Officer",
    cmo: "Chief Marketing Officer",
    cwit: "Chief Women in Tech",
    cio: "Chief Innovation Officer",
    cso: "Chief Skills Officer",
    cvo: "Chief Vibes Officer",
    to: "Technical Officer",
    co: "Creative Officer",
    fo: "Finance Officer",
    oo: "Operations Officer",
    mo: "Marketing Officer",
    wit: "Women in Tech",
    io: "Innovation Officer",
    so: "Skills Officer",
    vo: "Vibes Officer",
    student: "Student",
    faculty: "Faculty",
  };

  if (mapping[lower]) {
    return mapping[lower];
  }

  let formatted = trimmed;
  let replaced = false;
  Object.entries(mapping).forEach(([abbr, full]) => {
    const regex = new RegExp(`\\b${abbr}\\b`, "gi");
    if (regex.test(formatted)) {
      formatted = formatted.replace(regex, full);
      replaced = true;
    }
  });

  if (replaced) {
    return formatted;
  }

  return trimmed.toUpperCase();
}

function GithubContributionChart({
  githubUsername,
  contributions,
  totalContributions,
}: {
  githubUsername: string;
  contributions: ContributionDay[] | null;
  totalContributions: number | null;
}) {
  if (!githubUsername) {
    return (
      <div className="py-6 text-center text-xs text-white/40">
        Add your GitHub username in Edit Profile to display your live activity graph.
      </div>
    );
  }

  const levelColors = [
    "#161b22", // Level 0
    "#0e4429", // Level 1
    "#006d32", // Level 2
    "#26a641", // Level 3
    "#39d353", // Level 4
  ];

  let weeks: ContributionDay[][] = [];
  if (contributions && contributions.length > 0) {
    let currentWeek: ContributionDay[] = [];
    contributions.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    if (weeks.length > 52) {
      weeks = weeks.slice(weeks.length - 52);
    }
  }

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
          GitHub Contributions
        </p>
        <div className="flex items-center gap-3">
          {totalContributions !== null && (
            <span className="text-[11px] font-medium text-white/70">
              {totalContributions} contributions
            </span>
          )}
          <a
            href={`https://github.com/${githubUsername}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-xs font-medium text-[#39d353] hover:underline"
          >
            @{githubUsername}
          </a>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1117] p-3 shadow-inner">
        {weeks.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${weeks.length * 13} 91`}
              className="h-auto w-full max-w-full"
              style={{ minHeight: "80px" }}
            >
              {weeks.map((week, colIdx) => (
                <g key={colIdx} transform={`translate(${colIdx * 13}, 0)`}>
                  {week.map((day, rowIdx) => (
                    <rect
                      key={day.date || rowIdx}
                      x="0"
                      y={rowIdx * 13}
                      width="10"
                      height="10"
                      rx="2"
                      ry="2"
                      fill={levelColors[Math.min(day.level || 0, 4)]}
                    >
                      <title>{`${day.count} contribution${day.count === 1 ? "" : "s"} on ${day.date}`}</title>
                    </rect>
                  ))}
                </g>
              ))}
            </svg>
          </div>
        ) : (
          <div className="relative w-full overflow-hidden p-1">
            <img
              src={`https://ghchart.rshah.org/39d353/${githubUsername}`}
              alt={`${githubUsername}'s GitHub Contributions`}
              className="h-auto w-full rounded-lg filter contrast-125"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://github-readme-activity-graph.vercel.app/graph?username=${githubUsername}&theme=github-compact`;
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function IdCard({
  profile,
  avatar,
  editing = false,
  editData = {},
  setEditData,
  onSave,
  onCancel,
  onStartEdit,
  saving = false,
  className,
}: IdCardProps) {
  const role = formatDesignation(profile.role);
  const year = profile.batch || "3rd Year";

  const [githubRepos, setGithubRepos] = useState<number | null>(null);
  const [totalContributions, setTotalContributions] = useState<number | null>(null);
  const [contributions, setContributions] = useState<ContributionDay[] | null>(null);

  const getUsername = (value?: string | null) => {
    if (!value) return "";
    let clean = value.trim().replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
    clean = clean.replace(/^(github\.com|linkedin\.com\/in|linkedin\.com|behance\.net)\//i, "");
    return clean.replace(/^in\//i, "");
  };

  const githubUsername = getUsername(profile.githubUrl);
  const linkedinUsername = getUsername(profile.linkedinUrl);
  const behanceUsername = getUsername(profile.behanceUrl);

  useEffect(() => {
    if (!githubUsername) return;

    let cancelled = false;

    const fetchGithubData = async () => {
      try {
        const userRes = await fetch(`https://api.github.com/users/${githubUsername}`);
        if (cancelled) return;
        if (userRes.ok) {
          const userData = await userRes.json();
          setGithubRepos(userData.public_repos);
        }

        const contribRes = await fetch(`https://github-contributions-api.jogruber.de/v4/${githubUsername}?y=last`);
        if (cancelled) return;
        if (contribRes.ok) {
          const contribData = await contribRes.json();
          const total: Record<string, number> = contribData.total || {};
          const sum = Object.values(total).reduce(
            (acc: number, curr: number) => acc + curr,
            0
          );
          setTotalContributions(sum);
          if (Array.isArray(contribData.contributions)) {
            setContributions(contribData.contributions);
          }
        }
      } catch (err) {
        console.error("Failed to fetch live GitHub stats:", err);
      }
    };

    fetchGithubData();

    return () => {
      cancelled = true;
    };
  }, [githubUsername]);

  return (
    <div className={cn("relative flex w-full max-w-180 flex-col overflow-hidden rounded-[44px] border border-[#e8594c]/30 bg-[#0c0908] font-['Hanken_Grotesk'] text-white shadow-[0px_25px_70px_-15px_rgba(0,0,0,0.6)] transition-all", className)}>
      {/* 1. Graphic Banner */}
      <div className="relative mx-3 mt-3 h-64 shrink-0 overflow-hidden rounded-[36px] bg-red-950">
        <img
          src={BACKGROUND_PATTERN}
          alt="Background pattern"
          className="absolute inset-0 size-full object-cover opacity-90"
        />

        {/* Rectangle Cutout */}
        <div className="absolute bottom-0 left-1/2 h-10 w-60 -translate-x-1/2">
          <img
            src={RECTANGLE_CUTOUT}
            alt="Shape Cutout"
            className="size-full object-contain"
          />
        </div>

        {/* Avatar in Glowing Ring with Yellow Student Badge */}
        <div className="absolute left-1/2 top-9 h-36 w-36 -translate-x-1/2 rounded-full border-4 border-amber-500/90 bg-black p-1 shadow-2xl">
          <img
            src={avatar}
            alt={profile.name}
            className="size-full rounded-full object-cover"
          />
          <div className="absolute -right-1 top-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black shadow-md">
            {(profile.role || "Student").toUpperCase()}
          </div>
        </div>
      </div>

      {/* 2. Top ID Pill */}
      <div className="absolute left-1/2 top-3 flex h-9.5 w-max -translate-x-1/2 items-center justify-center whitespace-nowrap rounded-b-[20px] bg-linear-to-b from-red-600 to-red-800 px-8 font-semibold text-white shadow-md">
        <span className="text-sm tracking-wide">
          {profile.iecdId || "IEDC-2025-CSE-00001"}
        </span>
      </div>

      {/* 3. Main Info */}
      <div className="px-8 pt-3 text-center">
        <p className="text-sm font-semibold tracking-wide text-white/80">
          {year}
        </p>

        <div className="mt-2.5 inline-block rounded-full bg-[#342624] px-5 py-1 max-w-90 truncate">
          <span className="text-xs font-medium text-white/90">{role}</span>
        </div>

        <h1 className="mt-2.5 text-3xl font-bold tracking-tight text-white">
          {profile.name}
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-sm font-light leading-relaxed text-white/90">
          {profile.bio || "No bio added yet"}
        </p>

        {/* Edit Button inside Profile Card */}
        {onStartEdit && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={onStartEdit}
              className="flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-6 py-2 text-xs font-semibold text-white shadow-sm backdrop-blur-md transition hover:bg-white/20 hover:border-white/40"
            >
              <span>{editing ? "Cancel Edit" : "Edit Profile"}</span>
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-black/50">
                {editing ? <X className="h-3 w-3" /> : <Edit3 className="h-3 w-3" />}
              </div>
            </button>
          </div>
        )}
      </div>

      {/* 4. CONTENT AREA: VIEW MODE OR INLINE EDIT MODE */}
      {!editing ? (
        <div className="px-8 pb-8 pt-4 space-y-6">
          {/* Live Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl border border-white/5 bg-[#1e1614] p-3.5 text-center">
              <p className="text-xs font-normal text-white/60">Points</p>
              <p className="mt-1 text-2xl font-bold text-white">
                {profile.totalPoints ?? 0}
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#1e1614] p-3.5 text-center">
              <p className="text-xs font-normal text-white/60">GitHub Repos</p>
              <p className="mt-1 text-2xl font-bold text-white">
                {githubUsername ? (githubRepos ?? "...") : "N/A"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#1e1614] p-3.5 text-center">
              <p className="truncate text-xs font-normal text-white/60">
                Events Attended
              </p>
              <p className="mt-1 text-2xl font-bold text-white">
                {profile.eventsAttended ?? 0}
              </p>
            </div>
          </div>

          {/* Social Links Grid */}
          <div className="space-y-2.5">
            <p className="text-xs font-medium uppercase tracking-wider text-white/50">
              Profiles & Links
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {githubUsername ? (
                <a
                  href={`https://github.com/${githubUsername}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#161211] p-3 text-xs text-white transition hover:border-white/30 hover:bg-[#221b19]"
                >
                  <Code2 className="h-4 w-4 shrink-0 text-white" />
                  <span className="truncate font-medium">GitHub</span>
                </a>
              ) : (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-[#161211]/50 p-3 text-xs text-white/30">
                  <Code2 className="h-4 w-4" />
                  <span>GitHub</span>
                </div>
              )}

              {linkedinUsername ? (
                <a
                  href={`https://linkedin.com/in/${linkedinUsername}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#161211] p-3 text-xs text-white transition hover:border-white/30 hover:bg-[#221b19]"
                >
                  <Share2 className="h-4 w-4 shrink-0 text-blue-400" />
                  <span className="truncate font-medium">LinkedIn</span>
                </a>
              ) : (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-[#161211]/50 p-3 text-xs text-white/30">
                  <Share2 className="h-4 w-4" />
                  <span>LinkedIn</span>
                </div>
              )}

              {behanceUsername ? (
                <a
                  href={`https://behance.net/${behanceUsername}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#161211] p-3 text-xs text-white transition hover:border-white/30 hover:bg-[#221b19]"
                >
                  <FolderGit2 className="h-4 w-4 shrink-0 text-indigo-400" />
                  <span className="truncate font-medium">Behance</span>
                </a>
              ) : (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-[#161211]/50 p-3 text-xs text-white/30">
                  <FolderGit2 className="h-4 w-4" />
                  <span>Behance</span>
                </div>
              )}

              {profile.portfolioUrl ? (
                <a
                  href={profile.portfolioUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#161211] p-3 text-xs text-white transition hover:border-white/30 hover:bg-[#221b19]"
                >
                  <Globe className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span className="truncate font-medium">Portfolio</span>
                </a>
              ) : (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-[#161211]/50 p-3 text-xs text-white/30">
                  <Globe className="h-4 w-4" />
                  <span>Portfolio</span>
                </div>
              )}
            </div>
          </div>

          {/* GitHub Contribution Chart */}
          <GithubContributionChart
            githubUsername={githubUsername}
            contributions={contributions}
            totalContributions={totalContributions}
          />
        </div>
      ) : (
        <EditProfileDrawer
          editData={editData}
          setEditData={setEditData!}
          onSave={onSave!}
          onCancel={onCancel!}
          saving={saving}
        />
      )}
    </div>
  );
}
