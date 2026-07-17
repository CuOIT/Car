"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Gear = "P" | "R" | "N" | "D";
type Toast = { id: number; text: string; kind: "ok" | "bad" };

const tasks = [
  ["belt", "Thắt dây an toàn", "Nhấn B"],
  ["engine", "Khởi động động cơ", "Nhấn I"],
  ["gear", "Giữ phanh, chuyển P → D", "Giữ S + nhấp D"],
  ["handbrake", "Hạ phanh tay", "Nhấn H"],
  ["drive", "Đi đúng làn 120 m", "W A S D"],
] as const;

const lessons = [
  { title: "Tại chỗ không nổ máy", goal: "Làm quen điều khiển 60 m", target: 60, seconds: 120, scene: "stand" },
  { title: "Tại chỗ có nổ máy", goal: "Khởi động và kiểm tra xe 80 m", target: 80, seconds: 120, scene: "stand" },
  { title: "Bãi phẳng", goal: "Đi đúng hướng 120 m", target: 120, seconds: 140, scene: "yard" },
  { title: "Hình 3, 8 & chữ chi", goal: "Đi qua đường chữ chi 160 m", target: 160, seconds: 160, scene: "slalom" },
  { title: "Đường bằng", goal: "Giữ làn ổn định 200 m", target: 200, seconds: 170, scene: "urban" },
  { title: "Tổng hợp sân tập", goal: "Hoàn thành tổ hợp 240 m", target: 240, seconds: 190, scene: "yard" },
  { title: "Đường cao tốc", goal: "Nhập làn và giữ hướng 320 m", target: 320, seconds: 200, scene: "highway" },
  { title: "Dốc & đường quanh co", goal: "Kiểm soát đường cong 260 m", target: 260, seconds: 200, scene: "curve" },
  { title: "Đường phức tạp", goal: "Vượt khu vực nguy hiểm 280 m", target: 280, seconds: 210, scene: "hazard" },
  { title: "Lái xe ban đêm", goal: "Quan sát và giữ làn 240 m", target: 240, seconds: 190, scene: "night" },
  { title: "Lái xe có tải", goal: "Đi êm và giữ khoảng cách 220 m", target: 220, seconds: 190, scene: "load" },
  { title: "Ôn luyện sát hạch", goal: "Hoàn thành bài tổng hợp 360 m", target: 360, seconds: 240, scene: "exam" },
] as const;

type RoadScene = typeof lessons[number]["scene"];

function RoadCanvas({ speed, lane, scene }: { speed: number; lane: number; scene: RoadScene }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef({ speed, lane, scene });
  useEffect(() => { live.current = { speed, lane, scene }; }, [speed, lane, scene]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let phase = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = rect.width, h = rect.height;
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      phase = (phase + live.current.speed * dt * .018) % 1;
      const horizon = h * .39, roadBottom = h * .87;
      const curveStrength = live.current.scene === "curve" ? 92 : live.current.scene === "slalom" ? 58 : 0;
      const bend = Math.sin(now / 1750) * curveStrength;
      const driverOffset = -live.current.lane * 42;
      const centerAt = (z: number) => w / 2 + driverOffset + bend * Math.sin(z * Math.PI) * z;
      const halfAt = (z: number) => 35 + z * w * .27;
      const yAt = (z: number) => horizon + Math.pow(z, 1.65) * (roadBottom - horizon);

      ctx.clearRect(0, 0, w, h);
      const skyGlow = ctx.createRadialGradient(w / 2, horizon, 5, w / 2, horizon, w * .28);
      skyGlow.addColorStop(0, "rgba(79,206,255,.18)"); skyGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = skyGlow; ctx.fillRect(0, horizon - 90, w, 190);

      ctx.beginPath();
      ctx.moveTo(centerAt(0) - halfAt(0), horizon); ctx.lineTo(centerAt(0) + halfAt(0), horizon);
      ctx.lineTo(centerAt(1) + halfAt(1), roadBottom); ctx.lineTo(centerAt(1) - halfAt(1), roadBottom); ctx.closePath();
      const asphalt = ctx.createLinearGradient(0, horizon, 0, roadBottom);
      asphalt.addColorStop(0, "rgba(21,35,47,.48)"); asphalt.addColorStop(1, "rgba(5,12,19,.92)");
      ctx.fillStyle = asphalt; ctx.fill();

      for (const side of [-1, 1]) {
        ctx.beginPath();
        for (let n = 0; n <= 24; n++) { const z = n / 24; const x = centerAt(z) + side * halfAt(z); const y = yAt(z); n ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.strokeStyle = "rgba(230,244,255,.75)"; ctx.lineWidth = 2; ctx.shadowColor = "#61dfff"; ctx.shadowBlur = 5; ctx.stroke(); ctx.shadowBlur = 0;
      }

      for (let n = 0; n < 18; n++) {
        const z = (phase + n / 18) % 1;
        if ((n + Math.floor(phase * 18)) % 2) continue;
        const y = yAt(z), len = 4 + z * 34, lw = 1 + z * 4;
        for (const laneLine of [-1 / 3, 1 / 3]) {
          const x = centerAt(z) + laneLine * halfAt(z);
          ctx.beginPath(); ctx.moveTo(x, y - len / 2); ctx.lineTo(x, y + len / 2);
          ctx.strokeStyle = "rgba(239,249,255,.88)"; ctx.lineWidth = lw; ctx.shadowColor = "white"; ctx.shadowBlur = 3; ctx.stroke();
        }
      }
      ctx.shadowBlur = 0;

      for (let n = 0; n < 11; n++) {
        const z = (phase * .72 + n / 11) % 1; const y = yAt(z); const size = 2 + z * 10;
        for (const side of [-1, 1]) {
          const x = centerAt(z) + side * (halfAt(z) + 18 + z * 40);
          ctx.fillStyle = side < 0 ? "rgba(80,220,255,.9)" : "rgba(255,190,83,.9)";
          ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 9; ctx.fillRect(x - size / 2, y - size * 2.4, size, size * 2.4);
        }
      }
      ctx.shadowBlur = 0;

      const obstacleScene = ["hazard", "exam", "load"].includes(live.current.scene);
      if (obstacleScene && live.current.speed > 1) {
        const z = .48 + Math.sin(now / 2600) * .08; const x = centerAt(z) + halfAt(z) * .32; const y = yAt(z); const s = 9 + z * 25;
        ctx.fillStyle = "#ff9d3d"; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x - s * .55, y); ctx.lineTo(x + s * .55, y); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.fillRect(x - s * .35, y - s * .42, s * .7, 3);
      }
      if (live.current.scene === "highway") {
        ctx.fillStyle = "rgba(41,151,255,.9)"; ctx.fillRect(w * .67, horizon + 20, 78, 28); ctx.fillStyle = "white"; ctx.font = "700 9px system-ui"; ctx.fillText("CAO TỐC", w * .67 + 14, horizon + 38);
      }
      if (live.current.scene === "night") {
        const fog = ctx.createLinearGradient(0, horizon, 0, roadBottom); fog.addColorStop(0, "rgba(188,220,233,.35)"); fog.addColorStop(1, "rgba(120,150,165,.03)"); ctx.fillStyle = fog; ctx.fillRect(w * .25, horizon - 20, w * .5, roadBottom - horizon + 20);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} className="road-canvas" aria-label="Mặt đường mô phỏng chuyển động" />;
}

export default function Home() {
  const [lessonIndex, setLessonIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [gear, setGear] = useState<Gear>("P");
  const [belt, setBelt] = useState(false);
  const [engine, setEngine] = useState(false);
  const [handbrake, setHandbrake] = useState(true);
  const [signal, setSignal] = useState<"left" | "right" | null>(null);
  const [speed, setSpeed] = useState(0);
  const [lane, setLane] = useState(0);
  const [distance, setDistance] = useState(0);
  const [score, setScore] = useState(0);
  const [safety, setSafety] = useState(100);
  const [combo, setCombo] = useState(1);
  const [xp, setXp] = useState(1240);
  const [time, setTime] = useState(120);
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [help, setHelp] = useState(false);
  const keys = useRef(new Set<string>());
  const awarded = useRef(new Set<string>());
  const toastId = useRef(0);
  const speedWarning = useRef(false);

  const toast = useCallback((text: string, kind: Toast["kind"] = "ok") => {
    const id = ++toastId.current;
    setToasts((all) => [...all.slice(-2), { id, text, kind }]);
    window.setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), 2400);
  }, []);

  const reward = useCallback((id: string, text: string) => {
    if (awarded.current.has(id)) return;
    awarded.current.add(id);
    setScore((v) => v + 500);
    setXp((v) => v + 40);
    setCombo((v) => Math.min(5, v + 1));
    toast(`+500 · ${text}`);
  }, [toast]);

  const penalize = useCallback((text: string, points = 5) => {
    setSafety((v) => Math.max(0, v - points));
    setScore((v) => Math.max(0, v - points * 20));
    setCombo(1);
    toast(text, "bad");
  }, [toast]);

  const startLesson = useCallback((index: number) => {
    keys.current.clear(); awarded.current.clear(); speedWarning.current = false;
    setLessonIndex(index);
    setGear("P"); setBelt(false); setEngine(false); setHandbrake(true); setSignal(null);
    setSpeed(0); setLane(0); setDistance(0); setScore(0); setSafety(100); setCombo(1);
    setTime(lessons[index].seconds); setActiveKeys([]); setToasts([]); setPaused(false); setStarted(true);
  }, []);

  const lesson = lessons[lessonIndex];

  const shift = (next: Gear) => {
    if (!started || paused) return;
    const braking = keys.current.has("s") || keys.current.has("arrowdown");
    if (speed > 1 && (next === "P" || (gear === "D" && next === "R") || (gear === "R" && next === "D"))) {
      penalize("Không đổi hướng khi xe đang chạy", 8); return;
    }
    if (gear === "P" && next !== "P" && !braking) {
      penalize("Giữ phanh chân trước khi vào số", 4); return;
    }
    setGear(next);
    if (next === "D") reward("gear", "Vào số D đúng quy trình");
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
      if (k === "escape" && started) { setPaused((v) => !v); return; }
      if (!started || paused || e.repeat) return;
      if (k === "b") setBelt((v) => { if (!v) reward("belt", "Đã thắt dây an toàn"); return !v; });
      if (k === "i") setEngine((v) => { if (!v) reward("engine", "Động cơ đã khởi động"); return !v; });
      if (k === "h") {
        if (!engine || gear !== "D") penalize("Khởi động và vào D trước khi hạ phanh tay", 2);
        else setHandbrake((v) => { if (v) reward("handbrake", "Đã hạ phanh tay"); return !v; });
      }
      if (k === "q") setSignal((v) => v === "left" ? null : "left");
      if (k === "e") setSignal((v) => v === "right" ? null : "right");
      keys.current.add(k); setActiveKeys([...keys.current]);
    };
    const up = (e: KeyboardEvent) => { keys.current.delete(e.key.toLowerCase()); setActiveKeys([...keys.current]); };
    window.addEventListener("keydown", down, { passive: false }); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [engine, gear, paused, penalize, reward, started]);

  useEffect(() => {
    if (!started || paused) return;
    const loop = window.setInterval(() => {
      const gas = keys.current.has("w") || keys.current.has("arrowup");
      const brake = keys.current.has("s") || keys.current.has("arrowdown");
      const left = keys.current.has("a") || keys.current.has("arrowleft");
      const right = keys.current.has("d") || keys.current.has("arrowright");
      setSpeed((v) => {
        let n = v;
        if (brake) n -= 2.2;
        else if (gas && engine && !handbrake && (gear === "D" || gear === "R")) n += gear === "D" ? .72 : .38;
        else n -= .28;
        n = Math.max(0, Math.min(42, n));
        if (n > .2) { setDistance((d) => d + n / 72); setScore((s) => s + 1); }
        if (n > 30 && !speedWarning.current) { penalize("Quá giới hạn 30 km/h", 4); speedWarning.current = true; }
        if (n < 27) speedWarning.current = false;
        return n;
      });
      setLane((v) => {
        const steer = (right ? 1 : 0) - (left ? 1 : 0);
        const n = Math.max(-1.35, Math.min(1.35, v + steer * .055));
        if (Math.abs(n) > 1.05 && Math.abs(v) <= 1.05) penalize("Chạm vạch làn đường", 6);
        return n;
      });
    }, 50);
    return () => window.clearInterval(loop);
  }, [engine, gear, handbrake, paused, penalize, started]);

  useEffect(() => {
    if (!started || paused || time <= 0) return;
    const id = window.setInterval(() => setTime((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(id);
  }, [paused, started, time]);

  useEffect(() => { if (distance >= lesson.target) reward("drive", "Hoàn thành quãng đường"); }, [distance, lesson.target, reward]);

  const done = useMemo(() => ({ belt, engine, gear: gear === "D", handbrake: !handbrake, drive: distance >= lesson.target }), [belt, engine, gear, handbrake, distance, lesson.target]);
  const count = Object.values(done).filter(Boolean).length;
  const finished = count === 5;

  const keyOn = (k: string) => activeKeys.includes(k) || activeKeys.includes(k === "↑" ? "arrowup" : k === "↓" ? "arrowdown" : k === "←" ? "arrowleft" : k === "→" ? "arrowright" : "");
  const controlKey = (k: string) => ({ "↑": "ArrowUp", "↓": "ArrowDown", "←": "ArrowLeft", "→": "ArrowRight" }[k] || k);
  const pressControl = (k: string, hold: boolean) => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: controlKey(k), bubbles: true }));
    if (!hold) window.setTimeout(() => window.dispatchEvent(new KeyboardEvent("keyup", { key: controlKey(k), bubbles: true })), 80);
  };
  const releaseControl = (k: string) => window.dispatchEvent(new KeyboardEvent("keyup", { key: controlKey(k), bubbles: true }));

  return <main className="sim">
    <header className="topbar">
      <div className="brand"><b>◉</b><strong>CABIN QUEST</strong></div>
      <div className="lesson"><div><em>Bài {String(lessonIndex + 1).padStart(2, "0")}/12</em><span>•</span>{lesson.title}</div><nav aria-label="Chọn bài học"><button disabled={lessonIndex === 0} onClick={() => startLesson(lessonIndex - 1)}>‹</button><select value={lessonIndex} onChange={e => startLesson(Number(e.target.value))}>{lessons.map((item, index) => <option key={item.title} value={index}>Bài {index + 1}: {item.title}</option>)}</select><button disabled={lessonIndex === lessons.length - 1} onClick={() => startLesson(lessonIndex + 1)}>›</button></nav></div>
      <div className="top-actions"><div className="xp"><i>XP</i>{xp.toLocaleString("vi-VN")}</div><button onClick={() => setHelp(true)} aria-label="Hướng dẫn">?</button><button onClick={() => started && setPaused(v => !v)}>Tạm dừng <kbd>ESC</kbd></button></div>
    </header>

    <section className="stage">
      <div className="world" style={{ transform: `translateX(${-lane * 2.4}%) scale(1.05)` }} /><div className="shade" />
      <RoadCanvas speed={speed} lane={lane} scene={lesson.scene} />
      <div className={`scene-badge ${lesson.scene}`} aria-live="polite">{lesson.scene === "curve" ? "↝ ĐƯỜNG CONG" : lesson.scene === "hazard" ? "⚠ CHÚ Ý VẬT CẢN" : lesson.scene === "highway" ? "⬆ CAO TỐC" : lesson.scene === "night" ? "◉ TẦM NHÌN HẠN CHẾ" : lesson.scene === "slalom" ? "↭ ĐƯỜNG CHỮ CHI" : ""}</div>
      <div className="guides" style={{ transform: `translateX(calc(-50% + ${-lane * 24}px))` }}><i/><i/><i/><i/></div>

      <aside className="leftcol">
        <section className="panel mission-panel"><h3>⌖ &nbsp; NHIỆM VỤ HIỆN TẠI</h3><div className="current"><b>{finished ? "✓" : ""}</b><div><strong>{finished ? "Bài tập hoàn thành!" : count === 4 ? lesson.goal : tasks[count]?.[1]}</strong><small>{finished ? "Kết quả đã sẵn sàng" : count === 4 ? `${Math.min(lesson.target, Math.round(distance))} / ${lesson.target} m · W A S D` : tasks[count]?.[2]}</small></div></div>
          <div className="tasklist">{tasks.map((t, i) => <div key={t[0]} className={done[t[0]] ? "done" : i === count ? "active" : ""}><b>{done[t[0]] ? "✓" : i+1}</b><span>{t[0] === "drive" ? lesson.goal : t[1]}</span></div>)}</div>
        </section>
        <section className="panel controls"><h3>⌨ &nbsp; BÀN ĐIỀU KHIỂN</h3>
          <div className="control-deck">
            <button className={`deck-btn signal-left ${signal === "left" ? "on" : ""}`} onClick={() => pressControl("Q", false)}><b>◀</b><span>Q</span><small>TRÁI</small></button>
            <div className="drive-pad">
              <button className={`deck-btn gas ${keyOn("W") ? "pressed" : ""}`} onPointerDown={e => { e.preventDefault(); pressControl("W", true); }} onPointerUp={() => releaseControl("W")} onPointerLeave={() => releaseControl("W")}><b>W</b><small>TĂNG TỐC</small></button>
              <button className={`deck-btn steer left ${keyOn("A") ? "pressed" : ""}`} onPointerDown={e => { e.preventDefault(); pressControl("A", true); }} onPointerUp={() => releaseControl("A")} onPointerLeave={() => releaseControl("A")}><b>A</b><small>TRÁI</small></button>
              <button className={`deck-btn brake ${keyOn("S") ? "pressed" : ""}`} onPointerDown={e => { e.preventDefault(); pressControl("S", true); }} onPointerUp={() => releaseControl("S")} onPointerLeave={() => releaseControl("S")}><b>S</b><small>PHANH</small></button>
              <button className={`deck-btn steer right ${keyOn("D") ? "pressed" : ""}`} onPointerDown={e => { e.preventDefault(); pressControl("D", true); }} onPointerUp={() => releaseControl("D")} onPointerLeave={() => releaseControl("D")}><b>D</b><small>PHẢI</small></button>
            </div>
            <button className={`deck-btn signal-right ${signal === "right" ? "on" : ""}`} onClick={() => pressControl("E", false)}><b>▶</b><span>E</span><small>PHẢI</small></button>
          </div>
          <div className="cabin-sequence"><small>CHUẨN BỊ XE · THEO THỨ TỰ</small><div className="bih-row"><button className={belt ? "done" : ""} onClick={() => pressControl("B", false)}><b>B</b><span>Dây</span></button><button className={engine ? "done" : ""} onClick={() => pressControl("I", false)}><b>I</b><span>Máy</span></button><button className={!handbrake ? "done" : ""} onClick={() => pressControl("H", false)}><b>H</b><span>Phanh tay</span></button></div></div>
        </section>
      </aside>

      <div className="drivehud"><span className={signal === "left" ? "blink" : ""}>◀</span><div><small>TỐC ĐỘ</small><strong>{Math.round(speed)}</strong><em>km/h</em></div><section className="distancehud"><small>QUÃNG ĐƯỜNG</small><strong>{Math.min(lesson.target, Math.round(distance))}<em> / {lesson.target} m</em></strong><i><b style={{ width: `${Math.min(100, distance / lesson.target * 100)}%` }} /></i></section><span className={signal === "right" ? "blink" : ""}>▶</span><b>{gear}</b></div>

      <aside className="panel gear-panel"><h3>⚙ &nbsp; CẦN SỐ TỰ ĐỘNG</h3><div className="shifter"><div>{(["P","R","N","D"] as Gear[]).map(g => <button key={g} className={gear === g ? `active g-${g}` : ""} onClick={() => shift(g)} aria-label={`Chuyển sang số ${g}`}>{g}<i/></button>)}</div><span className={`stick pos-${gear}`}><i/></span></div>
        <p className="gear-tip">↖ <span>Giữ <kbd>S</kbd>, sau đó<br/><b>nhấp chuột để vào số</b></span></p>
        <div className="status"><span className={belt ? "ok" : ""}>Dây an toàn</span><span className={engine ? "ok" : ""}>Động cơ</span><span className={!handbrake ? "ok" : ""}>Phanh tay</span></div>
      </aside>

      <div className="toasts">{toasts.map(t => <div className={t.kind} key={t.id}>{t.kind === "ok" ? "✓" : "!"} {t.text}</div>)}</div>
      <div className="metrics"><div className="m-score"><b>★</b><span><small>ĐIỂM</small><strong>{score.toLocaleString("vi-VN")}</strong></span></div><div className="m-safe"><b>✓</b><span><small>AN TOÀN</small><strong>{safety}%</strong></span></div><div className="m-combo"><b>ϟ</b><span><small>COMBO</small><strong>×{combo}</strong></span></div></div>
      <footer><div><b>{count} / 5</b><span>{finished ? "Xuất sắc!" : "Đang luyện tập"}</span></div><section>{tasks.map((t,i) => <i key={t[0]} className={done[t[0]] ? "done" : i === count ? "now" : ""}/>)}</section><div className="clock"><small>THỜI GIAN</small><b>{String(Math.floor(time/60)).padStart(2,"0")}:{String(time%60).padStart(2,"0")}</b></div></footer>
    </section>

    {!started && <div className="overlay"><section className="startbox"><small>CHƯƠNG TRÌNH HẠNG B · SỐ TỰ ĐỘNG</small><h1>Khởi động đúng.<br/><em>Lái xe an toàn.</em></h1><p>12 bài bám theo các nội dung thực hành hiện hành. Đường mô phỏng chuyển động theo tốc độ; có thể dùng bàn phím hoặc nhấn trực tiếp cụm điều khiển.</p><div><span>12 bài thực hành</span><span>☝ Nút mô phỏng</span><span>↖ Chuột vào số</span></div><button onClick={() => startLesson(0)}>BẮT ĐẦU BÀI 01 <b>→</b></button><i>Mục tiêu: đạt ≥80 điểm an toàn</i></section></div>}
    {paused && started && <div className="overlay soft"><section className="pausebox"><small>ĐÃ TẠM DỪNG</small><h2>Hít thở. Quan sát. Tiếp tục.</h2><button onClick={() => setPaused(false)}>TIẾP TỤC</button><button className="ghost" onClick={() => startLesson(lessonIndex)}>CHƠI LẠI</button></section></div>}
    {finished && started && !paused && <section className="result"><b>★★★</b><h2>Hoàn thành bài {String(lessonIndex + 1).padStart(2, "0")}</h2><p>{score.toLocaleString("vi-VN")} điểm · An toàn {safety}%</p>{lessonIndex < lessons.length - 1 ? <button className="next" onClick={() => startLesson(lessonIndex + 1)}>BÀI TIẾP THEO →</button> : <button onClick={() => startLesson(0)}>HỌC LẠI TỪ ĐẦU</button>}<button className="retry" onClick={() => startLesson(lessonIndex)}>Luyện lại bài này</button></section>}
    {help && <div className="overlay soft" onClick={() => setHelp(false)}><section className="helpbox" onClick={e => e.stopPropagation()}><button className="x" onClick={() => setHelp(false)}>×</button><small>CHƯƠNG TRÌNH 2026</small><h2>Nội dung Cabin Quest bám sát</h2><div className="curriculum"><span>01 · Làm quen xe tại chỗ</span><span>02 · Bãi phẳng &amp; chữ chi</span><span>03 · Đường bằng</span><span>04 · Dốc &amp; đường quanh co</span><span>05 · Đường phức tạp</span><span>06 · Lái ban đêm</span></div><p>Bài hiện tại mô phỏng thao tác chuẩn bị, số tự động và kiểm soát làn. Đây là sản phẩm luyện tập, không thay thế chương trình tại cơ sở đào tạo.</p><a href="https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/4/17-bxd-kem.pdf" target="_blank" rel="noreferrer">Xem chương trình chính thức ↗</a><button onClick={() => setHelp(false)}>ĐÃ HIỂU</button></section></div>}
  </main>;
}
