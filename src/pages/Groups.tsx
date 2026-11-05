import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Download, FileText, Plus } from 'lucide-react';
import { downloadContributionCsv } from '../lib/exporters';
import type { Task } from '../lib/types';
import { useStore } from '../data/store';
import { remaining, round1 } from '../lib/priority';
import { addDays, fD, fT, iso, today0 } from '../lib/date';
import { TaskModal } from '../components/tasks';
import { Avatar, AvatarStack, Button, Field, Input, Modal, PageHeader, Progress, Segmented, Select, cx } from '../components/ui';
import { Board } from './Tasks';

/* ---------- Helpers ---------- */

/** Tiến độ nhóm (%), tính theo trọng số giờ ước lượng của từng việc. */
function groupProgress(ts: Task[]): number {
  const total = ts.reduce((s, t) => s + t.est, 0);
  if (!total) return 0;
  return Math.round((ts.reduce((s, t) => s + (t.est * t.progress) / 100, 0) / total) * 100);
}

const share = (t: Task) => Math.max(t.assignees.length, 1);

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

type ContribRow = {
  id: string;
  name: string;
  leader: boolean;
  n: number;
  d: number;
  late: number;
  hours: number;
  left: number;
  share: number;
  rate: number | null;
};

/** Mở cửa sổ in có sẵn bảng đóng góp để người dùng "Lưu thành PDF". Không cần thư viện ngoài. */
function printContributionReport(groupName: string, rows: ContribRow[]): boolean {
  const w = window.open('', '_blank');
  if (!w) return false;
  const body = rows
    .map(
      r => `<tr>
        <td>${escapeHtml(r.name)}${r.leader ? ' <small>(trưởng nhóm)</small>' : ''}</td>
        <td>${r.n}</td><td>${r.d}</td><td>${r.late}</td>
        <td>${round1(r.hours)}</td><td>${r.share}%</td>
        <td>${r.rate === null ? '—' : `${r.rate}%`}</td><td>${round1(r.left)}</td>
      </tr>`,
    )
    .join('');
  w.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8">
    <title>Báo cáo đóng góp - ${escapeHtml(groupName)}</title>
    <style>
      body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:32px}
      h1{font-size:20px;margin:0 0 4px} p{color:#666;font-size:12px;margin:0 0 20px}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th,td{border-bottom:1px solid #ddd;padding:8px 10px;text-align:right}
      th:first-child,td:first-child{text-align:left} th{font-size:12px;color:#555}
      small{color:#777}
    </style></head><body>
    <h1>Báo cáo đóng góp: ${escapeHtml(groupName)}</h1>
    <p>Xuất ngày ${new Date().toLocaleDateString('vi-VN')}. Số liệu lấy từ nhật ký nhóm.</p>
    <table><thead><tr>
      <th>Thành viên</th><th>Việc</th><th>Xong</th><th>Trễ hạn</th>
      <th>Giờ công</th><th>Tỷ trọng</th><th>Đúng hạn</th><th>Còn lại (h)</th>
    </tr></thead><tbody>${body}</tbody></table>
    <script>window.onload=function(){window.print()}<\/script>
    </body></html>`);
  w.document.close();
  return true;
}

/* ---------- Danh sách nhóm ---------- */

export function GroupList() {
  const { data, run } = useStore();
  const nav = useNavigate();
  const [mode, setMode] = useState<null | 'create' | 'join'>(null);
  const [name, setName] = useState('');
  const [cls, setCls] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    setMode(null);
    setName('');
    setCls('');
    setCode('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const id =
        mode === 'create'
          ? await run(r => r.createGroup({ name: name.trim(), classId: cls || null }), 'Đã tạo nhóm')
          : await run(r => r.joinGroup(code), 'Đã vào nhóm');
      if (id) {
        close();
        nav(`/groups/${id}`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow={`${data.groups.length} nhóm`} title="Nhóm">
        <Button onClick={() => setMode('join')}>Nhập mã nhóm</Button>
        <Button variant="primary" onClick={() => setMode('create')}>
          <Plus size={16} strokeWidth={2.4} />
          Tạo nhóm
        </Button>
      </PageHeader>

      <section className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {data.groups.map(g => {
          const ts = data.tasks.filter(t => t.groupId === g.id);
          const pct = groupProgress(ts);
          return (
            <Link
              key={g.id}
              to={`/groups/${g.id}`}
              className="rounded-[20px] border border-line p-5 flex flex-col gap-4 hover:bg-[#FAFAFA]"
            >
              <div className="flex justify-between">
                <span className="text-xs text-muted">{data.classes.find(c => c.id === g.classId)?.name ?? 'Nhóm tự do'}</span>
                <span className="font-mono text-xs text-muted">{pct}%</span>
              </div>
              <b className="text-[17px] font-semibold">{g.name}</b>
              <Progress value={pct} />
              <div className="flex justify-between items-center">
                <AvatarStack people={g.members} meId={data.me.id} />
                <span className="text-xs text-muted">{ts.filter(t => t.status !== 'done').length} việc đang mở</span>
              </div>
            </Link>
          );
        })}
      </section>

      {!data.groups.length && <p className="text-muted">Chưa có nhóm. Tạo nhóm rồi gửi mã cho các bạn.</p>}

      {mode && (
        <Modal title={mode === 'create' ? 'Tạo nhóm' : 'Nhập mã nhóm'} onClose={close}>
          <form onSubmit={submit} className="flex flex-col gap-4">
            {mode === 'create' ? (
              <>
                <Field label="Tên nhóm">
                  <Input autoFocus required value={name} onChange={e => setName(e.target.value)} placeholder="Nhóm 5" />
                </Field>
                <Field label="Môn">
                  <Select value={cls} onChange={e => setCls(e.target.value)}>
                    <option value="">Không gắn môn</option>
                    {data.classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            ) : (
              <Input
                autoFocus
                required
                minLength={6}
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                aria-label="Mã nhóm"
                className="h-14 text-center font-mono text-2xl tracking-[0.3em]"
              />
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={close}>
                Huỷ
              </Button>
              <Button variant="primary" disabled={busy}>
                {mode === 'create' ? 'Tạo' : 'Vào nhóm'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

/* ---------- Chi tiết nhóm ---------- */

export function GroupDetail() {
  const { id } = useParams();
  const { data, run, toast } = useStore();
  const [tab, setTab] = useState<'board' | 'contrib' | 'log'>('board');
  const [assigning, setAssigning] = useState(false);
  const [open, setOpen] = useState<Task | null>(null);

  const g = data.groups.find(x => x.id === id);
  const logs = useMemo(
    () => data.log.filter(l => l.groupId === id).sort((a, b) => (a.at < b.at ? 1 : -1)),
    [data.log, id],
  );

  if (!g) {
    return (
      <p className="text-muted">
        Không tìm thấy nhóm.{' '}
        <Link to="/groups" className="underline">
          Quay lại
        </Link>
      </p>
    );
  }

  const ts = data.tasks.filter(t => t.groupId === g.id);
  const pct = groupProgress(ts);
  const isLeader = g.leaderId === data.me.id;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(g.code);
      toast(`Đã sao chép ${g.code}`);
    } catch {
      toast(`Mã: ${g.code}`);
    }
  };

  const review = (t: Task, ok: boolean) =>
    run(
      r =>
        r.updateTask(
          t.id,
          ok
            ? { status: 'done', progress: 100, doneAt: new Date().toISOString() }
            : { status: 'doing', progress: Math.min(t.progress, 80) },
          ok ? `duyệt “${t.title}”` : `trả lại “${t.title}”`,
        ),
      ok ? 'Đã duyệt' : 'Đã trả lại',
    );

  return (
    <>
      <Link to="/groups" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink -mb-3">
        <ArrowLeft size={15} />
        Nhóm
      </Link>

      <header className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex flex-col gap-2.5">
          <span className="text-[13px] text-muted">{data.classes.find(c => c.id === g.classId)?.name ?? 'Nhóm tự do'}</span>
          <h1 className="text-[28px] md:text-[30px] font-semibold tracking-[-0.02em]">{g.name}</h1>
          <div className="flex items-center gap-3">
            <AvatarStack people={g.members} meId={data.me.id} size={28} />
            <button
              onClick={copy}
              className="inline-flex items-center gap-1.5 font-mono text-[13px] text-muted hover:text-ink"
              aria-label="Sao chép mã nhóm"
            >
              {g.code}
              <Copy size={13} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex flex-col gap-1.5 w-40">
            <div className="flex justify-between text-[13px]">
              <span className="text-muted">Tiến độ</span>
              <span className="font-mono">{pct}%</span>
            </div>
            <Progress value={pct} />
          </div>
          <Button variant="primary" onClick={() => setAssigning(true)}>
            <Plus size={16} strokeWidth={2.4} />
            Giao việc
          </Button>
        </div>
      </header>

      <div>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            ['board', 'Bảng'],
            ['contrib', 'Đóng góp'],
            ['log', 'Nhật ký'],
          ]}
        />
      </div>

      {tab === 'board' && (
        <Board
          tasks={ts}
          groupId={g.id}
          onOpen={setOpen}
          columns={[
            ['todo', 'Cần làm'],
            ['doing', 'Đang làm'],
            ['review', 'Chờ duyệt'],
            ['done', 'Xong'],
          ]}
          renderExtra={t =>
            t.status === 'review' && isLeader ? (
              <div className="flex gap-2">
                <Button size="sm" variant="primary" className="flex-1" onClick={() => review(t, true)}>
                  Duyệt
                </Button>
                <Button size="sm" className="flex-1" onClick={() => review(t, false)}>
                  Trả lại
                </Button>
              </div>
            ) : null
          }
        />
      )}

      {tab === 'contrib' && <Contribution groupId={g.id} />}

      {tab === 'log' && (
        <ul className="flex flex-col">
          {logs.map(l => (
            <li key={l.id} className="flex items-center gap-3 py-3 border-b border-[#F0F0F1] last:border-0 text-sm">
              <Avatar name={data.people[l.actorId] || '?'} me={l.actorId === data.me.id} size={26} />
              <span className="flex-1">
                <b className="font-semibold">{data.people[l.actorId] || 'Ai đó'}</b> {l.action}
              </span>
              <span className="font-mono text-xs text-muted whitespace-nowrap">
                {fD(l.at)} {fT(l.at)}
              </span>
            </li>
          ))}
          {!logs.length && <p className="text-muted">Chưa có hoạt động nào.</p>}
        </ul>
      )}

      {assigning && <AssignModal groupId={g.id} onClose={() => setAssigning(false)} />}
      {open && <TaskModal task={open} onClose={() => setOpen(null)} />}
    </>
  );
}

/* ---------- Đóng góp ---------- */

function Contribution({ groupId }: { groupId: string }) {
  const { data, toast } = useStore();
  const g = data.groups.find(x => x.id === groupId)!;
  const ts = data.tasks.filter(t => t.groupId === groupId);
  const total = ts.reduce((s, t) => s + t.est / share(t), 0) || 1;

  const rows = g.members.map(m => {
    const mine = ts.filter(t => t.assignees.includes(m.id));
    const done = mine.filter(t => t.status === 'done');
    const ontime = done.filter(t => t.doneAt && t.doneAt <= t.dueAt).length;
    const hours = mine.reduce((s, t) => s + t.est / share(t), 0);
    const left = mine.filter(t => t.status !== 'done').reduce((s, t) => s + remaining(t) / share(t), 0);
    return {
      m,
      n: mine.length,
      d: done.length,
      late: done.length - ontime,
      hours,
      left,
      rate: done.length ? Math.round((ontime / done.length) * 100) : null,
    };
  });

  const max = Math.max(...rows.map(r => r.hours), 1);
  const nameOf = (r: (typeof rows)[number]) => (r.m.id === data.me.id ? data.me.name : r.m.name);

  const exportRows: ContribRow[] = rows.map(r => ({
    id: r.m.id,
    name: nameOf(r),
    leader: r.m.id === g.leaderId,
    n: r.n,
    d: r.d,
    late: r.late,
    hours: r.hours,
    left: r.left,
    share: Math.round((r.hours / total) * 100),
    rate: r.rate,
  }));

  const exportPdf = () => {
    if (!printContributionReport(g.name, exportRows)) toast('Trình duyệt đang chặn cửa sổ mới, hãy cho phép pop-up');
  };

  const th = 'py-2 pr-4 font-medium text-right';

  return (
    <section className="flex flex-col gap-5">
      <div className="rounded-[20px] bg-soft p-6 grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        {rows.map(r => (
          <div key={r.m.id} className="flex flex-col gap-2">
            <span className="font-semibold">{r.m.id === data.me.id ? 'Bạn' : r.m.name}</span>
            <div className="h-1.5 rounded-full bg-[#E4E4E7]">
              <div className="h-full bg-ink rounded-full" style={{ width: `${(r.hours / max) * 100}%` }} />
            </div>
            <span className={cx('font-mono text-xs', r.late > 0 ? 'text-urgent-ink' : 'text-sub')}>
              {round1(r.hours)}h · {r.rate === null ? '—' : `${r.rate}%`}
            </span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted border-b border-line">
              <th className="py-2 pr-4 font-medium">Thành viên</th>
              <th className={th}>Việc</th>
              <th className={th}>Xong</th>
              <th className={th}>Trễ hạn</th>
              <th className={th}>Giờ công</th>
              <th className={th}>Tỷ trọng</th>
              <th className={th}>Đúng hạn</th>
              <th className="py-2 font-medium text-right">Còn lại</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.m.id} className="border-b border-[#F0F0F1] font-mono text-[13px]">
                <td className="py-3 pr-4 font-sans font-medium">
                  {r.m.id === data.me.id ? 'Bạn' : r.m.name}
                  {r.m.id === g.leaderId && <span className="text-xs text-muted font-normal"> · trưởng nhóm</span>}
                </td>
                <td className="py-3 pr-4 text-right">{r.n}</td>
                <td className="py-3 pr-4 text-right">{r.d}</td>
                <td className={cx('py-3 pr-4 text-right', r.late > 0 && 'text-urgent-ink')}>{r.late}</td>
                <td className="py-3 pr-4 text-right">{round1(r.hours)}</td>
                <td className="py-3 pr-4 text-right">{Math.round((r.hours / total) * 100)}%</td>
                <td className="py-3 pr-4 text-right">{r.rate === null ? '—' : `${r.rate}%`}</td>
                <td className="py-3 text-right">{round1(r.left)}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap justify-between items-center gap-3">
        <p className="text-xs text-muted">Số liệu lấy từ nhật ký nhóm, không ai sửa được. Dùng kèm phiếu đánh giá chéo.</p>
        <div className="flex gap-2">
          <Button size="sm" onClick={exportPdf}>
            <FileText size={14} />
            Xuất PDF
          </Button>
          <Button
            size="sm"
            onClick={() =>
              downloadContributionCsv(
                g.name,
                exportRows.map(r => ({
                  name: r.name,
                  leader: r.leader,
                  n: r.n,
                  d: r.d,
                  hours: r.hours,
                  share: r.share,
                  rate: r.rate,
                  left: r.left,
                })),
              )
            }
          >
            <Download size={14} />
            Tải Excel (CSV)
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ---------- Giao việc ---------- */

function AssignModal({ groupId, onClose }: { groupId: string; onClose: () => void }) {
  const { data, run } = useStore();
  const g = data.groups.find(x => x.id === groupId)!;
  const [title, setTitle] = useState('');
  const [who, setWho] = useState<string[]>([data.me.id]);
  const [date, setDate] = useState(iso(addDays(today0(), 5)));
  const [est, setEst] = useState(3);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!who.length || busy) return;
    setBusy(true);
    try {
      const [y, m, d] = date.split('-').map(Number);
      await run(
        r =>
          r.assignGroupTask({
            groupId,
            title: title.trim(),
            assignees: who,
            dueAt: new Date(y, m - 1, d, 23, 59).toISOString(),
            est,
          }),
        'Đã giao việc',
      );
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Giao việc" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Việc">
          <Input autoFocus required value={title} onChange={e => setTitle(e.target.value)} placeholder="Viết phần kết luận" />
        </Field>

        <div className="flex flex-col gap-2 text-[13px] font-medium">
          <span>Người làm</span>
          <div className="flex flex-wrap gap-2">
            {g.members.map((m, i) => {
              const on = who.includes(m.id);
              return (
                <button
                  type="button"
                  key={m.id}
                  aria-pressed={on}
                  onClick={() => setWho(on ? who.filter(x => x !== m.id) : [...who, m.id])}
                  className={cx(
                    'h-10 pl-1 pr-3.5 rounded-full border flex items-center gap-2 text-sm',
                    on ? 'border-ink bg-ink text-white' : 'border-line',
                  )}
                >
                  <Avatar name={m.name} me={m.id === data.me.id} size={30} i={i} />
                  {m.id === data.me.id ? 'Bạn' : m.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Hạn">
            <Input type="date" required min={iso(today0())} value={date} onChange={e => setDate(e.target.value)} />
          </Field>
          <Field label="Cần (giờ)">
            <Input type="number" min={0.5} step={0.5} value={est} onChange={e => setEst(Math.max(Number(e.target.value) || 1, 0.5))} />
          </Field>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button variant="primary" disabled={!who.length || busy}>
            Giao việc
          </Button>
        </div>
      </form>
    </Modal>
  );
}
