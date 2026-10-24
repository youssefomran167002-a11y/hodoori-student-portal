import React, { useEffect, useState, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Search,
  Download,
  Share2,
  Sparkles,
  QrCode,
  GraduationCap,
  X,
  Check,
  Smartphone,
  Eye,
} from "lucide-react";
import { supabase } from "./supabase";

interface StudentCard {
  id: string;
  name: string;
  section: number;
  seq: number;
  code: string;
  qr_token?: string;
  room_name?: string;
  room_subject?: string;
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [roomInfo, setRoomInfo] = useState<{ name: string; subject?: string }>({
    name: "ANU",
    subject: "الجميع",
  });
  const [students, setStudents] = useState<StudentCard[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState<number>(0);
  const [selectedStudent, setSelectedStudent] = useState<StudentCard | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    async function loadCards() {
      setLoading(true);
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const roomId = urlParams.get("room") || "72556c20-fa65-49bf-85fc-cbc08bf7cf5f"; // Default ANU room
        const secParam = parseInt(urlParams.get("section") || "0", 10);
        const tokenParam = urlParams.get("token");

        if (secParam > 0) {
          setSelectedSection(secParam);
        }

        if (tokenParam) {
          // Direct student token lookup
          const { data, error } = await supabase.rpc("get_student_card_public", {
            p_token: tokenParam.trim(),
          });
          if (error) throw error;
          if (data) {
            const st = data as StudentCard;
            setStudents([st]);
            setSelectedStudent(st);
            setRoomInfo({
              name: st.room_name || "ANU",
              subject: st.room_subject || "الجميع",
            });
            setLoading(false);
            return;
          }
        }

        // Fetch section cards
        const { data, error } = await supabase.rpc("get_section_cards_public", {
          p_room_id: roomId,
          p_section: 0, // Fetch all and filter in UI for maximum speed
        });

        if (error) throw error;

        if (data) {
          const res = data as {
            room_name: string;
            room_subject?: string;
            cards: StudentCard[];
          };
          setRoomInfo({
            name: res.room_name || "ANU",
            subject: res.room_subject || "الجميع",
          });
          setStudents(res.cards || []);
        }
      } catch (err: any) {
        showToast("تعذر تحميل البيانات، يرجى إعادة المحاولة");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadCards();
  }, []);

  const sectionsList = useMemo(() => {
    const secs = new Set(students.map((s) => s.section).filter(Boolean));
    return Array.from(secs).sort((a, b) => a - b);
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSection = selectedSection === 0 || s.section === selectedSection;
      if (!matchSection) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.code && s.code.toLowerCase().includes(q)) ||
        String(s.seq).includes(q)
      );
    });
  }, [students, selectedSection, searchQuery]);

  const formatCode = (code: string, sec: number, seq: number) => {
    if (code && !/^\d{10,}$/.test(code.trim())) {
      return code.trim();
    }
    return `ف${sec}-${String(seq || 1).padStart(2, "0")}`;
  };

  const handleDownloadHd = (st: StudentCard) => {
    const cleanCode = formatCode(st.code, st.section, st.seq);
    const svg = document.getElementById(`qr-svg-${st.id}`);
    if (!svg) {
      showToast("تعذر تجهيز الصورة");
      return;
    }

    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      // Ultra-HD 1200 x 1440
      canvas.width = 1200;
      canvas.height = 1440;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 1200, 1440);

        ctx.fillStyle = "#047857";
        ctx.fillRect(0, 0, 1200, 36);

        ctx.fillStyle = "#065f46";
        ctx.font = "bold 46px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(roomInfo.name || "ANU", 600, 120);

        if (roomInfo.subject) {
          ctx.fillStyle = "#64748b";
          ctx.font = "32px sans-serif";
          ctx.fillText(`مادة: ${roomInfo.subject}`, 600, 175);
        }

        const qrSize = 800;
        const qrX = (1200 - qrSize) / 2;
        const qrY = 220;

        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(qrX - 24, qrY - 24, qrSize + 48, qrSize + 48, 36);
        } else {
          ctx.rect(qrX - 24, qrY - 24, qrSize + 48, qrSize + 48);
        }
        ctx.fill();
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 56px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(st.name, 600, 1130);

        ctx.fillStyle = "#047857";
        ctx.font = "bold 42px sans-serif";
        ctx.fillText(`فصل ف${st.section} • الكود: ${cleanCode}`, 600, 1220);

        ctx.fillStyle = "#94a3b8";
        ctx.font = "28px sans-serif";
        ctx.fillText("كارت حضور ذكي فائق الدقة (Ultra-HD)", 600, 1330);

        const a = document.createElement("a");
        a.download = `كارت_${st.name}_${cleanCode}_HD.png`.replace(/\s+/g, "_");
        a.href = canvas.toDataURL("image/png", 1.0);
        a.click();
        showToast("تم تحميل كارت الحضور بدقة فائقة Ultra-HD 📥");
      };
      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    } catch {
      showToast("فشل تحميل الكارت");
    }
  };

  const handleShareWhatsApp = (st: StudentCard) => {
    const cleanCode = formatCode(st.code, st.section, st.seq);
    const cardLink = `${window.location.origin}?token=${st.qr_token || st.id}`;
    const text = `مرحباً ${st.name}،\nكارت الحضور الذكي الخاص بك لمساحة «${roomInfo.name}»:\nالكود: ${cleanCode} (فصل ف${st.section})\n\nلفتح الكارت بجودة فائقة الوضوح على شاشة الهاتف:\n🔗 ${cardLink}\n\nيرجى الاحتفاظ بالرابط لتسجيل الحضور بسهولة وبدون أي تشويش.`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleCopyLink = (st: StudentCard) => {
    const link = `${window.location.origin}?token=${st.qr_token || st.id}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(true);
      showToast("تم نسخ رابط الكارت المباشر بنجاح 📋");
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12" dir="rtl">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 inset-x-4 max-w-sm mx-auto z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm text-center font-medium animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Hero Header matching screenshot */}
      <div className="bg-gradient-to-b from-[#064e3b] to-[#047857] text-white pt-6 pb-8 px-4 rounded-b-3xl shadow-md">
        <div className="max-w-md mx-auto text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold tracking-wide text-emerald-100">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" /> كروت الحضور الرقمية الأصلية
          </div>
          <h1 className="text-3xl font-black tracking-tight">{roomInfo.name}</h1>
          <p className="text-sm font-medium text-emerald-100/90">
            مادة: {roomInfo.subject || "الجميع"}
          </p>

          <div className="pt-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 text-xs font-medium border border-white/20">
              <GraduationCap className="h-4 w-4 text-emerald-200" />
              <span>بوابة الطلاب الرسمية لتسجيل الحضور</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 mt-5 space-y-4">
        {/* Student Advice Alert matching screenshot */}
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-950 text-xs font-medium leading-relaxed flex items-start gap-3 shadow-xs">
          <QrCode className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-emerald-900 font-bold mb-0.5">تنبيه للطلاب:</strong>
            افتح كارتك واجعله بملء الشاشة، واضبط سطوع شاشة هاتفك لأعلى درجة أثناء تسجيل الحضور
            ليمسحه المحاضر في جزء من الثانية وبدون أي تشويش.
          </div>
        </div>

        {/* Live Search Input */}
        <div className="relative">
          <Search className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن اسمك أو كودك التسلسلي…"
            className="w-full pr-10 pl-4 py-3 bg-white rounded-2xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent shadow-xs transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Section Filters */}
        {sectionsList.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedSection(0)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                selectedSection === 0
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              الكل ({students.length})
            </button>
            {sectionsList.map((sec) => {
              const count = students.filter((s) => s.section === sec).length;
              return (
                <button
                  key={sec}
                  onClick={() => setSelectedSection(sec)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                    selectedSection === sec
                      ? "bg-emerald-700 text-white shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  فصل ف{sec} <span className="opacity-70 text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="py-20 text-center text-sm font-medium text-slate-400">
            جاري تحميل كروت الحضور بدقة فائقة…
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredStudents.length === 0 && (
          <div className="py-16 text-center text-sm text-slate-500 bg-white rounded-2xl border border-slate-200 p-6">
            لم يتم العثور على أي طلاب مطابقين للبحث.
          </div>
        )}

        {/* Cards Grid */}
        <div className="space-y-4">
          {filteredStudents.map((st) => {
            const cleanCode = formatCode(st.code, st.section, st.seq);
            const qrValue = st.qr_token || st.id;

            return (
              <div
                key={st.id}
                onClick={() => setSelectedStudent(st)}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col items-center"
              >
                {/* Section and Code header */}
                <div className="w-full flex items-center justify-between pb-2 border-b border-slate-100 text-xs font-bold">
                  <span className="text-emerald-800">فصل ف{st.section}</span>
                  <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[11px]">
                    {cleanCode}
                  </span>
                </div>

                {/* Vector QR Code SVG */}
                <div className="p-4 my-2 rounded-2xl bg-white border border-slate-100 shadow-inner">
                  <QRCodeSVG
                    id={`qr-svg-${st.id}`}
                    value={qrValue}
                    size={170}
                    level="H"
                    includeMargin
                    className="mx-auto"
                  />
                </div>

                {/* Student Name */}
                <h3 className="font-extrabold text-base text-slate-900 mt-1">{st.name}</h3>
                <p className="text-[11px] font-medium text-slate-400 mt-0.5 flex items-center gap-1">
                  <span>اضغط لعرض الكارت بملء الشاشة</span> 🔍
                </p>

                {/* Action Buttons */}
                <div
                  className="grid grid-cols-2 gap-2 w-full mt-4 pt-3 border-t border-slate-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleDownloadHd(st)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> تحميل HD
                  </button>
                  <button
                    onClick={() => handleShareWhatsApp(st)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition-colors"
                  >
                    <Share2 className="h-3.5 w-3.5" /> واتساب
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Full-Screen Smart Attendance Mode */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl relative space-y-4">
            <button
              onClick={() => setSelectedStudent(null)}
              className="absolute top-4 left-4 p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
              <Smartphone className="h-3.5 w-3.5" /> وضع الحضور الذكي
            </div>

            {/* Giant QR Code for instant scanner read */}
            <div className="p-4 rounded-3xl bg-white border-4 border-emerald-500/30 shadow-md">
              <QRCodeSVG
                value={selectedStudent.qr_token || selectedStudent.id}
                size={230}
                level="H"
                includeMargin
                className="mx-auto"
              />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-900">{selectedStudent.name}</h2>
              <div className="flex items-center justify-center gap-2 mt-1 text-sm font-bold text-emerald-700">
                <span>فصل ف{selectedStudent.section}</span>
                <span>•</span>
                <span className="font-mono bg-emerald-50 px-2 py-0.5 rounded text-xs">
                  {formatCode(
                    selectedStudent.code,
                    selectedStudent.section,
                    selectedStudent.seq,
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {roomInfo.name} • {roomInfo.subject || "الجميع"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => handleDownloadHd(selectedStudent)}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <Download className="h-4 w-4" /> حفظ الكارت HD
              </button>
              <button
                onClick={() => handleShareWhatsApp(selectedStudent)}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-300 transition-colors"
              >
                <Share2 className="h-4 w-4" /> إرسال لواتساب
              </button>
            </div>

            <button
              onClick={() => handleCopyLink(selectedStudent)}
              className="w-full text-center text-xs font-semibold text-slate-500 hover:text-emerald-700 py-1"
            >
              {copiedLink ? "تم نسخ الرابط بنجاح! ✓" : "نسخ رابط الكارت المباشر 🔗"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
