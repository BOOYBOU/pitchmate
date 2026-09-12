import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  PenTool,
  MoveRight,
  TrendingUp,
  Circle,
  Undo2,
  Trash2,
  Download,
  Eye,
  EyeOff,
  Sparkles,
  Sliders,
  Check,
  Disc,
  Flag,
} from 'lucide-react';
import { useLanguage } from '../lib/useLanguage';

export type TacticalTool = 'run_arrow' | 'pass_arrow' | 'freehand' | 'zone' | 'ball' | 'cone';

export interface Point {
  x: number;
  y: number;
}

export interface TacticalElement {
  id: string;
  type: TacticalTool;
  color: string;
  width: number;
  points: Point[]; // for freehand or start/end for arrows/zones
  radius?: number;
  text?: string;
}

interface TacticalDrawingCanvasProps {
  width: number;
  height: number;
  isActive: boolean;
  onToggleActive?: (active: boolean) => void;
  className?: string;
}

const TACTICAL_COLORS = [
  { id: 'gold', hex: '#F5D794', labelAr: 'ذهبي تكتيكي', labelEn: 'Tactical Gold' },
  { id: 'green', hex: '#10B981', labelAr: 'أخضر نيون', labelEn: 'Neon Green' },
  { id: 'cyan', hex: '#38BDF8', labelAr: 'أزرق ساطع', labelEn: 'Vibrant Cyan' },
  { id: 'red', hex: '#EF4444', labelAr: 'أحمر هجومي', labelEn: 'Attack Red' },
  { id: 'white', hex: '#FFFFFF', labelAr: 'أبيض طباشيري', labelEn: 'Chalk White' },
];

export const TacticalDrawingCanvas: React.FC<TacticalDrawingCanvasProps> = ({
  width,
  height,
  isActive,
  onToggleActive,
  className = '',
}) => {
  const { language } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Tactical tools state
  const [selectedTool, setSelectedTool] = useState<TacticalTool>('run_arrow');
  const [selectedColor, setSelectedColor] = useState<string>('#F5D794');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [elements, setElements] = useState<TacticalElement[]>([]);
  const [history, setHistory] = useState<TacticalElement[][]>([]);
  const [isVisible, setIsVisible] = useState<boolean>(true);

  // Ball marker
  const [ballPosition, setBallPosition] = useState<Point | null>({ x: width / 2, y: height / 2 });

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const currentPointsRef = useRef<Point[]>([]);

  // Redraw all elements on canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!isVisible) return;

    // Draw elements
    elements.forEach((el) => {
      ctx.save();
      ctx.strokeStyle = el.color;
      ctx.fillStyle = el.color;
      ctx.lineWidth = el.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 2;

      if (el.type === 'freehand' && el.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length - 1; i++) {
          const xc = (el.points[i].x + el.points[i + 1].x) / 2;
          const yc = (el.points[i].y + el.points[i + 1].y) / 2;
          ctx.quadraticCurveTo(el.points[i].x, el.points[i].y, xc, yc);
        }
        ctx.lineTo(el.points[el.points.length - 1].x, el.points[el.points.length - 1].y);
        ctx.stroke();
      } else if (el.type === 'run_arrow' && el.points.length >= 2) {
        const p1 = el.points[0];
        const p2 = el.points[el.points.length - 1];
        drawArrow(ctx, p1.x, p1.y, p2.x, p2.y, el.width, el.color, false);
      } else if (el.type === 'pass_arrow' && el.points.length >= 2) {
        const p1 = el.points[0];
        const p2 = el.points[el.points.length - 1];
        drawArrow(ctx, p1.x, p1.y, p2.x, p2.y, el.width, el.color, true);
      } else if (el.type === 'zone' && el.points.length >= 2) {
        const p1 = el.points[0];
        const p2 = el.points[el.points.length - 1];
        const rx = Math.abs(p2.x - p1.x);
        const ry = Math.abs(p2.y - p1.y);
        ctx.beginPath();
        ctx.ellipse(p1.x, p1.y, Math.max(rx, 15), Math.max(ry, 15), 0, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(el.color, 0.25);
        ctx.fill();
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (el.type === 'cone' && el.points.length >= 1) {
        const p = el.points[0];
        drawTrainingCone(ctx, p.x, p.y, el.color);
      }

      ctx.restore();
    });

    // Draw active drawing stroke if in progress
    if (isDrawing && currentPointsRef.current.length > 0) {
      const pts = currentPointsRef.current;
      ctx.save();
      ctx.strokeStyle = selectedColor;
      ctx.fillStyle = selectedColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 8;

      if (selectedTool === 'freehand' && pts.length > 1) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
      } else if (selectedTool === 'run_arrow' && pts.length >= 2) {
        drawArrow(ctx, pts[0].x, pts[0].y, pts[pts.length - 1].x, pts[pts.length - 1].y, strokeWidth, selectedColor, false);
      } else if (selectedTool === 'pass_arrow' && pts.length >= 2) {
        drawArrow(ctx, pts[0].x, pts[0].y, pts[pts.length - 1].x, pts[pts.length - 1].y, strokeWidth, selectedColor, true);
      } else if (selectedTool === 'zone' && pts.length >= 2) {
        const p1 = pts[0];
        const p2 = pts[pts.length - 1];
        const rx = Math.abs(p2.x - p1.x);
        const ry = Math.abs(p2.y - p1.y);
        ctx.beginPath();
        ctx.ellipse(p1.x, p1.y, Math.max(rx, 15), Math.max(ry, 15), 0, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(selectedColor, 0.25);
        ctx.fill();
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }

    // Draw Match Ball if visible
    if (ballPosition && isVisible) {
      drawRealisticSoccerBall(ctx, ballPosition.x, ballPosition.y);
    }
  }, [elements, isDrawing, isVisible, selectedColor, selectedTool, strokeWidth, ballPosition]);

  // Sync canvas dimensions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      redrawCanvas();
    }
  }, [width, height, redrawCanvas]);

  // Redraw on dependencies
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Helper: Hex to RGBA
  const hexToRgba = (hex: string, alpha: number) => {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map((x) => x + x).join('');
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Draw sleek directional arrow
  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    width: number,
    color: string,
    isDashed: boolean
  ) => {
    const headLength = Math.max(16, width * 3.5);
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);
    const dist = Math.hypot(dx, dy);

    if (dist < 8) return;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;

    if (isDashed) {
      ctx.setLineDash([10, 8]);
    }

    // Shaft line stopping just before the arrowhead base
    const endX = toX - (headLength * 0.6) * Math.cos(angle);
    const endY = toY - (headLength * 0.6) * Math.sin(angle);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Arrowhead
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      toX - (headLength * 0.6) * Math.cos(angle),
      toY - (headLength * 0.6) * Math.sin(angle)
    );
    ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  // Draw training cone
  const drawTrainingCone = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
    ctx.save();
    // Shadow
    ctx.beginPath();
    ctx.ellipse(x, y + 10, 16, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fill();

    // Base
    ctx.beginPath();
    ctx.ellipse(x, y + 6, 14, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#C2410C';
    ctx.fill();

    // Cone body
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 6);
    ctx.lineTo(x, y - 18);
    ctx.lineTo(x + 10, y + 6);
    ctx.closePath();
    ctx.fillStyle = color === '#F5D794' ? '#F97316' : color;
    ctx.fill();

    // White reflective band
    ctx.beginPath();
    ctx.moveTo(x - 5, y - 2);
    ctx.lineTo(x, y - 10);
    ctx.lineTo(x + 5, y - 2);
    ctx.closePath();
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    ctx.restore();
  };

  // Draw ultra-realistic soccer ball
  const drawRealisticSoccerBall = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const r = 13;
    ctx.save();
    // Drop shadow
    ctx.beginPath();
    ctx.ellipse(x, y + 12, r * 1.2, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fill();

    // Ball 3D spherical gradient
    const grad = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.7, '#E2E8F0');
    grad.addColorStop(1, '#94A3B8');

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#0F172A';
    ctx.stroke();

    // Pentagons
    ctx.fillStyle = '#0F172A';
    // Center pentagon
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const px = x + Math.cos(a) * (r * 0.38);
      const py = y + Math.sin(a) * (r * 0.38);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Edge accents
    for (let i = 0; i < 5; i++) {
      const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const px = x + Math.cos(a) * (r * 0.38);
      const py = y + Math.sin(a) * (r * 0.38);
      const ex = x + Math.cos(a) * (r * 0.85);
      const ey = y + Math.sin(a) * (r * 0.85);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }

    ctx.restore();
  };

  // Pointer event coordinates relative to canvas
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const pt = getCanvasCoords(e);

    if (selectedTool === 'ball') {
      setBallPosition(pt);
      redrawCanvas();
      return;
    }

    if (selectedTool === 'cone') {
      const newEl: TacticalElement = {
        id: `cone-${Date.now()}`,
        type: 'cone',
        color: selectedColor,
        width: strokeWidth,
        points: [pt],
      };
      setHistory((prev) => [...prev, elements]);
      setElements((prev) => [...prev, newEl]);
      return;
    }

    setIsDrawing(true);
    currentPointsRef.current = [pt];
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isActive) return;
    const pt = getCanvasCoords(e);

    if (selectedTool === 'freehand') {
      currentPointsRef.current.push(pt);
    } else {
      // For arrows and zones, keep origin and update current head
      if (currentPointsRef.current.length === 1) {
        currentPointsRef.current.push(pt);
      } else {
        currentPointsRef.current[1] = pt;
      }
    }
    redrawCanvas();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isActive) return;
    setIsDrawing(false);

    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}

    if (currentPointsRef.current.length > 1) {
      const newEl: TacticalElement = {
        id: `el-${Date.now()}-${Math.random()}`,
        type: selectedTool,
        color: selectedColor,
        width: strokeWidth,
        points: [...currentPointsRef.current],
      };

      setHistory((prev) => [...prev, elements]);
      setElements((prev) => [...prev, newEl]);
    }
    currentPointsRef.current = [];
  };

  // Undo
  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setElements(prev);
  };

  // Clear
  const handleClear = () => {
    if (elements.length === 0) return;
    setHistory((prev) => [...prev, elements]);
    setElements([]);
  };

  // Export Snapshot
  const handleExportSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `PitchMate-Tactical-Play-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className={`relative w-full h-full pointer-events-none select-none ${className}`}>
      {/* HTML5 Canvas overlay */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`w-full h-full absolute inset-0 ${
          isActive
            ? 'pointer-events-auto cursor-crosshair touch-none'
            : 'pointer-events-none'
        }`}
        style={{ width: '100%', height: '100%' }}
      />

      {/* Floating Tactical Drawing Command Deck */}
      {isActive && (
        <div className="absolute top-14 left-3 right-3 sm:left-auto sm:right-3.5 sm:w-auto z-40 flex flex-col gap-2 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-[#0A1A14]/95 backdrop-blur-md border border-[#E5B869]/40 p-2 sm:p-2.5 rounded-2xl shadow-2xl flex flex-wrap items-center gap-2">
            {/* Tool Selector */}
            <div className="flex items-center gap-1 bg-[#05100B] p-1 rounded-xl border border-[#E5B869]/20">
              <button
                type="button"
                onClick={() => setSelectedTool('run_arrow')}
                className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedTool === 'run_arrow'
                    ? 'bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 font-black shadow-md scale-105'
                    : 'text-slate-300 hover:text-white'
                }`}
                title={language === 'ar' ? 'سهم تحرك وركض تكتيكي' : 'Movement / Run Arrow'}
              >
                <MoveRight className="w-4 h-4" />
                <span className="hidden sm:inline text-[11px]">
                  {language === 'ar' ? 'تحرك' : 'Run'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTool('pass_arrow')}
                className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedTool === 'pass_arrow'
                    ? 'bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 font-black shadow-md scale-105'
                    : 'text-slate-300 hover:text-white'
                }`}
                title={language === 'ar' ? 'سهم تمريرة أرضية/هوائية (متقطع)' : 'Passing Lane (Dashed Arrow)'}
              >
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline text-[11px]">
                  {language === 'ar' ? 'تمرير' : 'Pass'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTool('freehand')}
                className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedTool === 'freehand'
                    ? 'bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 font-black shadow-md scale-105'
                    : 'text-slate-300 hover:text-white'
                }`}
                title={language === 'ar' ? 'قلم تكتيكي حر' : 'Freehand Pen'}
              >
                <PenTool className="w-4 h-4" />
                <span className="hidden sm:inline text-[11px]">
                  {language === 'ar' ? 'قلم' : 'Pen'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTool('zone')}
                className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedTool === 'zone'
                    ? 'bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 font-black shadow-md scale-105'
                    : 'text-slate-300 hover:text-white'
                }`}
                title={language === 'ar' ? 'منطقة ضغط تكتيكية' : 'Pressing Zone Area'}
              >
                <Circle className="w-4 h-4" />
                <span className="hidden sm:inline text-[11px]">
                  {language === 'ar' ? 'منطقة' : 'Zone'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTool('ball')}
                className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedTool === 'ball'
                    ? 'bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 font-black shadow-md scale-105'
                    : 'text-slate-300 hover:text-white'
                }`}
                title={language === 'ar' ? 'وضع كرة المباراة' : 'Place Match Ball'}
              >
                <Disc className="w-4 h-4" />
                <span className="hidden sm:inline text-[11px]">
                  {language === 'ar' ? 'كرة' : 'Ball'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTool('cone')}
                className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedTool === 'cone'
                    ? 'bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 font-black shadow-md scale-105'
                    : 'text-slate-300 hover:text-white'
                }`}
                title={language === 'ar' ? 'وضع مخروط تدريبي' : 'Training Cone'}
              >
                <Flag className="w-4 h-4" />
                <span className="hidden sm:inline text-[11px]">
                  {language === 'ar' ? 'مخروط' : 'Cone'}
                </span>
              </button>
            </div>

            {/* Colors */}
            <div className="flex items-center gap-1.5 bg-[#05100B] px-2 py-1.5 rounded-xl border border-[#E5B869]/20">
              {TACTICAL_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedColor(c.hex)}
                  className={`w-6 h-6 rounded-full transition-transform cursor-pointer border ${
                    selectedColor === c.hex
                      ? 'scale-120 ring-2 ring-white border-white shadow-md'
                      : 'border-black/40 hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={language === 'ar' ? c.labelAr : c.labelEn}
                />
              ))}
            </div>

            {/* Line Width */}
            <div className="flex items-center gap-1 bg-[#05100B] p-1 rounded-xl border border-[#E5B869]/20">
              {[
                { size: 3, label: '3px' },
                { size: 6, label: '6px' },
                { size: 10, label: '10px' },
              ].map((w) => (
                <button
                  key={w.size}
                  type="button"
                  onClick={() => setStrokeWidth(w.size)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    strokeWidth === w.size
                      ? 'bg-[#0E4836] text-[#F5D794] border border-[#E5B869]/50'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>

            {/* Actions: Undo, Clear, Visibility, Export */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleUndo}
                disabled={history.length === 0}
                className="p-2 text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 rounded-xl transition-colors cursor-pointer"
                title={language === 'ar' ? 'تراجع عن آخر رسم' : 'Undo'}
              >
                <Undo2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleClear}
                disabled={elements.length === 0}
                className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 disabled:opacity-30 rounded-xl transition-colors cursor-pointer"
                title={language === 'ar' ? 'مسح كافة الرسومات' : 'Clear All Drawings'}
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsVisible(!isVisible)}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  isVisible ? 'text-emerald-400 hover:bg-emerald-500/15' : 'text-slate-500 hover:bg-slate-800'
                }`}
                title={language === 'ar' ? (isVisible ? 'إخفاء الرسومات' : 'إظهار الرسومات') : (isVisible ? 'Hide Tactical Drawings' : 'Show Tactical Drawings')}
              >
                {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={handleExportSnapshot}
                className="p-2 text-[#F5D794] hover:bg-[#E5B869]/20 rounded-xl transition-colors cursor-pointer"
                title={language === 'ar' ? 'حفظ وتصدير اللوحة التكتيكية كصورة' : 'Export Tactical Snapshot'}
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
