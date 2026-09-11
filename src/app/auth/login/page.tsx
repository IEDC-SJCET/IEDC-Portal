"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { signIn } from "@/lib/auth-client";
import { ArrowUpRight, Loader2 } from "lucide-react";

function NavbarLogo() {
  return (
    <div className="flex flex-col items-start leading-none" style={{ fontFamily: '"Hanken Grotesk", sans-serif' }}>
      <span className="text-[26px] font-bold tracking-[0.18em] text-white sm:text-[30px] lg:text-[34px]">
        IEDC
      </span>
      <span className="mt-1 text-[10px] font-semibold tracking-[0.28em] text-white/80 sm:text-[11px] lg:text-[12px]">
        PORTAL
      </span>
    </div>
  );
}

function DottedRule() {
  return (
    <div aria-hidden className="w-full shrink-0 px-5 sm:px-10 lg:px-14">
      <div
        className="h-px w-full"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to right, #4A4A4A 0, #4A4A4A 18px, transparent 18px, transparent 28px)",
        }}
      />
    </div>
  );
}

function CircleArrow({ iconColor }: { iconColor: string }) {
  return (
    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/95 shadow-[0_8px_18px_rgba(0,0,0,0.2)]">
      <ArrowUpRight size={14} color={iconColor} strokeWidth={2.5} />
    </span>
  );
}

function GoogleGlyph() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#000000"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#000000"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#000000"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#000000"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");
  const [error, setError] = useState(searchParams.get("error") || "");
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      await signIn.social({
        provider: "google",
        callbackURL: redirectTo || "/student/dashboard",
      });
    } catch (err) {
      setError((err as Error).message || "Failed to sign in with Google");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="w-full max-w-90" style={{ fontFamily: '"Hanken Grotesk", sans-serif' }}>
      {error && (
        <div className="mb-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-[28px] border border-white/10 bg-white/6 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-[22px] sm:p-6">
        <div className="mb-3 text-sm text-[#BABABA]">
          Continue with your college Google account.
        </div>

        <button
          type="button"
          disabled={googleLoading}
          onClick={handleGoogleSignIn}
          className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#F7E5E3] text-[18px] font-semibold text-[#202020] transition-colors duration-200 ease-in-out hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
          style={{ fontFamily: '"Hanken Grotesk", sans-serif' }}
        >
          {googleLoading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              Login with Google
              <GoogleGlyph />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div
      className="font-sans relative min-h-dvh overflow-hidden bg-[#161616] text-white"
      style={{ fontFamily: '"Hanken Grotesk", sans-serif' }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#161616]" />
      </div>

      <div aria-hidden className="pointer-events-none absolute -top-190 z-10 h-450 w-200 overflow-visible rotate-5 opacity-80 sm:hidden"
        style={{
          mixBlendMode: "screen",
          filter: "blur(20px)",
        }}
      >
        <Image
          src="/login/glow.svg"
          alt="glow"
          fill
          sizes="200px"
          priority
          className="object-contain scale-150"
        />
      </div>

      <div aria-hidden className="pointer-events-none absolute -top-52 -right-30 z-10 hidden h-300 w-225 overflow-visible rotate-15 opacity-80 sm:block"
        style={{
          mixBlendMode: "screen",
          filter: "blur(20px)",
        }}
      >
        <Image
          src="/login/glow.svg"
          alt="glow"
          fill
          sizes="225px"
          priority
          className="object-contain scale-150"
        />
      </div>

      <div className="pointer-events-none absolute right-1 z-0 h-50 w-50 sm:hidden rotate-15 opacity-60">
        <Image
          src="/login/telegram.webp"
          alt="telegram"
          fill
          sizes="200px"
          priority
          className="object-contain rotate-[-15deg]"
        />
      </div>

      <div className="pointer-events-none absolute right-[10%] top-[10%] z-0 hidden w-65 items-center justify-center opacity-100 sm:flex sm:w-75 md:w-85 lg:w-95">
        <Image
          src="/login/telegram.webp"
          alt="telegram"
          width={320}
          height={320}
          priority
          className="h-auto w-full rotate-[-5deg]"
        />
      </div>

      <div className="relative z-20 grid min-h-dvh grid-rows-[auto_auto_1fr_auto_auto]">
        <header className="flex shrink-0 items-center px-5 py-4 sm:px-10 sm:py-5 lg:px-14">
          <NavbarLogo />
        </header>

        <div>
          <DottedRule />
        </div>

        <main className="flex items-center px-5 py-8 sm:px-10 lg:px-14 lg:py-10 xl:px-[11%]">
          <Suspense
            fallback={
              <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-white/40" />
              </div>
            }
          >
            <div className="flex w-full flex-col items-start gap-6 lg:max-w-180 lg:items-start lg:translate-x-20 xl:translate-x-25">
              <div className="max-w-125">
                <h1 className="mt-4 text-[clamp(2rem,4vw,3.3rem)] leading-[0.95]  tracking-[-0.04em] text-white">
                  Welcome Back
                </h1>
                <p className="mt-3 max-w-107.5 text-[clamp(0.9rem,1.3vw,1rem)] leading-7 text-[#878787]">
                  launching a startup, the IEDC Portal keeps your entire innovation journey in one place.
                </p>
              </div>

              <div className="flex w-full justify-start">
                <LoginForm />
              </div>
            </div>
          </Suspense>
        </main>

        <div>
          <DottedRule />
        </div>

        <footer className="shrink-0 py-3.5 text-center text-[12px] font-normal text-[#7A7A7A] sm:py-4 sm:text-[13px]">
          IEDC 2026 SJCET - TECH TEAM
        </footer>
      </div>
    </div>
  );
}