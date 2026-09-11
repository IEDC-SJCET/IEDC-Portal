"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Menu, X, LogOut, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useSession, signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { fetchProfilePoints } from "@/lib/profile-cache";
import { getRoleBadgeText, isExecomRole, isNodalOfficer } from "@/lib/roles";

interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

interface HeaderProps {
  items?: NavItem[];
  role?: string;
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

function HeaderContent({ items = [], role = "user" }: HeaderProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [modalQrUrl, setModalQrUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
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

  const isProfilePage = pathname.includes("/profile");
  const isOnboardingPage = pathname.endsWith("/onboarding");
  const isExcludedPage = isProfilePage || isOnboardingPage;
  const isDashboardPage = pathname === "/student/dashboard";
  // The header search drives the ?q= filter, which only the events listings use
  const isEventsPage = pathname.endsWith("/events");

  useEffect(() => {
    if (session?.user && (userRole === "student" || isStaff)) {
      fetchProfilePoints().then((pts) => {
        if (pts !== null) setPoints(pts);
      });
      fetch("/api/student/qr")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.qrDataUrl) setModalQrUrl(data.qrDataUrl);
        })
        .catch(() => { });
    }
  }, [session, userRole, isStaff]);

  const initials = name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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

  const handleOpenQRModal = async () => {
    setIsQRModalOpen(true);
    if (!modalQrUrl) {
      setQrLoading(true);
      try {
        const res = await fetch("/api/student/qr");
        if (res.ok) {
          const data = await res.json();
          if (data?.qrDataUrl) {
            setModalQrUrl(data.qrDataUrl);
          }
        }
      } catch (err) {
        console.error("Failed to load QR code", err);
      } finally {
        setQrLoading(false);
      }
    }
  };

  const currentSearch = searchParams.get("q") || "";

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(window.location.search);
    if (val) {
      params.set("q", val);
    } else {
      params.delete("q");
    }
    const newQuery = params.toString();
    router.replace(newQuery ? `${pathname}?${newQuery}` : pathname);
  };

  return (
    <>
      {!isExcludedPage && (
        <div className="w-full font-['Hanken_Grotesk'] text-[#1A0D0C] pt-2 pb-4">
          <div className="flex items-center justify-between gap-3 md:gap-4 max-w-[1014px]">
            <button
              onClick={() => setIsOpen(true)}
              className="md:hidden p-3 rounded-full bg-[#100A0A] text-white hover:bg-[#2A2020] transition-colors shrink-0 shadow-sm"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Desktop Search Bar */}
            {isEventsPage && (
              <div className="hidden md:flex items-center flex-1 max-w-[640px] h-[63px] px-8 bg-white rounded-[31px] border border-gray-100 shadow-sm transition-all focus-within:shadow-md">
                <Search className="w-5 h-5 text-[#00000069] mr-3 shrink-0" />
                <input
                  type="text"
                  placeholder="Search here...."
                  value={currentSearch}
                  onChange={handleSearchChange}
                  className="w-full bg-transparent outline-none border-none text-[20px] font-['Hanken_Grotesk'] font-normal text-[#1A0D0C] placeholder:text-[#00000069] tracking-[-0.6px]"
                />
              </div>
            )}

            {/* Expanded Mobile Search Input */}
            {isEventsPage && (isMobileSearchOpen || currentSearch) && (
              <div className="flex md:hidden items-center flex-1 h-[56px] px-4 bg-white rounded-[28px] border border-gray-100 shadow-sm transition-all animate-in fade-in duration-200">
                <Search className="w-5 h-5 text-[#00000069] mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Search here...."
                  value={currentSearch}
                  onChange={handleSearchChange}
                  autoFocus
                  className="w-full bg-transparent outline-none border-none text-[16px] font-['Hanken_Grotesk'] font-normal text-[#1A0D0C] placeholder:text-[#00000069] tracking-[-0.6px]"
                />
                <button
                  onClick={() => {
                    setIsMobileSearchOpen(false);
                    if (currentSearch) {
                      const params = new URLSearchParams(window.location.search);
                      params.delete("q");
                      const newQuery = params.toString();
                      router.replace(newQuery ? `${pathname}?${newQuery}` : pathname);
                    }
                  }}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-600 shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
              {isEventsPage && !isMobileSearchOpen && !currentSearch && (
                <button
                  onClick={() => setIsMobileSearchOpen(true)}
                  className="flex md:hidden w-[56px] h-[56px] rounded-full bg-white items-center justify-center border border-gray-100 shadow-sm hover:bg-gray-50 transition-colors cursor-pointer shrink-0"
                  aria-label="Search"
                >
                  <Search className="w-6 h-6 text-[#100A0A]" />
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleOpenQRModal();
                }}
                className="flex items-center justify-center w-[130px] sm:w-[169px] h-[56px] px-3 sm:px-4 gap-2.5 rounded-[31px] bg-[#100A0A] text-white text-[15px] sm:text-[20px] font-normal tracking-[-0.6px] shadow-sm hover:bg-[#2A2020] active:scale-98 transition-all cursor-pointer shrink-0 z-10"
              >
                <span>View My QR</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Dialog Modal */}
      <Dialog open={isQRModalOpen} onOpenChange={setIsQRModalOpen}>
        <DialogContent showCloseButton={false} className="sm:max-w-md bg-[#0C0908] border border-[#e8594c]/30 rounded-[36px] p-7 shadow-[0px_25px_70px_-15px_rgba(0,0,0,0.9)] flex flex-col items-center justify-center text-center font-['Hanken_Grotesk'] text-white overflow-hidden relative">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />

          <button
            onClick={() => setIsQRModalOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-all z-20"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="z-10 flex flex-col items-center">
            <span className="px-3.5 py-1 rounded-full bg-gradient-to-b from-[#FF0000] to-[#990000] text-white text-[10px] font-bold tracking-widest uppercase shadow-md mb-3">
              IEDC SJCET • ATTENDANCE
            </span>
            <DialogTitle className="text-2xl font-bold text-white tracking-tight mb-1">
              Official Attendance QR
            </DialogTitle>
            <DialogDescription className="text-xs text-white/70 mb-5 leading-relaxed max-w-[280px]">
              Show this QR code at event check-in to log your attendance at IEDC events.
            </DialogDescription>

            <div className="p-3 bg-white rounded-[24px] shadow-2xl border border-white/20 my-1">
              {qrLoading ? (
                <div className="w-56 h-56 flex flex-col items-center justify-center bg-gray-50 rounded-xl gap-2">
                  <div className="w-8 h-8 border-4 border-[#FF0000] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-gray-500 font-medium">Generating QR...</span>
                </div>
              ) : modalQrUrl ? (
                <img
                  src={modalQrUrl}
                  alt="Student QR Code"
                  className="w-56 h-56 md:w-64 md:h-64 rounded-xl object-contain"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center bg-gray-50 rounded-xl text-gray-400 text-xs">
                  Failed to load QR code
                </div>
              )}
            </div>

            <p className="text-[11px] text-white/50 mt-4 leading-relaxed max-w-[260px]">
              Scan at event check-in to record your participation and claim points.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Side Panel Drawer for Mobile */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-[305px] max-w-[85vw] h-full bg-[#0F0A0A] text-white shadow-2xl p-6 border-r border-[#2B2B2B] flex flex-col justify-between overflow-y-auto font-['Hanken_Grotesk']"
          style={{
            background: "linear-gradient(182deg, #0F0A0A 0%, #000000 100%)",
          }}
        >
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <SheetDescription className="sr-only">Mobile navigation sidebar menu</SheetDescription>

          <div className="space-y-6">
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
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
                <div className="flex flex-col leading-none">
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

              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="pt-2">
              <span
                className="text-white text-[15px] font-normal tracking-[-0.45px]"
                style={{ fontFamily: '"Hanken Grotesk", sans-serif' }}
              >
                Main Menu
              </span>
            </div>

            {items.length > 0 && (
              <nav className="space-y-2.5">
                {items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  const iconConfig = DEFAULT_ICONS[item.label] || { bg: "bg-[#EB594C]", icon: "/illustrations/file.webp" };

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center gap-3.5 h-[49px] px-[18px] rounded-[30px] transition-all duration-300 transform active:scale-95",
                        isActive
                          ? "bg-white/10 text-white font-semibold shadow-md border border-white/20"
                          : "bg-black border border-[#2B2B2B] text-white/80 hover:text-white hover:border-white/30"
                      )}
                    >
                      <div className={cn("w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm", iconConfig.bg)}>
                        <Image
                          src={iconConfig.icon}
                          alt={item.label}
                          width={14}
                          height={14}
                          className="object-contain"
                        />
                      </div>
                      <span className="text-base font-medium tracking-[-0.4px]" style={{ fontFamily: '"Hanken Grotesk", sans-serif' }}>
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          <div className="pt-6 pb-2 border-t border-[#2B2B2B] space-y-3">
            {session?.user && (
              <Link
                href={profileHref}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3.5 h-[54px] px-[16px] rounded-[30px] transition-all duration-300 transform active:scale-95 cursor-pointer",
                  pathname.includes("/profile")
                    ? "bg-white/10 text-white font-semibold shadow-md border border-white/20"
                    : "bg-black border border-[#2B2B2B] text-white/80 hover:text-white hover:border-white/30"
                )}
              >
                <div className="w-8 h-8 rounded-full bg-[#F59E0B] flex items-center justify-center shrink-0 overflow-hidden text-white font-bold text-xs shadow-sm">
                  {session.user.image ? (
                    <img src={session.user.image} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                  <p className="text-sm font-semibold truncate text-white leading-tight">{name}</p>
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
              onClick={() => {
                setIsOpen(false);
                handleSignOut();
              }}
              className="flex items-center gap-3 px-4 h-[44px] rounded-[30px] text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 border border-transparent hover:border-[#2B2B2B] transition-all duration-200 w-full cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function Header(props: HeaderProps) {
  return (
    <Suspense fallback={null}>
      <HeaderContent {...props} />
    </Suspense>
  );
}