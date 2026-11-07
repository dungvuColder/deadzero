import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { WorkloadSummary } from '../lib/workload';

interface Props {
  workload: WorkloadSummary;
}

export default function OverloadAlert({ workload }: Props) {
  const { loadPercentage, isOverloaded, totalEstimatedHours, totalFreeHours } = workload;

  if (!isOverloaded) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="text-emerald-600 shrink-0" size={20} />
          <div>
            <p className="text-xs font-semibold text-emerald-900">Khối lượng công việc tuần này cân bằng</p>
            <p className="text-xs text-emerald-700">Đã lên kế hoạch {totalEstimatedHours}h / Quỹ giờ rảnh {totalFreeHours}h ({loadPercentage}%)</p>
          </div>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">{loadPercentage}%</span>
      </div>
    );
  }

  return (
    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between animate-pulse">
      <div className="flex items-center gap-3">
        <AlertTriangle className="text-rose-600 shrink-0" size={22} />
        <div>
          <p className="text-xs font-bold text-rose-900">CẢNH BÁO QUÁ TẢI TUẦN ({loadPercentage}%)</p>
          <p className="text-xs text-rose-700">
            Tổng giờ làm bài ({totalEstimatedHours}h) vượt quá quỹ giờ rảnh ({totalFreeHours}h). Nên bắt đầu làm từ hôm nay!
          </p>
        </div>
      </div>
      <span className="text-xs font-bold px-3 py-1 bg-rose-600 text-white rounded-full">Quá tải</span>
    </div>
  );
}