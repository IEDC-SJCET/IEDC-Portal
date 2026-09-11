"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowUpRight } from "lucide-react";

export function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    {
      label: "Home",
      href: "/",
      iconBg: "bg-[#E52600]",
      icon: "/illustrations/Home.svg",
    },
    {
      label: "Events",
      href: "/student/events",
      iconBg: "bg-[#1D60C8]",
      icon: "/illustrations/file.webp",
    },
    {
      label: "Leaderboard",
      href: "/student/leaderboard",
      iconBg: "bg-[#CE322D]",
      icon: "/illustrations/Hash.svg",
    },
    {
      label: "Certificates",
      href: "/student/certificates",
      iconBg: "bg-[#20A300]",
      icon: "/illustrations/file.webp",
    },
    {
      label: "Badges",
      href: "/student/badges",
      iconBg: "bg-[#EAA100]",
      icon: "/illustrations/Trello.svg",
    },
    {
      label: "Projects",
      href: "/student/projects",
      iconBg: "bg-[#10B981]",
      icon: "/illustrations/file.webp",
    },
    {
      label: "Profile",
      href: "/student/profile",
      iconBg: "bg-[#F59E0B]",
      icon: "/illustrations/User.svg",
    },
  ];

  return (
    <>
      {/* DESKTOP / MAIN HEADER */}
      <header
        className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-5 sm:py-6 flex items-center justify-between gap-4 font-sans"
        style={{ fontFamily: '"Hanken Grotesk", sans-serif' }}
      >
        <Link href="/" className="flex items-center gap-3.5 group focus:outline-none">
          <div className="w-10 h-10 sm:w-[50px] sm:h-[50px] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
            <svg
              width="62"
              height="62"
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
              className="text-2xl sm:text-[38.483px] font-semibold tracking-[-1.154px] text-[#000000] leading-[94.051%]"
              style={{ fontFamily: '"Hanken Grotesk", sans-serif' }}
            >
              IEDC
            </span>
            <span
              className="text-[10px] sm:text-[11.759px] font-semibold tracking-[-0.353px] text-[#000000] leading-[94.051%]"
              style={{ fontFamily: '"Hanken Grotesk", sans-serif' }}
            >
              PORTAL
            </span>
          </div>
        </Link>

        {/* Desktop Nav Items */}
        <nav className="hidden lg:flex items-center gap-6 sm:gap-8 px-6 py-2.5 rounded-full border border-[#2B2B2B]/15 bg-white/70 backdrop-blur-md shadow-sm">
          <Link
            href="/"
            className="text-sm font-semibold text-[#000000] hover:text-[#E60B09] transition-colors"
          >
            Home
          </Link>
          <Link
            href="/student/events"
            className="text-sm font-semibold text-[#000000] hover:text-[#E60B09] transition-colors"
          >
            Events
          </Link>
          <Link
            href="/student/leaderboard"
            className="text-sm font-semibold text-[#000000] hover:text-[#E60B09] transition-colors"
          >
            Leaderboard
          </Link>
          <Link
            href="/student/certificates"
            className="text-sm font-semibold text-[#000000] hover:text-[#E60B09] transition-colors"
          >
            Certificates
          </Link>
          <Link
            href="/student/badges"
            className="text-sm font-semibold text-[#000000] hover:text-[#E60B09] transition-colors"
          >
            Badges
          </Link>
          <Link
            href="/student/projects"
            className="text-sm font-semibold text-[#000000] hover:text-[#E60B09] transition-colors"
          >
            Projects
          </Link>
        </nav>

        {/* Action Button + Mobile Hamburger Button */}
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="hidden sm:block">
            <button
              className="inline-flex items-center justify-center whitespace-nowrap h-10 sm:h-11 px-5 sm:px-7 rounded-full text-white font-semibold text-xs sm:text-sm tracking-[-0.5px] shadow-md hover:scale-105 active:scale-95 transition-all duration-200 border-none cursor-pointer"
              style={{
                background:
                  "radial-gradient(133.5% 127.27% at 48.91% 127.27%, rgba(89, 7, 8, 0.23) 0%, rgba(102, 102, 102, 0.00) 100%), #EB594C",
                fontFamily: '"Hanken Grotesk", sans-serif',
              }}
            >
              Join the Network
            </button>
          </Link>

          <button
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open Mobile Menu"
            className="lg:hidden p-2.5 rounded-full bg-[#130D0D] text-white hover:bg-[#2B2B2B] transition-colors shadow-md flex items-center justify-center"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-start font-sans">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div
            className="relative w-[305px] max-w-[85vw] h-full bg-[#0F0A0A] text-white shadow-2xl z-10 flex flex-col justify-between p-6 overflow-y-auto border-r border-[#2B2B2B]"
            style={{
              background: "linear-gradient(182deg, #0F0A0A 0%, #000000 100%)",
              fontFamily: '"Hanken Grotesk", sans-serif',
            }}
          >
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
                  onClick={() => setMobileMenuOpen(false)}
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

              <nav className="space-y-2.5">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3.5 h-[49px] px-[18px] rounded-[30px] transition-all duration-200 ${isActive
                        ? "bg-white/10 text-white font-semibold"
                        : "bg-black border border-[#2B2B2B] text-white/80 hover:text-white hover:border-white/30"
                        }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full ${item.iconBg} flex items-center justify-center flex-shrink-0 shadow-sm`}
                      >
                        <Image
                          src={item.icon}
                          alt={item.label}
                          width={14}
                          height={14}
                          className="object-contain"
                        />
                      </div>

                      <span
                        className="text-base font-medium tracking-[-0.4px]"
                        style={{ fontFamily: '"Hanken Grotesk", sans-serif' }}
                      >
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-6 pb-2">
              <Link
                href="/student/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="block p-4 rounded-[24px] border border-[#EB594C]/30 bg-gradient-to-b from-[#590708]/50 to-[#140A0A] hover:border-[#EB594C]/60 transition-all group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#EB594C] flex items-center justify-center text-white font-bold text-sm shadow-md">
                      S
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-white group-hover:text-[#EB594C] transition-colors">
                        Student Profile
                      </span>
                      <span className="text-xs text-white/60">
                        View ID &amp; Points
                      </span>
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}