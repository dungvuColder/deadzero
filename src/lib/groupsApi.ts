import { supabase } from '../data/supabaseRepo';
import { GroupTask, MemberContributionSummary } from './types';

// Kiểm tra client Supabase trước khi gọi
const getSb = () => {
  if (!supabase) throw new Error("Chưa cấu hình Supabase URL/Key trong file .env");
  return supabase;
};

export async function createGroupTask(taskData: Omit<GroupTask, 'id'>) {
  const sb = getSb();
  const { data: task, error } = await sb
    .from('group_tasks')
    .insert([taskData])
    .select()
    .single();

  if (error || !task) throw error;

  await sb.from('contribution_logs').insert([{
    group_id: task.group_id,
    task_id: task.id,
    user_id: task.assignee_id,
    action: 'assigned',
    hours_completed: 0
  }]);

  return task;
}

export async function getGroupContributionSummary(groupId: string): Promise<MemberContributionSummary[]> {
  const sb = getSb();
  const { data: members } = await sb
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId);

  const { data: tasks } = await sb
    .from('group_tasks')
    .select('*')
    .eq('group_id', groupId);

  if (!members || !tasks) return [];

  const summaryMap: Record<string, MemberContributionSummary> = {};

  members.forEach(m => {
    summaryMap[m.user_id] = {
      user_id: m.user_id,
      email: m.user_id.substring(0, 8) + '...',
      total_assigned: 0,
      total_completed: 0,
      on_time_count: 0,
      late_count: 0,
      total_hours_completed: 0
    };
  });

  tasks.forEach(t => {
    if (summaryMap[t.assignee_id]) {
      const userStat = summaryMap[t.assignee_id];
      userStat.total_assigned += 1;
      if (t.status === 'done') {
        userStat.total_completed += 1;
        userStat.total_hours_completed += Number(t.estimated_hours || 0);
        if (t.is_late) {
          userStat.late_count += 1;
        } else {
          userStat.on_time_count += 1;
        }
      }
    }
  });

  return Object.values(summaryMap);
}