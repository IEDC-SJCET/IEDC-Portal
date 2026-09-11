"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Trophy,
  FolderOpen,
  Award,
  User,
  Settings,
  BarChart3,
  Users,
  LogOut,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut, useSession } from "@/lib/auth-client";
import { fetchProfilePoints } from "@/lib/profile-cache";
import { getRoleBadgeText, isExecomRole, isNodalOfficer } from "@/lib/roles";

interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

interface SidebarProps {
  items: NavItem[];
  role: string;
}

const DEFAULT_ICONS: Record<string, { bg: string; icon: string }> = {
  Home: { bg: "bg-[#E52600]", icon: "/illustrations/Home.svg" },
  Dashboard: { bg: "bg-[#E52600]", icon: "/illustrations/Home.svg" },
  Events: { bg: "bg-[#1D60C8]", icon: "/illustrations/file.webp" },
  Leaderboard: { bg: "bg-[#CE322D]", icon: "/illustrations/Hash.svg" },
  Certificates: { bg: "bg-[#20A300]", icon: "/illustrations/file.webp" },
  Badges: { bg: "bg-[#EAA100]", icon: "/illustrations/Trello.svg" },
  Projects: { bg: "bg-[#10B981]", icon: "/illustrations/file.webp" },
  Profile: { bg: "bg-[#F59E0B]", icon: "/illustrations/User.svg" },
  CTO: { bg: "bg-[#F59E0B]", icon: "/illustrations/User.svg" },
  Users: { bg: "bg-[#8B5CF6]", icon: "/illustrations/User.svg" },
  Analytics: { bg: "bg-[#E52600]", icon: "/illustrations/Hash.svg" },
  Settings: { bg: "bg-[#6B7280]", icon: "/illustrations/Trello.svg" },
};

export function Sidebar({ items, role }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const [points, setPoints] = useState<number | null>(null);

  const name = session?.user?.name || "User";
  const userRole = ((session?.user as Record<string, unknown>)?.role as string) || role;
  const isExecom = isExecomRole(userRole);
  const isNodal = isNodalOfficer(userRole);
  // Execom and the Nodal Officer both get a staff workspace + role chip.
  const isStaff = isExecom || isNodal;
  const roleDisplay = isStaff ? getRoleBadgeText(userRole) : "";
  const profileHref = isNodal
    ? "/nodal/profile"
    : isExecom
      ? "/execom/profile"
      : "/student/profile";

  useEffect(() => {
    if (session?.user && (userRole === "student" || isStaff)) {
      fetchProfilePoints().then((pts) => {
        if (pts !== null) setPoints(pts);
      });
    }
  }, [session, userRole, isStaff]);

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

  return (
    <aside
      className="hidden md:flex flex-col w-20 lg:w-[305px] text-white min-h-screen fixed left-0 top-0 z-40 transition-all duration-300 border-r border-[#2B2B2B] font-sans"
      style={{
        background: "linear-gradient(182deg, #0F0A0A 0%, #000000 100%)",
        fontFamily: '"Hanken Grotesk", sans-serif',
      }}
    >
      {/* Brand Logo Header */}
      <div className="flex items-center justify-center lg:justify-start gap-3 px-4 lg:px-6 py-6 border-b border-[#2B2B2B]">
        <div className="w-10 h-10 flex items-center justify-center shrink-0">
          <svg
            width="42"
            height="42"
            viewBox="0 0 62 62"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full object-contain"
          >
            <path
              d="M48.7472 15.5221C48.9006 15.4759 49.243 15.4996 49.3676 15.6172C49.9526 16.1695 49.2689 17.8819 49.1014 18.5477L47.6603 24.2642L43.3148 41.4147L41.8745 47.0892C41.561 48.3355 41.2832 49.6725 40.8514 50.8489C40.719 51.2095 40.3312 51.1979 40.088 51.064C39.1097 50.5252 38.1595 49.7994 37.2235 49.1439L33.3257 46.4493L30.8246 44.7193C30.3977 44.4242 29.6131 43.9066 29.2458 43.5501C28.5733 44.4294 23.8124 50.8697 23.4258 51.042C23.2122 51.1373 22.9655 51.1743 22.7565 51.038C22.6496 50.9684 22.5791 50.8745 22.527 50.7349C22.3262 50.1969 22.2105 49.5157 22.0647 48.943C21.5745 47.0177 21.1515 45.0621 20.6724 43.1328C20.2592 41.6379 19.9445 40.0455 19.5405 38.534C19.3538 37.8353 19.2616 37.2829 19.0231 36.578C18.5843 36.1374 17.2869 35.2728 16.7506 34.8984L10.9464 30.8667C10.3755 30.4679 8.03924 28.9507 7.7703 28.4571C7.72845 27.996 7.74394 27.8446 7.88698 27.4197C8.28276 27.1194 9.19582 26.9419 9.67419 26.8019L12.968 25.8514L29.6799 21.0286L42.5995 17.2844C44.3978 16.765 46.2029 16.2193 47.9985 15.6812C48.2357 15.6101 48.5044 15.5638 48.7472 15.5221Z"
              fill="#E60B09"
            />
            <path
              d="M44.9092 18.5977L44.9504 18.6346C44.8928 18.77 40.0524 23.6186 39.6181 24.0551L29.1009 34.7017C28.4585 35.3546 25.3801 38.2187 25.0457 38.9905C24.6286 39.953 24.1935 43.0464 23.9038 44.2644C23.6835 45.1904 23.2664 47.07 23.1779 48.0477C22.9843 47.0361 22.6395 45.9477 22.4175 44.8417C22.0371 43.0329 21.4575 40.988 21.0567 39.1483C20.8761 38.319 20.4136 36.174 20.1504 35.459C21.1541 34.6847 22.3576 33.8985 23.3962 33.1924L28.7701 29.5491L44.9092 18.5977Z"
              fill="white"
            />
          </svg>
        </div>
        <div className="hidden lg:flex flex-col leading-none">
          <span
            className="text-2xl font-semibold tracking-[-1.154px] text-white leading-[94.051%]"
            style={{ fontFamily: '"Hanken Grotesk", sans-serif' }}
          >
            IEDC
          </span>
          <span
            className="text-[11px] font-semibold tracking-[-0.353px] text-white leading-[94.051%]"
            style={{ fontFamily: '"Hanken Grotesk", sans-serif' }}
          >
            PORTAL
          </span>
        </div>
      </div>

      {/* Main Menu Header */}
      <div className="hidden lg:block px-6 pt-5 pb-2">
        <span
          className="text-white text-[15px] font-normal tracking-[-0.45px]"
          style={{ fontFamily: '"Hanken Grotesk", sans-serif' }}
        >
          Main Menu
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-2 px-2 lg:px-6 space-y-2.5 overflow-y-auto">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const iconConfig = DEFAULT_ICONS[item.label] || { bg: "bg-[#EB594C]", icon: "/illustrations/file.webp" };

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3.5 px-3.5 h-[49px] rounded-[30px] transition-all duration-200",
                isActive
                  ? "bg-white/10 text-white font-semibold shadow-md"
                  : "bg-black border border-[#2B2B2B] text-white/80 hover:text-white hover:border-white/30"
              )}
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm",
                  iconConfig.bg
                )}
              >
                <Image
                  src={iconConfig.icon}
                  alt={item.label}
                  width={14}
                  height={14}
                  className="object-contain"
                />
              </div>
              <span
                className="hidden lg:block text-base font-medium tracking-[-0.4px]"
                style={{ fontFamily: '"Hanken Grotesk", sans-serif' }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Profile section */}
      <div className="px-2 lg:px-6 pb-6 pt-4 border-t border-[#2B2B2B] space-y-3">
        {session?.user && (
          <Link
            href={profileHref}
            className={cn(
              "hidden lg:flex items-center gap-3.5 h-[54px] px-[16px] rounded-[30px] transition-all duration-300 transform active:scale-95 cursor-pointer group",
              pathname.includes("/profile")
                ? "bg-white/10 text-white font-semibold shadow-md border border-white/20"
                : "bg-black border border-[#2B2B2B] text-white/80 hover:text-white hover:border-white/30"
            )}
          >
            <div className="w-8 h-8 rounded-full bg-[#F59E0B] flex items-center justify-center shrink-0 overflow-hidden text-white font-bold text-xs shadow-sm group-hover:scale-105 transition-transform">
              {session.user.image ? (
                <img src={session.user.image} alt={name} className="w-full h-full object-cover" />
              ) : (
                <span>
                  {name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <p className="text-sm font-semibold truncate text-white leading-tight group-hover:text-[#F59E0B] transition-colors">{name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {roleDisplay && (
                  <span className="text-[9px] font-bold text-[#EB594C] bg-[#EB594C]/15 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                    {roleDisplay}
                  </span>
                )}
                {points !== null && (
                  <span className="text-[10px] font-semibold text-emerald-400">
                    {points} pts
                  </span>
                )}
              </div>
            </div>
          </Link>
        )}

        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-4 h-[44px] rounded-[30px] text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 border border-transparent hover:border-[#2B2B2B] transition-all duration-200 w-full cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span className="hidden lg:block">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

// Pre-built nav configs for each role
export const studentNavItems: NavItem[] = [
  { label: "Dashboard", href: "/student/dashboard", icon: <LayoutDashboard /> },
  { label: "Events", href: "/student/events", icon: <Calendar /> },
  { label: "Leaderboard", href: "/student/leaderboard", icon: <Trophy /> },
  { label: "Certificates", href: "/student/certificates", icon: <Award /> },
  { label: "Badges", href: "/student/badges", icon: <Shield /> },
  { label: "Projects", href: "/student/projects", icon: <FolderOpen /> },
];

export const execomNavItems: NavItem[] = [
  { label: "Analytics", href: "/execom/analytics", icon: <BarChart3 /> },
  { label: "Users", href: "/execom/users", icon: <Users /> },
  { label: "Events", href: "/execom/events", icon: <Calendar /> },
  { label: "Projects", href: "/execom/projects", icon: <FolderOpen /> },
  { label: "Settings", href: "/execom/settings", icon: <Settings /> },
];

export const nodalNavItems: NavItem[] = [
  { label: "Analytics", href: "/nodal/analytics", icon: <BarChart3 /> },
  { label: "Users", href: "/nodal/users", icon: <Users /> },
  { label: "Events", href: "/nodal/events", icon: <Calendar /> },
  { label: "Projects", href: "/nodal/projects", icon: <FolderOpen /> },
  { label: "Settings", href: "/nodal/settings", icon: <Settings /> },
];

export const facultyNavItems: NavItem[] = [
  { label: "Reports", href: "/faculty/reports", icon: <BarChart3 /> },
  { label: "Events", href: "/faculty/events", icon: <Calendar /> },
  { label: "Projects", href: "/faculty/projects", icon: <FolderOpen /> },
];