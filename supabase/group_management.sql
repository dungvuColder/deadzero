-- 1. Bảng Nhóm (groups)
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    course_name TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bảng Thành viên nhóm (group_members)
CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('leader', 'member')) DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- 3. Bảng Thẻ công việc nhóm (group_tasks)
CREATE TABLE IF NOT EXISTS group_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    due_date TIMESTAMPTZ NOT NULL,
    estimated_hours NUMERIC CHECK (estimated_hours > 0) DEFAULT 2,
    status TEXT CHECK (status IN ('todo', 'doing', 'done')) DEFAULT 'todo',
    submitted_at TIMESTAMPTZ,
    file_url TEXT,
    is_late BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bảng Nhật ký đóng góp (contribution_logs)
CREATE TABLE IF NOT EXISTS contribution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    task_id UUID REFERENCES group_tasks(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    hours_completed NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bật RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE contribution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users full access to groups" ON groups FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users full access to group_members" ON group_members FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users full access to group_tasks" ON group_tasks FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users full access to contribution_logs" ON contribution_logs FOR ALL USING (auth.role() = 'authenticated');