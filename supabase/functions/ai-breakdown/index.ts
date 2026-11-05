// Edge Function: dùng Gemini để chia nhỏ bài tập hoặc tạo lộ trình tự học.
// Bí mật cần đặt: GEMINI_API_KEY (bắt buộc), GEMINI_MODEL (tuỳ chọn).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const KEY = Deno.env.get("GEMINI_API_KEY");
const MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.5-flash-lite";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const TASK_SCHEMA = {
  type: "OBJECT",
  properties: {
    steps: { type: "ARRAY", items: { type: "OBJECT", properties: { title: { type: "STRING" }, hours: { type: "NUMBER" } }, required: ["title", "hours"] } },
    tip: { type: "STRING" },
  },
  required: ["steps"],
};
const GOAL_SCHEMA = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING" },
    milestones: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING" }, items: { type: "ARRAY", items: { type: "STRING" } } }, required: ["name", "items"] } },
  },
  required: ["name", "milestones"],
};

const clip = (s: unknown, n: number) => String(s ?? "").slice(0, n);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!KEY) return json({ error: "Máy chủ chưa cấu hình GEMINI_API_KEY" }, 503);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Dữ liệu gửi lên không hợp lệ" }, 400); }

  const mode = body.mode === "goal" ? "goal" : "task";
  let prompt: string;
  if (mode === "task") {
    prompt = `Bạn là trợ lý học tập cho sinh viên đại học Việt Nam.
Chia công việc sau thành 3–8 bước nhỏ, làm được theo thứ tự, mỗi bước 0.5–4 giờ (bội số của 0.5).
Tên bước ngắn gọn (dưới 60 ký tự), bằng tiếng Việt, bắt đầu bằng động từ.
Ước lượng thực tế cho một sinh viên năm 2. Thêm một mẹo ngắn (dưới 160 ký tự).

Tên công việc: ${clip(body.title, 200)}
Môn học: ${clip(body.course, 120) || "không rõ"}
Hạn nộp: ${clip(body.due, 40) || "không rõ"}
Đề bài / yêu cầu:
${clip(body.details, 6000) || "(không có)"}`;
  } else {
    const weeks = Math.min(Math.max(Number(body.weeks) || 8, 1), 24);
    const per = Math.min(Math.max(Number(body.sessionsPerWeek) || 3, 1), 7);
    prompt = `Bạn là trợ lý học tập cho sinh viên đại học Việt Nam.
Tạo lộ trình tự học cho mục tiêu sau trong ${weeks} tuần, ${per} buổi mỗi tuần (tổng khoảng ${weeks * per} buổi).
Chia thành 2–4 mốc. Mỗi mốc gồm các buổi học, mỗi buổi là một tiêu đề ngắn (dưới 60 ký tự), cụ thể, bằng tiếng Việt.
Tổng số buổi của tất cả các mốc bằng khoảng ${weeks * per}. Đặt tên lộ trình ngắn gọn (dưới 50 ký tự).

Mục tiêu: ${clip(body.goal, 500)}
Trình độ hiện tại: ${clip(body.level, 300) || "không rõ"}`;
  }

  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: mode === "task" ? TASK_SCHEMA : GOAL_SCHEMA, temperature: 0.4 },
    }),
  });
  if (!r.ok) {
    const detail = await r.text();
    console.error("gemini error", r.status, detail.slice(0, 500));
    return json({ error: r.status === 429 ? "AI đang quá tải, thử lại sau ít phút" : "Không gọi được AI" }, 502);
  }
  const out = await r.json();
  const text = out?.candidates?.[0]?.content?.parts?.[0]?.text;
  try {
    const data = JSON.parse(text);
    if (mode === "task") {
      const steps = (data.steps ?? []).slice(0, 10).map((s: { title: string; hours: number }) => ({
        title: clip(s.title, 80), hours: Math.min(Math.max(Math.round((Number(s.hours) || 1) * 2) / 2, 0.5), 8),
      }));
      return json({ steps, tip: clip(data.tip, 200) });
    }
    const milestones = (data.milestones ?? []).slice(0, 5).map((m: { name: string; items: string[] }) => ({
      name: clip(m.name, 60), items: (m.items ?? []).slice(0, 40).map((x) => clip(x, 80)),
    }));
    return json({ name: clip(data.name, 60), milestones });
  } catch {
    return json({ error: "AI trả về dữ liệu không đọc được, thử lại" }, 502);
  }
});
