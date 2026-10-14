"use client";

import { Sidebar, studentNavItems } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { QueryProvider } from "@/components/providers/query-provider";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <div className="min-h-screen bg-[#F6F5F3] text-[#1A1A2E]">
        <Sidebar items={studentNavItems} role="student" />
        <div className="md:ml-20 lg:ml-[305px] flex flex-col min-h-screen">
          <main className="flex-1 p-4 md:p-8 pb-12">
            <Header items={studentNavItems} role="student" />
            {children}
          </main>
        </div>
      </div>
    </QueryProvider>
  );
}