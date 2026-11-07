import { AppData, Task } from './types';
import { diffDays, dow, iso, mondayOf, addDays, today0 } from './date';

export interface WorkloadSummary {
  weekStart: Date;
  totalFreeHours: number;      // Tổng giờ rảnh có thể học trong tuần
  totalEstimatedHours: number; // Tổng giờ cần làm bài tập trong tuần
  loadPercentage: number;      // Tỷ lệ quá tải (%)
  isOverloaded: boolean;       // Có bị quá tải (>100%) hay không
  suggestedStartDate?: string; // Ngày gợi ý bắt đầu làm bài
}

/**
 * Tính toán quỹ giờ rảnh và trạng thái tải công việc của tuần hiện tại
 */
export function calculateWeeklyWorkload(data: AppData, weekOffset: number = 0): WorkloadSummary {
  const t0 = today0();
  const weekStart = addDays(mondayOf(t0), weekOffset * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // 1. Lấy mảng giờ rảnh mặc định cấu hình của người dùng (7 ngày từ T2 đến CN)
  const userDailyCapacity = data.me.hours || [3, 3, 3, 3, 3, 5, 4];

  let totalFreeHours = 0;
  let totalEstimatedHours = 0;

  weekDays.forEach((d, idx) => {
    const dayDow = dow(d);
    const capacityToday = userDailyCapacity[dayDow] || 3;

    // Trừ đi thời gian học TKB trên lớp của ngày hôm đó
    const classSessions = data.classes.flatMap(c => 
      c.sessions.filter(s => s.wd === dayDow)
    );
    const classHours = classSessions.reduce((acc, s) => acc + (s.to - s.from + 1) * 0.8, 0);

    const netFreeToday = Math.max(0, capacityToday - classHours);
    totalFreeHours += netFreeToday;

    // Tổng số giờ cần làm của các task có hạn trong ngày hôm đó
    const tasksDueToday = data.tasks.filter(t => 
      t.assignees.includes(data.me.id) && 
      t.status !== 'done' && 
      diffDays(t.dueAt, d) === 0
    );
    
    totalEstimatedHours += tasksDueToday.reduce((acc, t) => acc + Number(t.est || 0), 0);
  });

  const loadPercentage = totalFreeHours > 0 
    ? Math.round((totalEstimatedHours / totalFreeHours) * 100) 
    : 0;

  const isOverloaded = loadPercentage > 100;

  return {
    weekStart,
    totalFreeHours,
    totalEstimatedHours,
    loadPercentage,
    isOverloaded,
    suggestedStartDate: isOverloaded ? 'Thứ Hai' : undefined
  };
}