import { useState, useEffect, useRef, useCallback } from "react";

// --- 1. UTILS & DATA PREP ---
function gcd(a,b){ return b===0?a:gcd(b,a%b); }

function buildFractions(){
  const seen = new Set(), all = [];
  for(let d=1; d<=20; d++) {
    for(let n=1; n<d; n++) { 
      const g=gcd(n,d), rn=n/g, rd=d/g;
      const key=`${rn}/${rd}`;
      if(!seen.has(key)){ 
        seen.add(key); 
        all.push({n:rn, d:rd, pct:+(n/d*100).toFixed(6), deg:+(n/d*360).toFixed(4)}); 
      }
    }
  }
  // also 1/1 = 100%
  all.push({n:1,d:1,pct:100,deg:360});
  return all;
}
const ALL_FRACTIONS = buildFractions();

function poolForLevel(level){
  if(level<=1) return ALL_FRACTIONS.filter(f=>[2,4,5,10].includes(f.d));
  if(level<=3) return ALL_FRACTIONS.filter(f=>[2,3,4,5,8,10].includes(f.d));
  if(level<=5) return ALL_FRACTIONS.filter(f=>[2,3,4,5,6,8,10,20].includes(f.d));
  if(level<=7) return ALL_FRACTIONS.filter(f=>[2,3,4,5,6,7,8,9,10,20].includes(f.d));
  if(level<=9) return ALL_FRACTIONS.filter(f=>f.d<=12);
  if(level<=11) return ALL_FRACTIONS.filter(f=>f.d<=15);
  if(level<=13) return ALL_FRACTIONS.filter(f=>f.d<=18);
  return ALL_FRACTIONS;
}

function fmtPct(p){
  if(Number.isInteger(p)) return `${p}%`;
  const s = p.toFixed(6);
  const t = parseFloat(p.toFixed(4));
  return `${t}%`;
}
function fmtFrac(f){ return `${f.n}/${f.d}`; }
function fmtDeg(d){ return `${+d.toFixed(2)}°`; }

function checkAnswer(q, userRaw){
  const user = userRaw.trim().replace(/°|%/g,"").trim();
  if(q.type==="F→%"){
    const expected = q.frac.pct;
    const parsed = parseFloat(user);
    if(isNaN(parsed)) return false;
    return Math.abs(parsed - expected) < 0.15;
  }
  if(q.type==="%→F"){
    const parts = user.split("/");
    if(parts.length===2){
      const un=parseInt(parts[0]), ud=parseInt(parts[1]);
      if(isNaN(un)||isNaN(ud)||ud===0) return false;
      const g=gcd(Math.abs(un),Math.abs(ud));
      return un/g===q.frac.n && ud/g===q.frac.d;
    }
    const parsed = parseFloat(user);
    if(!isNaN(parsed)) return Math.abs(parsed - q.frac.pct) < 0.15;
    return false;
  }
  if(q.type==="%→°"){
    const parsed = parseFloat(user);
    if(isNaN(parsed)) return false;
    return Math.abs(parsed - q.frac.deg) < 1.5;
  }
  return false;
}

function makeCorrection(q){
  if(q.type==="F→%") return `✗ ${fmtFrac(q.frac)} × 100 = ${fmtPct(q.frac.pct)}`;
  if(q.type==="%→F") return `✗ ${fmtPct(q.frac.pct)} = ${fmtFrac(q.frac)}`;
  if(q.type==="%→°") return `✗ ${fmtPct(q.frac.pct)} × 3.6 = ${fmtDeg(q.frac.deg)}`;
}

function questionTypes(level){
  if(level<=3) return ["F→%","%→F"];
  if(level<=7) return ["F→%","F→%","%→F","%→F","%→°"];
  if(level<=11) return ["F→%","%→F","%→°"];
  return ["F→%","%→F","%→°"];
}

function makeQuestion(level, recentKeys){
  const pool = poolForLevel(level);
  const types = questionTypes(level);
  const fresh = pool.filter(f=> !recentKeys.slice(-12).includes(`${f.n}/${f.d}`));
  const src = fresh.length > 0 ? fresh : pool;
  const frac = src[Math.floor(Math.random()*src.length)];
  const type = types[Math.floor(Math.random()*types.length)];
  let text = "";
  if(type==="F→%") text = `${fmtFrac(frac)} = ?`;
  if(type==="%→F") text = `${fmtPct(frac.pct)} = ?`;
  if(type==="%→°") text = `${fmtPct(frac.pct)} = ? °`;
  return { frac, type, text, key:`${frac.n}/${frac.d}` };
}

const LEVEL_LABELS=["Novice","Beginner","Elementary","Developing","Intermediate","Steady","Proficient","Capable","Skilled","Advanced","Expert","Master","Champion","Elite","Legend"];
const timerLimit = l => l<4?0:l<8?20:l<12?15:10;

// --- 2. HAPTICS & STYLES ---
const triggerHaptic = (pattern) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

const INJECTED_STYLES = `
  * { box-sizing: border-box; }
  body { background-color: #F8FAFC; margin: 0; font-family: system-ui, -apple-system, sans-serif; color: #0F172A; touch-action: manipulation; }
  .glass-card { background: #FFFFFF; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.01); border: 1px solid #F1F5F9; padding: 2rem; }
  .btn-primary { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
  .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3); }
  .btn-primary:active { transform: translateY(0); box-shadow: 0 4px 6px -2px rgba(16, 185, 129, 0.3); }
  .kbd-btn { transition: transform 0.05s, box-shadow 0.05s; user-select: none; touch-action: manipulation; }
  .kbd-btn:active { transform: translateY(4px); box-shadow: 0 0 0 transparent !important; }
  .modern-input { transition: all 0.2s; }
  .modern-input:focus { outline: none; border-color: #10B981 !important; box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.15) !important; }
`;

// Extracted Keyboard
const Kbd = ({ onPress }) => {
  const keys=[["7","8","9"],["4","5","6"],["1","2","3"],["0",".","/"],["%","⌫","↵"]];
  return(
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginTop:16}}>
      {keys.flat().map((k,i)=>(
        <button key={i} className="kbd-btn" 
          onMouseDown={e=>{ e.preventDefault(); onPress(k); }}
          onTouchStart={e=>{ e.preventDefault(); onPress(k); }}
          style={{
            padding:"1rem 0", borderRadius:12, fontWeight:600, fontSize:18, cursor:"pointer",
            fontFamily:"var(--font-mono, monospace)", display: "flex", alignItems: "center", justifyContent: "center",
            border: k==="↵" ? "none" : "1px solid #E2E8F0",
            background: k==="↵" ? "linear-gradient(135deg, #10B981, #059669)" : k==="⌫" ? "#F1F5F9" : "#FFFFFF",
            color: k==="↵" ? "#FFFFFF" : "#334155",
            boxShadow: k==="↵" ? "0 4px 0 #047857" : "0 4px 0 #CBD5E1"
          }}>
          {k}
        </button>
      ))}
    </div>
  );
};

// --- 3. MAIN APP ---
export default function App(){
  const [phase, setPhase] = useState("intro");
  const [q, setQ] = useState(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("");
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [weakSpots, setWeakSpots] = useState({});
  const [wrongCounts, setWrongCounts] = useState({});
  const [level, setLevel] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [timerOn, setTimerOn] = useState(false);
  const [recentKeys, setRecentKeys] = useState([]);
  const [mastered, setMastered] = useState(0);
  const [checkpointData, setCheckpointData] = useState(null);
  
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  const handleFocus = useCallback(() => {
    if (typeof window !== 'undefined' && window.matchMedia("(pointer: coarse)").matches) return;
    setTimeout(()=> inputRef.current?.focus(), 50);
  }, []);

  const startTimer = useCallback((lv) => {
    if(timerRef.current) clearInterval(timerRef.current);
    const lim = timerLimit(lv);
    if(lim===0) return;
    setTimeLeft(lim);
    setTimerOn(true);
  }, []);

  useEffect(()=>{
    if(!timerOn) return;
    timerRef.current = setInterval(()=>{
      setTimeLeft(t=>{
        if(t<=1){
          clearInterval(timerRef.current);
          setTimerOn(false);
          setFeedback("⏱ Time's up!");
          setFeedbackType("wrong");
          triggerHaptic([50, 50, 50]); 
          setTimeout(()=>nextQ(level), 600);
          return 0;
        }
        return t-1;
      });
    },1000);
    return ()=>clearInterval(timerRef.current);
  },[timerOn]);

  const nextQ = useCallback((lv, rk=recentKeys) => {
    const nq = makeQuestion(lv, rk);
    setQ(nq);
    setAnswer("");
    const updated = [...rk, nq.key].slice(-20);
    setRecentKeys(updated);
    startTimer(lv);
    handleFocus();
  },[recentKeys, startTimer, handleFocus]);

  const begin = () => {
    const nq = makeQuestion(0,[]);
    setQ(nq);
    setRecentKeys([nq.key]);
    setPhase("quiz");
    handleFocus();
  };

  const submit = useCallback(() => {
    if(!answer.trim()||!q) return;
    if(timerRef.current) clearInterval(timerRef.current);
    setTimerOn(false);

    const correct = checkAnswer(q, answer);
    const newTotal = total+1;
    const newLevel = Math.floor(newTotal/5);
    const newScore = correct?score+1:score;
    const newStreak = correct?streak+1:0;

    let wc={...wrongCounts}, ws={...weakSpots}, nm=mastered;
    if(!correct){
      triggerHaptic([40, 60, 40]); 
      wc[q.key]=(wc[q.key]||0)+1;
      if(wc[q.key]>=2) ws[q.key]=q.type==="F→%"?fmtPct(q.frac.pct):q.type==="%→F"?fmtFrac(q.frac):fmtDeg(q.frac.deg);
    } else {
      triggerHaptic(30); 
      if(ws[q.key]){ delete ws[q.key]; nm++; }
    }

    setScore(newScore); setTotal(newTotal); setStreak(newStreak);
    setWrongCounts(wc); setWeakSpots(ws); setMastered(nm);
    setLevel(newLevel);
    setFeedback(correct?"✓ Correct!":makeCorrection(q));
    setFeedbackType(correct?"correct":"wrong");
    setAnswer("");

    if(newTotal%20===0){
      const pct=Math.round(newScore/newTotal*100);
      setCheckpointData({score:newScore,total:newTotal,streak:newStreak,weakSpots:Object.entries(ws),level:newLevel,mastered:nm,pct});
      setPhase("checkpoint");
      setRecentKeys(rk=>{
        setQ(makeQuestion(newLevel,rk));
        return rk;
      });
    } else {
      setTimeout(()=> nextQ(newLevel), correct?300:1200);
    }
  }, [answer, q, total, score, streak, wrongCounts, weakSpots, mastered, nextQ]);

  const handleKbdPress = useCallback((k) => {
    if(k==="⌫"){ 
      triggerHaptic(10);
      setAnswer(a=>a.slice(0,-1)); 
      return; 
    }
    if(k==="↵"){ submit(); return; }
    triggerHaptic(10); 
    setAnswer(a=>a+k);
    handleFocus();
  }, [submit, handleFocus]);

  const handleKey = e => { if(e.key==="Enter") submit(); };

  const restart = () => {
    if(timerRef.current) clearInterval(timerRef.current);
    setPhase("intro"); setQ(null); setAnswer(""); setFeedback(""); setFeedbackType("");
    setScore(0); setTotal(0); setStreak(0); setWeakSpots({}); setWrongCounts({});
    setLevel(0); setTimeLeft(20); setTimerOn(false); setRecentKeys([]); setMastered(0); setCheckpointData(null);
  };

  const continueAfter = () => {
    setPhase("quiz");
    setFeedback(""); setFeedbackType("");
    startTimer(level);
    handleFocus();
  };

  const lim = timerLimit(level);
  const timerPercentage = lim > 0 ? (timeLeft / lim) * 100 : 100;
  let timerColor = "#10B981"; 
  if (timerPercentage <= 50) timerColor = "#F59E0B"; 
  if (timerPercentage <= 25) timerColor = "#EF4444"; 

  if(phase==="intro") return(
    <div style={{padding:"3rem 1rem",maxWidth:480,margin:"0 auto"}}>
      <style dangerouslySetInnerHTML={{__html: INJECTED_STYLES}} />
      <div className="glass-card">
        <div style={{fontSize:28,fontWeight:800,marginBottom:12, background: "linear-gradient(135deg, #0F172A, #334155)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"}}>
          Quant Aptitude Tutor
        </div>
        <p style={{fontSize:16,color:"#64748B",lineHeight:1.6,marginBottom:24}}>
          Master proper fractions from <b style={{fontWeight:600, color:"#0F172A"}}>1/2 to 19/20</b>. Build intuitive math reflexes.
        </p>
        <div style={{background:"#F8FAFC",borderRadius:16,padding:"1.25rem",marginBottom:28, border:"1px solid #E2E8F0"}}>
          <div style={{fontSize:14, fontWeight:600, color:"#475569", marginBottom:12, textTransform:"uppercase", letterSpacing:1}}>Progression Path</div>
          <ul style={{listStyle:"none", padding:0, margin:0, fontSize:14, color:"#334155", display:"flex", flexDirection:"column", gap:10}}>
            <li style={{display:"flex", alignItems:"center", gap:8}}><span style={{background:"#DBEAFE", color:"#1D4ED8", padding:"2px 8px", borderRadius:12, fontSize:12, fontWeight:600}}>Lv 0–3</span> Basic fractions • No timer</li>
            <li style={{display:"flex", alignItems:"center", gap:8}}><span style={{background:"#FEF08A", color:"#854D0E", padding:"2px 8px", borderRadius:12, fontSize:12, fontWeight:600}}>Lv 4–7</span> Add degrees • 20s timer</li>
            <li style={{display:"flex", alignItems:"center", gap:8}}><span style={{background:"#FED7AA", color:"#C2410C", padding:"2px 8px", borderRadius:12, fontSize:12, fontWeight:600}}>Lv 8–11</span> Harder mixing • 15s timer</li>
            <li style={{display:"flex", alignItems:"center", gap:8}}><span style={{background:"#FECACA", color:"#B91C1C", padding:"2px 8px", borderRadius:12, fontSize:12, fontWeight:600}}>Lv 12+</span> Full mastery • 10s timer</li>
          </ul>
        </div>
        <button onClick={begin} className="btn-primary" style={{width:"100%",padding:"1rem",borderRadius:14,border:"none",background:"linear-gradient(135deg, #10B981, #059669)",color:"white",fontWeight:600,fontSize:18,cursor:"pointer"}}>
          Start Session
        </button>
      </div>
    </div>
  );

  if(phase==="checkpoint"&&checkpointData) return(
    <div style={{padding:"3rem 1rem",maxWidth:480,margin:"0 auto"}}>
      <style dangerouslySetInnerHTML={{__html: INJECTED_STYLES}} />
      <div className="glass-card">
        <div style={{textAlign:"center", marginBottom:24}}>
          <div style={{fontSize:14, fontWeight:600, color:"#6366F1", textTransform:"uppercase", letterSpacing:1, marginBottom:4}}>Checkpoint Reached</div>
          <div style={{fontSize:28,fontWeight:800, color:"#0F172A"}}>Question {checkpointData.total}</div>
        </div>
        
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12,marginBottom:24}}>
          {[
            ["Score",`${checkpointData.score}/${checkpointData.total}`, "#F0FDF4", "#166534"],
            ["Accuracy",`${checkpointData.pct}%`, "#EFF6FF", "#1E40AF"],
            ["Current Streak",checkpointData.streak, "#FEF2F2", "#991B1B"],
            ["Mastered",checkpointData.mastered, "#FDF4FF", "#86198F"]
          ].map(([l,v, bg, col])=>(
            <div key={l} style={{background:bg,borderRadius:16,padding:"1rem",textAlign:"center", border:`1px solid ${bg}`}}>
              <div style={{fontSize:12,fontWeight:600,color:col,opacity:0.8,marginBottom:4,textTransform:"uppercase"}}>{l}</div>
              <div style={{fontSize:24,fontWeight:700,color:col}}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{display:"flex",gap:12}}>
          <button onClick={restart} style={{flex:0.7, padding:"1rem",borderRadius:14,border:"1px solid #CBD5E1",background:"#FFFFFF",color:"#475569",cursor:"pointer",fontSize:16,fontWeight:600}}>Quit</button>
          <button onClick={continueAfter} className="btn-primary" style={{flex:1.3, padding:"1rem",borderRadius:14,border:"none",background:"linear-gradient(135deg, #10B981, #059669)",color:"white",fontWeight:600,cursor:"pointer",fontSize:16}}>Continue</button>
        </div>
      </div>
    </div>
  );

  return(
    <div style={{padding:"2rem 1rem",maxWidth:480,margin:"0 auto", minHeight:"100vh", display:"flex", flexDirection:"column"}}>
      <style dangerouslySetInnerHTML={{__html: INJECTED_STYLES}} />
      
      <div style={{marginBottom:"1.5rem", background:"white", borderRadius:16, boxShadow:"0 4px 6px -1px rgba(0,0,0,0.05)", border:"1px solid #E2E8F0", overflow: "hidden"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center", padding:"12px 16px"}}>
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            <div style={{display:"flex", flexDirection:"column"}}>
              <span style={{fontSize:11,fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:0.5}}>Level {level}</span>
              <span style={{fontSize:14,fontWeight:700,color:"#6366F1"}}>{LEVEL_LABELS[Math.min(level,14)]}</span>
            </div>
          </div>
          <div style={{display:"flex",gap:16,alignItems:"center"}}>
            <div style={{textAlign:"center"}}>
              <span style={{display:"block", fontSize:10, color:"#94A3B8", fontWeight:600, textTransform:"uppercase"}}>Score</span>
              <span style={{fontSize:14, fontWeight:700, color:"#0F172A"}}>{score}/{total}</span>
            </div>
            <div style={{textAlign:"center"}}>
              <span style={{display:"block", fontSize:10, color:"#94A3B8", fontWeight:600, textTransform:"uppercase"}}>Streak</span>
              <span style={{fontSize:14, fontWeight:700, color:streak>=5?"#10B981":"#0F172A"}}>{streak} 🔥</span>
            </div>
            {lim>0 && (
               <span style={{fontWeight:700, fontSize:14, color: timerColor, width: "35px", textAlign: "right"}}>
                 {timeLeft}s
               </span>
            )}
          </div>
        </div>
        
        {lim > 0 && (
          <div style={{height: "4px", background: "#F1F5F9", width: "100%"}}>
            <div style={{
              height: "100%", width: `${timerPercentage}%`, 
              background: timerColor, 
              transition: "width 1s linear, background-color 0.5s ease"
            }} />
          </div>
        )}
      </div>

      {Object.keys(weakSpots).length>0&&(
        <div style={{fontSize:12,fontWeight:600,color:"#EF4444",marginBottom:12, background:"#FEF2F2", padding:"8px 16px", borderRadius:10, border:"1px solid #FECACA"}}>
          Review: {Object.keys(weakSpots).slice(0,4).join(" • ")}
        </div>
      )}

      <div className="glass-card" style={{padding:"2rem 1.5rem"}}>
        {q&&(
          <>
            <div style={{display:"flex", flexDirection:"column", alignItems:"center", marginBottom:"2rem"}}>
              <span style={{fontSize:14,fontWeight:600,color:"#64748B", background:"#F1F5F9", padding:"4px 12px", borderRadius:20, marginBottom:16}}>
                {q.type === "F→%" ? "Fraction to Percentage" : q.type === "%→F" ? "Percentage to Fraction" : "Percentage to Degrees"}
              </span>
              <span style={{fontSize:48,fontWeight:800,fontFamily:"var(--font-mono, monospace)", color:"#0F172A", letterSpacing:"-1px"}}>
                {q.text}
              </span>
            </div>

            {feedback&&(
              <div style={{fontSize:15,fontWeight:600,textAlign:"center",color:feedbackType==="correct"?"#059669":"#DC2626",marginBottom:"1.5rem",padding:"12px",background:feedbackType==="correct"?"#D1FAE5":"#FEE2E2",borderRadius:12, border:`1px solid ${feedbackType==="correct"?"#A7F3D0":"#FECACA"}`}}>
                {feedback}
              </div>
            )}

            <div style={{display:"flex",gap:12,marginBottom:8}}>
              <input ref={inputRef} value={answer} onChange={e=>setAnswer(e.target.value)} onKeyDown={handleKey}
                placeholder="Answer..." className="modern-input"
                style={{flex:1,fontSize:20,fontWeight:600,padding:"12px 16px", borderRadius:12, border:"2px solid #E2E8F0", background:"#F8FAFC", color:"#0F172A", textAlign:"center"}}/>
              <button onClick={submit} disabled={!answer.trim()} className={answer.trim() ? "btn-primary" : ""}
                style={{padding:"0 1.5rem",borderRadius:12,border:"none",background:answer.trim()?"linear-gradient(135deg, #10B981, #059669)":"#E2E8F0",color:answer.trim()?"white":"#94A3B8",fontWeight:700,cursor:answer.trim()?"pointer":"not-allowed",fontSize:16, boxShadow:answer.trim()?"0 4px 6px -1px rgba(16, 185, 129, 0.2)":"none"}}>
                GO
              </button>
            </div>
            
            <Kbd onPress={handleKbdPress} />
          </>
        )}
      </div>

      <div style={{marginTop:"auto", paddingTop:"2rem", display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13,fontWeight:600,color:"#94A3B8"}}>
        <span>Next checkpoint: Q{Math.ceil((total+1)/20)*20}</span>
        <button onClick={restart} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,fontWeight:600,color:"#EF4444",padding:"8px 12px", borderRadius:8}}>Restart Session</button>
      </div>
    </div>
  );
}