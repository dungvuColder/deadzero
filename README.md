# DeadZero

Ứng dụng quản lý học tập cho sinh viên: lớp học phần dùng chung bằng mã, xếp ưu tiên theo hệ số gấp, tải công việc theo tuần, làm việc nhóm và lộ trình tự học.

React + Vite + TypeScript + Tailwind · Supabase (đăng nhập, database, realtime) · deploy trên Vercel.

## Chạy trên máy

```bash
npm install
npm run dev        # http://localhost:5173
```

Không có file `.env` → app chạy **chế độ demo**: dữ liệu mẫu, lưu trên trình duyệt, không cần tài khoản.

## Bật chế độ thật (nhiều người dùng)

### 1. Supabase (miễn phí)
1. Vào https://supabase.com → đăng nhập bằng GitHub → **New project** (chọn region Singapore).
2. **SQL Editor → New query** → dán toàn bộ `supabase/schema.sql` → **Run**.
3. **Project Settings → API**: copy `Project URL` và `anon public key`.
4. Tạo file `.env` ở thư mục gốc:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
5. **Authentication → URL Configuration**: thêm `http://localhost:5173` và domain Vercel (bước 3) vào *Redirect URLs*.

Đăng nhập bằng email (link gửi qua mail) chạy được ngay. Đăng nhập Google cần thêm bước: **Authentication → Providers → Google**, làm theo hướng dẫn của Supabase để lấy Client ID trên Google Cloud.

### 2. Đẩy code lên GitHub
```bash
git remote add origin https://github.com/dungvuColder/deadzero.git
git push -u origin main
```

### 3. Vercel
1. https://vercel.com → đăng nhập bằng GitHub → **Add New → Project** → chọn repo `deadzero`.
2. Framework: Vite (tự nhận). Thêm 2 biến môi trường `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
3. **Deploy**. Mỗi lần push lên `main`, Vercel tự deploy lại.

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `src/lib/priority.ts` | Hệ số gấp r, ngày nên bắt đầu, tải công việc theo tuần |
| `src/lib/templates.ts` | Lộ trình tự học mẫu, chia buổi, streak, dời buổi lỡ |
| `src/lib/parseTkb.ts` | Đọc thời khoá biểu dán từ cổng đào tạo |
| `src/data/localRepo.ts` | Chế độ demo (localStorage) |
| `src/data/supabaseRepo.ts` | Chế độ thật (Supabase + realtime) |
| `src/pages/` | Các màn hình |
| `supabase/schema.sql` | Bảng, phân quyền (RLS), hàm RPC, trigger thông báo, realtime |

## Công thức ưu tiên

```
r = giờ còn phải làm ÷ giờ tự học còn trống trước hạn
r ≥ 1 Nguy cơ trễ · 0,6–1 Cao · 0,3–0,6 Vừa · < 0,3 Thấp
```

Ngày nên bắt đầu = ngày mà từ đó đến hạn vừa đủ giờ tự học, trừ 1 ngày dự phòng.

## Để sau

Thông báo đẩy và email, Zalo OA, kết nối cổng đào tạo, đồng bộ Google Calendar, xuất PDF báo cáo đóng góp, đánh giá chéo ẩn danh, gợi ý lịch làm tự động.
