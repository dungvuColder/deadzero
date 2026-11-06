import React, { useState } from 'react';
import { parseTkb, parseExcelTkb, SAMPLE_TKB } from '../lib/parseTkb';
import type { ParsedRow } from '../lib/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImport: (rows: ParsedRow[]) => void;
}

const WDS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

export default function ImportTKBModal({ isOpen, onClose, onImport }: Props) {
  const [tab, setTab] = useState<'excel' | 'paste'>('excel');
  const [rawText, setRawText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const buffer = evt.target?.result as ArrayBuffer;
      const rows = parseExcelTkb(buffer);
      setParsedRows(rows);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleTextChange = (text: string) => {
    setRawText(text);
    setParsedRows(parseTkb(text));
  };

  const handleSave = () => {
    if (parsedRows.length > 0) {
      onImport(parsedRows);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-3xl w-full shadow-xl space-y-4 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="text-xl font-bold text-slate-800">Nhập Thời khóa biểu học kỳ</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </div>

        {/* Tab lựa chọn */}
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setTab('excel')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg ${tab === 'excel' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600'}`}
          >
            Tải file Excel / CSV
          </button>
          <button
            onClick={() => setTab('paste')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg ${tab === 'paste' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600'}`}
          >
            Dán văn bản từ Cổng Đào Tạo
          </button>
        </div>

        {/* Khu vực nhập dữ liệu */}
        {tab === 'excel' ? (
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="hidden"
              id="tkb-excel-input"
            />
            <label htmlFor="tkb-excel-input" className="cursor-pointer space-y-2 block">
              <div className="text-3xl">📊</div>
              <div className="text-sm font-medium text-slate-700">
                {fileName ? `File đã chọn: ${fileName}` : "Bấm vào đây để chọn file TKB (.xlsx, .csv)"}
              </div>
              <p className="text-xs text-slate-400">Hỗ trợ định dạng xuất từ portal đào tạo</p>
            </label>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              rows={5}
              placeholder={`Dán văn bản TKB vào đây...\nVí dụ:\n${SAMPLE_TKB}`}
              value={rawText}
              onChange={(e) => handleTextChange(e.target.value)}
              className="w-full p-3 border rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        )}

        {/* Bản xem trước */}
        {parsedRows.length > 0 && (
          <div className="flex-1 overflow-y-auto border rounded-xl p-3 bg-slate-50 space-y-2">
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Bản xem trước ({parsedRows.length} lớp học phần nhận diện thành công)
            </div>
            <table className="w-full text-xs text-left border-collapse bg-white rounded-lg overflow-hidden border">
              <thead>
                <tr className="bg-slate-100 border-b text-slate-600">
                  <th className="p-2">Mã LHP</th>
                  <th className="p-2">Tên học phần</th>
                  <th className="p-2">Thứ</th>
                  <th className="p-2">Tiết</th>
                  <th className="p-2">Giảng đường</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((r, i) => (
                  <tr key={i} className="border-b hover:bg-blue-50/50">
                    <td className="p-2 font-mono text-blue-600 font-semibold">{r.sec}</td>
                    <td className="p-2 font-medium text-slate-800">{r.name}</td>
                    <td className="p-2">{WDS[r.wd]}</td>
                    <td className="p-2">Tiết {r.from} - {r.to}</td>
                    <td className="p-2 text-slate-500">{r.room}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Nút thao tác */}
        <div className="flex justify-end gap-3 pt-2 border-t">
          <button onClick={onClose} className="px-4 py-2 border rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={parsedRows.length === 0}
            className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-blue-700 transition"
          >
            Lưu vào Lịch học ({parsedRows.length})
          </button>
        </div>
      </div>
    </div>
  );
}