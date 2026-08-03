
function doRoll(count, sides, mod, label){
  const rolls = [];
  for(let i=0;i<count;i++) rolls.push(1+Math.floor(Math.random()*sides));
  let total, breakdown;
  if(sides===20 && count===1 && state.adv!=='normal'){
    const r2 = 1+Math.floor(Math.random()*20);
    const chosen = state.adv==='adv' ? Math.max(rolls[0],r2) : Math.min(rolls[0],r2);
    total = chosen + mod;
    breakdown = `[${rolls[0]}, ${r2}] ${state.adv==='adv'?'take higher':'take lower'} ${mod?fmtMod(mod):''}`;
  } else {
    const sum = rolls.reduce((a,b)=>a+b,0);
    total = sum + mod;
    breakdown = `[${rolls.join(', ')}]${mod?(' '+fmtMod(mod)):''}`;
  }
  state.diceLog.unshift({ id: uid('roll'), timestamp: Date.now(), label, total, breakdown });
  persistDiceLog();
  render();
}

function copyToClipboard(text){
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).catch(()=>{ fallbackCopy(text); });
  } else fallbackCopy(text);
}
function fallbackCopy(text){
  const ta = document.createElement('textarea');
  ta.value = text; document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); }catch(e){}
  document.body.removeChild(ta);
}

loadInitial();
loadSrdBundle();
})();
