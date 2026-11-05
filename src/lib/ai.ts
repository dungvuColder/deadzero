import { supabase } from '../data/supabaseRepo';
import type { Template } from './templates';

export interface AiStep { title: string; hours: number }
export interface AiBreakdown { steps: AiStep[]; tip?: string; sample?: boolean }

/** Bộ chia mẫu cho chế độ demo (không gọi AI) */
function sampleBreakdown(title: string, details: string): AiBreakdown {
  const t = (title + ' ' + details).toLowerCase();
  const pick = (steps: [string, number][], tip: string) => ({ steps: steps.map(([s, h]) => ({ title: s, hours: h })), tip, sample: true });
  if (/báo cáo|report|tiểu luận|kế hoạch/.test(t)) return pick([['Đọc kỹ yêu cầu, lập dàn ý', 1], ['Tìm và đọc tài liệu tham khảo', 2], ['Viết phần mở đầu và cơ sở lý thuyết', 2], ['Viết phần nội dung chính', 3], ['Kết luận, trích nguồn, định dạng', 1], ['Đọc lại, sửa lỗi', 0.5]], 'Viết dàn ý trước rồi mới viết, sẽ đỡ phải sửa nhiều.');
  if (/ôn|thi|kiểm tra|exam/.test(t)) return pick([['Liệt kê các chương sẽ thi', 0.5], ['Tóm tắt lý thuyết từng chương', 3], ['Làm bài tập mẫu mỗi dạng', 3], ['Làm 1 đề thi năm trước có bấm giờ', 2], ['Chữa lỗi sai, ôn lại phần yếu', 1.5]], 'Làm đề có bấm giờ giúp biết phần nào cần ôn thêm.');
  if (/lab|code|lập trình|api|web|app|đồ án/.test(t)) return pick([['Đọc đề, xác định chức năng cần làm', 0.5], ['Dựng khung dự án, cài thư viện', 1], ['Làm chức năng chính', 3], ['Viết test, sửa lỗi', 1.5], ['Viết README, nộp bài', 0.5]], 'Commit sau mỗi chức năng để dễ quay lại khi lỗi.');
  return pick([['Đọc đề và ghi lại yêu cầu', 0.5], ['Làm phần dễ trước', 1], ['Làm phần khó', 1.5], ['Kiểm tra lại và nộp', 0.5]], 'Chia việc thành phần nhỏ để dễ bắt đầu.');
}

export async function breakdownTask(input: { title: string; details: string; course?: string; due?: string }, cloud: boolean): Promise<AiBreakdown> {
  if (!cloud || !supabase) { await new Promise(r => setTimeout(r, 600)); return sampleBreakdown(input.title, input.details); }
  const { data, error } = await supabase.functions.invoke('ai-breakdown', { body: { mode: 'task', ...input } });
  if (error) throw new Error(await readError(error));
  return data as AiBreakdown;
}

export async function generateGoal(input: { goal: string; level?: string; weeks: number; sessionsPerWeek: number }, cloud: boolean): Promise<Template & { sample?: boolean }> {
  if (!cloud || !supabase) {
    await new Promise(r => setTimeout(r, 600));
    return { key: 'ai', name: input.goal.slice(0, 50), weeks: input.weeks, desc: 'Lộ trình mẫu (bản demo không gọi AI)', sample: true,
      ms: [['Nền tảng', ['Xác định kiến thức cần có', 'Học khái niệm cơ bản', 'Bài tập cơ bản']], ['Luyện tập', ['Bài tập vừa', 'Bài tập khó', 'Tự kiểm tra']], ['Tổng kết', ['Làm sản phẩm hoặc đề tổng hợp', 'Rút kinh nghiệm']]] };
  }
  const { data, error } = await supabase.functions.invoke('ai-breakdown', { body: { mode: 'goal', ...input } });
  if (error) throw new Error(await readError(error));
  const d = data as { name: string; milestones: { name: string; items: string[] }[] };
  return { key: 'ai', name: d.name || input.goal.slice(0, 50), weeks: input.weeks, desc: `Tạo bằng AI cho: ${input.goal}`, ms: d.milestones.map(m => [m.name, m.items] as [string, string[]]) };
}

async function readError(error: unknown): Promise<string> {
  const ctx = (error as { context?: Response }).context;
  try { if (ctx) { const j = await ctx.json(); if (j?.error) return j.error; } } catch { /* bỏ qua */ }
  return 'Không gọi được AI, thử lại sau';
}
