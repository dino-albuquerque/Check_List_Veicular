import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Car, 
  ClipboardCheck, 
  Camera, 
  FileText, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  AlertTriangle, 
  MinusCircle,
  Download,
  Send,
  LogOut,
  User as UserIcon,
  Calendar,
  Hash,
  MessageSquare,
  Mail,
  PlusCircle
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { InspectionData, ChecklistStatus, User, InspectionType, ChecklistItem } from '../types';
import { generateProtocol, cn } from '../lib/utils';
import { CameraCapture } from './CameraCapture';
import { Logo } from './Logo';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface InspectionWizardProps {
  user: User;
  onLogout: () => void;
}

const STEPS = [
  { id: 'vehicle', label: 'Veículo', icon: Car },
  { id: 'checklist', label: 'Checklist', icon: ClipboardCheck },
  { id: 'finalization', label: 'Finalização', icon: Camera },
  { id: 'summary', label: 'Resumo', icon: FileText },
];

const CHECKLIST_STRUCTURE = {
  exterior: [
    { id: 'pintura', label: 'Pintura e Lataria' },
    { id: 'vidros', label: 'Vidros e Parabrisa' },
    { id: 'pneus', label: 'Pneus e Rodas' },
    { id: 'farois', label: 'Faróis e Lanternas' },
    { id: 'retrovisores', label: 'Retrovisores' },
  ],
  interior: [
    { id: 'estofados', label: 'Estofados e Bancos' },
    { id: 'painel', label: 'Painel e Instrumentos' },
    { id: 'ar_condicionado', label: 'Ar Condicionado' },
    { id: 'cinto_seguranca', label: 'Cintos de Segurança' },
    { id: 'limpeza', label: 'Limpeza Geral' },
  ],
  mechanics: [
    { id: 'motor', label: 'Nível de Óleo/Água' },
    { id: 'freios', label: 'Sistema de Freios' },
    { id: 'suspensao', label: 'Suspensão' },
    { id: 'bateria', label: 'Bateria' },
    { id: 'ruidos', label: 'Ruídos Anormais' },
  ],
  docs: [
    { id: 'crlv', label: 'CRLV Digital/Físico' },
    { id: 'manual', label: 'Manual do Proprietário' },
    { id: 'chave_reserva', label: 'Chave Reserva' },
    { id: 'estepe', label: 'Estepe e Ferramentas' },
  ]
};

export function InspectionWizard({ user, onLogout }: InspectionWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<InspectionData>({
    protocol: generateProtocol(),
    inspector: user.name,
    type: 'final',
    vehicle: { plate: '', brand: '', model: '', year: '', color: '', km: '' },
    checklist: {
      exterior: CHECKLIST_STRUCTURE.exterior.map(i => ({ ...i, status: 'ok' as ChecklistStatus })),
      interior: CHECKLIST_STRUCTURE.interior.map(i => ({ ...i, status: 'ok' as ChecklistStatus })),
      mechanics: CHECKLIST_STRUCTURE.mechanics.map(i => ({ ...i, status: 'ok' as ChecklistStatus })),
      docs: CHECKLIST_STRUCTURE.docs.map(i => ({ ...i, status: 'ok' as ChecklistStatus })),
    },
    photos: {},
    comments: '',
    signature: '',
    date: new Date().toLocaleDateString('pt-BR'),
  });

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const reportRef = useRef<HTMLDivElement>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Signature logic
  useEffect(() => {
    if (currentStep === 2 && signatureCanvasRef.current) {
      const canvas = signatureCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
      }
    }
  }, [currentStep]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (signatureCanvasRef.current) {
      setData(prev => ({ ...prev, signature: signatureCanvasRef.current!.toDataURL() }));
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !signatureCanvasRef.current) return;
    const canvas = signatureCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearSignature = () => {
    if (signatureCanvasRef.current) {
      const canvas = signatureCanvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      setData(prev => ({ ...prev, signature: '' }));
    }
  };

  const nextStep = async () => {
    if (currentStep === STEPS.length - 2) {
      // Finalizing
      await saveInspection();
    }
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  };

  const saveInspection = async () => {
    try {
      const response = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocol: data.protocol,
          inspector_email: user.email,
          data: data
        }),
      });
      if (!response.ok) throw new Error('Failed to save');
    } catch (err) {
      console.error("Error saving inspection:", err);
    }
  };

  const resetWizard = () => {
    setCurrentStep(0);
    setData({
      protocol: generateProtocol(),
      inspector: user.name,
      type: 'final',
      vehicle: { plate: '', brand: '', model: '', year: '', color: '', km: '' },
      checklist: {
        exterior: CHECKLIST_STRUCTURE.exterior.map(i => ({ ...i, status: 'ok' as ChecklistStatus })),
        interior: CHECKLIST_STRUCTURE.interior.map(i => ({ ...i, status: 'ok' as ChecklistStatus })),
        mechanics: CHECKLIST_STRUCTURE.mechanics.map(i => ({ ...i, status: 'ok' as ChecklistStatus })),
        docs: CHECKLIST_STRUCTURE.docs.map(i => ({ ...i, status: 'ok' as ChecklistStatus })),
      },
      photos: {},
      comments: '',
      signature: '',
      date: new Date().toLocaleDateString('pt-BR'),
    });
  };

  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  const updateChecklist = (category: keyof typeof data.checklist, id: string, status: ChecklistStatus) => {
    setData(prev => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        [category]: prev.checklist[category].map(item => 
          item.id === id ? { ...item, status } : item
        )
      }
    }));
  };

  const generatePdf = async () => {
    if (!reportRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      return pdf;
    } catch (err) {
      console.error("Error generating PDF:", err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const downloadPdf = async () => {
    const pdf = await generatePdf();
    if (pdf) {
      pdf.save(`Vistoria_${data.protocol}.pdf`);
    }
  };

  const sendEmail = async () => {
    if (!emailTo) return;
    setIsSendingEmail(true);
    const pdf = await generatePdf();
    if (!pdf) return;

    const pdfBase64 = pdf.output('datauristring');

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailTo,
          pdfBase64,
          protocol: data.protocol
        }),
      });

      if (response.ok) {
        alert("E-mail enviado com sucesso!");
        setShowEmailModal(false);
      } else {
        alert("Erro ao enviar e-mail.");
      }
    } catch (err) {
      alert("Erro de conexão.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Tipo de Inspeção</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setData(prev => ({ ...prev, type: 'inicial' }))}
                    className={cn(
                      "flex-1 py-3 rounded-xl border-2 font-bold transition-all",
                      data.type === 'inicial' ? "bg-blue-50 border-blue-600 text-blue-600" : "bg-white border-slate-200 text-slate-400"
                    )}
                  >
                    Inicial
                  </button>
                  <button 
                    onClick={() => setData(prev => ({ ...prev, type: 'final' }))}
                    className={cn(
                      "flex-1 py-3 rounded-xl border-2 font-bold transition-all",
                      data.type === 'final' ? "bg-blue-50 border-blue-600 text-blue-600" : "bg-white border-slate-200 text-slate-400"
                    )}
                  >
                    Final
                  </button>
                </div>
                {data.type === 'inicial' && (
                  <p className="text-[10px] text-blue-500 font-medium ml-1 italic">
                    * Inspeção inicial não requer captura de fotos.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Placa</label>
                <input 
                  type="text" 
                  value={data.vehicle.plate}
                  onChange={e => setData(prev => ({ ...prev, vehicle: { ...prev.vehicle, plate: e.target.value.toUpperCase() } }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="ABC-1234"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Marca</label>
                <input 
                  type="text" 
                  value={data.vehicle.brand}
                  onChange={e => setData(prev => ({ ...prev, vehicle: { ...prev.vehicle, brand: e.target.value } }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: Toyota"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Modelo</label>
                <input 
                  type="text" 
                  value={data.vehicle.model}
                  onChange={e => setData(prev => ({ ...prev, vehicle: { ...prev.vehicle, model: e.target.value } }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: Corolla"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Ano</label>
                <input 
                  type="text" 
                  value={data.vehicle.year}
                  onChange={e => setData(prev => ({ ...prev, vehicle: { ...prev.vehicle, year: e.target.value } }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="2024"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Cor</label>
                <input 
                  type="text" 
                  value={data.vehicle.color}
                  onChange={e => setData(prev => ({ ...prev, vehicle: { ...prev.vehicle, color: e.target.value } }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Prata"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">KM Atual</label>
                <input 
                  type="text" 
                  value={data.vehicle.km}
                  onChange={e => setData(prev => ({ ...prev, vehicle: { ...prev.vehicle, km: e.target.value } }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-8">
            {Object.entries(CHECKLIST_STRUCTURE).map(([category, items]) => (
              <div key={category} className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full" />
                  {category === 'exterior' ? 'Exterior' : category === 'interior' ? 'Interior' : category === 'mechanics' ? 'Mecânica' : 'Documentação'}
                </h3>
                <div className="space-y-3">
                  {items.map(item => {
                    const currentStatus = data.checklist[category as keyof typeof data.checklist].find(i => i.id === item.id)?.status;
                    return (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => updateChecklist(category as any, item.id, 'ok')}
                            className={cn("p-2 rounded-lg transition-all", currentStatus === 'ok' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-white text-slate-300")}
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => updateChecklist(category as any, item.id, 'avaria')}
                            className={cn("p-2 rounded-lg transition-all", currentStatus === 'avaria' ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : "bg-white text-slate-300")}
                          >
                            <AlertTriangle className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => updateChecklist(category as any, item.id, 'na')}
                            className={cn("p-2 rounded-lg transition-all", currentStatus === 'na' ? "bg-slate-400 text-white shadow-lg shadow-slate-400/20" : "bg-white text-slate-300")}
                          >
                            <MinusCircle className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );
      case 2:
        return (
          <div className="space-y-8">
            {data.type === 'final' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CameraCapture label="Frente do Veículo" onCapture={img => setData(prev => ({ ...prev, photos: { ...prev.photos, front: img } }))} currentImage={data.photos.front} />
                <CameraCapture label="Traseira do Veículo" onCapture={img => setData(prev => ({ ...prev, photos: { ...prev.photos, back: img } }))} currentImage={data.photos.back} />
                <CameraCapture label="Lateral Esquerda" onCapture={img => setData(prev => ({ ...prev, photos: { ...prev.photos, left: img } }))} currentImage={data.photos.left} />
                <CameraCapture label="Lateral Direita" onCapture={img => setData(prev => ({ ...prev, photos: { ...prev.photos, right: img } }))} currentImage={data.photos.right} />
                <CameraCapture label="Motor" onCapture={img => setData(prev => ({ ...prev, photos: { ...prev.photos, engine: img } }))} currentImage={data.photos.engine} />
                <CameraCapture label="Interior" onCapture={img => setData(prev => ({ ...prev, photos: { ...prev.photos, interior: img } }))} currentImage={data.photos.interior} />
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  Comentários do Inspetor
                </label>
                <textarea 
                  value={data.comments}
                  onChange={e => setData(prev => ({ ...prev, comments: e.target.value }))}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl min-h-[120px] focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="Descreva aqui qualquer observação relevante sobre o estado do veículo..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Assinatura do Inspetor</label>
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden">
                  <canvas 
                    ref={signatureCanvasRef}
                    width={500}
                    height={200}
                    className="w-full h-40 cursor-crosshair touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseOut={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                  <div className="p-2 bg-slate-100 flex justify-end">
                    <button 
                      onClick={clearSignature}
                      className="text-xs font-bold text-slate-500 hover:text-red-500 transition-colors uppercase tracking-widest"
                    >
                      Limpar Assinatura
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-emerald-900">Vistoria Concluída!</h3>
                <p className="text-sm text-emerald-700">O protocolo {data.protocol} foi gerado com sucesso.</p>
              </div>
            </div>

            {/* Report Preview */}
            <div ref={reportRef} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-slate-800">
              <div className="flex justify-between items-start mb-8 border-b pb-6">
                <Logo />
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Protocolo</p>
                  <p className="text-lg font-black text-blue-600">{data.protocol}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{data.date}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-1">Dados do Veículo</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <span className="text-slate-400">Placa:</span> <span className="font-bold">{data.vehicle.plate}</span>
                    <span className="text-slate-400">Marca/Modelo:</span> <span className="font-bold">{data.vehicle.brand} {data.vehicle.model}</span>
                    <span className="text-slate-400">Ano/Cor:</span> <span className="font-bold">{data.vehicle.year} / {data.vehicle.color}</span>
                    <span className="text-slate-400">KM:</span> <span className="font-bold">{data.vehicle.km}</span>
                    <span className="text-slate-400">Tipo:</span> <span className="font-bold uppercase text-blue-600">{data.type}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-1">Inspetor Responsável</h4>
                  <div className="text-sm">
                    <p className="font-bold text-slate-700">{data.inspector}</p>
                    <p className="text-xs text-slate-400 mt-1 italic">Vistoria realizada via Auto Check App</p>
                  </div>
                </div>
              </div>

              {data.comments && (
                <div className="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Observações</h4>
                  <p className="text-sm text-slate-600 italic">"{data.comments}"</p>
                </div>
              )}

              <div className="space-y-6">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-1">Resumo do Checklist</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(data.checklist).map(([cat, items]) => {
                    const avarias = (items as ChecklistItem[]).filter(i => i.status === 'avaria').length;
                    return (
                      <div key={cat} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-[10px] font-bold uppercase text-slate-400">{cat}</p>
                        <p className={cn("text-lg font-black mt-1", avarias > 0 ? "text-amber-500" : "text-emerald-500")}>
                          {avarias > 0 ? `${avarias} Avarias` : 'OK'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-12 pt-8 border-t flex justify-between items-end">
                <div className="text-center">
                  {data.signature && <img src={data.signature} alt="Assinatura" className="h-16 mx-auto mb-2" />}
                  <div className="w-48 h-px bg-slate-300 mx-auto" />
                  <p className="text-[10px] font-bold uppercase text-slate-400 mt-2">Assinatura do Inspetor</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Desenvolvido por BJ Hub</p>
                  <p className="text-[10px] text-slate-300">© 2024 Auto Check</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-4">
              <button 
                onClick={downloadPdf}
                disabled={isGeneratingPdf}
                className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                {isGeneratingPdf ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                Baixar PDF
              </button>
              <button 
                onClick={() => setShowEmailModal(true)}
                className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
              >
                <Send className="w-5 h-5" />
                Enviar E-mail
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <button 
                onClick={resetWizard}
                className="py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
              >
                <PlusCircle className="w-5 h-5" />
                Nova Vistoria
              </button>
              <button 
                onClick={resetWizard}
                className="py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
              >
                <CheckCircle2 className="w-5 h-5" />
                Salvar e Fechar
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 sticky top-0 z-50 flex items-center justify-between">
        <Logo className="h-8 w-auto" />
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Inspetor</span>
            <span className="text-sm font-bold text-slate-700">{user.name}</span>
          </div>
          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 border border-blue-100">
            <UserIcon className="w-5 h-5" />
          </div>
          <button 
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white px-6 py-4 border-b border-slate-100">
        <div className="max-w-4xl mx-auto flex justify-between relative">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -translate-y-1/2 -z-10" />
          <div 
            className="absolute top-1/2 left-0 h-1 bg-blue-600 -translate-y-1/2 -z-10 transition-all duration-500"
            style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
          />
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = idx === currentStep;
            const isCompleted = idx < currentStep;
            return (
              <div key={step.id} className="flex flex-col items-center gap-2">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-2",
                  isActive ? "bg-blue-600 border-blue-600 text-white scale-110 shadow-lg shadow-blue-600/20" : 
                  isCompleted ? "bg-emerald-500 border-emerald-500 text-white" : 
                  "bg-white border-slate-200 text-slate-400"
                )}>
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-widest transition-colors",
                  isActive ? "text-blue-600" : "text-slate-400"
                )}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100"
          >
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                  {STEPS[currentStep].label}
                </h2>
                <p className="text-sm text-slate-400 font-medium mt-1">
                  Etapa {currentStep + 1} de {STEPS.length} • Protocolo {data.protocol}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                {React.createElement(STEPS[currentStep].icon, { className: "w-6 h-6" })}
              </div>
            </div>

            {renderStep()}

            {currentStep < 3 && (
              <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between">
                <button
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="px-6 py-3 text-slate-400 font-bold flex items-center gap-2 hover:text-slate-600 transition-colors disabled:opacity-0"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Voltar
                </button>
                <button
                  onClick={nextStep}
                  className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                >
                  {currentStep === STEPS.length - 2 ? 'Finalizar Vistoria' : 'Continuar'}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Email Modal */}
      <AnimatePresence>
        {showEmailModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEmailModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8"
            >
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-4">
                  <Mail className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Enviar Relatório</h3>
                <p className="text-sm text-slate-500 text-center mt-2">
                  Insira os e-mails dos destinatários separados por vírgula.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Destinatários</label>
                  <input 
                    type="text"
                    value={emailTo}
                    onChange={e => setEmailTo(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="cliente@email.com, gerente@email.com"
                  />
                </div>

                <button 
                  onClick={sendEmail}
                  disabled={isSendingEmail || !emailTo}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSendingEmail ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  Enviar Agora
                </button>
                <button 
                  onClick={() => setShowEmailModal(false)}
                  className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="p-6 text-center">
        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
          Desenvolvido por BJ Hub
        </p>
      </footer>
    </div>
  );
}

function Loader2(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
