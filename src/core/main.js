const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const SCENES = {
  SPLASH_POSTER: 0,
  LOGO_ANIZO: 1,
  LOGO_AYNEMO: 2,
  DATA_LOADER: 3,
  TITLE_LOBBY: 4,
  SAVE_SLOTS: 5,
  WORLD_MAP: 6,
  STAGE_LOADER: 7,
  GAMEPLAY: 8
};

// Expanded stage blueprint (Ready for 30-50 stages expansion in future updates)
const STAGES_CONFIG = [
  { id: 1, name: 'OUTPOST SPARK', x: -0.25, y: -0.05, skyDark: ['#1E1035', '#6D28D9'], skyLit: ['#0284C7', '#FDE68A'], pitX: 0, pitW: 0, beaconXRatio: 0.8 },
  { id: 2, name: 'BROKEN RELAY', x: 0.0, y: -0.15, skyDark: ['#310B19', '#9D174D'], skyLit: ['#059669', '#A7F3D0'], pitX: 0.45, pitW: 75, beaconXRatio: 0.85 },
  { id: 3, name: 'SHADOW RIDGE', x: 0.25, y: -0.05, skyDark: ['#090D16', '#1E3A8A'], skyLit: ['#D97706', '#FEF08A'], pitX: 0.48, pitW: 90, beaconXRatio: 0.88 }
];

let savedData = [
  { id: 1, empty: false, zone: 'SILENT WOODLANDS', clearedIds: [] },
  { id: 2, empty: true, zone: '-', clearedIds: [] },
  { id: 3, empty: true, zone: '-', clearedIds: [] }
];

try {
  const raw = localStorage.getItem('horizon_spark_saves_v2');
  if (raw) savedData = JSON.parse(raw);
} catch (e) {}

function saveProgress() {
  try { localStorage.setItem('horizon_spark_saves_v2', JSON.stringify(state.saves)); } catch (e) {}
}

const state = {
  w: 0,
  h: 0,
  scene: SCENES.SPLASH_POSTER,
  timer: 0,
  loadProgress: 0,
  stageLoadProgress: 0,
  selectedSlot: 0,
  selectedNode: 0,
  saves: savedData,
  player: { x: 70, y: 0, vx: 0, vy: 0, onGround: true, beaconLit: false, animFrame: 0 }
};

function resize() {
  // Force 16:9 Landscape virtual scaling for cinematic experience
  const rawW = window.innerWidth;
  const rawH = window.innerHeight;
  // Ensure landscape orientation priority
  state.w = Math.max(rawW, rawH);
  state.h = Math.min(rawW, rawH);
  canvas.width = state.w;
  canvas.height = state.h;
}
window.addEventListener('resize', resize);
resize();

function getActiveSave() { return state.saves[state.selectedSlot]; }
function isStageUnlocked(idx) { return idx === 0 || getActiveSave().clearedIds.includes(STAGES_CONFIG[idx - 1].id); }
function isStageCleared(idx) { return getActiveSave().clearedIds.includes(STAGES_CONFIG[idx].id); }

window.addEventListener('pointerdown', (e) => {
  const x = e.clientX;
  const y = e.clientY;

  if (state.scene === SCENES.SPLASH_POSTER) { state.scene = SCENES.LOGO_ANIZO; state.timer = 0; }
  else if (state.scene === SCENES.LOGO_ANIZO) { state.scene = SCENES.LOGO_AYNEMO; state.timer = 0; }
  else if (state.scene === SCENES.LOGO_AYNEMO) { state.scene = SCENES.DATA_LOADER; state.loadProgress = 0; }
  else if (state.scene === SCENES.TITLE_LOBBY) { state.scene = SCENES.SAVE_SLOTS; }
  else if (state.scene === SCENES.SAVE_SLOTS) {
    const cardW = Math.min(320, state.w * 0.75);
    const cardH = 95;
    const startY = state.h * 0.22;
    for (let i = 0; i < 3; i++) {
      const cy = startY + i * (cardH + 12);
      if (y >= cy && y <= cy + cardH && x >= (state.w - cardW) / 2 && x <= (state.w + cardW) / 2) {
        state.selectedSlot = i;
        if (state.saves[i].empty) {
          state.saves[i].empty = false;
          state.saves[i].zone = 'SILENT WOODLANDS';
          state.saves[i].clearedIds = [];
          saveProgress();
        }
        state.scene = SCENES.WORLD_MAP;
        break;
      }
    }
  } else if (state.scene === SCENES.WORLD_MAP) {
    if (y > state.h * 0.72 && y < state.h * 0.88) {
      if (isStageUnlocked(state.selectedNode)) {
        state.scene = SCENES.STAGE_LOADER;
        state.stageLoadProgress = 0;
      }
    } else {
      const nextNode = (state.selectedNode + 1) % STAGES_CONFIG.length;
      if (isStageUnlocked(nextNode)) state.selectedNode = nextNode;
      else state.selectedNode = 0;
    }
  } else if (state.scene === SCENES.GAMEPLAY) {
    if (x < 100 && y < 65) { state.scene = SCENES.WORLD_MAP; return; }
    if (y < state.h * 0.5 && state.player.onGround) {
      state.player.vy = -11.5;
      state.player.onGround = false;
    } else if (x < state.w * 0.5) {
      state.player.vx = -4.8;
    } else {
      state.player.vx = 4.8;
    }
  }
});

window.addEventListener('pointerup', () => { state.player.vx = 0; });

function drawSilhouetteGround(yLevel, color = '#05070B') {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, state.h);
  ctx.lineTo(0, yLevel);
  ctx.quadraticCurveTo(state.w * 0.3, yLevel - 32, state.w * 0.6, yLevel + 8);
  ctx.quadraticCurveTo(state.w * 0.85, yLevel + 25, state.w, yLevel - 20);
  ctx.lineTo(state.w, state.h);
  ctx.closePath();
  ctx.fill();
}

function render(time) {
  state.timer += 0.016;
  const cx = state.w * 0.5;
  const cy = state.h * 0.5;

  if (state.scene === SCENES.SPLASH_POSTER) {
    const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, state.h * 0.8);
    grad.addColorStop(0, '#F59E0B'); grad.addColorStop(0.45, '#7C2D12'); grad.addColorStop(1, '#05070B');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, state.w, state.h);
    drawSilhouetteGround(state.h * 0.68);
    ctx.fillStyle = '#FFFFFF'; ctx.font = '900 36px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('HORIZON SPARK', cx, cy - 25);
    ctx.fillStyle = '#FDE68A'; ctx.font = '15px system-ui';
    ctx.fillText('شرارة الأفق — Cinematic 16:9 Edition', cx, cy + 12);
    if (state.timer > 2.2) { state.scene = SCENES.LOGO_ANIZO; state.timer = 0; }
  }
  else if (state.scene === SCENES.LOGO_ANIZO) {
    ctx.fillStyle = '#090D16'; ctx.fillRect(0, 0, state.w, state.h);
    ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy - 12, 45, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#FDE68A'; ctx.beginPath(); ctx.arc(cx, cy - 25, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 28px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('ANIZO STUDIO', cx, cy + 35);
    ctx.fillStyle = '#9CA3AF'; ctx.font = '12px system-ui';
    ctx.fillText('OFFICIAL PUBLISHER', cx, cy + 58);
    if (state.timer > 2.2) { state.scene = SCENES.LOGO_AYNEMO; state.timer = 0; }
  }
  else if (state.scene === SCENES.LOGO_AYNEMO) {
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, state.w, state.h);
    ctx.fillStyle = '#05070B'; ctx.beginPath(); ctx.arc(cx, cy - 35, 38, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(cx, cy - 58); ctx.lineTo(cx - 15, cy - 20); ctx.lineTo(cx + 15, cy - 20); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#05070B'; ctx.font = '900 30px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('AYNEMO GAME', cx, cy + 40);
    if (state.timer > 2.2) { state.scene = SCENES.DATA_LOADER; state.loadProgress = 0; }
  }
  else if (state.scene === SCENES.DATA_LOADER) {
    ctx.fillStyle = '#0B101B'; ctx.fillRect(0, 0, state.w, state.h);
    state.loadProgress = Math.min(100, state.loadProgress + 1.2);
    const barW = state.w * 0.65; const barX = (state.w - barW) * 0.5; const barY = state.h * 0.8;
    ctx.fillStyle = '#9CA3AF'; ctx.font = '13px system-ui'; ctx.textAlign = 'left';
    ctx.fillText('Loading Cinematic 16:9 Assets & Stage Nodes...', barX, barY - 12);
    ctx.textAlign = 'right'; ctx.fillStyle = '#F59E0B'; ctx.fillText(state.loadProgress.toFixed(1) + '%', barX + barW, barY - 12);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(barX, barY, barW, 5);
    ctx.fillStyle = '#F59E0B'; ctx.fillRect(barX, barY, (barW * state.loadProgress) / 100, 5);
    if (state.loadProgress >= 100) state.scene = SCENES.TITLE_LOBBY;
  }
  else if (state.scene === SCENES.TITLE_LOBBY) {
    const sky = ctx.createLinearGradient(0, 0, 0, state.h);
    sky.addColorStop(0, '#090D16'); sky.addColorStop(0.6, '#1E1B4B'); sky.addColorStop(1, '#F59E0B');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, state.w, state.h);
    drawSilhouetteGround(state.h * 0.72);
    ctx.fillStyle = '#FFFFFF'; ctx.font = '900 40px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('HORIZON SPARK', cx, state.h * 0.3);
    ctx.fillStyle = '#FDE68A'; ctx.font = '14px system-ui';
    ctx.fillText('ANIZO STUDIO  •  AYNEMO GAME', cx, state.h * 0.38);
    const alpha = 0.5 + Math.sin(time * 0.005) * 0.4;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`; ctx.font = 'bold 16px system-ui';
    ctx.fillText('— TAP ANYWHERE TO START —', cx, state.h * 0.82);
  }
  else if (state.scene === SCENES.SAVE_SLOTS) {
    const bg = ctx.createLinearGradient(0, 0, 0, state.h);
    bg.addColorStop(0, '#FEF3C7'); bg.addColorStop(1, '#FDE68A');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, state.w, state.h);
    drawSilhouetteGround(state.h * 0.88);
    ctx.fillStyle = '#05070B'; ctx.font = '900 24px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('SELECT SAVE PROFILE', cx, state.h * 0.14);

    const cardW = Math.min(340, state.w * 0.78);
    const cardH = 88;
    const startY = state.h * 0.22;
    state.saves.forEach((slot, idx) => {
      const x = (state.w - cardW) * 0.5;
      const y = startY + idx * (cardH + 12);
      const done = slot.clearedIds ? slot.clearedIds.length : 0;
      const pct = ((done / STAGES_CONFIG.length) * 100).toFixed(0) + '%';

      ctx.fillStyle = slot.empty ? '#FFFFFF' : '#05070B';
      ctx.fillRect(x, y, cardW, cardH);
      ctx.strokeStyle = '#05070B'; ctx.lineWidth = 3; ctx.strokeRect(x, y, cardW, cardH);

      if (slot.empty) {
        ctx.fillStyle = '#05070B'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(`SAVE SLOT ${slot.id} — EMPTY (TAP TO START)`, cx, y + 50);
      } else {
        ctx.fillStyle = '#F59E0B'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'left';
        ctx.fillText(`SAVE SLOT ${slot.id}`, x + 20, y + 32);
        ctx.fillStyle = '#FFFFFF'; ctx.font = '13px system-ui';
        ctx.fillText(`ZONE: ${slot.zone}  |  STAGES: ${done}/${STAGES_CONFIG.length} (${pct})`, x + 20, y + 62);
      }
    });
  }
  else if (state.scene === SCENES.WORLD_MAP) {
    const spaceGrad = ctx.createLinearGradient(0, 0, 0, state.h);
    spaceGrad.addColorStop(0, '#090D16'); spaceGrad.addColorStop(1, '#1E293B');
    ctx.fillStyle = spaceGrad; ctx.fillRect(0, 0, state.w, state.h);

    ctx.fillStyle = '#9CA3AF'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('CHAPTER 1 — SILENT WOODLANDS', cx, 36);
    ctx.fillStyle = '#FFFFFF'; ctx.font = '900 24px system-ui';
    ctx.fillText('WORLD STAGE SELECTOR', cx, 62);

    const planetRadius = state.w * 0.7;
    const planetCenterY = state.h * 0.6 + planetRadius;
    ctx.fillStyle = '#1D4ED8'; ctx.beginPath(); ctx.arc(cx, planetCenterY, planetRadius, 0, Math.PI * 2); ctx.fill();

    // Map Nodes
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2;
    ctx.beginPath();
    STAGES_CONFIG.forEach((n, i) => {
      const nx = cx + n.x * state.w; const ny = state.h * 0.5 + n.y * state.h;
      if (i === 0) ctx.moveTo(nx, ny); else ctx.lineTo(nx, ny);
    });
    ctx.stroke(); ctx.setLineDash([]);

    STAGES_CONFIG.forEach((n, i) => {
      const nx = cx + n.x * state.w; const ny = state.h * 0.5 + n.y * state.h;
      const cleared = isStageCleared(i); const unlocked = isStageUnlocked(i);
      ctx.fillStyle = cleared ? '#10B981' : (unlocked ? '#F59E0B' : '#475569');
      ctx.beginPath(); ctx.arc(nx, ny, i === state.selectedNode ? 18 : 13, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(`0${n.id}`, nx, ny + 4);
    });

    const activeStage = STAGES_CONFIG[state.selectedNode];
    const btnW = Math.min(320, state.w * 0.75); const btnX = (state.w - btnW) * 0.5; const btnY = state.h * 0.74;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)'; ctx.fillRect(btnX, btnY, btnW, 64);
    ctx.strokeStyle = '#F59E0B'; ctx.strokeRect(btnX, btnY, btnW, 64);

    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(`STAGE 0${activeStage.id}: ${activeStage.name}`, cx, btnY + 25);
    ctx.fillStyle = '#FDE68A'; ctx.font = 'bold 13px system-ui';
    ctx.fillText('TAP HERE TO LAUNCH STAGE ->', cx, btnY + 48);
  }
  else if (state.scene === SCENES.STAGE_LOADER) {
    state.stageLoadProgress = Math.min(100, state.stageLoadProgress + 2.5);
    const activeStage = STAGES_CONFIG[state.selectedNode];
    ctx.fillStyle = '#090D16'; ctx.fillRect(0, 0, state.w, state.h);
    drawSilhouetteGround(state.h * 0.74);
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 28px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(`STAGE 0${activeStage.id}: ${activeStage.name}`, 36, 55);

    const barY = state.h - 50;
    ctx.fillStyle = '#F59E0B'; ctx.fillRect(36, barY, ((state.w - 72) * state.stageLoadProgress) / 100, 5);
    if (state.stageLoadProgress >= 100) {
      state.player.x = 80; state.player.y = state.h * 0.72; state.player.vy = 0; state.player.onGround = true;
      state.player.beaconLit = isStageCleared(state.selectedNode);
      state.scene = SCENES.GAMEPLAY;
    }
  }
  else if (state.scene === SCENES.GAMEPLAY) {
    const stage = STAGES_CONFIG[state.selectedNode];
    const groundY = state.h * 0.72;
    const pitStart = stage.pitX ? stage.pitX * state.w : -100;
    const pitEnd = pitStart + stage.pitW;

    state.player.x = Math.max(30, Math.min(state.w - 30, state.player.x + state.player.vx));
    state.player.y += state.player.vy;
    const overPit = stage.pitW > 0 && state.player.x > pitStart && state.player.x < pitEnd;

    if (!overPit && state.player.y >= groundY) {
      state.player.y = groundY; state.player.vy = 0; state.player.onGround = true;
    } else {
      state.player.vy += 0.55; state.player.onGround = false;
    }

    if (state.player.y > state.h + 40) { state.player.x = 80; state.player.y = groundY; state.player.vy = 0; }

    const beaconX = state.w * stage.beaconXRatio;
    if (Math.abs(state.player.x - beaconX) < 35 && Math.abs(state.player.y - groundY) < 40) {
      if (!state.player.beaconLit) {
        state.player.beaconLit = true;
        const save = getActiveSave();
        if (!save.clearedIds.includes(stage.id)) { save.clearedIds.push(stage.id); saveProgress(); }
        if (state.selectedNode + 1 < STAGES_CONFIG.length) state.selectedNode += 1;
      }
    }

    const sky = ctx.createLinearGradient(0, 0, 0, state.h);
    const colors = state.player.beaconLit ? stage.skyLit : stage.skyDark;
    sky.addColorStop(0, colors[0]); sky.addColorStop(1, colors[1]);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, state.w, state.h);

    // Beacon tower
    ctx.fillStyle = '#05070B'; ctx.fillRect(beaconX - 12, groundY - 90, 24, 94);
    if (state.player.beaconLit) {
      const glow = ctx.createRadialGradient(beaconX, groundY - 90, 4, beaconX, groundY - 90, 140);
      glow.addColorStop(0, '#FFFFFF'); glow.addColorStop(0.35, 'rgba(245, 158, 11, 0.85)'); glow.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(beaconX, groundY - 90, 140, 0, Math.PI * 2); ctx.fill();
    }

    // Terrain
    ctx.fillStyle = '#05070B';
    if (stage.pitW > 0) {
      ctx.fillRect(0, groundY, pitStart, state.h - groundY);
      ctx.fillRect(pitEnd, groundY, state.w - pitEnd, state.h - groundY);
    } else {
      ctx.fillRect(0, groundY, state.w, state.h - groundY);
    }

    // UPGRADED CHARACTER SILHOUETTE (Instead of a simple square!)
    const px = state.player.x; const py = state.player.y;
    ctx.fillStyle = '#05070B';
    ctx.fillRect(px - 12, py - 28, 24, 28); // Body
    ctx.beginPath(); ctx.arc(px, py - 34, 9, 0, Math.PI * 2); ctx.fill(); // Head
    // Glowing Core Spark on Character Chest
    ctx.fillStyle = '#F59E0B'; ctx.beginPath(); ctx.arc(px, py - 16, 5, 0, Math.PI * 2); ctx.fill();

    // UI Back Button
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(20, 16, 85, 36);
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('< WORLD', 62, 39);

    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 14px system-ui';
    ctx.fillText(
      state.player.beaconLit ? `STAGE 0${stage.id} CLEARED! TAP < WORLD` : `STAGE 0${stage.id}: ${stage.name} (TAP TOP TO JUMP)`,
      cx, state.h - 22
    );
  }

  requestAnimationFrame(render);
}

requestAnimationFrame(render);
