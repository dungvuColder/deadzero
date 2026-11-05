import { MemberContributionSummary } from './types';

export function exportContributionToCSV(groupName: string, summary: MemberContributionSummary[]) {
  const headers = ['Mã Thành Viên', 'Thẻ Được Giao', 'Hoàn Thành', 'Đúng Hạn', 'Trễ Hạn', 'Số Giờ Đã Làm'];
  const rows = summary.map(s => [
    s.user_id,
    s.total_assigned,
    s.total_completed,
    s.on_time_count,
    s.late_count,
    s.total_hours_completed
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' 
    + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Bao_Cao_Dong_Gop_${groupName.replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportContributionToPDF(groupName: string, summary: MemberContributionSummary[]) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Báo cáo đóng góp - ${groupName}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        h2 { text-align: center; color: #1e40af; }
        p { font-size: 14px; text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: center; font-size: 13px; }
        th { background-color: #f1f5f9; color: #0f172a; }
        .footer { margin-top: 30px; font-size: 12px; text-align: right; font-style: italic; }
      </style>
    </head>
    <body>
      <h2>BÁO CÁO GHI NHẬN ĐÓNG GÓP THÀNH VIÊN</h2>
      <p><b>Dự án/Học phần:</b> ${groupName} | <b>Thời điểm xuất:</b> ${new Date().toLocaleString('vi-VN')}</p>
      <table>
        <thead>
          <tr>
            <th>STT</th>
            <th>Mã Thành Viên</th>
            <th>Số thẻ được giao</th>
            <th>Số thẻ hoàn thành</th>
            <th>Đúng hạn</th>
            <th>Trễ hạn</th>
            <th>Tổng số giờ ước lượng</th>
          </tr>
        </thead>
        <tbody>
          ${summary.map((s, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${s.user_id}</td>
              <td>${s.total_assigned}</td>
              <td>${s.total_completed}</td>
              <td>${s.on_time_count}</td>
              <td>${s.late_count}</td>
              <td>${s.total_hours_completed} giờ</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="footer">Xác nhận tự động từ hệ thống DeadZero (Study Planner)</div>
      <script>
        window.onload = function() { window.print(); window.close(); }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}