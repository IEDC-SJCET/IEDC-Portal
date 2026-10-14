"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Send, FolderPlus, ArrowUpRight } from "lucide-react";
import { studentQueryKeys } from "@/lib/student-queries";

export default function SubmitProjectPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    githubUrl: "",
    demoUrl: "",
    tags: "",
  });

  const [lookingForContributors, setLookingForContributors] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [customRoleInput, setCustomRoleInput] = useState("");
  const [contributorDescription, setContributorDescription] = useState("");

  const presetDomains = ["Frontend", "UI/UX", "Backend", "AI/ML", "Security", "Mobile App", "DevOps"];

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const addCustomRole = () => {
    const trimmed = customRoleInput.trim();
    if (trimmed && !selectedRoles.includes(trimmed)) {
      setSelectedRoles((prev) => [...prev, trimmed]);
      setCustomRoleInput("");
    }
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const body = {
        ...form,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        teamMembers: [],
        lookingForContributors,
        contributorRoles: lookingForContributors ? selectedRoles : [],
        contributorDescription: lookingForContributors ? contributorDescription.trim() || null : null,
      };

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: studentQueryKeys.projectLists });
        queryClient.invalidateQueries({ queryKey: studentQueryKeys.profile });
        router.push("/student/projects");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to submit project");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6 font-['Hanken_Grotesk'] text-[#1A0D0C] pb-16">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between py-1">
        <button
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
            } else {
              router.push("/student/projects");
            }
          }}
          className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-100 cursor-pointer shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Projects
        </button>
      </div>

      {/* Main Submission Card Container */}
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="relative w-full bg-white rounded-[38px] border border-gray-100/80 p-8 md:p-10 shadow-sm space-y-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-[220px] h-[36px] rounded-bl-[55px] bg-gradient-to-b from-[#FF0000] to-[#990000] flex items-center justify-center text-white font-['Hanken_Grotesk'] text-[14px] font-semibold tracking-[-0.4px] z-10 shadow-xs">
            SUBMIT INNOVATION
          </div>

          <div className="space-y-1 pt-2">
            <h1 className="text-[32px] sm:text-[40px] font-semibold text-[#1A0D0C] tracking-[-1.2px] leading-tight flex items-center gap-3">
              Submit Project
            </h1>
            <p className="text-[16px] sm:text-[18px] font-semibold text-[#B0B0B0] tracking-[-0.5px] leading-snug">
              Share your project details with the IEDC SJCET community &amp; Execom reviewers
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-[#1A0D0C]">
                Project Title <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                className="rounded-2xl h-[46px] text-sm px-4 focus:border-[#1A0D0C]"
                placeholder="e.g. Smart Campus IoT Monitoring System"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-[#1A0D0C]">Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                className="rounded-2xl resize-none text-sm p-4 min-h-[120px] focus:border-[#1A0D0C]"
                placeholder="Describe your project, key features, technology stack, and real-world impact..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-[#1A0D0C]">GitHub Repository URL</Label>
                <Input
                  value={form.githubUrl}
                  onChange={(e) => handleChange("githubUrl", e.target.value)}
                  className="rounded-2xl h-[46px] text-sm px-4 focus:border-[#1A0D0C]"
                  placeholder="https://github.com/username/repo"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-[#1A0D0C]">Live Demo / Deployment URL</Label>
                <Input
                  value={form.demoUrl}
                  onChange={(e) => handleChange("demoUrl", e.target.value)}
                  className="rounded-2xl h-[46px] text-sm px-4 focus:border-[#1A0D0C]"
                  placeholder="https://demo.example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-[#1A0D0C]">Tags (Comma-separated)</Label>
              <Input
                value={form.tags}
                onChange={(e) => handleChange("tags", e.target.value)}
                className="rounded-2xl h-[46px] text-sm px-4 focus:border-[#1A0D0C]"
                placeholder="e.g. React, Next.js, IoT, AI, Hardware"
              />
            </div>

            {/* Looking for Contributors Card Section */}
            <div className="p-5 sm:p-6 rounded-[28px] bg-gradient-to-b from-[#FAF8F5] to-[#F5F2EC] border border-[#EAE3D2] space-y-4 font-['Hanken_Grotesk'] shadow-2xs">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="text-sm font-bold text-[#1A0D0C] tracking-tight">Looking for Contributors?</h3>
                  </div>
                  <p className="text-xs text-gray-500">
                    Invite other students to collaborate on your project in domains like Frontend, UI/UX, AI/ML, etc.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={lookingForContributors}
                    onChange={(e) => setLookingForContributors(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1A0D0C]" />
                </label>
              </div>

              {lookingForContributors && (
                <div className="space-y-4 pt-3 border-t border-[#E5DEC9] animate-in fade-in duration-200">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-[#1A0D0C]">
                      Select Required Domains / Roles
                    </Label>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {presetDomains.map((domain) => {
                        const isSelected = selectedRoles.includes(domain);
                        return (
                          <button
                            key={domain}
                            type="button"
                            onClick={() => toggleRole(domain)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${isSelected
                              ? "bg-[#1A0D0C] text-white border-[#1A0D0C] shadow-2xs"
                              : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                              }`}
                          >
                            {domain} {isSelected ? "✓" : "+"}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Role Input */}
                    <div className="flex items-center gap-2 pt-2">
                      <Input
                        value={customRoleInput}
                        onChange={(e) => setCustomRoleInput(e.target.value)}
                        placeholder="Add custom role (e.g. CyberSecurity, Data Analyst)..."
                        className="rounded-full h-[36px] text-xs px-4 bg-white"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCustomRole();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={addCustomRole}
                        className="h-[36px] px-4 rounded-full bg-gray-200 hover:bg-gray-300 text-[#1A0D0C] text-xs font-semibold shrink-0 cursor-pointer"
                      >
                        Add
                      </button>
                    </div>

                    {selectedRoles.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        <span className="text-[11px] font-semibold text-gray-500 self-center mr-1">Selected:</span>
                        {selectedRoles.map((role) => (
                          <span
                            key={role}
                            className="bg-emerald-100 text-emerald-900 border border-emerald-300/80 px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1"
                          >
                            {role}
                            <button
                              type="button"
                              onClick={() => toggleRole(role)}
                              className="hover:text-red-600 cursor-pointer ml-0.5"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#1A0D0C]">
                      Contributor Expectations / Details (Optional)
                    </Label>
                    <Textarea
                      value={contributorDescription}
                      onChange={(e) => setContributorDescription(e.target.value)}
                      placeholder="Briefly describe what tasks contributors will work on, weekly time commitment, or skills preferred..."
                      className="rounded-2xl resize-none text-xs p-3 bg-white border-gray-200"
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-xs font-semibold rounded-2xl p-4 border border-red-100">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-between w-full sm:w-[210px] h-[44px] pl-[22px] pr-[10px] py-[6px] rounded-[31px] text-white text-[15px] font-semibold tracking-[-0.45px] transition-transform active:scale-95 shadow-sm disabled:opacity-50 cursor-pointer"
                style={{
                  background:
                    "radial-gradient(133.5% 127.27% at 48.91% 127.27%, rgba(89, 7, 8, 0.23) 0%, rgba(102, 102, 102, 0.00) 100%), #0F0A0A",
                }}
              >
                <span>{loading ? "Submitting..." : "Submit Project"}</span>
                <span className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center shrink-0">
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-black" />
                  )}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="max-w-3xl mx-auto pt-10 flex justify-end">
        <p className="w-[242px] h-[26px] text-[#AAA] text-right font-['Hanken_Grotesk'] text-[16px] font-normal leading-[94.331%] tracking-[-0.48px]">
          IEDC 2026 SJCET - TECH TEAM
        </p>
      </div>
    </div>
  );
}