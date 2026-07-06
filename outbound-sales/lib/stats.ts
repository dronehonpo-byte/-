import type { CallLog, DashboardStats } from "@/lib/types";

// ダッシュボード集計。接続 = アポ獲得/興味あり/拒否(=会話が成立した通話)。
export function computeStats(logs: CallLog[]): DashboardStats {
  const attempted = logs.filter(
    (l) => l.outcome !== "blocked_dnc" && l.outcome !== "blocked_hours"
  );
  const connected = attempted.filter((l) =>
    ["appointment", "interested", "rejected"].includes(l.outcome)
  );
  const appointments = attempted.filter((l) => l.outcome === "appointment");

  const interestDistribution: Record<string, number> = { high: 0, medium: 0, low: 0, none: 0 };
  for (const l of logs) {
    if (l.interest_level) interestDistribution[l.interest_level]++;
  }

  return {
    totalCalls: attempted.length,
    connectedCalls: connected.length,
    appointments: appointments.length,
    connectRate: attempted.length ? connected.length / attempted.length : 0,
    appointmentRate: attempted.length ? appointments.length / attempted.length : 0,
    interestDistribution,
    blockedByDnc: logs.filter((l) => l.outcome === "blocked_dnc").length,
    blockedByHours: logs.filter((l) => l.outcome === "blocked_hours").length,
  };
}
