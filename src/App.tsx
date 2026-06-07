import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, RotateCcw, Info, Settings, Copy, Trophy, Sparkles, Skull, Calendar, Trash2 } from 'lucide-react';
import { Segment, SpinLog } from './types';
import { defaultSegments } from './data';
import { SoundSynthesizer } from './sound';

// Instantiate sound synthesizer
const synth = new SoundSynthesizer();

export default function App() {
  // Application Modes and Configuration state
  const [segments, setSegments] = useState<Segment[]>(() => {
    const saved = localStorage.getItem('wheel_segments');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return defaultSegments;
  });

  const [historyLog, setHistoryLog] = useState<SpinLog[]>(() => {
    const saved = localStorage.getItem('wheel_spin_history');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return [];
  });

  // UI States
  const [activeAura, setActiveAura] = useState<'gold' | 'purple'>('purple'); // Purple has the smoky dark golf vibe
  const [isMuted, setIsMuted] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [winnerSegment, setWinnerSegment] = useState<Segment | null>(null);
  const [activeTab, setActiveTab] = useState<'wheel' | 'setup' | 'rules'>('wheel');
  
  // Custom segment editing modal/input state
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editTag, setEditTag] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Refs for physics engine
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const angleRef = useRef<number>(0);
  const angularVelocityRef = useRef<number>(0);
  const isSpinningRef = useRef<boolean>(false);
  const lastWedgeRef = useRef<number>(-1);
  const tickerDeltaRef = useRef<number>(0); // Decays to 0 for snap animation

  // Synchronize localStorage
  useEffect(() => {
    localStorage.setItem('wheel_segments', JSON.stringify(segments));
  }, [segments]);

  useEffect(() => {
    localStorage.setItem('wheel_spin_history', JSON.stringify(historyLog));
  }, [historyLog]);

  // Handle Mute
  const handleToggleMute = () => {
    const muted = synth.toggleMute();
    setIsMuted(muted);
  };

  // Re-draw wheel on initial load or segment edit
  useEffect(() => {
    drawWheelStatic();
  }, [segments, activeAura]);

  const drawWheelStatic = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Crisp up DPI scale
    const dpr = window.devicePixelRatio || 1;
    const rawSize = 420;
    canvas.width = rawSize * dpr;
    canvas.height = rawSize * dpr;
    ctx.scale(dpr, dpr);

    const centerX = rawSize / 2;
    const centerY = rawSize / 2;
    const radius = rawSize / 2 - 25;

    renderCanvasContent(ctx, centerX, centerY, radius, angleRef.current, 0);
  };

  /**
   * The Master Canvas Drawing Function
   */
  const renderCanvasContent = (
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number,
    currentAngle: number,
    tickerDeflection: number
  ) => {
    const totalWedges = segments.length;
    const segAngle = (2 * Math.PI) / totalWedges;

    // Clear background with soft black depth
    ctx.clearRect(0, 0, centerX * 2, centerY * 2);

    // 1. Draw central shadows & glow
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 4, 0, 2 * Math.PI);
    ctx.shadowColor = activeAura === 'purple' ? 'rgba(168, 85, 247, 0.4)' : 'rgba(234, 179, 8, 0.4)';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#0a080d';
    ctx.fill();
    ctx.restore();

    // 2. Draw Wheel Slices
    for (let i = 0; i < totalWedges; i++) {
      const seg = segments[i];
      const startAngle = i * segAngle + currentAngle;
      const endAngle = (i + 1) * segAngle + currentAngle;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();

      // Implement subtle spherical radial gradient for each wedge
      const wedgeGrad = ctx.createRadialGradient(
        centerX, centerY, radius * 0.2,
        centerX, centerY, radius
      );
      
      // Select wedge custom scheme
      wedgeGrad.addColorStop(0, '#1c1924'); // soft middle
      wedgeGrad.addColorStop(0.7, seg.backgroundColor);
      wedgeGrad.addColorStop(1, '#050308'); // dark shadow at perimeter
      
      ctx.fillStyle = wedgeGrad;
      ctx.fill();

      // Delicate golden/purple wedge dividing lines
      ctx.strokeStyle = activeAura === 'purple' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(234, 179, 8, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // 3. Draw Wedges labels
      ctx.save();
      ctx.translate(centerX, centerY);
      // Place text perfectly in middle of wedge slice
      const middleAngle = startAngle + segAngle / 2;
      ctx.rotate(middleAngle);
      
      ctx.fillStyle = seg.textColor;
      ctx.font = 'bold 11px "Inter", sans-serif';
      ctx.textAlign = 'right';

      // Adjust text spacing and width limit
      const maxTextWidth = radius * 0.65;
      let fontHeight = 11;
      while (ctx.measureText(seg.name).width > maxTextWidth && fontHeight > 8) {
        fontHeight--;
        ctx.font = `bold ${fontHeight}px "Inter", sans-serif`;
      }
      
      // Draw label radiating outward from center
      ctx.fillText(seg.name, radius - 22, fontHeight / 3);
      ctx.restore();
    }

    // 4. Draw outer brass/gold rings
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = activeAura === 'purple' ? '#a855f7' : '#eab308';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 6, 0, 2 * Math.PI);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // 5. Draw Central Mascot Golf Ball Axle
    ctx.save();
    ctx.translate(centerX, centerY);
    // Let the central mascot face spin slightly slower or spin directly with the wheel
    ctx.rotate(currentAngle * 0.3); // creates an awesome independent motion!

    const mascotSize = 42;
    // Radial lighting gradient on the central golf ball
    const ballGrad = ctx.createRadialGradient(-5, -5, 5, 0, 0, mascotSize);
    if (activeAura === 'gold') {
      ballGrad.addColorStop(0, '#fef08a'); // radiant yellow
      ballGrad.addColorStop(0.6, '#f59e0b'); // amber
      ballGrad.addColorStop(1, '#b45309'); // dark bronze
    } else {
      ballGrad.addColorStop(0, '#6b7280'); // clean graphite
      ballGrad.addColorStop(0.6, '#1b1424'); // deep purple/smoky black
      ballGrad.addColorStop(1, '#050307');
    }

    // Outer circle shadow
    ctx.shadowColor = activeAura === 'purple' ? 'rgba(168, 85, 247, 0.9)' : 'rgba(234, 179, 8, 0.9)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, mascotSize, 0, 2 * Math.PI);
    ctx.fillStyle = ballGrad;
    ctx.fill();
    ctx.shadowBlur = 0; // reset shadow

    // Dimple dots on center cap
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    const dimples = [
      [-22, -18], [22, -18], [-12, 24], [12, 24], 
      [-30, 0], [30, 0], [0, -32], [0, 32]
    ];
    dimples.forEach(([bx, by]) => {
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw stylized eyes & smiles on the center axle golf ball (mini version)
    if (activeAura === 'gold') {
      // Small happy smiley cap
      ctx.fillStyle = '#1c1917';
      // eyes
      ctx.beginPath();
      ctx.arc(-14, 2, 5, 0, 2 * Math.PI);
      ctx.arc(14, 2, 5, 0, 2 * Math.PI);
      ctx.fill();
      // smile
      ctx.beginPath();
      ctx.arc(0, 10, 10, 0.1, Math.PI - 0.1);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#1c1917';
      ctx.stroke();
    } else {
      // Small angry scamp face cap
      ctx.fillStyle = '#ffffff';
      // left tilted eye sclera
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.quadraticCurveTo(-12, 8, -6, 2);
      ctx.quadraticCurveTo(-12, -4, -18, 0);
      ctx.closePath();
      ctx.fill();
      // right tilted eye sclera
      ctx.beginPath();
      ctx.moveTo(6, 2);
      ctx.quadraticCurveTo(12, 8, 18, 0);
      ctx.quadraticCurveTo(12, -4, 6, 2);
      ctx.closePath();
      ctx.fill();

      // glowing purple pupils
      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.arc(-12, 2, 2.5, 0, 2 * Math.PI);
      ctx.arc(12, 2, 2.5, 0, 2 * Math.PI);
      ctx.fill();

      // evil grin line
      ctx.beginPath();
      ctx.moveTo(-14, 14);
      ctx.quadraticCurveTo(0, 22, 14, 12);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#050406';
      ctx.stroke();
    }
    ctx.restore();

    // 6. Draw Triangular Indicator Ticker at top center (points straight down)
    ctx.save();
    ctx.translate(centerX, centerY - radius + 5);
    // Apply spring-like rotation based on tickerDeflection offset
    ctx.rotate(tickerDeflection);

    // Indicator background drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;

    // Needle shape
    ctx.beginPath();
    ctx.moveTo(0, -5);     // Top joint pivot
    ctx.lineTo(-14, -28);  // Left side top ear
    ctx.lineTo(14, -28);   // Right side top ear
    ctx.closePath();

    // Color indicators
    const tickerColor = activeAura === 'purple' ? '#a855f7' : '#eab308';
    const tickerGrad = ctx.createLinearGradient(0, -30, 0, 0);
    tickerGrad.addColorStop(0, '#ffffff');
    tickerGrad.addColorStop(0.5, tickerColor);
    tickerGrad.addColorStop(1, '#530e8c');

    ctx.fillStyle = tickerGrad;
    ctx.fill();

    // Draw the tiny chrome rivet holding the ticker in place
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.beginPath();
    ctx.arc(0, -18, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#1e1b4b';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  };

  /**
   * Physics Engine Animation Loop
   */
  const handleSpinClick = () => {
    if (isSpinningRef.current) return;

    // Lazy play dummy tone to unlock browser Audio state if needed
    synth.playTick();

    // 1. Configure massive initial velocity
    // (Between 0.28 and 0.44 radians per frame)
    angularVelocityRef.current = 0.28 + Math.random() * 0.16;
    isSpinningRef.current = true;
    setIsSpinning(true);
    tickerDeltaRef.current = 0;
    lastWedgeRef.current = -1;

    // 2. Schedule regular frame iterations
    requestAnimationFrame(animateFrame);
  };

  const animateFrame = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rawSize = 420;
    const centerX = rawSize / 2;
    const centerY = rawSize / 2;
    const radius = rawSize / 2 - 25;

    // A. Update spinning angles
    angleRef.current += angularVelocityRef.current;

    // B. Physics friction deceleration (0.985 decays beautifully and naturally)
    angularVelocityRef.current *= 0.985;

    // C. Check tactile ticker clicks!
    const totalWedges = segments.length;
    const segAngle = (2 * Math.PI) / totalWedges;
    
    // Wedge index relative to the top ticker positioned at 1.5 * Math.PI
    const currentWedge = Math.floor(
      ((angleRef.current + Math.PI / 2) % (2 * Math.PI)) / segAngle
    );

    if (currentWedge !== lastWedgeRef.current) {
      synth.playTick();
      lastWedgeRef.current = currentWedge;
      // Set indicator flick in coordinate matching velocity direction
      tickerDeltaRef.current = Math.min(0.35, angularVelocityRef.current * 1.5);
    } else {
      // Spring decay ticker back to original center
      tickerDeltaRef.current *= 0.85;
    }

    // D. Paint canvas updates
    renderCanvasContent(ctx, centerX, centerY, radius, angleRef.current, tickerDeltaRef.current);

    // E. Evaluate Stop Threshold
    if (angularVelocityRef.current < 0.0012) {
      // Stabilize values
      angularVelocityRef.current = 0;
      isSpinningRef.current = false;
      setIsSpinning(false);
      tickerDeltaRef.current = 0;

      // F. Solve segment pointing straight up under top needle (1.5 * Math.PI radians)
      const winningWedge = calcWinningSegment();
      
      // Delay slightly for dramatic suspense
      setTimeout(() => {
        setWinnerSegment(winningWedge);
        setShowWinnerModal(true);
        // Play appropriate sound based on selected club category
        synth.playChime(winningWedge.impact);
        
        // Log result to course history logs
        const newLog: SpinLog = {
          id: Math.random().toString(36).substring(4),
          clubName: winningWedge.name,
          tag: winningWedge.tag,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          ratingValue: 'unrated'
        };
        setHistoryLog(prev => [newLog, ...prev]);
      }, 400);

    } else {
      requestAnimationFrame(animateFrame);
    }
  };

  /**
   * Perfectly calculate the slice pointing directly under the indicator
   */
  const calcWinningSegment = (): Segment => {
    const totalWedges = segments.length;
    const segAngle = (2 * Math.PI) / totalWedges;
    
    // Normalize target angle pointing straight up (1.5 * Math.PI) relative to current angle offset
    const targetIndicatorAngle = 1.5 * Math.PI;
    const normalizedAngle = (targetIndicatorAngle - angleRef.current) % (2 * Math.PI);
    
    // Shift to positive value
    const positiveAngle = (normalizedAngle + 2 * Math.PI) % (2 * Math.PI);
    
    const winningIndex = Math.floor(positiveAngle / segAngle);
    return segments[winningIndex % totalWedges];
  };

  // Log rating update
  const rateSelection = (logId: string, rating: 'heroic' | 'not-ideal' | 'shanked') => {
    setHistoryLog(prev => prev.map(log => log.id === logId ? { ...log, ratingValue: rating } : log));
  };

  // Segment editing tasks
  const startEditingSegment = (seg: Segment) => {
    setEditingSegmentId(seg.id);
    setEditName(seg.name);
    setEditTag(seg.tag);
    setEditDesc(seg.description);
  };

  const saveSegmentEdit = () => {
    if (!editingSegmentId) return;
    setSegments(prev => prev.map(seg => seg.id === editingSegmentId ? {
      ...seg,
      name: editName,
      tag: editTag,
      description: editDesc
    } : seg));
    setEditingSegmentId(null);
  };

  const resetAllSegments = () => {
    if (window.confirm("Reset all wedges back to standard league default clubs?")) {
      setSegments(defaultSegments);
      localStorage.removeItem('wheel_segments');
    }
  };

  const clearLogs = () => {
    if (window.confirm("Clear all session spin logs?")) {
      setHistoryLog([]);
      localStorage.removeItem('wheel_spin_history');
    }
  };

  // Master Standalone single-file HTML code generation string (Tailwind, sounds, click-physics included!)
  const getStandaloneCode = (): string => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wheel of Not Ideal - standalone</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; background-color: #0a0a0a; }
    h1, h2, h3 { font-family: 'Playfair Display', Georgia, serif; }
    @keyframes neonPulse {
      0%, 100% { box-shadow: 0 0 15px rgba(147, 51, 234, 0.4), 0 0 30px rgba(234, 179, 8, 0.15); }
      50% { box-shadow: 0 0 25px rgba(147, 51, 234, 0.75), 0 0 45px rgba(234, 179, 8, 0.4); }
    }
    .glowing-ring { animation: neonPulse 3s infinite ease-in-out; }
  </style>
</head>
<body class="text-white min-h-screen flex flex-col items-center py-4 px-3 overflow-x-hidden">

  <!-- Header -->
  <header class="w-full max-w-md flex items-center justify-between gap-2 border-b border-purple-950/40 pb-3 mb-4">
    <div class="flex items-center gap-1.5">
      <div class="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-black border border-amber-300 shadow-lg">Vice</div>
      <span class="text-xs tracking-widest text-amber-400 font-bold uppercase">IDEAL CO.</span>
    </div>
    
    <div class="text-center">
      <h1 class="text-md font-bold tracking-tight bg-gradient-to-r from-amber-400 to-purple-400 bg-clip-text text-transparent">WHEEL OF NOT IDEAL</h1>
      <p class="text-[10px] text-gray-500 uppercase tracking-widest">GOLF LEAGUE RULESETS</p>
    </div>

    <div class="flex items-center gap-1.5">
      <span class="text-xs tracking-widest text-purple-400 font-bold uppercase">ROGUES</span>
      <div class="w-8 h-8 rounded-full bg-indigo-950 flex items-center justify-center text-xs font-bold text-purple-400 border border-purple-500 shadow-purple-500/50 shadow-md">Vice</div>
    </div>
  </header>

  <!-- Controls utility panel -->
  <div class="w-full max-w-sm flex items-center justify-between px-2 py-1.5 bg-neutral-900/60 rounded-xl mb-4 text-xs">
    <div class="flex items-center gap-2">
      <button onclick="toggleAudio()" class="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-400 transition" id="audioBtn">🔊 Sound ON</button>
      <button onclick="toggleAura()" class="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-purple-400 transition" id="auraBtn">Aura: Purple 😈</button>
    </div>
    <span class="text-gray-400 font-bold tracking-widest text-[9px] uppercase">WHEEL STOPS AT NEEDLE</span>
  </div>

  <!-- Wheel Wrapper -->
  <div class="relative w-full max-w-xs flex flex-col justify-center items-center py-4">
    <div class="glowing-ring rounded-full border-4 border-purple-950 p-2.5 bg-black/60 shadow-xl overflow-hidden">
      <canvas id="wheelCanvas" width="380" height="380" class="w-full max-w-[340px] h-auto aspect-square"></canvas>
    </div>
    
    <!-- Central action spinner trigger -->
    <button id="spinBtn" onclick="triggerSpin()" class="mt-6 w-full max-w-[200px] py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-sm tracking-wider uppercase rounded-2xl shadow-lg hover:scale-105 active:scale-95 duration-150 transition disabled:opacity-40 disabled:scale-100 glowing-ring">
      🍺 SPIN WHEEL
    </button>
  </div>

  <!-- Rules card -->
  <div class="w-full max-w-sm mt-8 bg-neutral-900/50 rounded-2xl border border-purple-950/30 p-4">
    <h3 class="font-bold text-amber-400 text-md border-b border-neutral-800 pb-2 flex items-center gap-2">❓ Rules of Engagement</h3>
    <ul class="text-xs text-gray-300 space-y-2 mt-3 list-disc pl-4">
      <li>Whenever your ball lands in a <strong>Sub-optimal lie</strong> (rough, sand, behind tree branches), you must spin.</li>
      <li>You are strictly prohibited from putting with irons OR utilizing any club other than what the wheel provides.</li>
      <li>Opponent's choice? Play defensive, select their worst possible utility rod.</li>
    </ul>
  </div>

  <!-- Win Announcement Pop-up -->
  <div id="modalOverlay" class="fixed inset-0 bg-neutral-950/90 z-50 flex items-center justify-center p-4 hidden">
    <div class="w-full max-w-sm bg-neutral-900 rounded-2xl border-2 border-amber-400 p-6 shadow-2xl text-center">
      <div class="text-amber-400 font-extrabold text-xs tracking-widest uppercase py-1 px-3 bg-amber-450/10 rounded-full border border-amber-400/20 inline-block" id="modalTag">THE CLASSIC INDEX</div>
      <h2 class="text-3xl font-extrabold tracking-tight mt-3 text-white" id="modalClub">Driver</h2>
      <p class="text-xs text-neutral-400 italic mt-1 font-semibold" id="modalSubtext">Favorable Break</p>
      <p class="text-sm text-gray-200 mt-4 leading-relaxed" id="modalDesc"></p>
      <button onclick="closeModal()" class="mt-6 w-full py-3 bg-amber-400 hover:bg-amber-300 text-black font-extrabold rounded-xl transition shadow-lg">LFG! CLOSE</button>
    </div>
  </div>

  <script>
    // System Datasets
    const segments = ${JSON.stringify(segments)};
    let activeAura = "purple";
    let isMuted = false;
    let isSpinning = false;
    let currentAngle = 0;
    let angularVelocity = 0;
    let lastWedge = -1;
    let tickerDeflection = 0;

    const canvas = document.getElementById("wheelCanvas");
    const ctx = canvas.getContext("2d");

    // Polyfill Audio Synth
    let soundCtx = null;
    function playClick() {
      if (isMuted) return;
      try {
        if(!soundCtx) soundCtx = new (window.AudioContext || window.webkitAudioContext)();
        if(soundCtx.state === "suspended") soundCtx.resume();
        const now = soundCtx.currentTime;
        const osc = soundCtx.createOscillator();
        const gain = soundCtx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(950, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.012);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.01);
        osc.connect(gain);
        gain.connect(soundCtx.destination);
        osc.start();
        osc.stop(now + 0.015);
      } catch(e) {}
    }

    function playBell(impact) {
      if (isMuted) return;
      try {
        if(!soundCtx) soundCtx = new (window.AudioContext || window.webkitAudioContext)();
        if(soundCtx.state === "suspended") soundCtx.resume();
        const now = soundCtx.currentTime;
        if(impact === 'favorable' || impact === 'wildcard') {
          [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
            const osc = soundCtx.createOscillator();
            const gain = soundCtx.createGain();
            osc.slice = "sine";
            osc.frequency.setValueAtTime(freq, now + idx * 0.1);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.1 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.5);
            osc.connect(gain);
            gain.connect(soundCtx.destination);
            osc.start(now + idx*0.1);
            osc.stop(now + idx*0.1 + 0.6);
          });
        } else {
          const osc = soundCtx.createOscillator();
          const gain = soundCtx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(250, now);
          osc.frequency.linearRampToValueAtTime(80, now + 0.45);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
          osc.connect(gain);
          gain.connect(soundCtx.destination);
          osc.start();
          osc.stop(now + 0.5);
        }
      } catch(e) {}
    }

    function toggleAudio() {
      isMuted = !isMuted;
      document.getElementById("audioBtn").innerText = isMuted ? "🔇 Muted" : "🔊 Sound ON";
    }

    function toggleAura() {
      activeAura = activeAura === "purple" ? "gold" : "purple";
      const btn = document.getElementById("auraBtn");
      btn.innerText = activeAura === "gold" ? "Aura: Gold 😇" : "Aura: Purple 😈";
      btn.className = activeAura === "gold" ? "p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-400 transition" : "p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-purple-400 transition";
      drawWheelStatic();
    }

    function drawWheelStatic() {
      render(0, 0);
    }

    function render(ang, tick) {
      if(!ctx) return;
      const size = 380;
      const centerX = size / 2;
      const centerY = size / 2;
      const radius = size / 2 - 20;

      ctx.clearRect(0, 0, size, size);

      // Slices
      const total = segments.length;
      const segAngle = (2 * Math.PI) / total;

      for(let i=0; i<total; i++) {
        const seg = segments[i];
        const start = i * segAngle + ang;
        const end = (i+1) * segAngle + ang;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, start, end);
        ctx.closePath();

        const grad = ctx.createRadialGradient(centerX, centerY, radius*0.2, centerX, centerY, radius);
        grad.addColorStop(0, '#1c1924');
        grad.addColorStop(0.7, seg.backgroundColor);
        grad.addColorStop(1, '#050308');

        ctx.fillStyle = grad;
        ctx.fill();

        ctx.strokeStyle = activeAura === "purple" ? "rgba(168, 85, 247, 0.25)" : "rgba(234, 179, 8, 0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Label Text
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(start + segAngle / 2);
        ctx.fillStyle = seg.textColor;
        ctx.font = 'bold 9.5px "Inter", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(seg.name, radius - 18, 3);
        ctx.restore();
      }

      // Outer rings
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2*Math.PI);
      ctx.strokeStyle = activeAura === 'purple' ? '#a855f7' : '#eab308';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Center gold ball
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(ang * 0.3);

      const radBall = 32;
      const ballGrad = ctx.createRadialGradient(-3, -3, 3, 0, 0, radBall);
      if(activeAura === "gold") {
        ballGrad.addColorStop(0, '#fef08a');
        ballGrad.addColorStop(0.6, '#f59e0b');
        ballGrad.addColorStop(1, '#b45309');
      } else {
        ballGrad.addColorStop(0, '#6b7280');
        ballGrad.addColorStop(0.6, '#1b1424');
        ballGrad.addColorStop(1, '#050307');
      }

      ctx.beginPath();
      ctx.arc(0, 0, radBall, 0, 2 * Math.PI);
      ctx.fillStyle = ballGrad;
      ctx.fill();

      // Simple smiley
      ctx.fillStyle = activeAura === "gold" ? "#1a1510" : "#ffffff";
      ctx.beginPath();
      ctx.arc(-8, 0, 3.5, 0, 2*Math.PI);
      ctx.arc(8, 0, 3.5, 0, 2*Math.PI);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, 6, 6, 0.1, Math.PI - 0.1);
      ctx.strokeStyle = activeAura === "gold" ? "#1a1510" : "#050406";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();

      // Top indicator Ticker
      ctx.save();
      ctx.translate(centerX, centerY - radius + 5);
      ctx.rotate(tick);
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.lineTo(-11, -22);
      ctx.lineTo(11, -22);
      ctx.closePath();
      ctx.fillStyle = activeAura === "purple" ? "#d8b4fe" : "#fef08a";
      ctx.fill();
      ctx.restore();
    }

    function triggerSpin() {
      if(isSpinning) return;
      isSpinning = true;
      document.getElementById("spinBtn").disabled = true;
      angularVelocity = 0.26 + Math.random() * 0.16;
      tickerDeflection = 0;
      lastWedge = -1;
      loop();
    }

    function loop() {
      currentAngle += angularVelocity;
      angularVelocity *= 0.985;

      const total = segments.length;
      const segAngle = (2 * Math.PI) / total;
      const currentWedge = Math.floor(((currentAngle + Math.PI/2) % (2*Math.PI)) / segAngle);

      if(currentWedge !== lastWedge) {
        playClick();
        lastWedge = currentWedge;
        tickerDeflection = Math.min(0.35, angularVelocity * 1.5);
      } else {
        tickerDeflection *= 0.85;
      }

      render(currentAngle, tickerDeflection);

      if(angularVelocity < 0.0012) {
        isSpinning = false;
        document.getElementById("spinBtn").disabled = false;
        const norm = (1.5 * Math.PI - currentAngle) % (2 * Math.PI);
        const pos = (norm + 2*Math.PI) % (2*Math.PI);
        const winIdx = Math.floor(pos / segAngle) % total;
        const won = segments[winIdx];

        setTimeout(() => {
          document.getElementById("modalTag").innerText = won.tag.toUpperCase();
          document.getElementById("modalClub").innerText = won.name;
          document.getElementById("modalSubtext").innerText = won.impact.toUpperCase();
          document.getElementById("modalDesc").innerText = won.description;
          document.getElementById("modalOverlay").classList.remove("hidden");
          playBell(won.impact);
        }, 300);
      } else {
        requestAnimationFrame(loop);
      }
    }

    function closeModal() {
      document.getElementById("modalOverlay").classList.add("hidden");
    }

    drawWheelStatic();
  </script>
</body>
</html>`;
  };

  const copyCode = () => {
    navigator.clipboard.writeText(getStandaloneCode());
    alert("Full Standalone index.html code successfully copied to clipboard!");
  };

  return (
    <div className="min-h-screen text-slate-100 font-sans tracking-wide bg-gradient-to-b from-[#0a0a0a] via-[#111111] to-[#0a0a0a] relative overflow-x-hidden pb-10">
      {/* Dynamic Aura background glows */}
      <div className="absolute top-0 left-0 w-full h-[500px] overflow-hidden pointer-events-none opacity-20">
        <div className={`absolute -top-40 left-1/4 w-[350px] h-[350px] rounded-full blur-[120px] transition-all duration-1000 ${activeAura === 'purple' ? 'bg-purple-600' : 'bg-amber-600'}`} />
        <div className={`absolute -top-20 right-1/4 w-[280px] h-[280px] rounded-full blur-[90px] transition-all duration-1000 ${activeAura === 'purple' ? 'bg-indigo-600' : 'bg-yellow-600'}`} />
      </div>

      <div className="max-w-md mx-auto px-4 py-6 relative flex flex-col min-h-screen">
        {/* UPPER BRANDING HEADER */}
        <header className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
          <button 
            onClick={() => setActiveAura('gold')}
            className={`flex items-center gap-2 text-left group transition duration-300 ${activeAura === 'gold' ? 'opacity-100 scale-102' : 'opacity-35 hover:opacity-70'}`}
            title="Switch to Gold Aura (Good Fortune)"
            id="aura-gold"
          >
            {/* Responsive Gold mascot Badge SVG */}
            <svg width="34" height="34" viewBox="0 0 100 100" referrerPolicy="no-referrer" className="gold-glow rounded-full">
              <defs>
                <radialGradient id="goldBall" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#fffbeb"/>
                  <stop offset="45%" stopColor="#f59e0b"/>
                  <stop offset="100%" stopColor="#78350f"/>
                </radialGradient>
              </defs>
              <circle cx="50" cy="50" r="48" fill="url(#goldBall)"/>
              {/* Dimples */}
              <circle cx="25" cy="20" r="3" fill="#fef08a" opacity="0.6"/>
              <circle cx="75" cy="20" r="3" fill="#fef08a" opacity="0.6"/>
              <circle cx="50" cy="85" r="3" fill="#b45309" opacity="0.4"/>
              {/* Smiling Face */}
              <circle cx="34" cy="45" r="5" fill="#1e180d"/>
              <circle cx="66" cy="45" r="5" fill="#1e180d"/>
              <circle cx="32" cy="42" r="1.5" fill="#ffffff"/>
              <circle cx="64" cy="42" r="1.5" fill="#ffffff"/>
              <path d="M 33 60 Q 50 82 67 60" fill="none" stroke="#1e180d" strokeWidth="4.5" strokeLinecap="round"/>
            </svg>
            <div className="hidden xs:block">
              <p className="text-[9px] font-bold tracking-widest text-[#eab308] uppercase leading-none">AURA GOOD</p>
              <h4 className="text-xs font-semibold text-amber-200">Gold Sphere</h4>
            </div>
          </button>

          <div className="text-center flex-1">
            <h1 className="text-2xl font-black tracking-tighter bg-gradient-to-r from-purple-500 to-yellow-500 bg-clip-text text-transparent italic font-display uppercase">
              Wheel of Not Ideal
            </h1>
            <p className="text-[9px] tracking-[0.3em] uppercase opacity-50 font-semibold mt-1">Elite Golf League Edition</p>
          </div>

          <button 
            onClick={() => setActiveAura('purple')}
            className={`flex items-center gap-2 text-right group transition duration-300 ${activeAura === 'purple' ? 'opacity-100 scale-102' : 'opacity-35 hover:opacity-70'}`}
            title="Switch to Menacing Crimson Aura (Pure Rogue Lie)"
            id="aura-purple"
          >
            <div className="hidden xs:block">
              <p className="text-[9px] font-bold tracking-widest text-purple-400 uppercase leading-none">AURA ROGUE</p>
              <h4 className="text-xs font-semibold text-purple-200">Black Sphere</h4>
            </div>
            {/* Menacing Black Golf Ball Badge SVG */}
            <svg width="34" height="34" viewBox="0 0 100 100" referrerPolicy="no-referrer" className="purple-glow rounded-full">
              <defs>
                <radialGradient id="blackBall" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#6b7280"/>
                  <stop offset="42%" stopColor="#1e122b"/>
                  <stop offset="100%" stopColor="#050307"/>
                </radialGradient>
              </defs>
              <circle cx="50" cy="50" r="48" fill="url(#blackBall)"/>
              <circle cx="50" cy="50" r="48" stroke="#a855f7" strokeWidth="1.5" strokeOpacity="0.4" fill="none"/>
              {/* Dimples */}
              <circle cx="20" cy="30" r="3" fill="#ffffff" opacity="0.1"/>
              <circle cx="80" cy="30" r="3" fill="#ffffff" opacity="0.1"/>
              {/* Menacing Eyes */}
              <path d="M 22 47 Q 35 55 42 45 Q 35 38 22 47 Z" fill="#ffffff"/>
              <path d="M 78 47 Q 65 55 58 45 Q 65 38 78 47 Z" fill="#ffffff"/>
              {/* Pupils */}
              <circle cx="34" cy="46" r="3" fill="#c084fc"/>
              <circle cx="66" cy="46" r="3" fill="#c084fc"/>
              <circle cx="34" cy="46" r="1.5" fill="#000000"/>
              <circle cx="66" cy="46" r="1.5" fill="#000000"/>
              {/* Brow Lines */}
              <path d="M 18 36 L 42 45" stroke="#000" strokeWidth="3" strokeLinecap="round"/>
              <path d="M 82 36 L 58 45" stroke="#000" strokeWidth="3" strokeLinecap="round"/>
              {/* Grinning Mouth */}
              <path d="M 28 62 Q 50 78 72 60" fill="none" stroke="#040305" strokeWidth="4.5" strokeLinecap="round"/>
            </svg>
          </button>
        </header>

        {/* NAVIGATION TAB TRAY */}
        <nav className="flex glass-panel p-1 rounded-xl mb-4" id="nav-tray">
          <button 
            onClick={() => setActiveTab('wheel')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition duration-200 ${activeTab === 'wheel' ? 'bg-[#9333ea]/30 text-[#eab308] border border-[#9333ea]/30 shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            id="tab-wheel"
          >
            🎡 The Wheel
          </button>
          <button 
            onClick={() => setActiveTab('setup')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition duration-200 ${activeTab === 'setup' ? 'bg-[#9333ea]/30 text-[#eab308] border border-[#9333ea]/30 shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            id="tab-setup"
          >
            🛠️ Custom Clubs
          </button>
          <button 
            onClick={() => setActiveTab('rules')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition duration-200 ${activeTab === 'rules' ? 'bg-[#9333ea]/30 text-[#eab308] border border-[#9333ea]/30 shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            id="tab-rules"
          >
            📜 Rules & Exports
          </button>
        </nav>

        {/* TAB 1: THE MAIN WHEEL */}
        {activeTab === 'wheel' && (
          <div className="flex-1 flex flex-col justify-between" id="view-wheel">
            {/* Quick Status bar */}
            <div className="flex items-center justify-between px-3 py-2 glass-panel rounded-xl mb-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-400 font-semibold uppercase text-[10px]">COURSE LIVE LINK</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleToggleMute}
                  className="p-1.5 hover:bg-white/5 rounded-lg text-slate-300 hover:text-amber-400 transition"
                  title={isMuted ? "Unmute clicks" : "Mute audio synthesizer"}
                  id="mute-toggle"
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                </button>
                <span className="text-gray-600 font-bold">|</span>
                <span className="font-mono text-[10px] text-[#eab308] uppercase font-semibold">{activeAura === 'gold' ? '😇 ANGELIC luck' : '😈 DEVIOUS luck'}</span>
              </div>
            </div>

            {/* CANVAS INTERACTIVE CONTAINER */}
            <div className="relative flex flex-col justify-center items-center py-5 bg-[#171717]/30 rounded-3xl border border-white/5 shadow-inner">
              <div className="glowing-ring rounded-full wheel-decor-border p-2 bg-[#050505] relative shadow-2xl">
                <canvas 
                  ref={canvasRef} 
                  className="w-full max-w-[310px] xs:max-w-[340px] h-auto aspect-square rounded-full transition-transform"
                  style={{ touchAction: 'none' }}
                  id="canvas"
                />
              </div>

              {/* ACTION SPIN BUTTON - Highly reactive target for thumbs on the cart */}
              <button
                onClick={handleSpinClick}
                disabled={isSpinning}
                className="mt-6 w-full max-w-[240px] py-4 bg-[#eab308] hover:bg-[#eab308]/90 active:scale-95 text-black font-black text-base tracking-widest uppercase rounded-full shadow-[0_0_25px_rgba(234,179,8,0.45)] hover:shadow-[0_0_35px_rgba(234,179,8,0.6)] duration-150 transition disabled:opacity-45 disabled:scale-100 disabled:pointer-events-none glowing-ring border-4 border-black z-10"
                id="spin-trigger"
              >
                {isSpinning ? 'SPINNING...' : 'SPIN'}
              </button>
            </div>

            {/* QUICK HISTORY LOG BAR OUT ON COURSE */}
            <div className="mt-6 glass-panel p-4 rounded-2xl" id="quick-history">
              <div className="flex items-center justify-between pb-2 border-b border-white/5 text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-amber-500" /> Session History Tracker</span>
                {historyLog.length > 0 && (
                  <button onClick={clearLogs} className="text-xs hover:text-rose-450 text-slate-500 transition flex items-center gap-1" id="clear-history">
                    <Trash2 className="w-3 animate-pulse" /> Clear
                  </button>
                )}
              </div>

              {historyLog.length === 0 ? (
                <p className="text-xs text-neutral-500 text-center py-4 italic">No spins recorded yet. Spin above!</p>
              ) : (
                <div className="space-y-2 mt-2 max-h-[140px] overflow-y-auto pr-1">
                  {historyLog.map((log) => (
                    <div key={log.id} className="flex items-center justify-between bg-[#171717]/60 p-2.5 rounded-xl text-xs hover:bg-[#171717] duration-150 border border-white/5">
                      <div>
                        <span className="font-bold text-slate-100 text-sm">{log.clubName}</span>
                        <p className="text-[10px] text-slate-400 font-semibold leading-none mt-0.5">{log.timestamp} • {log.tag}</p>
                      </div>

                      {/* Micro user assessment ratings */}
                      <div className="flex gap-1" id={`rating-${log.id}`}>
                        <button 
                          onClick={() => rateSelection(log.id, 'heroic')}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition duration-150 ${log.ratingValue === 'heroic' ? 'bg-[#eab308] text-black shadow-sm' : 'bg-white/5 hover:bg-white/10 text-neutral-400'}`}
                          title="Rate as Heroic Shot!"
                        >
                          🔥 Hero
                        </button>
                        <button 
                          onClick={() => rateSelection(log.id, 'not-ideal')}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition duration-150 ${log.ratingValue === 'not-ideal' ? 'bg-[#9333ea] text-white shadow-sm' : 'bg-white/5 hover:bg-white/10 text-neutral-400'}`}
                          title="Rate as Not Ideal Shot!"
                        >
                          😅 Bad
                        </button>
                        <button 
                          onClick={() => rateSelection(log.id, 'shanked')}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition duration-150 ${log.ratingValue === 'shanked' ? 'bg-rose-500 text-black shadow-sm' : 'bg-white/5 hover:bg-white/10 text-neutral-400'}`}
                          title="Rate as Shanked Shot"
                        >
                          💀 Shank
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: BAG SETUP / CONFIG WORKING SPACE */}
        {activeTab === 'setup' && (
          <div className="flex-1 flex flex-col justify-between" id="view-setup">
            <div>
              <div className="mb-4 bg-[#9333ea]/10 p-3 rounded-xl border border-[#9333ea]/30 text-xs shadow-md">
                <h3 className="font-bold text-[#eab308] border-b border-white/5 pb-1 mb-1 flex items-center gap-1.5 font-display text-sm tracking-tight">
                  <Settings className="w-3.5 h-3.5" /> Course Customizer Layout
                </h3>
                <p className="text-gray-300 leading-normal">
                  Golf lies differ on every course! Customize and edit any of the 15 segments of your wheel in real-time below to match your bag.
                </p>
              </div>

              {/* Wedge Editing Block */}
              {editingSegmentId && (
                <div className="glass-panel border-2 border-[#eab308]/80 p-4 rounded-xl mb-4 text-xs shadow-xl animate-fade-in" id="edit-form">
                  <h4 className="font-bold text-sm text-[#eab308] mb-2 font-display italic">Edit Segment: "{editName}"</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="text-gray-400 block mb-0.5 font-semibold text-[10px] uppercase tracking-wider">Wedge Name</label>
                      <input 
                        type="text" 
                        value={editName} 
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-[#171717] border border-white/5 rounded p-1.5 text-white font-bold"
                        maxLength={22}
                        id="edit-name-field"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-0.5 font-semibold text-[10px] uppercase tracking-wider">Short Subheading Tag</label>
                      <input 
                        type="text" 
                        value={editTag} 
                        onChange={(e) => setEditTag(e.target.value)}
                        className="w-full bg-[#171717] border border-white/5 rounded p-1.5 text-slate-300"
                        maxLength={25}
                        id="edit-tag-field"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-0.5 font-semibold text-[10px] uppercase tracking-wider">Rogue Caddie Description / Comment</label>
                      <textarea 
                        rows={2}
                        value={editDesc} 
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="w-full bg-[#171717] border border-white/5 rounded p-1.5 text-slate-300"
                        maxLength={130}
                        id="edit-desc-field"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button onClick={saveSegmentEdit} className="bg-[#eab308] hover:bg-[#eab308]/80 text-black px-4 py-1.5 rounded font-black uppercase tracking-wider flex-1 transition" id="save-edit-btn">Save Wedge</button>
                      <button onClick={() => setEditingSegmentId(null)} className="bg-[#171717] hover:bg-[#171717]/80 text-neutral-300 border border-white/5 px-3 py-1.5 rounded font-semibold" id="cancel-edit-btn">Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {/* LIST OF THE 15 SEGMENTS FOR CONFIG */}
              <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1" id="clubs-list">
                {segments.map((seg, idx) => (
                  <div key={seg.id} className="flex items-center justify-between glass-panel p-2.5 rounded-xl hover:bg-[#171717]/60 hover:scale-[1.01] duration-150">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-[10px] text-gray-500 w-4">#{idx+1}</span>
                      <span className="w-3.5 h-3.5 rounded-full border border-black" style={{ backgroundColor: seg.backgroundColor }} />
                      <div>
                        <span className="font-bold text-sm text-slate-100">{seg.name}</span>
                        <p className="text-[10px] text-slate-400 leading-none mt-0.5 font-semibold">{seg.tag}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => startEditingSegment(seg)}
                      className="px-2.5 py-1 bg-[#171717] hover:bg-[#222222] border border-white/5 hover:border-[#eab308]/40 text-[10px] font-bold text-[#eab308] uppercase tracking-wider rounded-lg transition"
                      id={`edit-${seg.id}`}
                    >
                      ✐ Edit
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5" id="reset-box">
              <button 
                onClick={resetAllSegments}
                className="w-full py-2.5 bg-[#171717]/60 hover:bg-[#171717] text-slate-400 hover:text-rose-400 font-bold border border-white/5 hover:border-rose-500/20 text-xs rounded-xl flex items-center justify-center gap-1 transition"
                id="reset-segments"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Wheel to Default Clubs
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: RULES & CUSTOM SOURCE RECODE */}
        {activeTab === 'rules' && (
          <div className="flex-1 flex flex-col justify-between" id="view-rules">
            <div className="space-y-4">
              {/* Rules description */}
              <div className="glass-panel p-5 rounded-2xl text-xs text-gray-300">
                <h3 className="font-bold text-[#eab308] text-sm border-b border-white/5 pb-2 mb-2 flex items-center gap-2 font-display italic tracking-tight text-base">
                  <Info className="w-4 h-4 text-[#eab308]" /> League Rules of Play
                </h3>
                <ul className="space-y-2 list-decimal pl-4 leading-relaxed font-medium">
                  <li>
                    Whenever a player's ball lands in a position or boundary deemed <strong>"Not Ideal"</strong> by the group or lies (e.g. rough, sand hazard, under hanging leaves), they must spin the wheel.
                  </li>
                  <li>
                    The player must execute their next single shot utilising the exact golf club designated by the wheel results.
                  </li>
                  <li>
                    If the wheel lands on <strong className="text-[#9333ea]">"Opponent's Choice"</strong>, the opposing division assigns any legal club currently in the bag.
                  </li>
                  <li>
                    Should the wheel reward <strong className="text-[#eab308]">"Wildcard"</strong>, the active player chooses any club they trust, acting as their lucky lifesaver.
                  </li>
                </ul>
              </div>

              {/* Standalone Export Area - Full single file delivery */}
              <div className="bg-[#9333ea]/10 p-5 rounded-2xl border border-white/5 text-xs shadow-xl">
                <h3 className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#9333ea] to-[#eab308] text-[#eab308] text-sm flex items-center gap-2 mb-1 font-display italic tracking-tight text-base">
                  💾 Copy Standalone HTML Webfile
                </h3>
                <p className="text-gray-300 leading-normal mb-3">
                  You requested a single-file application package to run anywhere, completely offline without any node dependencies. Tap the button to copy it.
                </p>

                <button 
                  onClick={copyCode}
                  className="w-full py-3 bg-[#9333ea]/80 hover:bg-[#9333ea] text-[#eab308] transition duration-150 font-black tracking-wider uppercase rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(147,51,234,0.3)] border border-[#9333ea]/50 cursor-pointer"
                  id="copy-export-code"
                >
                  <Copy className="w-4 h-4" /> Copy Standalone HTML Code
                </button>
                <div className="bg-black/60 p-2 text-[10px] text-gray-400 leading-none text-center font-mono rounded mt-2 border border-white/5">
                  Save clipboard content as "wheel.html" to run offline.
                </div>
              </div>
            </div>

            <div className="text-center text-[10px] text-neutral-500 mt-6 pt-4 border-t border-white/5 font-mono tracking-wider">
              WHEEL OF NOT IDEAL • CO. ALL RIGHTS RESERVED.
            </div>
          </div>
        )}

        {/* POPUP RESULT ANNOUNCEMENT PORTAL MODAL */}
        {showWinnerModal && winnerSegment && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in" id="winner-modal">
            <div className={`w-full max-w-sm glass-panel rounded-3xl p-6 shadow-2xl text-center border-2 relative overflow-hidden transition-all duration-300 ${winnerSegment.impact === 'favorable' || winnerSegment.impact === 'wildcard' ? 'border-[#eab308]' : 'border-[#9333ea]'}`}>
              
              {/* Backlit Glowing effects */}
              <div className={`absolute top-0 left-0 w-full h-8 blur-lg transition duration-500 opacity-60 ${winnerSegment.impact === 'favorable' || winnerSegment.impact === 'wildcard' ? 'bg-[#eab308]' : 'bg-[#9333ea]'}`} />

              <div className="relative z-10 flex flex-col items-center">
                
                {/* Result Tag */}
                <div className={`text-[10px] font-black tracking-widest uppercase py-1 px-3.5 rounded-full border inline-block select-none ${winnerSegment.impact === 'favorable' || winnerSegment.impact === 'wildcard' ? 'bg-[#eab308]/10 text-[#eab308] border-[#eab308]/20' : 'bg-[#9333ea]/10 text-purple-300 border-[#9333ea]/20'}`}>
                  {winnerSegment.tag}
                </div>

                {/* Animated Display icons */}
                <div className="mt-4 flex items-center justify-center w-14 h-14 rounded-full bg-neutral-900 border border-neutral-800 text-3xl">
                  {winnerSegment.impact === 'favorable' || winnerSegment.impact === 'wildcard' ? (
                    <Trophy className="w-7 h-7 text-amber-300 animate-bounce" />
                  ) : winnerSegment.impact === 'opponent' ? (
                    <Skull className="w-7 h-7 text-rose-500 animate-pulse" />
                  ) : (
                    <Sparkles className="w-7 h-7 text-purple-400 animate-spin" />
                  )}
                </div>

                {/* Winner Title - Playfair Display Editorial Header */}
                <h2 className="text-5xl font-black italic tracking-tighter mt-4 text-slate-100 font-display uppercase">{winnerSegment.name}</h2>
                
                {/* Visual Impact subtext */}
                <span className={`text-[10px] font-bold tracking-[0.2em] font-sans uppercase mt-1.5 ${winnerSegment.impact === 'favorable' || winnerSegment.impact === 'wildcard' ? 'text-amber-500' : 'text-[#9333ea]'}`}>
                  {winnerSegment.impact.replace('-', ' ').toUpperCase()} RESULT
                </span>

                {/* Narrative funny quotes */}
                <p className="text-slate-300 mt-4 leading-relaxed font-semibold italic text-sm text-center px-2 font-sans">
                  "{winnerSegment.description}"
                </p>

                {/* LFG Acknowledge Trigger */}
                <button
                  onClick={() => setShowWinnerModal(false)}
                  className={`mt-6 w-full py-4 text-black font-black text-sm tracking-widest uppercase rounded-full shadow-xl transition hover:scale-[1.02] active:scale-95 duration-100 border-2 border-black ${winnerSegment.impact === 'favorable' || winnerSegment.impact === 'wildcard' ? 'bg-[#eab308] hover:bg-[#eab308]/90 text-black' : 'bg-[#9333ea] hover:bg-[#9333ea]/90 text-white'}`}
                  id="confirm-winner-btn"
                >
                  🚀 MAKE THE SHOT!
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
