/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { isExecomBootcampEmail } from "@/lib/roles";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  CheckCircle2,
  User,
  Mail,
  GraduationCap,
  Calendar,
  Hash,
  Phone,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

const DEPARTMENTS = [
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

function parseStudentEmail(email: string) {
  const parts = email.split("@");
  if (parts.length !== 2) return null;
  const username = parts[0];
  const domain = parts[1];

  const domainParts = domain.split(".");
  // For student email: name2027@dept.sjcetpalai.ac.in
  if (domainParts.length < 4 || domainParts[1] !== "sjcetpalai") return null;

  const deptCode = domainParts[0].toLowerCase();

  // Extract graduating year
  const match = username.match(/(\d+)$/);
  if (!match) return { deptCode, gradYear: null, batch: "" };
  const gradYear = parseInt(match[1]);
  if (isNaN(gradYear)) return { deptCode, gradYear: null, batch: "" };

  // Calculate batch based on dept
  const duration = ["mca", "mba"].includes(deptCode) ? 2 : 4;
  const startYear = gradYear - duration;
  const batch = `${startYear}-${gradYear}`;

  return {
    deptCode,
    gradYear,
    batch,
  };
}

export default function StudentOnboardingPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [batch, setBatch] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [phone, setPhone] = useState("");

  const email = session?.user?.email || "";
  // Execom role mailboxes (e.g. ctobootcamp@sjcetpalai.ac.in) skip the batch and
  // admission number questions — the server fills those in for them.
  const isExecomAccount = isExecomBootcampEmail(email);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isPending && session) {
      setName(session.user?.name || "");
      const parsed = parseStudentEmail(session.user?.email || "");
      if (parsed) {
        const matchedDept = DEPARTMENTS.find(d => d.value.toLowerCase() === parsed.deptCode?.toLowerCase());
        if (matchedDept) {
          setDepartment(matchedDept.value);
        }
        if (parsed.batch) {
          setBatch(parsed.batch);
        }
      }
    }
  }, [session, isPending]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/student/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isExecomAccount
            ? { name, phone }
            : { name, admissionNumber, department, batch, phone }
        ),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/student/dashboard");
          router.refresh();
        }, 1200);
      } else {
        setError(data.error || "Failed to complete onboarding");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isPending) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center font-['Hanken_Grotesk'] text-[#1A0D0C]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-[#E60B09]" />
          <p className="text-sm font-medium text-[#7A7A7A]">Loading student profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[85vh] font-['Hanken_Grotesk'] text-[#1A0D0C] flex flex-col items-center justify-center p-2 sm:p-4 md:p-6 pb-16">
      <div className="w-full max-w-2xl bg-white rounded-[32px] sm:rounded-[38px] border border-gray-100/90 shadow-xl p-6 sm:p-10 md:p-12 relative overflow-hidden space-y-8">

        {/* Decorative Top Banner Pill */}
        <div className="absolute top-0 right-0 rounded-bl-[28px] bg-linear-to-b from-[#FF0000] to-[#990000] text-white px-5 py-2 text-[12px] font-semibold tracking-[-0.36px] shadow-sm z-10 hidden sm:flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>STUDENT REGISTRATION</span>
        </div>

        {/* Header Section */}
        <div className="text-center space-y-3 pt-2">
          <div className="w-14 h-14 rounded-2xl bg-[#0F0A0A] flex items-center justify-center mx-auto shadow-md border border-[#2B2B2B]">
            <svg
              width="36"
              height="36"
              viewBox="0 0 62 62"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-9 h-9 object-contain"
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

          <h1 className="text-[28px] sm:text-[34px] font-bold tracking-[-1px] text-[#1A0D0C]">
            Welcome to SJCET IEDC! 👋
          </h1>
          <p className="text-[14px] sm:text-[15px] font-medium text-[#7A7A7A] max-w-lg mx-auto leading-relaxed">
            Set up your student profile to access event points, certificates, and your digital IEDC ID card.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[11px] font-bold uppercase tracking-wider text-[#7A7A7A] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#E60B09]" />
                Full Name
              </Label>
              <div className="relative">
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your official full name"
                  className="rounded-2xl h-12 bg-slate-50/70 border-gray-200 focus:bg-white text-sm font-medium transition-all"
                  required
                />
              </div>
            </div>

            {/* Email Address (read only) */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[11px] font-bold uppercase tracking-wider text-[#7A7A7A] flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#E60B09]" />
                College Email
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  value={session?.user?.email || ""}
                  className="rounded-2xl h-12 bg-gray-100/70 text-gray-500 border-gray-200 cursor-not-allowed text-sm font-medium"
                  disabled
                />
              </div>
            </div>

            {/* Department */}
            {!isExecomAccount && (
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-[#7A7A7A] flex items-center gap-1.5 font-['Hanken_Grotesk']">
                <GraduationCap className="w-3.5 h-3.5 text-[#E60B09]" />
                Department
              </Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="w-full h-12 rounded-2xl bg-slate-50/80 hover:bg-slate-100/70 border border-gray-200 focus:border-[#E60B09] focus:ring-2 focus:ring-[#E60B09]/20 focus:bg-white text-sm font-semibold text-[#1A0D0C] font-['Hanken_Grotesk'] tracking-[-0.2px] transition-all px-4 shadow-xs cursor-pointer">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  sideOffset={6}
                  className="rounded-2xl bg-white text-slate-900 border border-gray-200 shadow-2xl p-2 font-['Hanken_Grotesk'] z-[1100] max-h-72 overflow-y-auto w-[var(--radix-select-trigger-width)] animate-in fade-in-0 zoom-in-95"
                >
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem
                      key={dept.value}
                      value={dept.value}
                      className="rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-red-50 hover:text-[#E60B09] focus:bg-red-500 focus:text-white transition-all outline-none cursor-pointer my-0.5 data-[state=checked]:bg-[#E60B09] data-[state=checked]:text-white font-['Hanken_Grotesk']"
                    >
                      {dept.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            )}

            {/* Batch */}
            {!isExecomAccount && (
            <div className="space-y-2">
              <Label htmlFor="batch" className="text-[11px] font-bold uppercase tracking-wider text-[#7A7A7A] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#E60B09]" />
                Batch Period
              </Label>
              <Input
                id="batch"
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                className="rounded-2xl h-12 bg-slate-50/70 border-gray-200 focus:bg-white text-sm font-medium transition-all"
                placeholder="e.g. 2023-2027"
                required
              />
            </div>
            )}

            {/* Admission Number */}
            {!isExecomAccount && (
            <div className="space-y-2">
              <Label htmlFor="admissionNumber" className="text-[11px] font-bold uppercase tracking-wider text-[#7A7A7A] flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-[#E60B09]" />
                Admission Number
              </Label>
              <Input
                id="admissionNumber"
                value={admissionNumber}
                onChange={(e) => setAdmissionNumber(e.target.value)}
                className="rounded-2xl h-12 bg-slate-50/70 border-gray-200 focus:bg-white text-sm font-medium transition-all"
                placeholder="e.g. 23CS101"
                required
              />
            </div>
            )}

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-[11px] font-bold uppercase tracking-wider text-[#7A7A7A] flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#E60B09]" />
                Phone Number
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="rounded-2xl h-12 bg-slate-50/70 border-gray-200 focus:bg-white text-sm font-medium transition-all"
                placeholder="10-digit mobile number"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={10}
                required
              />
            </div>

          </div>

          {error && (
            <div className="bg-red-50/90 text-red-700 text-xs font-semibold rounded-2xl p-4 border border-red-100 flex items-center gap-2.5 shadow-sm">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50/90 text-emerald-800 text-xs font-semibold rounded-2xl p-4 border border-emerald-100 flex items-center gap-2.5 shadow-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Onboarding completed! Redirecting to student dashboard...</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || success || (!isExecomAccount && !department)}
            className="w-full h-13 rounded-full bg-[#0F0A0A] hover:bg-[#1E1614] text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-between px-6 group active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed mt-4"
          >
            {submitting ? (
              <span className="flex items-center gap-2 mx-auto">
                <Loader2 className="w-5 h-5 animate-spin text-white" />
                <span>Completing Profile...</span>
              </span>
            ) : (
              <>
                <span>Complete Registration</span>
                <span className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shrink-0 group-hover:translate-x-0.5 transition-transform">
                  <ArrowRight className="w-4 h-4 text-black" />
                </span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}