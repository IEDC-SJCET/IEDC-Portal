"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Award,
  Download,
  Eye,
  Search,
  Calendar,
  MapPin,
  CheckCircle2,
  ArrowUpRight,
  ShieldCheck,
  FileCheck,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface CertificateItem {
  id: string;
  certificateNumber: string;
  certificateUrl: string;
  issuedAt: string;
  eventId?: string | null;
  eventTitle?: string | null;
  eventType?: string | null;
  eventVenue?: string | null;
  eventStartDatetime?: string | null;
}

const FILTER_ITEMS = [
  { key: "all", label: "All Certificates" },
  { key: "workshop", label: "Workshops" },
  { key: "hackathon", label: "Hackathons" },
  { key: "seminar", label: "Seminars" },
  { key: "competition", label: "Competitions" },
];

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedCert, setSelectedCert] = useState<CertificateItem | null>(null);

  useEffect(() => {
    async function fetchCertificates() {
      try {
        const res = await fetch("/api/student/certificates");
        if (res.ok) {
          const data = await res.json();
          setCertificates(data.certificates || []);
        }
      } catch (err) {
        console.error("Failed to fetch student certificates:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCertificates();
  }, []);

  const filteredCertificates = certificates.filter((cert) => {
    const title = (cert.eventTitle || "Event Certificate").toLowerCase();
    const certNum = (cert.certificateNumber || "").toLowerCase();
    const query = searchQuery.toLowerCase().trim();

    const matchesSearch =
      !query || title.includes(query) || certNum.includes(query);

    const certType = (cert.eventType || "").toLowerCase();
    let matchesTab = activeTab === "all";
    if (!matchesTab) {
      matchesTab = certType.includes(activeTab);
    }

    return matchesSearch && matchesTab;
  });

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="w-full space-y-6 font-['Hanken_Grotesk'] text-[#1A0D0C] pb-16">
      <div className="relative w-full max-w-[1014px] min-h-[203px] bg-white rounded-[38px] border border-gray-100/80 p-8 md:p-10 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-[240.16px] h-[37.24px] rounded-bl-[65px] bg-gradient-to-b from-[#FF0000] to-[#990000] flex items-center justify-center text-white font-['Hanken_Grotesk'] text-[15.2px] font-semibold tracking-[-0.456px] z-10 shadow-sm">
          IEDC SJCET VERIFIED
        </div>

        <div className="space-y-1 pt-2 md:pt-0 max-w-xl">
          <h1 className="text-[36px] sm:text-[46px] font-semibold text-[#1A0D0C] tracking-[-1.38px] leading-tight flex items-center gap-3">
            Certificates
          </h1>
          <p className="text-[16px] sm:text-[20px] font-semibold text-[#B0B0B0] tracking-[-0.6px] leading-snug">
            Download and verify your official event participation &amp; achievement certificates
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 pt-2 md:pt-0">
          <div className="flex flex-col justify-end items-start w-[145px] h-[101px] p-[14px_20px_10px_20px] rounded-[20px] bg-[#1E1614] gap-[5px] shadow-sm">
            <span className="text-[#FFFFFF] text-[15px] font-normal tracking-[-0.5px] leading-none truncate max-w-full">
              Total Earned
            </span>
            <span className="text-[#FFFFFF] text-[38px] font-bold tracking-[-1.14px] leading-none">
              {certificates.length}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-[1014px] space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-1 scrollbar-none max-w-full">
            {FILTER_ITEMS.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={cn(
                    "inline-flex items-center justify-center px-4 py-1.5 rounded-[26.92px] border text-[13px] font-normal tracking-[-0.39px] whitespace-nowrap transition-all duration-200 cursor-pointer h-[36px]",
                    isActive
                      ? "bg-[#100A0A] border-[#A5A5A5] text-white shadow-sm"
                      : "bg-[#E2E2E2] border-[#A5A5A5] text-[#3C3C3C] hover:bg-gray-200"
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-[280px] shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search certificates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-[36px] pl-10 pr-4 rounded-[26.92px] bg-white border border-gray-200 text-xs font-medium placeholder:text-gray-400 focus:outline-none focus:border-[#1A0D0C] transition-colors shadow-xs"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[1014px] pt-2">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="w-full h-[260px] bg-white rounded-[32px] border border-gray-100/80 p-6 animate-pulse flex flex-col justify-between shadow-xs"
            >
              <div className="space-y-3">
                <div className="h-10 bg-gray-100 rounded-2xl w-3/4" />
                <div className="h-4 bg-gray-100 rounded-xl w-1/2" />
              </div>
              <div className="h-10 bg-gray-100 rounded-full w-full" />
            </div>
          ))}
        </div>
      ) : filteredCertificates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[1014px] pt-2">
          {filteredCertificates.map((cert) => (
            <div
              key={cert.id}
              className="w-full bg-white rounded-[32px] border border-gray-100/90 p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
            >
              <div>
                <div className="bg-gradient-to-r from-[#FAF6EE] to-[#F5EFE0] rounded-[20px] p-4 mb-4 border border-[#EAE3D2]/60 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#1A0D0C] text-[#FACC15] flex items-center justify-center shadow-xs shrink-0">
                      <Award className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#1A0D0C]">
                      {cert.eventType || "Official Cert"}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-[#990000] bg-[#FF0000]/10 px-2.5 py-1 rounded-full font-bold border border-[#FF0000]/20">
                    #{cert.certificateNumber}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-[#1A0D0C] line-clamp-2 leading-snug group-hover:text-[#990000] transition-colors mb-3">
                  {cert.eventTitle || "Event Participation Certificate"}
                </h3>

                <div className="space-y-2 text-xs font-medium text-gray-500 mb-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>Issued on {formatDate(cert.issuedAt)}</span>
                  </div>
                  {cert.eventVenue && (
                    <div className="flex items-center gap-2 truncate">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{cert.eventVenue}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-emerald-600 font-semibold pt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Verified by IEDC SJCET</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-100/80">
                <a
                  href={`${cert.certificateUrl}?download=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full h-[40px] pl-5 pr-2 py-2 rounded-full text-white text-[13.5px] font-semibold tracking-[-0.4px] transition-transform active:scale-95 shadow-sm"
                  style={{
                    background:
                      "radial-gradient(133.5% 127.27% at 48.91% 127.27%, rgba(89, 7, 8, 0.23) 0%, rgba(102, 102, 102, 0.00) 100%), #0F0A0A",
                  }}
                >
                  <span>Download PDF</span>
                  <span className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center shrink-0">
                    <Download className="w-3.5 h-3.5 text-black" />
                  </span>
                </a>

                <button
                  onClick={() => setSelectedCert(cert)}
                  className="w-full h-[36px] rounded-full border border-gray-200 text-xs font-semibold text-[#1A0D0C] hover:bg-[#FAF6EE] hover:border-[#EAE3D2] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-gray-500" />
                  <span>View Certificate</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="max-w-[1014px] bg-white rounded-[38px] border border-gray-100/80 p-12 md:p-16 text-center shadow-sm flex flex-col items-center justify-center my-4">
          <div className="w-20 h-20 rounded-full bg-[#FAE9CF] flex items-center justify-center mb-5 text-[#990000] shadow-inner">
            <Award className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-semibold text-[#1A0D0C] tracking-tight">
            No Certificates Yet
          </h3>
          <p className="text-gray-400 text-sm sm:text-base max-w-md mt-2 leading-relaxed">
            {searchQuery || activeTab !== "all"
              ? "No certificates matched your search or category filter. Try clearing filters."
              : "You have no certificates yet. Certificates appear here automatically once you attend an IEDC SJCET event and the organisers issue them."}
          </p>

          <Link
            href="/student/events"
            className="mt-6 inline-flex items-center justify-between w-[165px] h-[38px] pl-[20px] pr-[8px] py-[4.5px] rounded-[31px] text-white text-[14px] font-semibold tracking-[-0.45px] transition-transform active:scale-95 shadow-sm"
            style={{
              background:
                "radial-gradient(133.5% 127.27% at 48.91% 127.27%, rgba(89, 7, 8, 0.23) 0%, rgba(102, 102, 102, 0.00) 100%), #0F0A0A",
            }}
          >
            <span>Browse Events</span>
            <span className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center">
              <ArrowUpRight className="w-3.5 h-3.5 text-black" />
            </span>
          </Link>
        </div>
      )}

      {/* Certificate Preview Modal */}
      <Dialog open={!!selectedCert} onOpenChange={() => setSelectedCert(null)}>
        <DialogContent className="sm:max-w-3xl rounded-[32px] p-6 bg-white border border-gray-100 shadow-2xl space-y-5">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#1A0D0C] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#990000]" />
              Certificate Verification
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Official digital certificate issued by Innovation and Entrepreneurship Development Centre (IEDC), SJCET.
            </DialogDescription>
          </DialogHeader>

          {selectedCert && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-[#1E1614] to-[#0A0706] rounded-[24px] p-6 text-white space-y-4 relative overflow-hidden shadow-inner border border-white/10">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#FACC15] block">
                      {selectedCert.eventType || "Event Certificate"}
                    </span>
                    <h4 className="text-lg font-bold text-white mt-1">
                      {selectedCert.eventTitle || "Certificate of Participation"}
                    </h4>
                  </div>
                  <FileCheck className="w-8 h-8 text-[#FACC15] shrink-0 opacity-80" />
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-white/10">
                  <div>
                    <span className="text-gray-400 block text-[10px]">Certificate No:</span>
                    <span className="font-mono font-bold text-amber-300">
                      #{selectedCert.certificateNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">Issued Date:</span>
                    <span className="font-medium text-gray-200">
                      {formatDate(selectedCert.issuedAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-emerald-400 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Authenticated &amp; cryptographically registered in IEDC database</span>
                </div>
              </div>

              {/* Live render of the issued certificate. */}
              <iframe
                src={selectedCert.certificateUrl}
                title="Certificate document"
                className="w-full h-[55vh] rounded-[20px] border border-gray-200 bg-gray-50"
              />

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <a
                  href={selectedCert.certificateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-full border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                  <span>Open in new tab</span>
                </a>

                <a
                  href={`${selectedCert.certificateUrl}?download=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between h-[38px] pl-5 pr-2 py-2 rounded-full text-white text-[13px] font-semibold tracking-[-0.4px] transition-transform active:scale-95 shadow-sm"
                  style={{
                    background:
                      "radial-gradient(133.5% 127.27% at 48.91% 127.27%, rgba(89, 7, 8, 0.23) 0%, rgba(102, 102, 102, 0.00) 100%), #0F0A0A",
                  }}
                >
                  <span className="mr-3">Download PDF</span>
                  <span className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center shrink-0">
                    <Download className="w-3.5 h-3.5 text-black" />
                  </span>
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="max-w-[1014px] pt-12 flex justify-end">
        <p className="w-[242px] h-[26px] text-[#AAA] text-right font-['Hanken_Grotesk'] text-[16px] font-normal leading-[94.331%] tracking-[-0.48px]">
          IEDC 2026 SJCET - TECH TEAM
        </p>
      </div>
    </div>
  );
}