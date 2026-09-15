"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  Users,
  TrendingUp,
  Award,
  FolderGit2,
  FileCheck,
  ChevronRight,
  Sparkles,
  BarChart3,
  X,
  CheckCircle2,
  Clock,
  Building2,
  ArrowUpRight,
  RefreshCw,
  Search,
  Code2,
  Globe,
  Tag,
  Phone,
  BookOpen,
  Download,
  FileText,
  ChevronLeft,
  UserCheck,
} from "lucide-react";
import { generateAttendanceDocx } from "@/lib/docx-export";
import { buildAttendanceFileName, excludeNonStudents } from "@/lib/attendance-report";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface DepartmentData {
  department: string;
  count: number;
}

interface StudentDetail {
  id: string;
  name: string;
  department: string;
  admissionNumber: string;
  batch: string;
  iecdId: string;
  totalPoints: number | null;
  phone?: string | null;
}

interface ProjectDetail {
  id: string;
  title: string;
  description?: string | null;
  githubUrl?: string | null;
  demoUrl?: string | null;
  tags?: string[] | null;
  status: string | null;
  submittedAt?: string | null;
  studentName?: string | null;
  department?: string | null;
}

interface CertificateDetail {
  id: string;
  certificateNumber: string;
  issuedAt?: string | null;
  studentName?: string | null;
  department?: string | null;
  eventTitle?: string | null;
}

interface EventPerformance {
  id: string;
  title: string;
  eventType: string;
  startDatetime: string;
  status: string;
  venue?: string | null;
  participationPoints?: number | null;
  registrationsCount: number;
  attendanceCount: number;
  turnoutRate: number;
}

interface AnalyticsData {
  totalStudents: number;
  totalEvents: number;
  publishedEvents: number;
  completedEvents: number;
  totalRegistrations: number;
  totalAttendance: number;
  turnoutRate: number;
  totalProjects: number;
  totalCertificates: number;
  departmentBreakdown: DepartmentData[];
  students: StudentDetail[];
  projects: ProjectDetail[];
  certificates: CertificateDetail[];
  eventsPerformance: EventPerformance[];
}

export default function ExecomAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventPerformance | null>(null);

  // Modal filter states
  const [deptFilter, setDeptFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [projectStatusFilter, setProjectStatusFilter] = useState("all");

  // Registrations per-event state & docx export
  const [selectedRegEvent, setSelectedRegEvent] = useState<EventPerformance | null>(null);
  const [regEventData, setRegEventData] = useState<{
    registrations: Array<{
      id: string;
      role: string;
      registeredAt: string;
      attended: boolean;
      student: {
        id: string;
        name: string;
        admissionNumber: string;
        department: string;
        batch: string;
        iecdId: string;
        phone?: string | null;
        userRole?: string | null;
      };
    }>;
  } | null>(null);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [regSearchQuery, setRegSearchQuery] = useState("");

  const fetchEventRegistrations = async (eventId: string) => {
    setLoadingRegs(true);
    setRegEventData(null);
    try {
      const res = await fetch(`/api/events/${eventId}/registrations`);
      if (res.ok) {
        const json = await res.json();
        setRegEventData(json);
      }
    } catch (err) {
      console.error("Failed to fetch event registrations:", err);
    } finally {
      setLoadingRegs(false);
    }
  };

  const handleSelectRegEvent = (ev: EventPerformance) => {
    setSelectedRegEvent(ev);
    setRegSearchQuery("");
    fetchEventRegistrations(ev.id);
  };

  const handleDownloadDocx = async () => {
    if (!selectedRegEvent || !regEventData) return;
    setDownloadingDocx(true);
    try {
      const blob = await generateAttendanceDocx(
        {
          title: selectedRegEvent.title,
          startDatetime: selectedRegEvent.startDatetime,
        },
        // Shared Execom role mailboxes and faculty are not students; Execom students stay.
        excludeNonStudents(
          regEventData.registrations.map((r) => ({
            student: {
              name: r.student?.name || "",
              department: r.student?.department || "",
              batch: r.student?.batch || "",
              userRole: r.student?.userRole,
            },
          }))
        )
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = buildAttendanceFileName(selectedRegEvent.title, "docx");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("DOCX Export Error:", err);
    } finally {
      setDownloadingDocx(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/analytics/overview");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const openModal = (type: string) => {
    setActiveModal(type);
    setDeptFilter("all");
    setSearchQuery("");
    setProjectStatusFilter("all");
    if (type !== "registrations") {
      setSelectedRegEvent(null);
      setRegEventData(null);
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedEvent(null);
    setSelectedRegEvent(null);
    setRegEventData(null);
    setSearchQuery("");
  };

  const totalDeptsCount =
    data?.departmentBreakdown.reduce((sum, d) => sum + d.count, 0) || 1;

  // Filter students for department modal
  const filteredStudents = (data?.students || []).filter((st) => {
    const matchesDept =
      deptFilter === "all" ||
      st.department.toLowerCase() === deptFilter.toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      st.name.toLowerCase().includes(q) ||
      st.admissionNumber.toLowerCase().includes(q) ||
      st.iecdId.toLowerCase().includes(q) ||
      st.department.toLowerCase().includes(q);
    return matchesDept && matchesQuery;
  });

  // Filter projects for projects modal
  const filteredProjects = (data?.projects || []).filter((proj) => {
    const matchesStatus =
      projectStatusFilter === "all" ||
      (proj.status || "pending").toLowerCase() === projectStatusFilter.toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      proj.title.toLowerCase().includes(q) ||
      (proj.description || "").toLowerCase().includes(q) ||
      (proj.studentName || "").toLowerCase().includes(q) ||
      (proj.tags || []).some((t) => t.toLowerCase().includes(q));
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="w-full space-y-6 font-['Hanken_Grotesk'] text-[#1A0D0C] pb-16">
      {/* Hero Header Card */}
      <div className="w-full max-w-[1014px] min-h-[200px] rounded-[38px] bg-white p-8 md:p-10 flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden shadow-sm border border-gray-100/80 my-8 gap-6 group">
        <div className="z-10 max-w-xl space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-0.5 rounded-full bg-[#D9383A]/10 text-[#D9383A] text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
              <BarChart3 className="w-3 h-3" /> Real-time Telemetry
            </span>
          </div>
          <h1 className="text-[36px] md:text-[46px] font-semibold text-[#1A0D0C] tracking-[-1.38px] leading-tight">
            Analytics & Insights
          </h1>
          <p className="text-[16px] md:text-[20px] font-semibold text-[#B0B0B0] tracking-[-0.6px] leading-snug">
            Real-time event turnout rates, student rosters, project showcases, and department metrics.
          </p>
        </div>

        {/* Refresh Action Button */}
        <div className="z-10 flex items-center gap-3">
          <button
            type="button"
            onClick={fetchAnalytics}
            disabled={loading}
            suppressHydrationWarning
            className="flex items-center justify-center h-[52px] px-6 gap-2.5 rounded-[31px] bg-[#100A0A] text-white text-[15px] font-normal tracking-[-0.5px] shadow-sm hover:bg-[#2A2020] active:scale-98 transition-all cursor-pointer shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            <span>Refresh Data</span>
          </button>
        </div>

        {/* Glow accent */}
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-[#D9383A]/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Grid of Interactive Dynamic Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-[1014px]">
        {/* 1. Total Events Created Card */}
        <div
          onClick={() => openModal("events")}
          className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group relative overflow-hidden flex flex-col justify-between min-h-[160px]"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#D9383A] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-[#D9383A] bg-red-50 px-3 py-1 rounded-full flex items-center gap-1 group-hover:bg-[#100A0A] group-hover:text-white transition-colors">
              Details <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="mt-4">
            <h3 className="text-3xl font-bold text-[#1A0D0C] tracking-tight">
              {loading ? "..." : data?.totalEvents || 0}
            </h3>
            <p className="text-xs font-medium text-gray-500 mt-1 flex items-center justify-between">
              <span>Total Events Created</span>
              <span className="text-emerald-600 font-semibold">
                {data?.publishedEvents || 0} Active
              </span>
            </p>
          </div>
        </div>

        {/* 2. Total Registrations Card */}
        <div
          onClick={() => openModal("registrations")}
          className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group relative overflow-hidden flex flex-col justify-between min-h-[160px]"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full flex items-center gap-1 group-hover:bg-[#100A0A] group-hover:text-white transition-colors">
              Details <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="mt-4">
            <h3 className="text-3xl font-bold text-[#1A0D0C] tracking-tight">
              {loading ? "..." : data?.totalRegistrations || 0}
            </h3>
            <p className="text-xs font-medium text-gray-500 mt-1 flex items-center justify-between">
              <span>Student Registrations</span>
              <span className="text-blue-600 font-semibold">
                Avg {data?.totalEvents ? Math.round((data.totalRegistrations || 0) / data.totalEvents) : 0}/event
              </span>
            </p>
          </div>
        </div>

        {/* 3. Turnout & Attendance Rate Card */}
        <div
          onClick={() => openModal("attendance")}
          className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group relative overflow-hidden flex flex-col justify-between min-h-[160px]"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full flex items-center gap-1 group-hover:bg-[#100A0A] group-hover:text-white transition-colors">
              Details <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="mt-4">
            <h3 className="text-3xl font-bold text-[#1A0D0C] tracking-tight flex items-baseline gap-2">
              <span>{loading ? "..." : `${data?.turnoutRate || 0}%`}</span>
              <span className="text-xs font-normal text-gray-400">Turnout</span>
            </h3>
            <p className="text-xs font-medium text-gray-500 mt-1 flex items-center justify-between">
              <span>Verified QR Attendance</span>
              <span className="text-emerald-600 font-semibold">
                {data?.totalAttendance || 0} Scans
              </span>
            </p>
          </div>
        </div>

        {/* 4. Active Students Engagement Card */}
        <div
          onClick={() => openModal("students")}
          className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group relative overflow-hidden flex flex-col justify-between min-h-[160px]"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Award className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-3 py-1 rounded-full flex items-center gap-1 group-hover:bg-[#100A0A] group-hover:text-white transition-colors">
              Details <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="mt-4">
            <h3 className="text-3xl font-bold text-[#1A0D0C] tracking-tight">
              {loading ? "..." : data?.totalStudents || 0}
            </h3>
            <p className="text-xs font-medium text-gray-500 mt-1 flex items-center justify-between">
              <span>Active Students</span>
              <span className="text-purple-600 font-semibold">
                {data?.departmentBreakdown.length || 0} Departments
              </span>
            </p>
          </div>
        </div>

        {/* 5. Showcased Projects Card */}
        <div
          onClick={() => openModal("projects")}
          className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group relative overflow-hidden flex flex-col justify-between min-h-[160px]"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1 rounded-full flex items-center gap-1 group-hover:bg-[#100A0A] group-hover:text-white transition-colors">
              Details <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="mt-4">
            <h3 className="text-3xl font-bold text-[#1A0D0C] tracking-tight">
              {loading ? "..." : data?.totalProjects || 0}
            </h3>
            <p className="text-xs font-medium text-gray-500 mt-1 flex items-center justify-between">
              <span>Submitted Projects</span>
              <span className="text-amber-600 font-semibold">Showcase</span>
            </p>
          </div>
        </div>

        {/* 6. Verified Certificates Card */}
        <div
          onClick={() => openModal("certificates")}
          className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group relative overflow-hidden flex flex-col justify-between min-h-[160px]"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileCheck className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-teal-600 bg-teal-50 px-3 py-1 rounded-full flex items-center gap-1 group-hover:bg-[#100A0A] group-hover:text-white transition-colors">
              Details <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="mt-4">
            <h3 className="text-3xl font-bold text-[#1A0D0C] tracking-tight">
              {loading ? "..." : data?.totalCertificates || 0}
            </h3>
            <p className="text-xs font-medium text-gray-500 mt-1 flex items-center justify-between">
              <span>Certificates Issued</span>
              <span className="text-teal-600 font-semibold">Verified</span>
            </p>
          </div>
        </div>
      </div>

      {/* Event Performance Breakdown Table */}
      <div className="max-w-[1014px] bg-white rounded-[38px] border border-gray-100 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold text-[#1A0D0C] tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#D9383A]" /> Event Performance & Turnout
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Comparative turnout statistics for recent IEDC SJCET events
            </p>
          </div>

          <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
            {data?.eventsPerformance.length || 0} Recent Events
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : data?.eventsPerformance && data.eventsPerformance.length > 0 ? (
          <div className="space-y-3">
            {data.eventsPerformance.map((ev) => (
              <div
                key={ev.id}
                onClick={() => {
                  setSelectedEvent(ev);
                  setActiveModal("event-detail");
                }}
                className="p-4 rounded-2xl border border-gray-100 hover:border-gray-300 hover:bg-gray-50/50 transition-all duration-200 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                <div className="space-y-1 max-w-md">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#100A0A] text-white text-[10px] font-bold uppercase tracking-wider">
                      {ev.eventType}
                    </span>
                    <h4 className="text-base font-bold text-[#1A0D0C] group-hover:text-[#D9383A] transition-colors truncate">
                      {ev.title}
                    </h4>
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      {new Date(ev.startDatetime).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {ev.venue && (
                      <span className="truncate max-w-[150px]">
                        📍 {ev.venue}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-end min-w-[120px]">
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-[#1A0D0C]">
                        {ev.turnoutRate}%
                      </span>
                      <span className="text-[10px] text-gray-400">turnout</span>
                    </div>
                    {/* Turnout Progress bar */}
                    <div className="w-28 h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                        style={{ width: `${Math.min(ev.turnoutRate, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    <span className="font-bold text-[#1A0D0C] block">
                      {ev.attendanceCount} / {ev.registrationsCount}
                    </span>
                    <span className="text-gray-400 text-[10px]">scans / reg</span>
                  </div>

                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#100A0A] group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-gray-50/50 rounded-3xl border border-gray-100">
            <p className="text-gray-500 font-medium">No event analytics yet</p>
            <p className="text-gray-400 text-xs mt-1">
              Events and QR check-ins will populate this performance table.
            </p>
          </div>
        )}
      </div>

      {/* Footer Tagline */}
      <div className="max-w-[1014px] pt-12 flex justify-end">
        <p className="w-[242px] h-[26px] text-[#AAA] text-right font-['Hanken_Grotesk'] text-[16px] font-normal leading-[94.331%] tracking-[-0.48px]">
          IEDC 2026 SJCET - TECH TEAM
        </p>
      </div>

      {/* Interactive Detail Modal Dialog */}
      <Dialog open={!!activeModal} onOpenChange={closeModal}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-2xl bg-[#0C0908] border border-[#e8594c]/30 rounded-[36px] p-6 sm:p-8 shadow-[0px_25px_70px_-15px_rgba(0,0,0,0.9)] text-white font-['Hanken_Grotesk'] max-h-[88vh] overflow-y-auto relative custom-scrollbar"
        >
          {/* Glowing backdrop pill */}
          <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            type="button"
            onClick={closeModal}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-all z-20 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="relative z-10 flex flex-col items-start mb-6 pr-6">
            <span className="px-3.5 py-1 rounded-full bg-gradient-to-b from-[#FF0000] to-[#990000] text-white text-[10px] font-bold tracking-widest uppercase shadow-md mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> IEDC SJCET • TELEMETRY DETAILS
            </span>
            <DialogTitle className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {activeModal === "events" && "Created Events Log"}
              {activeModal === "registrations" && "Event Registrations Roster"}
              {activeModal === "attendance" && "QR Attendance Audit"}
              {activeModal === "students" && "Student Demographics & Roster"}
              {activeModal === "projects" && "Showcased Projects Pipeline"}
              {activeModal === "certificates" && "Issued Certificates Log"}
              {activeModal === "event-detail" && (selectedEvent?.title || "Event Analytics")}
            </DialogTitle>
            <DialogDescription className="text-xs text-white/70 mt-1 leading-relaxed">
              Granular live metrics, audit logs, and detailed record breakdown.
            </DialogDescription>
          </div>

          {/* Modal Content Switcher */}
          <div className="relative z-10 space-y-4">
            {/* 1. Events Modal Content */}
            {activeModal === "events" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                    <span className="text-3xl font-extrabold text-white block">
                      {data?.totalEvents || 0}
                    </span>
                    <span className="text-xs text-white/60">Total Events Created</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <span className="text-3xl font-extrabold text-emerald-400 block">
                      {data?.publishedEvents || 0}
                    </span>
                    <span className="text-xs text-emerald-300">Published / Active</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <h4 className="text-xs font-bold text-white/80 uppercase tracking-wider">
                    All Created Events List
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                    {data?.eventsPerformance.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-white block">{ev.title}</span>
                          <span className="text-white/50 text-[10px] uppercase">
                            {ev.eventType} • {ev.venue || "IDEALab"}
                          </span>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase">
                          {ev.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. Registrations Modal Content */}
            {activeModal === "registrations" && (
              <div className="space-y-4">
                {!selectedRegEvent ? (
                  <>
                    <div className="p-5 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-blue-300 block font-medium">
                          Total Student Registrations Across All Events
                        </span>
                        <span className="text-3xl font-extrabold text-blue-400">
                          {data?.totalRegistrations || 0}
                        </span>
                      </div>
                      <Users className="w-10 h-10 text-blue-400 opacity-60" />
                    </div>

                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white/80 uppercase tracking-wider">
                          Select an Event to View Registered Students & Download DOCX Roster
                        </h4>
                      </div>

                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                        {data?.eventsPerformance.map((ev) => (
                          <div
                            key={ev.id}
                            onClick={() => handleSelectRegEvent(ev)}
                            className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer group"
                          >
                            <div className="space-y-1">
                              <span className="font-bold text-white block group-hover:text-blue-400 transition-colors">
                                {ev.title}
                              </span>
                              <span className="text-white/50 text-xs">
                                {ev.eventType.toUpperCase()} • {ev.venue || "Campus Venue"}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="font-extrabold text-blue-400 block">
                                  {ev.registrationsCount} Registered
                                </span>
                                <span className="text-[10px] text-emerald-400">
                                  {ev.attendanceCount} Attended
                                </span>
                              </div>
                              <span className="p-2 rounded-lg bg-white/5 group-hover:bg-blue-500/20 text-white/60 group-hover:text-blue-400 transition-colors">
                                <ChevronRight className="w-4 h-4" />
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Header Bar for Selected Event */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-white/10">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRegEvent(null);
                          setRegEventData(null);
                        }}
                        className="flex items-center gap-1.5 text-xs text-blue-400 font-semibold hover:underline cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" /> Back to All Events
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadDocx}
                        disabled={downloadingDocx || !regEventData?.registrations?.length}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-40"
                      >
                        <Download className={cn("w-4 h-4", downloadingDocx && "animate-spin")} />
                        <span>{downloadingDocx ? "Generating DOCX..." : "Download Registrations (.docx)"}</span>
                      </button>
                    </div>

                    {/* Selected Event Details Card */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                          {selectedRegEvent.eventType} Event
                        </span>
                        <span className="text-xs text-white/60">
                          {selectedRegEvent.startDatetime
                            ? new Date(selectedRegEvent.startDatetime).toLocaleString("en-IN")
                            : "N/A"}
                        </span>
                      </div>
                      <h3 className="text-xl font-extrabold text-white">
                        {selectedRegEvent.title}
                      </h3>
                      <div className="flex items-center gap-4 text-xs text-white/70">
                        <span>Venue: {selectedRegEvent.venue || "Campus Venue"}</span>
                        <span>•</span>
                        <span className="text-blue-300 font-semibold">
                          {selectedRegEvent.registrationsCount} Registrations
                        </span>
                        <span>•</span>
                        <span className="text-emerald-400 font-semibold">
                          {selectedRegEvent.attendanceCount} Attended
                        </span>
                      </div>
                    </div>

                    {/* Registrant Search Bar */}
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3.5 top-3 text-white/40" />
                      <input
                        type="text"
                        placeholder="Search registrants by name, admission no, department..."
                        value={regSearchQuery}
                        onChange={(e) => setRegSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-blue-500/50"
                      />
                    </div>

                    {/* Registrant Roster List / Table */}
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                      {loadingRegs ? (
                        <div className="p-8 text-center text-white/60 text-xs flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                          <span>Fetching registered students...</span>
                        </div>
                      ) : regEventData?.registrations && regEventData.registrations.length > 0 ? (
                        (() => {
                          const filtered = regEventData.registrations.filter((r) => {
                            const q = regSearchQuery.toLowerCase();
                            const s = r.student;
                            return (
                              !q ||
                              (s?.name || "").toLowerCase().includes(q) ||
                              (s?.admissionNumber || "").toLowerCase().includes(q) ||
                              (s?.department || "").toLowerCase().includes(q) ||
                              (s?.iecdId || "").toLowerCase().includes(q)
                            );
                          });

                          if (filtered.length === 0) {
                            return (
                              <div className="p-6 text-center text-white/50 text-xs">
                                No matching registrants found.
                              </div>
                            );
                          }

                          return (
                            <div className="overflow-x-auto rounded-xl border border-white/10">
                              <table className="w-full text-left text-xs text-white/80">
                                <thead className="bg-white/10 text-white font-bold uppercase text-[10px] tracking-wider">
                                  <tr>
                                    <th className="p-3 w-8">#</th>
                                    <th className="p-3">Student Name</th>
                                    <th className="p-3">Admission No</th>
                                    <th className="p-3">Dept</th>
                                    <th className="p-3">Batch / Year</th>
                                    <th className="p-3">IECD ID</th>
                                    <th className="p-3">Phone</th>
                                    <th className="p-3">Role</th>
                                    <th className="p-3">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 bg-white/5">
                                  {filtered.map((r, idx) => (
                                    <tr key={r.id} className="hover:bg-white/10 transition-colors">
                                      <td className="p-3 text-white/50 font-mono">{idx + 1}</td>
                                      <td className="p-3 font-semibold text-white">
                                        {r.student?.name || "N/A"}
                                      </td>
                                      <td className="p-3 text-white/70 font-mono">
                                        {r.student?.admissionNumber || "N/A"}
                                      </td>
                                      <td className="p-3 font-semibold text-blue-300">
                                        {r.student?.department || "N/A"}
                                      </td>
                                      <td className="p-3 text-white/70">
                                        {r.student?.batch || "N/A"}
                                      </td>
                                      <td className="p-3 text-white/60 font-mono text-[11px]">
                                        {r.student?.iecdId || "N/A"}
                                      </td>
                                      <td className="p-3 text-white/60">
                                        {r.student?.phone || "N/A"}
                                      </td>
                                      <td className="p-3">
                                        <span
                                          className={cn(
                                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                            r.role === "volunteer"
                                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                              : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                          )}
                                        >
                                          {r.role || "participant"}
                                        </span>
                                      </td>
                                      <td className="p-3">
                                        {r.attended ? (
                                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase flex items-center gap-1 w-fit">
                                            <CheckCircle2 className="w-3 h-3" /> Attended
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/50 text-[10px] font-bold uppercase w-fit block">
                                            Registered
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="p-8 text-center text-white/50 text-xs">
                          No registrations found for this event.
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 3. Attendance Modal Content */}
            {activeModal === "attendance" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <span className="text-3xl font-extrabold text-emerald-400 block">
                      {data?.turnoutRate || 0}%
                    </span>
                    <span className="text-xs text-emerald-300">Overall Turnout Rate</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                    <span className="text-3xl font-extrabold text-white block">
                      {data?.totalAttendance || 0}
                    </span>
                    <span className="text-xs text-white/60">Verified QR Check-ins</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <h4 className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Event Attendance Log
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                    {data?.eventsPerformance.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-white block">{ev.title}</span>
                          <span className="text-emerald-400 text-[10px] font-semibold">
                            {ev.turnoutRate}% Turnout
                          </span>
                        </div>
                        <span className="font-bold text-white">
                          {ev.attendanceCount} / {ev.registrationsCount} Scanned
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 4. Student Department Demographics & Roster Modal */}
            {activeModal === "students" && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-purple-300 block font-medium">
                      Active Registered Students
                    </span>
                    <span className="text-3xl font-extrabold text-purple-300">
                      {data?.totalStudents || 0}
                    </span>
                  </div>
                  <Building2 className="w-10 h-10 text-purple-400 opacity-60" />
                </div>

                {/* Department Distribution Bars */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white/80 uppercase tracking-wider">
                      Department Distribution
                    </h4>
                    <span className="text-[10px] text-white/50">Click department to filter roster</span>
                  </div>

                  {data?.departmentBreakdown && data.departmentBreakdown.length > 0 ? (
                    <div className="space-y-2">
                      {data.departmentBreakdown.map((dept) => {
                        const pct = Math.round((dept.count / totalDeptsCount) * 100);
                        const isSelected = deptFilter.toLowerCase() === dept.department.toLowerCase();
                        return (
                          <div
                            key={dept.department}
                            onClick={() => setDeptFilter(isSelected ? "all" : dept.department)}
                            className={cn(
                              "p-2 rounded-xl border transition-all cursor-pointer space-y-1",
                              isSelected
                                ? "bg-purple-500/20 border-purple-400"
                                : "bg-white/5 border-transparent hover:bg-white/10"
                            )}
                          >
                            <div className="flex justify-between text-xs text-white/90 font-semibold">
                              <span>{dept.department.toUpperCase()} Department</span>
                              <span>
                                {dept.count} students ({pct}%)
                              </span>
                            </div>
                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-white/50">No department breakdown available.</p>
                  )}
                </div>

                {/* Student Roster Section with Search */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-purple-400" /> Student Roster ({filteredStudents.length})
                    </h4>

                    {/* Department Quick Filter Buttons */}
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setDeptFilter("all")}
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase transition-all cursor-pointer",
                          deptFilter === "all"
                            ? "bg-purple-500 text-white"
                            : "bg-white/10 text-white/60 hover:text-white"
                        )}
                      >
                        All
                      </button>
                      {data?.departmentBreakdown.map((d) => (
                        <button
                          key={d.department}
                          type="button"
                          onClick={() => setDeptFilter(d.department)}
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase transition-all cursor-pointer",
                            deptFilter.toLowerCase() === d.department.toLowerCase()
                              ? "bg-purple-500 text-white"
                              : "bg-white/10 text-white/60 hover:text-white"
                          )}
                        >
                          {d.department}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Search input */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-white/40 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search student name, admission no, or IEDC ID..."
                      className="w-full bg-white/5 border border-white/15 text-white placeholder-white/40 rounded-xl h-10 pl-9 pr-4 text-xs focus:border-purple-400 outline-none"
                    />
                  </div>

                  {/* Roster List */}
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar pt-1">
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map((st) => (
                        <div
                          key={st.id}
                          className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs hover:bg-white/10 transition-colors"
                        >
                          <div className="space-y-0.5">
                            <span className="font-bold text-white block">{st.name}</span>
                            <span className="text-[#AAA] text-[11px] block">
                              {st.department.toUpperCase()} • Batch {st.batch} • Adm: {st.admissionNumber}
                            </span>
                            <span className="text-purple-300 text-[10px] font-mono block">
                              ID: {st.iecdId}
                            </span>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold">
                              🏆 {st.totalPoints || 0} pts
                            </span>
                            {st.phone && (
                              <a
                                href={`tel:${st.phone}`}
                                className="block text-[10px] text-white/50 hover:text-white mt-1 underline"
                              >
                                📞 {st.phone}
                              </a>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-white/50 text-center py-6">
                        No students found matching current filter.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 5. Projects Modal Content */}
            {activeModal === "projects" && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-amber-300 block font-medium">
                      Showcased Innovation Projects
                    </span>
                    <span className="text-3xl font-extrabold text-amber-400">
                      {data?.totalProjects || 0}
                    </span>
                  </div>
                  <FolderGit2 className="w-10 h-10 text-amber-400 opacity-60" />
                </div>

                {/* Filter & Search for Projects */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {["all", "approved", "pending", "rejected"].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setProjectStatusFilter(st)}
                        className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all cursor-pointer",
                          projectStatusFilter === st
                            ? "bg-amber-500 text-black font-extrabold"
                            : "bg-white/10 text-white/60 hover:text-white"
                        )}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-48">
                    <Search className="w-3.5 h-3.5 text-white/40 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search projects..."
                      className="w-full bg-white/5 border border-white/15 text-white placeholder-white/40 rounded-xl h-8 pl-8 pr-3 text-xs focus:border-amber-400 outline-none"
                    />
                  </div>
                </div>

                {/* Project List */}
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                  {filteredProjects.length > 0 ? (
                    filteredProjects.map((proj) => (
                      <div
                        key={proj.id}
                        className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-base font-bold text-white truncate">
                            {proj.title}
                          </h4>
                          <span
                            className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0",
                              proj.status === "approved"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : proj.status === "rejected"
                                  ? "bg-red-500/20 text-red-300"
                                  : "bg-amber-500/20 text-amber-300"
                            )}
                          >
                            {proj.status || "pending"}
                          </span>
                        </div>

                        {proj.description && (
                          <p className="text-xs text-white/70 line-clamp-2 leading-relaxed">
                            {proj.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-xs">
                          <span className="text-white/50 text-[11px]">
                            By <strong className="text-white">{proj.studentName || "Student"}</strong> ({proj.department || "IEDC"})
                          </span>

                          <div className="flex items-center gap-2">
                            {proj.githubUrl && (
                              <a
                                href={proj.githubUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-white/80 hover:text-white bg-white/10 px-2.5 py-1 rounded-lg transition-colors"
                              >
                                <Code2 className="w-3.5 h-3.5" /> Code <ArrowUpRight className="w-3 h-3" />
                              </a>
                            )}
                            {proj.demoUrl && (
                              <a
                                href={proj.demoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-amber-300 hover:text-amber-200 bg-amber-500/20 px-2.5 py-1 rounded-lg transition-colors font-semibold"
                              >
                                <Globe className="w-3.5 h-3.5" /> Live Demo <ArrowUpRight className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-white/50 text-center py-8">
                      No project submissions found.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 6. Certificates Modal Content */}
            {activeModal === "certificates" && (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-teal-300 block font-medium">
                      Issued Verified Certificates
                    </span>
                    <span className="text-3xl font-extrabold text-teal-400">
                      {data?.totalCertificates || 0}
                    </span>
                  </div>
                  <FileCheck className="w-10 h-10 text-teal-400 opacity-60" />
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <h4 className="text-xs font-bold text-white/80 uppercase tracking-wider">
                    Recent Certificate Issuance Audit Log
                  </h4>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                    {data?.certificates && data.certificates.length > 0 ? (
                      data.certificates.map((cert) => (
                        <div
                          key={cert.id}
                          className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs"
                        >
                          <div className="space-y-0.5">
                            <span className="font-bold text-white block">
                              {cert.studentName || "Student"} ({cert.department?.toUpperCase()})
                            </span>
                            <span className="text-white/60 text-[10px] block">
                              Event: {cert.eventTitle || "IEDC Workshop"}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="font-mono text-teal-300 text-[11px] font-bold block">
                              #{cert.certificateNumber}
                            </span>
                            <span className="text-white/40 text-[10px]">
                              {cert.issuedAt
                                ? new Date(cert.issuedAt).toLocaleDateString()
                                : "Issued"}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-white/50 text-center py-6">
                        No certificate issuance logs found yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 7. Individual Event Detail Modal */}
            {activeModal === "event-detail" && selectedEvent && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#FF0000] text-white text-[10px] font-bold uppercase tracking-wider">
                      {selectedEvent.eventType}
                    </span>
                    <span className="text-xs text-white/60">
                      Status: <strong className="text-white capitalize">{selectedEvent.status}</strong>
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    {selectedEvent.title}
                  </h3>
                  {selectedEvent.venue && (
                    <p className="text-xs text-white/70">
                      📍 Venue: {selectedEvent.venue}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center">
                    <span className="text-3xl font-extrabold text-blue-400 block">
                      {selectedEvent.registrationsCount}
                    </span>
                    <span className="text-xs text-blue-300">Registrations</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <span className="text-3xl font-extrabold text-emerald-400 block">
                      {selectedEvent.attendanceCount}
                    </span>
                    <span className="text-xs text-emerald-300">QR Check-ins</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs text-white/80">
                    <span>Turnout Percentage</span>
                    <span className="font-bold text-emerald-400">
                      {selectedEvent.turnoutRate}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                      style={{ width: `${Math.min(selectedEvent.turnoutRate, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}