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
  { title: "Khởi động & vào số", goal: "Đi đúng làn 120 m", target: 120, seconds: 120 },
  { title: "Giữ làn & xi-nhan", goal: "Giữ làn ổn định 180 m", target: 180, seconds: 150 },
  { title: "Đường đêm phức tạp", goal: "Lái an toàn 240 m", target: 240, seconds: 180 },
] as const;

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

  useEffect(() => { if (distance >= lesson.target && Math.abs(lane) < .75) reward("drive", "Hoàn thành quãng đường đúng làn"); }, [distance, lane, lesson.target, reward]);

  const done = useMemo(() => ({ belt, engine, gear: gear === "D", handbrake: !handbrake, drive: distance >= lesson.target && Math.abs(lane) < .75 }), [belt, engine, gear, handbrake, distance, lane, lesson.target]);
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
      <div className="lesson"><em>Bài {String(lessonIndex + 1).padStart(2, "0")}</em><span>•</span>{lesson.title}</div>
      <div className="top-actions"><div className="xp"><i>XP</i>{xp.toLocaleString("vi-VN")}</div><button onClick={() => setHelp(true)} aria-label="Hướng dẫn">?</button><button onClick={() => started && setPaused(v => !v)}>Tạm dừng <kbd>ESC</kbd></button></div>
    </header>

    <section className="stage">
      <div className="world" style={{ transform: `translateX(${-lane * 2.4}%) scale(1.05)` }} /><div className="shade" />
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
          <div className="cabin-sequence"><small>CHUẨN BỊ XE</small><div><button className={belt ? "done" : ""} onClick={() => pressControl("B", false)}><b>B</b><span>Dây an toàn</span></button><i>→</i><button className={engine ? "done" : ""} onClick={() => pressControl("I", false)}><b>I</b><span>Động cơ</span></button><i>→</i><button className={!handbrake ? "done" : ""} onClick={() => pressControl("H", false)}><b>H</b><span>Phanh tay</span></button></div></div>
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

    {!started && <div className="overlay"><section className="startbox"><small>CHƯƠNG TRÌNH HẠNG B · SỐ TỰ ĐỘNG</small><h1>Khởi động đúng.<br/><em>Lái xe an toàn.</em></h1><p>Hoàn thành 3 bài tăng dần độ khó. Có thể dùng bàn phím hoặc nhấn trực tiếp các nút mô phỏng; cần số P–R–N–D thao tác bằng chuột.</p><div><span>⌨ Bàn phím</span><span>☝ Nút mô phỏng</span><span>↖ Chuột vào số</span></div><button onClick={() => startLesson(0)}>BẮT ĐẦU BÀI 01 <b>→</b></button><i>Mục tiêu: đạt ≥80 điểm an toàn</i></section></div>}
    {paused && started && <div className="overlay soft"><section className="pausebox"><small>ĐÃ TẠM DỪNG</small><h2>Hít thở. Quan sát. Tiếp tục.</h2><button onClick={() => setPaused(false)}>TIẾP TỤC</button><button className="ghost" onClick={() => startLesson(lessonIndex)}>CHƠI LẠI</button></section></div>}
    {finished && started && !paused && <section className="result"><b>★★★</b><h2>Hoàn thành bài {String(lessonIndex + 1).padStart(2, "0")}</h2><p>{score.toLocaleString("vi-VN")} điểm · An toàn {safety}%</p>{lessonIndex < lessons.length - 1 ? <button className="next" onClick={() => startLesson(lessonIndex + 1)}>BÀI TIẾP THEO →</button> : <button onClick={() => startLesson(0)}>HỌC LẠI TỪ ĐẦU</button>}<button className="retry" onClick={() => startLesson(lessonIndex)}>Luyện lại bài này</button></section>}
    {help && <div className="overlay soft" onClick={() => setHelp(false)}><section className="helpbox" onClick={e => e.stopPropagation()}><button className="x" onClick={() => setHelp(false)}>×</button><small>CHƯƠNG TRÌNH 2026</small><h2>Nội dung Cabin Quest bám sát</h2><div className="curriculum"><span>01 · Làm quen xe tại chỗ</span><span>02 · Bãi phẳng &amp; chữ chi</span><span>03 · Đường bằng</span><span>04 · Dốc &amp; đường quanh co</span><span>05 · Đường phức tạp</span><span>06 · Lái ban đêm</span></div><p>Bài hiện tại mô phỏng thao tác chuẩn bị, số tự động và kiểm soát làn. Đây là sản phẩm luyện tập, không thay thế chương trình tại cơ sở đào tạo.</p><a href="https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/4/17-bxd-kem.pdf" target="_blank" rel="noreferrer">Xem chương trình chính thức ↗</a><button onClick={() => setHelp(false)}>ĐÃ HIỂU</button></section></div>}
  </main>;
}
