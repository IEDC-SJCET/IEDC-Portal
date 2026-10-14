"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  FolderOpen,
  ExternalLink,
  GitBranch,
  MessageSquare,
  RotateCcw,
  Pencil,
  Loader2,
  Search,
  Plus,
  ArrowUpRight,
  UserPlus,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Globe,
  Award,
  Sparkles,
  Building2,
  GraduationCap,
  Mail,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  STUDENT_STALE_TIMES,
  fetchJson,
  studentQueryKeys,
} from "@/lib/student-queries";

const LinkedinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
  </svg>
);

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

interface ProjectData {
  id: string;
  title: string;
  description: string | null;
  githubUrl: string | null;
  demoUrl: string | null;
  tags: string[];
  lookingForContributors?: boolean;
  contributorRoles?: string[];
  contributorDescription?: string | null;
  status: string | null;
  reviewComment?: string | null;
  submittedAt: string | null;
  submittedBy?: string | null;
  studentName?: string | null;
  department?: string | null;
}

interface ApplicantProfile {
  id: string;
  name: string;
  email: string;
  department: string;
  batch: string;
  admissionNumber: string;
  iecdId: string;
  phone?: string | null;
  bio?: string | null;
  skills?: string[];
  interests?: string[];
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  behanceUrl?: string | null;
  portfolioUrl?: string | null;
  totalPoints?: number;
}

interface CollaborationItem {
  id: string;
  projectId: string;
  applicantId: string;
  domain: string;
  message?: string | null;
  status: "pending" | "accepted" | "rejected";
  appliedAt: string;
  applicant: ApplicantProfile;
}

interface MyApplication {
  id: string;
  projectId: string;
  domain: string;
  message?: string | null;
  status: "pending" | "accepted" | "rejected";
  appliedAt: string | null;
  project?: ProjectData | null;
}

async function fetchProjects(view: "browse" | "my"): Promise<ProjectData[]> {
  const url =
    view === "browse"
      ? "/api/projects?status=approved&limit=30"
      : "/api/projects?my=true";
  const data = await fetchJson<{ projects?: Record<string, unknown>[] }>(url);
  const rawList: Record<string, unknown>[] = data.projects || [];
  return rawList.map((p) => ({
    id: p.id as string,
    title: (p.title as string) || "Untitled Project",
    description: (p.description as string) || null,
    githubUrl: (p.githubUrl as string) || (p.github_url as string) || null,
    demoUrl: (p.demoUrl as string) || (p.demo_url as string) || null,
    tags: (p.tags as string[]) || [],
    lookingForContributors: Boolean(p.lookingForContributors ?? p.looking_for_contributors),
    contributorRoles: (p.contributorRoles as string[]) || (p.contributor_roles as string[]) || [],
    contributorDescription: (p.contributorDescription as string) || (p.contributor_description as string) || null,
    status: (p.status as string) || "pending",
    reviewComment:
      (p.reviewComment as string) || (p.review_comment as string) || null,
    submittedAt:
      (p.submittedAt as string) || (p.submitted_at as string) || null,
    submittedBy: (p.submittedBy as string) || (p.submitted_by as string) || null,
    studentName: (p.studentName as string) || (p.student_name as string) || null,
    department: (p.department as string) || null,
  }));
}

export default function StudentProjectsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"browse" | "my" | "collabs">("browse");
  const [searchQuery, setSearchQuery] = useState("");

  // Edit / Resubmit state
  const [editingProject, setEditingProject] = useState<ProjectData | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    githubUrl: "",
    demoUrl: "",
    tags: "",
  });
  const [resubmitting, setResubmitting] = useState(false);
  const [resubmitError, setResubmitError] = useState("");

  // Apply to Contribute state
  const [applyingProject, setApplyingProject] = useState<ProjectData | null>(null);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [customDomainInput, setCustomDomainInput] = useState("");
  const [applyMessage, setApplyMessage] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [applySuccess, setApplySuccess] = useState("");

  // Manage Applicants state (Project Owner view)
  const [managingProject, setManagingProject] = useState<ProjectData | null>(null);
  const [collaborations, setCollaborations] = useState<CollaborationItem[]>([]);
  const [loadingCollaborations, setLoadingCollaborations] = useState(false);
  const [updatingCollabId, setUpdatingCollabId] = useState<string | null>(null);

  // Applicant Profile Viewer Modal state
  const [viewingApplicantProfile, setViewingApplicantProfile] = useState<ApplicantProfile | null>(null);

  const [viewingApplicationsFor, setViewingApplicationsFor] = useState<ProjectData | null>(null);

  // The Collabs tab is rendered from the student's accepted applications,
  // which already carry their project payload, so no project list is fetched.
  const projectsView = activeTab === "collabs" ? null : activeTab;
  const projectsQuery = useQuery({
    queryKey: studentQueryKeys.projectList(projectsView ?? "browse"),
    queryFn: () => fetchProjects(projectsView ?? "browse"),
    enabled: projectsView !== null,
    staleTime:
      projectsView === "browse" ? STUDENT_STALE_TIMES.approvedProjects : undefined,
  });
  const projects = projectsView ? projectsQuery.data ?? [] : [];
  const loading = projectsView !== null && projectsQuery.isPending;

  // Collaboration requests sent by the signed-in student
  const { data: myApplicationsData } = useQuery({
    queryKey: studentQueryKeys.myApplications,
    queryFn: () =>
      fetchJson<{ applications?: MyApplication[]; profileId?: string | null }>(
        "/api/projects/my-applications"
      ),
  });
  const myApplications = myApplicationsData?.applications || [];
  const myProfileId = myApplicationsData?.profileId || null;

  const applicationsFor = (projectId: string) =>
    myApplications.filter((a) => a.projectId === projectId);

  const isAcceptedCollaborator = (projectId: string) =>
    myApplications.some((a) => a.projectId === projectId && a.status === "accepted");

  // Projects the student was accepted to collaborate on, deduped across domains
  const collabProjects: ProjectData[] = Array.from(
    myApplications
      .filter((a) => a.status === "accepted" && a.project)
      .reduce((map, a) => {
        if (!map.has(a.projectId)) map.set(a.projectId, a.project as ProjectData);
        return map;
      }, new Map<string, ProjectData>())
      .values()
  );

  const visibleProjects =
    activeTab === "collabs"
      ? collabProjects
      : activeTab === "browse"
        ? projects.filter((p) => !isAcceptedCollaborator(p.id))
        : projects;

  const filteredProjects = visibleProjects.filter((project) => {
    const title = project.title.toLowerCase();
    const desc = (project.description || "").toLowerCase();
    const tags = (project.tags || []).join(" ").toLowerCase();
    const roles = (project.contributorRoles || []).join(" ").toLowerCase();
    const query = searchQuery.toLowerCase().trim();

    return !query || title.includes(query) || desc.includes(query) || tags.includes(query) || roles.includes(query);
  });

  const openEditModal = (project: ProjectData) => {
    setEditingProject(project);
    setEditForm({
      title: project.title || "",
      description: project.description || "",
      githubUrl: project.githubUrl || "",
      demoUrl: project.demoUrl || "",
      tags: (project.tags || []).join(", "),
    });
    setResubmitError("");
  };

  const closeEditModal = () => {
    setEditingProject(null);
    setResubmitError("");
  };

  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    setResubmitting(true);
    setResubmitError("");

    try {
      const body = {
        title: editForm.title,
        description: editForm.description,
        githubUrl: editForm.githubUrl,
        demoUrl: editForm.demoUrl,
        tags: editForm.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };

      const res = await fetch(`/api/projects/${editingProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        closeEditModal();
        queryClient.invalidateQueries({ queryKey: studentQueryKeys.projectLists });
      } else {
        const data = await res.json();
        setResubmitError(data.error || "Failed to resubmit project");
      }
    } catch {
      setResubmitError("Something went wrong while updating project");
    } finally {
      setResubmitting(false);
    }
  };

  // Open Apply to Contribute modal
  const openApplyModal = (project: ProjectData) => {
    setApplyingProject(project);
    const appliedDomains = applicationsFor(project.id).map((a) => a.domain);
    const roles = (project.contributorRoles || []).filter(
      (role) => !appliedDomains.includes(role)
    );
    setSelectedDomain(roles.length > 0 ? roles[0] : "");
    setCustomDomainInput("");
    setApplyMessage("");
    setApplyError("");
    setApplySuccess("");
  };

  // Submit Collaboration Application
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingProject) return;

    const domainToApply = selectedDomain === "custom" ? customDomainInput.trim() : selectedDomain;
    if (!domainToApply) {
      setApplyError("Please select or specify a contribution domain.");
      return;
    }

    setApplying(true);
    setApplyError("");
    setApplySuccess("");

    try {
      const res = await fetch(`/api/projects/${applyingProject.id}/collaborations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: domainToApply,
          message: applyMessage.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setApplySuccess(`Application submitted successfully for ${domainToApply}!`);
        queryClient.invalidateQueries({ queryKey: studentQueryKeys.myApplications });
        setTimeout(() => {
          setApplyingProject(null);
          setApplySuccess("");
        }, 1800);
      } else {
        setApplyError(data.error || "Failed to submit collaboration application.");
      }
    } catch {
      setApplyError("Something went wrong while submitting application.");
    } finally {
      setApplying(false);
    }
  };

  // Fetch collaboration applications for owner
  const openManageApplicantsModal = async (project: ProjectData) => {
    setManagingProject(project);
    setLoadingCollaborations(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/collaborations`);
      if (res.ok) {
        const data = await res.json();
        setCollaborations(data.collaborations || []);
      } else {
        setCollaborations([]);
      }
    } catch (error) {
      console.error("Failed to fetch collaborations:", error);
      setCollaborations([]);
    } finally {
      setLoadingCollaborations(false);
    }
  };

  // Update applicant collaboration status (Accept / Reject)
  const handleUpdateCollaborationStatus = async (
    collaborationId: string,
    newStatus: "accepted" | "rejected"
  ) => {
    if (!managingProject) return;
    setUpdatingCollabId(collaborationId);
    try {
      const res = await fetch(
        `/api/projects/${managingProject.id}/collaborations/${collaborationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (res.ok) {
        setCollaborations((prev) =>
          prev.map((c) => (c.id === collaborationId ? { ...c, status: newStatus } : c))
        );
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdatingCollabId(null);
    }
  };

  const getApplicationStatusBadge = (status: string | null) => {
    switch (status) {
      case "accepted":
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full text-[11px] font-bold px-2.5 py-0.5 shrink-0 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Accepted
          </span>
        );
      case "rejected":
        return (
          <span className="bg-rose-50 text-rose-700 border border-rose-200/80 rounded-full text-[11px] font-bold px-2.5 py-0.5 shrink-0 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      case "pending":
      default:
        return (
          <span className="bg-amber-50 text-amber-800 border border-amber-200/80 rounded-full text-[11px] font-bold px-2.5 py-0.5 shrink-0 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "approved":
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full text-xs font-semibold px-3 py-0.5 shrink-0">
            Approved
          </span>
        );
      case "changes_requested":
        return (
          <span className="bg-amber-50 text-amber-800 border border-amber-300/80 rounded-full text-xs font-semibold px-3 py-0.5 shrink-0">
            Changes Requested
          </span>
        );
      case "rejected":
        return (
          <span className="bg-rose-50 text-rose-700 border border-rose-200/80 rounded-full text-xs font-semibold px-3 py-0.5 shrink-0">
            Rejected
          </span>
        );
      case "pending":
      default:
        return (
          <span className="bg-blue-50 text-blue-700 border border-blue-200/80 rounded-full text-xs font-semibold px-3 py-0.5 shrink-0">
            Pending Review
          </span>
        );
    }
  };

  return (
    <div className="w-full space-y-6 font-['Hanken_Grotesk'] text-[#1A0D0C] pb-16">
      {/* Hero Header Banner */}
      <div className="relative w-full max-w-[1014px] min-h-[203px] bg-white rounded-[38px] border border-gray-100/80 p-8 md:p-10 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-[240.16px] h-[37.24px] rounded-bl-[65px] bg-gradient-to-b from-[#FF0000] to-[#990000] flex items-center justify-center text-white font-['Hanken_Grotesk'] text-[15.2px] font-semibold tracking-[-0.456px] z-10 shadow-sm">
          IEDC SJCET INNOVATION
        </div>

        <div className="space-y-1 pt-2 md:pt-0 max-w-xl">
          <h1 className="text-[36px] sm:text-[46px] font-semibold text-[#1A0D0C] tracking-[-1.38px] leading-tight">
            Projects
          </h1>
          <p className="text-[16px] sm:text-[20px] font-semibold text-[#B0B0B0] tracking-[-0.6px] leading-snug">
            Browse community projects, recruit contributors, or apply to collaborate in your domain
          </p>
        </div>

        {/* Submit Action Button */}
        <div className="shrink-0 pt-2 md:pt-0">
          <Link
            href="/student/projects/submit"
            className="flex items-center justify-between w-[175px] h-[44px] pl-[22px] pr-[10px] py-[6px] rounded-[31px] text-white text-[15px] font-semibold tracking-[-0.45px] transition-transform active:scale-95 shadow-sm shrink-0"
            style={{
              background:
                "radial-gradient(133.5% 127.27% at 48.91% 127.27%, rgba(89, 7, 8, 0.23) 0%, rgba(102, 102, 102, 0.00) 100%), #0F0A0A",
            }}
          >
            <span>Submit Project</span>
            <span className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-black" />
            </span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="max-w-[1014px] space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
            <button
              onClick={() => setActiveTab("browse")}
              className={cn(
                "inline-flex items-center justify-center px-5 py-1.5 rounded-[26.92px] border text-[13.026px] font-medium tracking-[-0.391px] whitespace-nowrap transition-all duration-200 cursor-pointer h-[36px]",
                activeTab === "browse"
                  ? "bg-[#100A0A] border-[#A5A5A5] text-white shadow-sm"
                  : "bg-[#E2E2E2] border-[#A5A5A5] text-[#3C3C3C] hover:bg-gray-200"
              )}
            >
              Browse Projects
            </button>
            <button
              onClick={() => setActiveTab("my")}
              className={cn(
                "inline-flex items-center justify-center px-5 py-1.5 rounded-[26.92px] border text-[13.026px] font-medium tracking-[-0.391px] whitespace-nowrap transition-all duration-200 cursor-pointer h-[36px]",
                activeTab === "my"
                  ? "bg-[#100A0A] border-[#A5A5A5] text-white shadow-sm"
                  : "bg-[#E2E2E2] border-[#A5A5A5] text-[#3C3C3C] hover:bg-gray-200"
              )}
            >
              My Submissions
            </button>
            <button
              onClick={() => setActiveTab("collabs")}
              className={cn(
                "inline-flex items-center gap-1.5 justify-center px-5 py-1.5 rounded-[26.92px] border text-[13.026px] font-medium tracking-[-0.391px] whitespace-nowrap transition-all duration-200 cursor-pointer h-[36px]",
                activeTab === "collabs"
                  ? "bg-[#100A0A] border-[#A5A5A5] text-white shadow-sm"
                  : "bg-[#E2E2E2] border-[#A5A5A5] text-[#3C3C3C] hover:bg-gray-200"
              )}
            >
              Collabs
              {collabProjects.length > 0 && (
                <span
                  className={cn(
                    "min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                    activeTab === "collabs"
                      ? "bg-emerald-500 text-white"
                      : "bg-emerald-600 text-white"
                  )}
                >
                  {collabProjects.length}
                </span>
              )}
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-[280px] shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects, domains..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-[36px] pl-10 pr-4 rounded-[26.92px] bg-white border border-gray-200 text-xs font-medium placeholder:text-gray-400 focus:outline-none focus:border-[#1A0D0C] transition-colors shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Projects Grid / Skeleton / Empty States */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[1014px] pt-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="w-full h-[260px] bg-white rounded-[32px] border border-gray-100/80 p-6 animate-pulse flex flex-col justify-between shadow-xs"
            >
              <div className="space-y-3">
                <div className="h-6 bg-gray-100 rounded-xl w-2/3" />
                <div className="h-4 bg-gray-100 rounded-lg w-full" />
                <div className="h-4 bg-gray-100 rounded-lg w-4/5" />
              </div>
              <div className="h-8 bg-gray-100 rounded-full w-full" />
            </div>
          ))}
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[1014px] pt-2">
          {filteredProjects.map((project) => {
            const myApps = applicationsFor(project.id);
            const hasApplied = activeTab !== "my" && myApps.length > 0;
            const appliedDomains = myApps.map((a) => a.domain);
            const acceptedDomains = myApps
              .filter((a) => a.status === "accepted")
              .map((a) => a.domain);
            const isCollab = activeTab === "collabs";
            const isOwnProject =
              !!myProfileId && project.submittedBy === myProfileId;

            return (
            <div
              key={project.id}
              className={cn(
                "w-full bg-white rounded-[32px] border p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group relative overflow-hidden space-y-4",
                hasApplied ? "border-emerald-300/80" : "border-gray-100/90"
              )}
            >
              <div className="space-y-3">
                {/* Top header row */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-[#1A0D0C] text-lg leading-snug group-hover:text-[#990000] transition-colors">
                      {project.title}
                    </h3>
                    {project.studentName && (
                      <p className="text-[11px] font-medium text-gray-400 mt-0.5">
                        By {project.studentName} {project.department ? `• ${project.department}` : ""}
                      </p>
                    )}
                  </div>
                  {activeTab === "my" && getStatusBadge(project.status)}
                  {activeTab === "browse" && isOwnProject && (
                    <span className="bg-[#1A0D0C] text-white rounded-full text-xs font-bold px-3 py-0.5 shrink-0 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Your Project
                    </span>
                  )}
                  {hasApplied && !isOwnProject && (
                    <button
                      onClick={() => setViewingApplicationsFor(project)}
                      className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full text-xs font-bold px-3 py-0.5 shrink-0 flex items-center gap-1 hover:bg-emerald-100 transition-colors cursor-pointer"
                      title="View your application"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {isCollab ? "Collaborator" : "Applied"}
                    </button>
                  )}
                </div>

                {/* Description */}
                {project.description && (
                  <p className="text-xs sm:text-sm text-gray-500 leading-relaxed line-clamp-3">
                    {project.description}
                  </p>
                )}

                {/* Looking for Contributors Banner */}
                {project.lookingForContributors && (
                  <div className="p-3.5 rounded-[22px] bg-gradient-to-r from-emerald-50/90 to-teal-50/90 border border-emerald-200/80 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-xs font-bold text-emerald-900 tracking-tight">
                          Looking for Contributors
                        </span>
                      </div>
                      {activeTab === "browse" && !hasApplied && !isOwnProject && (
                        <button
                          onClick={() => openApplyModal(project)}
                          className="px-3 py-1 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold flex items-center gap-1 transition-all shadow-2xs cursor-pointer active:scale-95"
                        >
                          <UserPlus className="w-3 h-3" />
                          Apply
                        </button>
                      )}
                      {hasApplied && !isOwnProject && (
                        <button
                          onClick={() => setViewingApplicationsFor(project)}
                          className="px-3 py-1 rounded-full bg-white text-emerald-800 border border-emerald-300 text-[11px] font-bold flex items-center gap-1 transition-all shadow-2xs cursor-pointer active:scale-95 hover:bg-emerald-50"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          View Application
                        </button>
                      )}
                    </div>

                    {/* Contributor Roles tags */}
                    {project.contributorRoles && project.contributorRoles.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {project.contributorRoles.map((role, idx) => (
                          <span
                            key={idx}
                            className={cn(
                              "text-[10px] font-bold px-2.5 py-0.5 rounded-full border",
                              appliedDomains.includes(role)
                                ? "bg-emerald-700 text-white border-emerald-700"
                                : "bg-emerald-100/90 text-emerald-900 border-emerald-300/60"
                            )}
                          >
                            {role}
                            {appliedDomains.includes(role) ? " ✓" : ""}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Accepted collaboration roles */}
                {isCollab && acceptedDomains.length > 0 && (
                  <div className="p-3.5 rounded-[22px] bg-emerald-700 text-white space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-100">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      You are collaborating as
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {acceptedDomains.map((domain) => (
                        <span
                          key={domain}
                          className="bg-white/15 border border-white/25 text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                        >
                          {domain}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Execom Review Feedback Box */}
                {activeTab === "my" && project.reviewComment && (
                  <div className="p-4 rounded-[20px] bg-[#FAE9CF]/60 border border-[#EAE3D2] text-xs text-amber-950 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-amber-900">
                      <MessageSquare className="w-3.5 h-3.5" /> Execom Review Feedback:
                    </div>
                    <p className="leading-relaxed pl-5 text-amber-900/90">
                      {project.reviewComment}
                    </p>
                  </div>
                )}

                {/* Tags list */}
                {project.tags && project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {project.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-[11px] font-semibold text-gray-600 bg-gray-100/80 px-3 py-1 rounded-full border border-gray-200/60"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Footer Actions */}
              <div className="flex flex-wrap items-center justify-between pt-4 border-t border-gray-100/80 mt-auto gap-3">
                <div className="flex items-center gap-2.5">
                  {project.githubUrl && (
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-[#1A0D0C] font-semibold transition-colors bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200/60"
                    >
                      <GitBranch className="w-3.5 h-3.5" />
                      GitHub
                    </a>
                  )}
                  {project.demoUrl && (
                    <a
                      href={project.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-[#1A0D0C] font-semibold transition-colors bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200/60"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Demo
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Browse tab: owners manage their own project's applicants */}
                  {activeTab === "browse" &&
                    isOwnProject &&
                    project.lookingForContributors && (
                      <button
                        onClick={() => openManageApplicantsModal(project)}
                        className="h-[34px] px-4 rounded-full bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-98"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Applicants</span>
                      </button>
                    )}

                  {activeTab !== "my" &&
                    !isOwnProject &&
                    (project.lookingForContributors || hasApplied) &&
                    (hasApplied ? (
                      <button
                        onClick={() => setViewingApplicationsFor(project)}
                        className="h-[34px] px-4 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-98"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          {isCollab ? "My Role" : "Applied"}
                          {!isCollab && myApps.length > 1 ? ` (${myApps.length})` : ""}
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={() => openApplyModal(project)}
                        className="h-[34px] px-4 rounded-full bg-[#100A0A] hover:bg-[#2A2020] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-98"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Contribute</span>
                      </button>
                    ))}

                  {/* My Submissions tab: Manage Applicants button */}
                  {activeTab === "my" && project.lookingForContributors && (
                    <button
                      onClick={() => openManageApplicantsModal(project)}
                      className="h-[34px] px-4 rounded-full bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-98"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Applicants</span>
                    </button>
                  )}

                  {/* My Submissions tab: Edit button */}
                  {activeTab === "my" &&
                    (project.status === "changes_requested" ||
                      project.status === "rejected" ||
                      project.status === "pending") && (
                      <button
                        onClick={() => openEditModal(project)}
                        className="h-[34px] px-4 rounded-full bg-[#1A0D0C] hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    )}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="max-w-[1014px] bg-white rounded-[38px] border border-gray-100/80 p-12 md:p-16 text-center shadow-sm flex flex-col items-center justify-center my-4">
          <div className="w-20 h-20 rounded-full bg-[#FAE9CF] flex items-center justify-center mb-5 text-[#990000] shadow-inner">
            <FolderOpen className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-semibold text-[#1A0D0C] tracking-tight">
            {activeTab === "browse"
              ? "No Approved Projects Found"
              : activeTab === "collabs"
                ? "No Collaborations Yet"
                : "No Submissions Yet"}
          </h3>
          <p className="text-gray-400 text-sm sm:text-base max-w-md mt-2 leading-relaxed">
            {activeTab === "browse"
              ? searchQuery
                ? "No projects matched your search query. Try searching for something else."
                : "Be the first student to submit and showcase your technical project!"
              : activeTab === "collabs"
                ? searchQuery
                  ? "None of your collaborations matched your search query."
                  : "Projects you get accepted to contribute on will show up here. Apply from the Browse Projects tab."
                : "You haven't submitted any projects yet. Share your project with the IEDC SJCET community."}
          </p>

          {activeTab !== "collabs" && (
            <Link
              href="/student/projects/submit"
              className="mt-6 inline-flex items-center justify-between w-[175px] h-[40px] pl-[20px] pr-[8px] py-[5px] rounded-[31px] text-white text-[14px] font-semibold tracking-[-0.45px] transition-transform active:scale-95 shadow-sm"
              style={{
                background:
                  "radial-gradient(133.5% 127.27% at 48.91% 127.27%, rgba(89, 7, 8, 0.23) 0%, rgba(102, 102, 102, 0.00) 100%), #0F0A0A",
              }}
            >
              <span>Submit Project</span>
              <span className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center">
                <ArrowUpRight className="w-3.5 h-3.5 text-black" />
              </span>
            </Link>
          )}
        </div>
      )}

      {/* 0. MY APPLICATION MODAL (APPLICANT VIEW) */}
      <Dialog
        open={!!viewingApplicationsFor}
        onOpenChange={() => setViewingApplicationsFor(null)}
      >
        <DialogContent className="sm:max-w-md rounded-[32px] p-6 sm:p-8 bg-white border border-gray-100 shadow-2xl space-y-5 font-['Hanken_Grotesk'] text-[#1A0D0C] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#1A0D0C] flex items-center gap-2 tracking-tight">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Your Application
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-1">
              Domains you applied to contribute in on{" "}
              <span className="font-bold text-gray-900">
                {viewingApplicationsFor?.title}
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {(viewingApplicationsFor
              ? applicationsFor(viewingApplicationsFor.id)
              : []
            ).map((app) => (
              <div
                key={app.id}
                className="p-4 rounded-[22px] border border-gray-100 bg-gray-50/70 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Domain / Role
                    </p>
                    <p className="text-sm font-bold text-[#1A0D0C]">{app.domain}</p>
                  </div>
                  {getApplicationStatusBadge(app.status)}
                </div>

                {app.message && (
                  <div className="pt-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Your Pitch Note
                    </p>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {app.message}
                    </p>
                  </div>
                )}

                {app.appliedAt && (
                  <p className="text-[11px] text-gray-400 font-medium">
                    Applied on{" "}
                    {new Date(app.appliedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setViewingApplicationsFor(null)}
              className="rounded-full text-xs px-5 h-[38px]"
            >
              Close
            </Button>
            <button
              type="button"
              onClick={() => {
                const project = viewingApplicationsFor;
                setViewingApplicationsFor(null);
                if (project) openApplyModal(project);
              }}
              className="h-[38px] px-5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Apply for another role
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 1. APPLY TO CONTRIBUTE MODAL */}
      <Dialog open={!!applyingProject} onOpenChange={() => setApplyingProject(null)}>
        <DialogContent className="sm:max-w-md rounded-[32px] p-6 sm:p-8 bg-white border border-gray-100 shadow-2xl space-y-5 font-['Hanken_Grotesk'] text-[#1A0D0C]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#1A0D0C] flex items-center gap-2 tracking-tight">
              <UserPlus className="w-5 h-5 text-emerald-600" /> Apply for Collaboration
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-1">
              Select your domain of interest and submit your request to contribute to <span className="font-bold text-gray-900">{applyingProject?.title}</span>.
            </DialogDescription>
          </DialogHeader>

          {applyingProject?.contributorDescription && (
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 text-xs text-emerald-950 space-y-1">
              <span className="font-bold block text-emerald-900">Project Expectations:</span>
              <p className="leading-relaxed">{applyingProject.contributorDescription}</p>
            </div>
          )}

          <form onSubmit={handleApplySubmit} className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-[#1A0D0C]">
                Select Domain / Role <span className="text-rose-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {(applyingProject?.contributorRoles || []).map((role) => {
                  const alreadyApplied = applyingProject
                    ? applicationsFor(applyingProject.id).some((a) => a.domain === role)
                    : false;
                  return (
                    <button
                      key={role}
                      type="button"
                      disabled={alreadyApplied}
                      onClick={() => setSelectedDomain(role)}
                      title={alreadyApplied ? "You have already applied for this role" : undefined}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${alreadyApplied
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 cursor-not-allowed"
                        : selectedDomain === role
                          ? "bg-[#100A0A] text-white border-[#100A0A] shadow-2xs cursor-pointer"
                          : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 cursor-pointer"
                        }`}
                    >
                      {alreadyApplied
                        ? `${role} · Applied`
                        : `${role} ${selectedDomain === role ? "✓" : ""}`}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setSelectedDomain("custom")}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${selectedDomain === "custom"
                    ? "bg-[#100A0A] text-white border-[#100A0A] shadow-2xs"
                    : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                    }`}
                >
                  Other Custom Role
                </button>
              </div>

              {selectedDomain === "custom" && (
                <Input
                  value={customDomainInput}
                  onChange={(e) => setCustomDomainInput(e.target.value)}
                  placeholder="Specify domain (e.g. Mobile App, QA, Data Science)..."
                  className="rounded-2xl h-[40px] text-xs px-4 mt-2"
                  required
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1A0D0C]">
                Pitch Note / Experience (Optional)
              </Label>
              <Textarea
                value={applyMessage}
                onChange={(e) => setApplyMessage(e.target.value)}
                placeholder="Briefly state your relevant skills, past work, or why you're excited to contribute..."
                className="rounded-2xl resize-none text-xs p-3 min-h-[90px]"
              />
            </div>

            {applyError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-semibold">
                {applyError}
              </div>
            )}

            {applySuccess && (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{applySuccess}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setApplyingProject(null)}
                className="rounded-full text-xs px-5 h-[38px]"
                disabled={applying}
              >
                Cancel
              </Button>
              <button
                type="submit"
                disabled={applying}
                className="h-[38px] px-6 rounded-full text-white text-xs font-semibold transition-transform active:scale-95 shadow-sm disabled:opacity-50 cursor-pointer flex items-center justify-center"
                style={{
                  background:
                    "radial-gradient(133.5% 127.27% at 48.91% 127.27%, rgba(89, 7, 8, 0.23) 0%, rgba(102, 102, 102, 0.00) 100%), #0F0A0A",
                }}
              >
                {applying ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Submitting...
                  </>
                ) : (
                  "Submit Application"
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. MANAGE APPLICANTS MODAL (FOR PROJECT OWNER) */}
      <Dialog open={!!managingProject} onOpenChange={() => setManagingProject(null)}>
        <DialogContent className="sm:max-w-2xl rounded-[32px] p-6 sm:p-8 bg-white border border-gray-100 shadow-2xl space-y-5 font-['Hanken_Grotesk'] text-[#1A0D0C] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#1A0D0C] flex items-center gap-2 tracking-tight">
              <Users className="w-5 h-5 text-emerald-700" /> Manage Collaboration Applications
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-1">
              Review candidates who applied to contribute to <span className="font-bold text-gray-900">{managingProject?.title}</span>. Accept or reject requests after inspecting their profile.
            </DialogDescription>
          </DialogHeader>

          {loadingCollaborations ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
              <p className="text-xs text-gray-500">Loading applicant requests...</p>
            </div>
          ) : collaborations.length > 0 ? (
            <div className="space-y-3 pt-1">
              {collaborations.map((collab) => {
                const { applicant } = collab;
                const isPending = collab.status === "pending";
                const isAccepted = collab.status === "accepted";
                const isRejected = collab.status === "rejected";

                return (
                  <div
                    key={collab.id}
                    className="p-4 sm:p-5 rounded-[24px] bg-gray-50/80 border border-gray-200/70 space-y-3 transition-all hover:bg-gray-50"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#F59E0B] flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0">
                          {applicant.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-[#1A0D0C]">{applicant.name}</h4>
                            <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              {collab.domain}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {applicant.department} • Batch {applicant.batch} • {applicant.admissionNumber}
                          </p>
                        </div>
                      </div>

                      {/* Status Tag */}
                      <div>
                        {isAccepted && (
                          <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full text-xs font-bold px-3 py-1 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Accepted
                          </span>
                        )}
                        {isRejected && (
                          <span className="bg-rose-100 text-rose-900 border border-rose-300 rounded-full text-xs font-bold px-3 py-1 inline-flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5 text-rose-700" /> Rejected
                          </span>
                        )}
                        {isPending && (
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-xs font-bold px-3 py-1">
                            Pending Review
                          </span>
                        )}
                      </div>
                    </div>

                    {collab.message && (
                      <p className="text-xs text-gray-600 bg-white p-3 rounded-xl border border-gray-200/60 leading-relaxed italic">
                        "{collab.message}"
                      </p>
                    )}

                    {/* Actions row */}
                    <div className="flex flex-wrap items-center justify-between pt-2 border-t border-gray-200/60 gap-2">
                      <button
                        type="button"
                        onClick={() => setViewingApplicantProfile(applicant)}
                        className="text-xs font-bold text-gray-700 hover:text-black flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-2xs hover:bg-gray-100 cursor-pointer transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" /> View Candidate Profile
                      </button>

                      {isPending && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={updatingCollabId === collab.id}
                            onClick={() => handleUpdateCollaborationStatus(collab.id, "rejected")}
                            className="px-3.5 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold cursor-pointer border border-rose-200/70 transition-all active:scale-95"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            disabled={updatingCollabId === collab.id}
                            onClick={() => handleUpdateCollaborationStatus(collab.id, "accepted")}
                            className="px-4 py-1.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer shadow-2xs transition-all active:scale-95 flex items-center gap-1"
                          >
                            {updatingCollabId === collab.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : null}
                            Accept Candidate
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center space-y-2">
              <Users className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-sm font-semibold text-gray-600">No applicants yet</p>
              <p className="text-xs text-gray-400 max-w-xs mx-auto">
                Students will be able to apply to collaborate on this project from the Browse Projects section.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 3. CANDIDATE PROFILE CARD MODAL */}
      <Dialog open={!!viewingApplicantProfile} onOpenChange={() => setViewingApplicantProfile(null)}>
        <DialogContent className="sm:max-w-lg rounded-[36px] p-6 sm:p-8 bg-white border border-gray-100 shadow-2xl space-y-5 font-['Hanken_Grotesk'] text-[#1A0D0C]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1A0D0C] flex items-center gap-2">
              Candidate Profile
            </DialogTitle>
          </DialogHeader>

          {viewingApplicantProfile && (
            <div className="space-y-5 pt-1">
              {/* Header profile card */}
              <div className="p-5 rounded-[28px] bg-gradient-to-br from-[#100A0A] to-[#2B2020] text-white space-y-3 shadow-md relative overflow-hidden">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-[#F59E0B] flex items-center justify-center text-white font-bold text-xl shadow-md shrink-0 border-2 border-white/20">
                    {viewingApplicantProfile.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <h3 className="font-bold text-lg text-white truncate">{viewingApplicantProfile.name}</h3>
                    <p className="text-xs text-amber-400 font-medium truncate flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5" />
                      {viewingApplicantProfile.department} • Batch {viewingApplicantProfile.batch}
                    </p>
                    <p className="text-[11px] text-gray-300 font-mono">
                      IEDC ID: {viewingApplicantProfile.iecdId}
                    </p>
                  </div>
                </div>

                {viewingApplicantProfile.totalPoints !== undefined && (
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                    <span className="text-gray-300 font-medium">Activity Score:</span>
                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" /> {viewingApplicantProfile.totalPoints} pts
                    </span>
                  </div>
                )}
              </div>

              {/* Bio */}
              {viewingApplicantProfile.bio && (
                <div className="space-y-1">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">About Candidate</span>
                  <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-2xl border border-gray-100 leading-relaxed">
                    {viewingApplicantProfile.bio}
                  </p>
                </div>
              )}

              {/* Skills */}
              {viewingApplicantProfile.skills && viewingApplicantProfile.skills.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Technical Skills</span>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingApplicantProfile.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="bg-gray-100 text-gray-800 text-xs font-semibold px-3 py-1 rounded-full border border-gray-200"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Social / Portfolio Links */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Links &amp; Profiles</span>
                <div className="flex flex-wrap gap-2">
                  {viewingApplicantProfile.linkedinUrl && (
                    <a
                      href={viewingApplicantProfile.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold border border-blue-200 transition-colors"
                    >
                      <LinkedinIcon className="w-3.5 h-3.5" /> LinkedIn
                    </a>
                  )}
                  {viewingApplicantProfile.githubUrl && (
                    <a
                      href={viewingApplicantProfile.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gray-100 text-gray-800 hover:bg-gray-200 text-xs font-semibold border border-gray-200 transition-colors"
                    >
                      <GithubIcon className="w-3.5 h-3.5" /> GitHub
                    </a>
                  )}
                  {viewingApplicantProfile.portfolioUrl && (
                    <a
                      href={viewingApplicantProfile.portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-semibold border border-purple-200 transition-colors"
                    >
                      <Globe className="w-3.5 h-3.5" /> Portfolio
                    </a>
                  )}
                  {viewingApplicantProfile.email && (
                    <a
                      href={`mailto:${viewingApplicantProfile.email}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold border border-emerald-200 transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5" /> {viewingApplicantProfile.email}
                    </a>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setViewingApplicantProfile(null)}
                  className="rounded-full text-xs px-5 h-[36px]"
                >
                  Close Profile
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit & Resubmit Modal Dialog */}
      <Dialog open={!!editingProject} onOpenChange={closeEditModal}>
        <DialogContent className="sm:max-w-lg rounded-[32px] p-6 sm:p-8 bg-white border border-gray-100 shadow-2xl space-y-5">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#1A0D0C] flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-[#990000]" /> Edit &amp; Resubmit Project
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Update your project details according to Execom review feedback and submit for re-evaluation.
            </DialogDescription>
          </DialogHeader>

          {editingProject?.reviewComment && (
            <div className="p-4 rounded-[20px] bg-[#FAE9CF]/60 border border-[#EAE3D2] text-xs text-amber-950 space-y-1">
              <span className="font-bold block text-amber-900">Execom Feedback:</span>
              <p className="leading-relaxed">{editingProject.reviewComment}</p>
            </div>
          )}

          <form onSubmit={handleResubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1A0D0C]">Project Title</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="rounded-2xl text-xs h-[42px]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1A0D0C]">Description</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="rounded-2xl text-xs resize-none p-3"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1A0D0C]">GitHub URL</Label>
                <Input
                  value={editForm.githubUrl}
                  onChange={(e) => setEditForm({ ...editForm, githubUrl: e.target.value })}
                  className="rounded-2xl text-xs h-[42px]"
                  placeholder="https://github.com/..."
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1A0D0C]">Demo URL</Label>
                <Input
                  value={editForm.demoUrl}
                  onChange={(e) => setEditForm({ ...editForm, demoUrl: e.target.value })}
                  className="rounded-2xl text-xs h-[42px]"
                  placeholder="https://demo.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1A0D0C]">Tags (comma-separated)</Label>
              <Input
                value={editForm.tags}
                onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                className="rounded-2xl text-xs h-[42px]"
                placeholder="React, IoT, AI"
              />
            </div>

            {resubmitError && (
              <p className="text-xs text-red-600 font-semibold">{resubmitError}</p>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={closeEditModal}
                className="rounded-full text-xs px-5 h-[38px]"
              >
                Cancel
              </Button>
              <button
                type="submit"
                disabled={resubmitting}
                className="h-[38px] px-6 rounded-full text-white text-xs font-semibold transition-transform active:scale-95 shadow-sm disabled:opacity-50 cursor-pointer flex items-center justify-center"
                style={{
                  background:
                    "radial-gradient(133.5% 127.27% at 48.91% 127.27%, rgba(89, 7, 8, 0.23) 0%, rgba(102, 102, 102, 0.00) 100%), #0F0A0A",
                }}
              >
                {resubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Resubmitting...
                  </>
                ) : (
                  "Resubmit for Review"
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mobile Floating Action Button */}
      <Link href="/student/projects/submit" className="md:hidden fixed bottom-20 right-4 z-40">
        <div
          className="rounded-full w-14 h-14 text-white shadow-xl flex items-center justify-center cursor-pointer transition-transform active:scale-95"
          style={{
            background:
              "radial-gradient(133.5% 127.27% at 48.91% 127.27%, rgba(89, 7, 8, 0.23) 0%, rgba(102, 102, 102, 0.00) 100%), #0F0A0A",
          }}
        >
          <Plus className="w-6 h-6 text-white" />
        </div>
      </Link>

      <div className="max-w-[1014px] pt-12 flex justify-end">
        <p className="w-[242px] h-[26px] text-[#AAA] text-right font-['Hanken_Grotesk'] text-[16px] font-normal leading-[94.331%] tracking-[-0.48px]">
          IEDC 2026 SJCET - TECH TEAM
        </p>
      </div>
    </div>
  );
}