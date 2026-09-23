"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Calendar,
  UserCheck,
  TrendingUp,
  FolderOpen,
  CheckCircle2,
  Building2,
  RefreshCw,
  Search,
  ChevronRight,
  Sparkles,
  Trophy,
  GraduationCap,
  FolderGit2,
  Clock,
  GitBranch,
  ExternalLink,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EventCard, EventCardProps } from "@/components/events/event-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface EventPerformance {
  id: string;
  title: string;
  eventType: string;
  startDatetime: string;
  endDatetime: string;
  status: string;
  venue?: string | null;
  participationPoints?: number | null;
  posterUrl?: string | null;
  description?: string | null;
  registrationsCount: number;
  attendanceCount: number;
  turnoutRate: number;
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
  reviewComment?: string | null;
  submittedAt?: string | null;
  studentName?: string | null;
  department?: string | null;
  admissionNumber?: string | null;
  iecdId?: string | null;
}

interface ReportsData {
  totalStudents: number;
  totalEvents: number;
  totalRegistrations: number;
  totalAttendance: number;
  pendingProjects: number;
  approvedProjects: number;
  departmentBreakdown: Array<{ department: string; count: number }>;
  students: StudentDetail[];
  projects: ProjectDetail[];
  eventsPerformance: EventPerformance[];
  recentEvents: EventPerformance[];
}

export default function FacultyReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Active modal type: null | 'students' | 'events' | 'registrations' | 'attendance' | 'projects'
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Filter & Search states
  const [deptFilter, setDeptFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [projectStatusFilter, setProjectStatusFilter] = useState("all");
  const [eventStatusFilter, setEventStatusFilter] = useState("all");

  // Selected event for event-specific registrations drill-down
  const [selectedRegEvent, setSelectedRegEvent] = useState<EventPerformance | null>(null);
  const [regEventData, setRegEventData] = useState<{
    registrations: Array<{
      id: string;
      role: string;
      registeredAt: string;
      attended: boolean;
      student: StudentDetail;
    }>;
  } | null>(null);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [regSearchQuery, setRegSearchQuery] = useState("");

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/faculty/reports");
      if (res.ok) {
        setData(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const openModal = (type: string, initialFilter?: string) => {
    setActiveModal(type);
    setDeptFilter(initialFilter || "all");
    setSearchQuery("");
    setEventStatusFilter("all");
    setProjectStatusFilter(initialFilter || "all");
    setSelectedRegEvent(null);
    setRegEventData(null);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedRegEvent(null);
    setRegEventData(null);
    setSearchQuery("");
  };

  const fetchEventRegistrations = async (eventId: string) => {
    setLoadingRegs(true);
    setRegEventData(null);
    try {
      const res = await fetch(`/api/events/${eventId}/registrations`);
      if (res.ok) {
        setRegEventData(await res.json());
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

  const turnoutRate =
    data?.totalRegistrations && data.totalRegistrations > 0
      ? Math.round(((data.totalAttendance || 0) / data.totalRegistrations) * 100)
      : 0;

  // Filtered Students list
  const filteredStudents = (data?.students || []).filter((st) => {
    const matchesDept =
      deptFilter === "all" || st.department.toLowerCase() === deptFilter.toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      st.name.toLowerCase().includes(q) ||
      st.admissionNumber.toLowerCase().includes(q) ||
      st.iecdId.toLowerCase().includes(q) ||
      st.department.toLowerCase().includes(q) ||
      (st.batch && st.batch.toLowerCase().includes(q));
    return matchesDept && matchesQuery;
  });

  // Filtered Projects list
  const filteredProjects = (data?.projects || []).filter((proj) => {
    const matchesStatus =
      projectStatusFilter === "all" ||
      (proj.status || "pending").toLowerCase() === projectStatusFilter.toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      proj.title.toLowerCase().includes(q) ||
      (proj.description || "").toLowerCase().includes(q) ||
      (proj.studentName || "").toLowerCase().includes(q) ||
      (proj.department || "").toLowerCase().includes(q) ||
      (proj.tags || []).some((t) => t.toLowerCase().includes(q));
    return matchesStatus && matchesQuery;
  });

  // Filtered Events list
  const filteredEvents = (data?.eventsPerformance || []).filter((ev) => {
    const matchesStatus =
      eventStatusFilter === "all" ||
      ev.status.toLowerCase() === eventStatusFilter.toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      ev.title.toLowerCase().includes(q) ||
      ev.eventType.toLowerCase().includes(q) ||
      (ev.venue || "").toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="w-full space-y-6 font-['Hanken_Grotesk'] text-[#1A0D0C] pb-16">
      {/* Hero Header Banner */}
      <div className="relative w-full max-w-[1014px] min-h-[203px] bg-white rounded-[38px] border border-gray-100/80 p-8 md:p-10 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden font-['Hanken_Grotesk']">
        {/* Top Right Ribbon Tag */}
        <div className="absolute top-0 right-0 w-[240.16px] h-[37.24px] rounded-bl-[65px] bg-gradient-to-b from-[#FF0000] to-[#990000] flex items-center justify-center text-white font-['Hanken_Grotesk'] text-[15.2px] font-semibold tracking-[-0.456px] z-10 shadow-sm">
          FACULTY TELEMETRY
        </div>

        <div className="space-y-1 pt-2 md:pt-0 max-w-xl">
          <h1 className="text-[36px] sm:text-[46px] font-semibold text-[#1A0D0C] tracking-[-1.38px] leading-tight font-['Hanken_Grotesk']">
            Faculty Reports
          </h1>
          <p className="text-[16px] sm:text-[20px] font-semibold text-[#B0B0B0] tracking-[-0.6px] leading-snug font-['Hanken_Grotesk']">
            IEDC activity overview, student turnout analytics, and department breakdown
          </p>
        </div>

        {/* Turnout Stat Pill & Refresh Action */}
        <div className="flex items-center gap-3 shrink-0 pt-2 md:pt-0">
          <div className="flex flex-col justify-end items-start w-[145px] h-[101px] p-[14px_20px_10px_20px] rounded-[20px] bg-[#1E1614] gap-[5px] shadow-sm font-['Hanken_Grotesk']">
            <span className="text-[#FFFFFF] text-[15px] font-normal tracking-[-0.5px] leading-none truncate max-w-full">
              Turnout Rate
            </span>
            <span className="text-[#FFFFFF] text-[38px] font-bold tracking-[-1.14px] leading-none">
              {turnoutRate}%
            </span>
          </div>

          <button
            onClick={fetchReports}
            disabled={loading ? true : undefined}
            suppressHydrationWarning
            className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors shadow-xs cursor-pointer disabled:opacity-50 font-['Hanken_Grotesk']"
            title="Refresh Report Data"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Metrics Cards Grid - All Interactive */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-[1014px] font-['Hanken_Grotesk']">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-[140px] bg-white rounded-[32px] border border-gray-100/80 p-5 animate-pulse flex flex-col justify-between shadow-xs"
            >
              <div className="w-8 h-8 bg-gray-100 rounded-xl" />
              <div className="space-y-2">
                <div className="h-6 bg-gray-100 rounded-lg w-1/2" />
                <div className="h-3 bg-gray-100 rounded-md w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 max-w-[1014px] font-['Hanken_Grotesk']">
          {/* 1. Total Students */}
          <div
            onClick={() => openModal("students")}
            className="bg-white rounded-[32px] p-5 border border-gray-100/90 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group cursor-pointer font-['Hanken_Grotesk']"
          >
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <div className="mt-4">
              <h3 className="text-2xl sm:text-3xl font-bold text-[#1A0D0C] tracking-tight">
                {data?.totalStudents || 0}
              </h3>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5 flex items-center justify-between">
                <span>Students</span>
                <ChevronRight className="w-3.5 h-3.5 text-purple-600 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </div>
          </div>

          {/* 2. Total Events */}
          <div
            onClick={() => openModal("events")}
            className="bg-white rounded-[32px] p-5 border border-gray-100/90 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group cursor-pointer font-['Hanken_Grotesk']"
          >
            <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#D9383A] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="mt-4">
              <h3 className="text-2xl sm:text-3xl font-bold text-[#1A0D0C] tracking-tight">
                {data?.totalEvents || 0}
              </h3>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5 flex items-center justify-between">
                <span>Total Events</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#D9383A] group-hover:translate-x-0.5 transition-transform" />
              </p>
            </div>
          </div>

          {/* 3. Registrations */}
          <div
            onClick={() => openModal("registrations")}
            className="bg-white rounded-[32px] p-5 border border-gray-100/90 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group cursor-pointer font-['Hanken_Grotesk']"
          >
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="mt-4">
              <h3 className="text-2xl sm:text-3xl font-bold text-[#1A0D0C] tracking-tight">
                {data?.totalRegistrations || 0}
              </h3>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5 flex items-center justify-between">
                <span>Registrations</span>
                <ChevronRight className="w-3.5 h-3.5 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </div>
          </div>

          {/* 4. QR Attendance */}
          <div
            onClick={() => openModal("attendance")}
            className="bg-white rounded-[32px] p-5 border border-gray-100/90 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group cursor-pointer font-['Hanken_Grotesk']"
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="mt-4">
              <h3 className="text-2xl sm:text-3xl font-bold text-[#1A0D0C] tracking-tight">
                {data?.totalAttendance || 0}
              </h3>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5 flex items-center justify-between">
                <span>QR Attendance</span>
                <ChevronRight className="w-3.5 h-3.5 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </div>
          </div>

          {/* 5. Pending Projects */}
          <div
            onClick={() => openModal("projects", "pending")}
            className="bg-white rounded-[32px] p-5 border border-gray-100/90 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group cursor-pointer font-['Hanken_Grotesk']"
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div className="mt-4">
              <h3 className="text-2xl sm:text-3xl font-bold text-[#1A0D0C] tracking-tight">
                {data?.pendingProjects || 0}
              </h3>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5 flex items-center justify-between">
                <span>Pending Projects</span>
                <ChevronRight className="w-3.5 h-3.5 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </div>
          </div>

          {/* 6. Approved Projects */}
          <div
            onClick={() => openModal("projects", "approved")}
            className="bg-white rounded-[32px] p-5 border border-gray-100/90 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group cursor-pointer font-['Hanken_Grotesk']"
          >
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="mt-4">
              <h3 className="text-2xl sm:text-3xl font-bold text-[#1A0D0C] tracking-tight">
                {data?.approvedProjects || 0}
              </h3>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5 flex items-center justify-between">
                <span>Approved Projects</span>
                <ChevronRight className="w-3.5 h-3.5 text-teal-600 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Department Breakdown Section */}
      <div className="max-w-[1014px] bg-white rounded-[38px] border border-gray-100/80 p-8 md:p-10 shadow-sm space-y-6 font-['Hanken_Grotesk']">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#1A0D0C] tracking-tight flex items-center gap-2.5 font-['Hanken_Grotesk']">
              <Building2 className="w-5 h-5 text-[#990000]" /> Students by Department
            </h2>
            <p className="text-xs text-gray-400 mt-0.5 font-['Hanken_Grotesk']">
              Click any department to inspect student profiles, admission details, and total earned points.
            </p>
          </div>
          <button
            onClick={() => openModal("students", "all")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1A0D0C] text-white text-xs font-semibold hover:bg-black transition-all shadow-xs cursor-pointer w-fit shrink-0 font-['Hanken_Grotesk']"
          >
            <span>View All Profiles</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : data?.departmentBreakdown && data.departmentBreakdown.length > 0 ? (
          <div className="space-y-3 font-['Hanken_Grotesk']">
            {data.departmentBreakdown.map((dept) => {
              const percentage =
                data.totalStudents > 0
                  ? Math.round((dept.count / data.totalStudents) * 100)
                  : 0;
              return (
                <div
                  key={dept.department}
                  onClick={() => openModal("students", dept.department)}
                  className="p-4 rounded-[22px] border border-gray-100 hover:border-gray-300 hover:bg-[#FAF6EE]/50 transition-all duration-200 cursor-pointer space-y-2 group font-['Hanken_Grotesk']"
                >
                  <div className="flex items-center justify-between text-xs font-bold font-['Hanken_Grotesk']">
                    <span className="text-[#1A0D0C] text-sm group-hover:text-[#990000] transition-colors flex items-center gap-2 font-['Hanken_Grotesk']">
                      <span>{dept.department}</span>
                      <span className="text-[10px] font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md font-['Hanken_Grotesk']">
                        {dept.count} Profiles
                      </span>
                    </span>
                    <span className="text-gray-500 tabular-nums flex items-center gap-1 font-['Hanken_Grotesk']">
                      <span>{percentage}%</span>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#1A0D0C] group-hover:translate-x-0.5 transition-all" />
                    </span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#990000] to-[#1A0D0C] rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-gray-50/60 rounded-3xl border border-gray-100 font-['Hanken_Grotesk']">
            <p className="text-gray-500 font-semibold text-sm">No department data available</p>
          </div>
        )}
      </div>

      {/* Recent Events Log Section */}
      <div className="max-w-[1014px] bg-white rounded-[38px] border border-gray-100/80 p-8 md:p-10 shadow-sm space-y-6 font-['Hanken_Grotesk']">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#1A0D0C] tracking-tight flex items-center gap-2.5 font-['Hanken_Grotesk']">
              <Calendar className="w-5 h-5 text-[#990000]" /> Recent Events Log
            </h2>
            <p className="text-xs text-gray-400 mt-0.5 font-['Hanken_Grotesk']">
              Latest published and conducted events across campus
            </p>
          </div>
          <Link
            href="/faculty/events"
            className="text-xs font-semibold text-[#1A0D0C] hover:text-[#990000] flex items-center gap-1 transition-colors font-['Hanken_Grotesk']"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6 md:gap-8 max-w-[1014px]">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-full max-w-[247px] h-[340px] bg-gray-100 rounded-3xl animate-pulse mx-auto" />
            ))}
          </div>
        ) : data?.recentEvents && data.recentEvents.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6 md:gap-8 max-w-[1014px] font-['Hanken_Grotesk']">
            {data.recentEvents.map((event) => (
              <EventCard
                key={event.id}
                {...event}
                linkPrefix="/faculty/events"
              />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-gray-50/60 rounded-3xl border border-gray-100 font-['Hanken_Grotesk']">
            <p className="text-gray-500 font-semibold text-sm">No recent events found</p>
          </div>
        )}
      </div>

      {/* Unified Telemetry Dialog Modal */}
      <Dialog open={!!activeModal} onOpenChange={closeModal}>
        <DialogContent
          showCloseButton={true}
          className="sm:max-w-3xl rounded-[36px] p-6 sm:p-8 bg-white border border-gray-100 shadow-2xl space-y-5 max-h-[85vh] overflow-hidden flex flex-col font-['Hanken_Grotesk'] text-[#1A0D0C]"
        >
          {/* Modal Header */}
          <DialogHeader className="shrink-0 font-['Hanken_Grotesk']">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-3 py-0.5 rounded-full bg-[#990000]/10 text-[#990000] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 font-['Hanken_Grotesk']">
                <Sparkles className="w-3.5 h-3.5" /> FACULTY TELEMETRY DETAILS
              </span>
            </div>
            <DialogTitle className="text-2xl font-bold text-[#1A0D0C] tracking-tight font-['Hanken_Grotesk']">
              {activeModal === "students" && "Student Profiles & Demographics"}
              {activeModal === "events" && "All Created Events Roster"}
              {activeModal === "registrations" && "Event Registrations Roster"}
              {activeModal === "attendance" && "Verified QR Attendance Telemetry"}
              {activeModal === "projects" && "Showcased Projects Pipeline"}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 font-['Hanken_Grotesk']">
              {activeModal === "students" && "Inspect student profiles, admission numbers, IEDC IDs, and total points earned per department."}
              {activeModal === "events" && "Detailed log of all published, draft, ongoing, and completed campus events."}
              {activeModal === "registrations" && "Event registration rosters, student roles, and turnout analysis."}
              {activeModal === "attendance" && "QR scan check-in analytics and comparative turnout performance."}
              {activeModal === "projects" && "Detailed pipeline of student submitted projects, code repos, live demos, and review statuses."}
            </DialogDescription>
          </DialogHeader>

          {/* 1. STUDENTS MODAL CONTENT */}
          {activeModal === "students" && (
            <>
              <div className="space-y-3 shrink-0 pt-1 font-['Hanken_Grotesk']">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none max-w-full font-['Hanken_Grotesk']">
                  <button
                    onClick={() => setDeptFilter("all")}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer font-['Hanken_Grotesk']",
                      deptFilter === "all"
                        ? "bg-[#1A0D0C] text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    All ({data?.totalStudents || 0})
                  </button>
                  {data?.departmentBreakdown?.map((d) => (
                    <button
                      key={d.department}
                      onClick={() => setDeptFilter(d.department)}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer font-['Hanken_Grotesk']",
                        deptFilter.toLowerCase() === d.department.toLowerCase()
                          ? "bg-[#1A0D0C] text-white shadow-sm"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}
                    >
                      {d.department} ({d.count})
                    </button>
                  ))}
                </div>

                <div className="relative w-full font-['Hanken_Grotesk']">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search students by name, admission no, IEDC ID, department..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-[38px] pl-10 pr-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-medium placeholder:text-gray-400 focus:outline-none focus:border-[#1A0D0C] transition-colors font-['Hanken_Grotesk']"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar min-h-[260px] pt-1 font-['Hanken_Grotesk']">
                {filteredStudents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-['Hanken_Grotesk']">
                    {filteredStudents.map((student) => (
                      <div
                        key={student.id}
                        className="p-4 rounded-[22px] bg-white border border-gray-200/80 hover:border-gray-300 hover:shadow-sm transition-all space-y-2 flex flex-col justify-between font-['Hanken_Grotesk']"
                      >
                        <div className="space-y-1 font-['Hanken_Grotesk']">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-bold text-[#1A0D0C] text-sm truncate font-['Hanken_Grotesk']">
                              {student.name}
                            </h4>
                            <span className="font-mono text-[10px] text-[#990000] bg-[#FF0000]/10 px-2 py-0.5 rounded-full font-bold border border-[#FF0000]/20 shrink-0">
                              {student.iecdId || "IEDC"}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 font-medium font-['Hanken_Grotesk']">
                            <span className="bg-gray-100 px-2 py-0.5 rounded-md text-[#1A0D0C] font-semibold font-['Hanken_Grotesk']">
                              Dept: {student.department}
                            </span>
                            {student.batch && (
                              <span className="bg-gray-100 px-2 py-0.5 rounded-md font-['Hanken_Grotesk']">
                                Batch: {student.batch}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-['Hanken_Grotesk']">
                          <span className="font-mono text-gray-600">
                            Adm: {student.admissionNumber}
                          </span>
                          <div className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full font-bold border border-amber-200/60 font-['Hanken_Grotesk']">
                            <Trophy className="w-3 h-3 text-amber-600" />
                            <span>{student.totalPoints ?? 0} Pts</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center bg-gray-50/60 rounded-3xl border border-gray-100 flex flex-col items-center justify-center font-['Hanken_Grotesk']">
                    <Users className="w-10 h-10 text-gray-300 mb-2" />
                    <p className="text-gray-600 font-bold text-sm font-['Hanken_Grotesk']">No student profiles found</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* 2. EVENTS MODAL CONTENT */}
          {activeModal === "events" && (
            <>
              <div className="space-y-3 shrink-0 pt-1 font-['Hanken_Grotesk']">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none max-w-full font-['Hanken_Grotesk']">
                  {["all", "published", "draft", "ongoing", "completed"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setEventStatusFilter(st)}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all shrink-0 cursor-pointer font-['Hanken_Grotesk']",
                        eventStatusFilter === st
                          ? "bg-[#1A0D0C] text-white shadow-sm"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div className="relative w-full font-['Hanken_Grotesk']">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search events by title, category, venue..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-[38px] pl-10 pr-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-medium placeholder:text-gray-400 focus:outline-none focus:border-[#1A0D0C] transition-colors font-['Hanken_Grotesk']"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar min-h-[260px] pt-1 font-['Hanken_Grotesk']">
                {filteredEvents.length > 0 ? (
                  <div className="space-y-3 font-['Hanken_Grotesk']">
                    {filteredEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-4 rounded-[22px] bg-white border border-gray-200/80 hover:border-gray-300 hover:shadow-sm transition-all space-y-2 flex flex-col md:flex-row md:items-center justify-between gap-3 font-['Hanken_Grotesk']"
                      >
                        <div className="space-y-1 font-['Hanken_Grotesk']">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-[#1A0D0C] text-white text-[10px] font-bold uppercase tracking-wider">
                              {ev.eventType}
                            </span>
                            <h4 className="font-bold text-[#1A0D0C] text-base font-['Hanken_Grotesk']">
                              {ev.title}
                            </h4>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 font-['Hanken_Grotesk']">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-gray-400" />
                              {new Date(ev.startDatetime).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                            {ev.venue && <span>• 📍 {ev.venue}</span>}
                            <span>• ⭐ {ev.participationPoints ?? 10} Pts</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0 font-['Hanken_Grotesk']">
                          <div className="text-right text-xs font-['Hanken_Grotesk']">
                            <span className="font-bold text-[#1A0D0C] block">
                              {ev.registrationsCount} Regs / {ev.attendanceCount} Scans
                            </span>
                            <span className="text-emerald-600 font-semibold text-[11px]">
                              {ev.turnoutRate}% Turnout
                            </span>
                          </div>
                          <span className="px-3 py-1 rounded-full text-xs font-bold capitalize bg-gray-100 text-gray-700">
                            {ev.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center bg-gray-50/60 rounded-3xl border border-gray-100 flex flex-col items-center justify-center font-['Hanken_Grotesk']">
                    <Calendar className="w-10 h-10 text-gray-300 mb-2" />
                    <p className="text-gray-600 font-bold text-sm font-['Hanken_Grotesk']">No events found</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* 3. REGISTRATIONS MODAL CONTENT */}
          {activeModal === "registrations" && (
            <div className="space-y-4 flex-1 overflow-hidden flex flex-col font-['Hanken_Grotesk']">
              {!selectedRegEvent ? (
                <>
                  <div className="p-4 rounded-[22px] bg-blue-50/80 border border-blue-200/80 flex items-center justify-between shrink-0 font-['Hanken_Grotesk']">
                    <div>
                      <span className="text-xs text-blue-700 font-semibold block">
                        Select an event to view full student registration roster &amp; attendance status:
                      </span>
                      <span className="text-2xl font-bold text-blue-900">
                        {data?.totalRegistrations || 0} Total Registrations
                      </span>
                    </div>
                    <UserCheck className="w-8 h-8 text-blue-600 opacity-80" />
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar font-['Hanken_Grotesk']">
                    {data?.eventsPerformance.map((ev) => (
                      <div
                        key={ev.id}
                        onClick={() => handleSelectRegEvent(ev)}
                        className="p-4 rounded-[22px] bg-white border border-gray-200/80 hover:border-gray-300 hover:shadow-sm transition-all flex items-center justify-between cursor-pointer group font-['Hanken_Grotesk']"
                      >
                        <div className="space-y-1">
                          <span className="font-bold text-[#1A0D0C] text-sm block group-hover:text-[#990000] transition-colors">
                            {ev.title}
                          </span>
                          <span className="text-xs text-gray-400">
                            {ev.eventType.toUpperCase()} • {ev.venue || "Campus Venue"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="font-bold text-blue-600 block text-sm">
                              {ev.registrationsCount} Registered
                            </span>
                            <span className="text-[11px] text-emerald-600 font-semibold">
                              {ev.attendanceCount} Attended
                            </span>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#1A0D0C] group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {/* Selected Event Header */}
                  <div className="flex items-center justify-between shrink-0 pb-2 border-b border-gray-100 font-['Hanken_Grotesk']">
                    <button
                      onClick={() => {
                        setSelectedRegEvent(null);
                        setRegEventData(null);
                      }}
                      className="flex items-center gap-1.5 text-xs text-[#1A0D0C] font-semibold hover:underline cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back to All Events
                    </button>
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                      {selectedRegEvent.registrationsCount} Registered
                    </span>
                  </div>

                  <div className="p-4 rounded-[22px] bg-gray-50 border border-gray-200/80 shrink-0 space-y-1 font-['Hanken_Grotesk']">
                    <h3 className="text-lg font-bold text-[#1A0D0C]">{selectedRegEvent.title}</h3>
                    <p className="text-xs text-gray-500">
                      Venue: {selectedRegEvent.venue || "Campus"} • {selectedRegEvent.attendanceCount} Attended ({selectedRegEvent.turnoutRate}% Turnout)
                    </p>
                  </div>

                  <div className="relative shrink-0 font-['Hanken_Grotesk']">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search registrants by name, admission no, department..."
                      value={regSearchQuery}
                      onChange={(e) => setRegSearchQuery(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-4 py-2 text-xs text-[#1A0D0C] focus:outline-none focus:border-[#1A0D0C]"
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar font-['Hanken_Grotesk']">
                    {loadingRegs ? (
                      <div className="p-8 text-center text-gray-500 text-xs flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-[#1A0D0C]" />
                        <span>Fetching registered students roster...</span>
                      </div>
                    ) : regEventData?.registrations && regEventData.registrations.length > 0 ? (
                      regEventData.registrations
                        .filter((r) => {
                          const q = regSearchQuery.toLowerCase();
                          const s = r.student;
                          return (
                            !q ||
                            s?.name?.toLowerCase().includes(q) ||
                            s?.admissionNumber?.toLowerCase().includes(q) ||
                            s?.department?.toLowerCase().includes(q) ||
                            s?.iecdId?.toLowerCase().includes(q)
                          );
                        })
                        .map((r) => (
                          <div
                            key={r.id}
                            className="p-3.5 rounded-[18px] bg-white border border-gray-200/80 flex items-center justify-between text-xs font-['Hanken_Grotesk']"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#1A0D0C] text-sm">
                                  {r.student?.name}
                                </span>
                                <span className="font-mono text-[10px] text-[#990000] bg-[#FF0000]/10 px-2 py-0.5 rounded-full font-bold">
                                  {r.student?.iecdId}
                                </span>
                              </div>
                              <div className="text-gray-500 text-[11px]">
                                Dept: {r.student?.department} • Adm: {r.student?.admissionNumber} • Batch: {r.student?.batch}
                              </div>
                            </div>
                            <span
                              className={cn(
                                "px-3 py-1 rounded-full text-[11px] font-bold shrink-0",
                                r.attended
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-gray-100 text-gray-500"
                              )}
                            >
                              {r.attended ? "Attended ✓" : "Registered"}
                            </span>
                          </div>
                        ))
                    ) : (
                      <div className="p-8 text-center text-gray-500 text-xs font-['Hanken_Grotesk']">
                        No registrations recorded for this event.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* 4. ATTENDANCE MODAL CONTENT */}
          {activeModal === "attendance" && (
            <>
              <div className="p-4 rounded-[22px] bg-emerald-50/80 border border-emerald-200/80 flex items-center justify-between shrink-0 font-['Hanken_Grotesk']">
                <div>
                  <span className="text-xs text-emerald-700 font-semibold block">
                    Verified QR Scan Attendance &amp; Turnout Telemetry
                  </span>
                  <span className="text-2xl font-bold text-emerald-900">
                    {data?.totalAttendance || 0} Total Scans ({turnoutRate}% Turnout Rate)
                  </span>
                </div>
                <TrendingUp className="w-8 h-8 text-emerald-600 opacity-80" />
              </div>

              <div className="relative w-full shrink-0 font-['Hanken_Grotesk']">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search events by title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-[38px] pl-10 pr-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-medium placeholder:text-gray-400 focus:outline-none focus:border-[#1A0D0C] transition-colors"
                />
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar min-h-[260px] pt-1 font-['Hanken_Grotesk']">
                {filteredEvents.length > 0 ? (
                  <div className="space-y-3 font-['Hanken_Grotesk']">
                    {filteredEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-4 rounded-[22px] bg-white border border-gray-200/80 hover:border-gray-300 transition-all space-y-2 flex flex-col justify-between font-['Hanken_Grotesk']"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-[#1A0D0C] text-sm">{ev.title}</h4>
                            <span className="text-xs text-gray-400">
                              {ev.eventType.toUpperCase()} • {ev.venue || "Campus Venue"}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-emerald-700 text-base block">
                              {ev.turnoutRate}%
                            </span>
                            <span className="text-[10px] text-[#888888]">
                              {ev.attendanceCount} scans / {ev.registrationsCount} reg
                            </span>
                          </div>
                        </div>

                        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full"
                            style={{ width: `${Math.min(ev.turnoutRate, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center bg-gray-50/60 rounded-3xl border border-gray-100 font-['Hanken_Grotesk']">
                    <p className="text-gray-600 font-bold text-sm">No attendance records found</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* 5. PROJECTS MODAL CONTENT */}
          {activeModal === "projects" && (
            <>
              <div className="space-y-3 shrink-0 pt-1 font-['Hanken_Grotesk']">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none max-w-full font-['Hanken_Grotesk']">
                  {["all", "pending", "approved", "changes_requested", "rejected"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setProjectStatusFilter(st)}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all shrink-0 cursor-pointer font-['Hanken_Grotesk']",
                        projectStatusFilter === st
                          ? "bg-[#1A0D0C] text-white shadow-sm"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}
                    >
                      {st.replace("_", " ")}
                    </button>
                  ))}
                </div>

                <div className="relative w-full font-['Hanken_Grotesk']">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search projects by title, description, tags, student name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-[38px] pl-10 pr-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-medium placeholder:text-gray-400 focus:outline-none focus:border-[#1A0D0C] transition-colors font-['Hanken_Grotesk']"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar min-h-[260px] pt-1 font-['Hanken_Grotesk']">
                {filteredProjects.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 font-['Hanken_Grotesk']">
                    {filteredProjects.map((proj) => (
                      <div
                        key={proj.id}
                        className="p-4 rounded-[22px] bg-white border border-gray-200/80 hover:border-gray-300 hover:shadow-sm transition-all space-y-3 font-['Hanken_Grotesk']"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-bold text-[#1A0D0C] text-base">
                              {proj.title}
                            </h4>
                            <p className="text-xs text-gray-500">
                              Submitted by <strong className="text-[#1A0D0C]">{proj.studentName || "Student"}</strong> ({proj.department || "Dept"})
                            </p>
                          </div>
                          <span
                            className={cn(
                              "px-3 py-1 rounded-full text-[11px] font-bold capitalize shrink-0",
                              proj.status === "approved" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                              proj.status === "pending" && "bg-blue-50 text-blue-700 border border-blue-200",
                              proj.status === "changes_requested" && "bg-amber-50 text-amber-800 border border-amber-300",
                              proj.status === "rejected" && "bg-rose-50 text-rose-700 border border-rose-200"
                            )}
                          >
                            {(proj.status || "pending").replace("_", " ")}
                          </span>
                        </div>

                        {proj.description && (
                          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                            {proj.description}
                          </p>
                        )}

                        {proj.reviewComment && (
                          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900 space-y-1">
                            <span className="font-bold block text-amber-800">Execom Review Feedback:</span>
                            <p>{proj.reviewComment}</p>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                          <div className="flex items-center gap-3">
                            {proj.githubUrl && (
                              <a
                                href={proj.githubUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-gray-600 hover:text-[#1A0D0C] font-semibold"
                              >
                                <GitBranch className="w-3.5 h-3.5" /> GitHub
                              </a>
                            )}
                            {proj.demoUrl && (
                              <a
                                href={proj.demoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-gray-600 hover:text-[#1A0D0C] font-semibold"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> Live Demo
                              </a>
                            )}
                          </div>

                          {proj.tags && proj.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {proj.tags.map((tag, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-md font-semibold text-gray-600"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center bg-gray-50/60 rounded-3xl border border-gray-100 flex flex-col items-center justify-center font-['Hanken_Grotesk']">
                    <FolderGit2 className="w-10 h-10 text-gray-300 mb-2" />
                    <p className="text-gray-600 font-bold text-sm">No projects found</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Modal Footer */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 shrink-0 font-['Hanken_Grotesk']">
            <span className="font-['Hanken_Grotesk']">
              Telemetry details verified by IEDC SJCET System
            </span>
            <button
              onClick={closeModal}
              className="px-5 py-2 rounded-full bg-[#1A0D0C] text-white font-semibold hover:bg-black transition-all cursor-pointer font-['Hanken_Grotesk']"
            >
              Done
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer Branding */}
      <div className="max-w-[1014px] pt-12 flex justify-end font-['Hanken_Grotesk']">
        <p className="w-[242px] h-[26px] text-[#AAA] text-right font-['Hanken_Grotesk'] text-[16px] font-normal leading-[94.331%] tracking-[-0.48px]">
          IEDC 2026 SJCET - TECH TEAM
        </p>
      </div>
    </div>
  );
}