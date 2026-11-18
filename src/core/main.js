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

// 3 Official Stages for Release v1.0
const STAGES_CONFIG = [
  {
    id: 1,
    name: 'OUTPOST SPARK',
    x: -0.22,
    y: -0.05,
    skyDark: ['#1E1035', '#6D28D9'],
    skyLit: ['#0284C7', '#FDE68A'],
    pitX: 0,
    pitW: 0,
    beaconXRatio: 0.78
  },
  {
    id: 2,
    name: 'BROKEN RELAY',
    x: 0.0,
    y: -0.14,
    skyDark: ['#310B19', '#9D174D'],
    skyLit: ['#059669', '#A7F3D0'],
    pitX: 0.42,
    pitW: 70,
    beaconXRatio: 0.82
  },
  {
    id: 3,
    name: 'SHADOW RIDGE',
    x: 0.22,
    y: -0.05,
    skyDark: ['#090D16', '#1E3A8A'],
    skyLit: ['#D97706', '#FEF08A'],
    pitX: 0.50,
    pitW: 85,
    beaconXRatio: 0.85
  }
];

const defaultSaves = [
  { id: 1, empty: false, zone: 'SILENT WOODLANDS', clearedIds: [] },
  { id: 2, empty: true, zone: '-', clearedIds: [] },
  { id: 3, empty: true, zone: '-', clearedIds: [] }
];

let savedData = defaultSaves;
try {
  const raw = localStorage.getItem('horizon_spark_saves_v1');
  if (raw) savedData = JSON.parse(raw);
} catch (e) {}

function saveProgress() {
  try {
    localStorage.setItem('horizon_spark_saves_v1', JSON.stringify(state.saves));
  } catch (e) {}
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
  player: { x: 70, y: 0, vx: 0, vy: 0, onGround: true, beaconLit: false }
};

function resize() {
  state.w = window.innerWidth;
  state.h = window.innerHeight;
  canvas.width = state.w;
  canvas.height = state.h;
}
window.addEventListener('resize', resize);
resize();

function getActiveSave() {
  return state.saves[state.selectedSlot];
}

function isStageUnlocked(index) {
  if (index === 0) return true;
  const save = getActiveSave();
  return save.clearedIds.includes(STAGES_CONFIG[index - 1].id);
}

function isStageCleared(index) {
  const save = getActiveSave();
  return save.clearedIds.includes(STAGES_CONFIG[index].id);
}

window.addEventListener('pointerdown', (e) => {
  const x = e.clientX;
  const y = e.clientY;

  if (state.scene === SCENES.SPLASH_POSTER) {
    state.scene = SCENES.LOGO_ANIZO;
    state.timer = 0;
  } else if (state.scene === SCENES.LOGO_ANIZO) {
    state.scene = SCENES.LOGO_AYNEMO;
    state.timer = 0;
  } else if (state.scene === SCENES.LOGO_AYNEMO) {
    state.scene = SCENES.DATA_LOADER;
    state.loadProgress = 0;
  } else if (state.scene === SCENES.TITLE_LOBBY) {
    state.scene = SCENES.SAVE_SLOTS;
  } else if (state.scene === SCENES.SAVE_SLOTS) {
    const cardW = Math.min(280, state.w * 0.82);
    const cardH = 112;
    const startY = state.h * 0.20;
    for (let i = 0; i < 3; i++) {
      const cy = startY + i * (cardH + 16);
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
    // Launch stage button
    if (y > state.h * 0.72 && y < state.h * 0.86) {
      if (isStageUnlocked(state.selectedNode)) {
        state.scene = SCENES.STAGE_LOADER;
        state.stageLoadProgress = 0;
      }
    } else {
      // Cycle through unlocked stages on planet map
      const nextNode = (state.selectedNode + 1) % STAGES_CONFIG.length;
      if (isStageUnlocked(nextNode)) {
        state.selectedNode = nextNode;
      } else {
        state.selectedNode = 0;
      }
    }
  } else if (state.scene === SCENES.GAMEPLAY) {
    // Top-left Back to Map button
    if (x < 95 && y < 60) {
      state.scene = SCENES.WORLD_MAP;
      return;
    }
    // Upper screen tap = Jump, Left/Right lower screen = Move
    if (y < state.h * 0.55 && state.player.onGround) {
      state.player.vy = -10.5;
      state.player.onGround = false;
    } else if (x < state.w * 0.5) {
      state.player.vx = -4.2;
    } else {
      state.player.vx = 4.2;
    }
  }
});

window.addEventListener('pointerup', () => {
  state.player.vx = 0;
});

function drawSilhouetteGround(yLevel, color = '#05070B') {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, state.h);
  ctx.lineTo(0, yLevel);
  ctx.quadraticCurveTo(state.w * 0.25, yLevel - 28, state.w * 0.55, yLevel + 6);
  ctx.quadraticCurveTo(state.w * 0.8, yLevel + 22, state.w, yLevel - 18);
  ctx.lineTo(state.w, state.h);
  ctx.closePath();
  ctx.fill();
}

function render(time) {
  state.timer += 0.016;
  const cx = state.w * 0.5;
  const cy = state.h * 0.5;

  // SCENE 0: SPLASH POSTER
  if (state.scene === SCENES.SPLASH_POSTER) {
    const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, state.h * 0.7);
    grad.addColorStop(0, '#F59E0B');
    grad.addColorStop(0.45, '#7C2D12');
    grad.addColorStop(1, '#05070B');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, state.w, state.h);

    drawSilhouetteGround(state.h * 0.68);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 32px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('HORIZON SPARK', cx, cy - 20);
    ctx.fillStyle = '#FDE68A';
    ctx.font = '14px system-ui';
    ctx.fillText('شرارة الأفق — v1.0', cx, cy + 12);

    if (state.timer > 2.2) {
      state.scene = SCENES.LOGO_ANIZO;
      state.timer = 0;
    }
  }

  // SCENE 1: ANIZO STUDIO LOGO
  else if (state.scene === SCENES.LOGO_ANIZO) {
    ctx.fillStyle = '#090D16';
    ctx.fillRect(0, 0, state.w, state.h);

    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy - 10, 42, Math.PI, 0);
    ctx.stroke();

    ctx.fillStyle = '#FDE68A';
    ctx.beginPath();
    ctx.arc(cx, cy - 22, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 26px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('ANIZO STUDIO', cx, cy + 35);
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '12px system-ui';
    ctx.fillText('OFFICIAL PUBLISHER', cx, cy + 56);

    if (state.timer > 2.2) {
      state.scene = SCENES.LOGO_AYNEMO;
      state.timer = 0;
    }
  }

  // SCENE 2: AYNEMO GAME LOGO
  else if (state.scene === SCENES.LOGO_AYNEMO) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, state.w, state.h);

    ctx.fillStyle = '#05070B';
    ctx.beginPath();
    ctx.arc(cx, cy - 35, 36, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 55);
    ctx.lineTo(cx - 14, cy - 20);
    ctx.lineTo(cx + 14, cy - 20);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#05070B';
    ctx.font = '900 28px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('AYNEMO', cx, cy + 28);
    ctx.font = '900 34px system-ui';
    ctx.fillText('GAME', cx, cy + 62);

    if (state.timer > 2.2) {
      state.scene = SCENES.DATA_LOADER;
      state.loadProgress = 0;
    }
  }

  // SCENE 3: DATA & ASSET LOADER
  else if (state.scene === SCENES.DATA_LOADER) {
    ctx.fillStyle = '#0B101B';
    ctx.fillRect(0, 0, state.w, state.h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy - 30, 95, 0, Math.PI * 2);
    ctx.stroke();

    state.loadProgress = Math.min(100, state.loadProgress + 0.9);
    const barW = state.w * 0.76;
    const barX = (state.w - barW) * 0.5;
    const barY = state.h * 0.82;

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('Loading v1.0 World Stages (3 Chapters)...', barX, barY - 10);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#F59E0B';
    ctx.fillText(state.loadProgress.toFixed(1) + '%', barX + barW, barY - 10);

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(barX, barY, barW, 4);
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(barX, barY, (barW * state.loadProgress) / 100, 4);

    if (state.loadProgress >= 100) {
      state.scene = SCENES.TITLE_LOBBY;
    }
  }

  // SCENE 4: TITLE LOBBY
  else if (state.scene === SCENES.TITLE_LOBBY) {
    const sky = ctx.createLinearGradient(0, 0, 0, state.h);
    sky.addColorStop(0, '#090D16');
    sky.addColorStop(0.6, '#1E1B4B');
    sky.addColorStop(1, '#F59E0B');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, state.w, state.h);

    drawSilhouetteGround(state.h * 0.72);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 36px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('HORIZON SPARK', cx, state.h * 0.28);

    ctx.fillStyle = '#FDE68A';
    ctx.font = '13px system-ui';
    ctx.fillText('ANIZO STUDIO  •  AYNEMO GAME', cx, state.h * 0.34);

    const alpha = 0.5 + Math.sin(time * 0.005) * 0.4;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.font = 'bold 15px system-ui';
    ctx.fillText('— TAP ANYWHERE TO START —', cx, state.h * 0.86);
  }

  // SCENE 5: SAVE SLOTS (3 Stages Tracking)
  else if (state.scene === SCENES.SAVE_SLOTS) {
    const bg = ctx.createLinearGradient(0, 0, 0, state.h);
    bg.addColorStop(0, '#FEF3C7');
    bg.addColorStop(1, '#FDE68A');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, state.w, state.h);

    drawSilhouetteGround(state.h * 0.85);

    ctx.fillStyle = '#05070B';
    ctx.font = '900 22px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('SELECT SAVE PROFILE', cx, state.h * 0.13);

    const cardW = Math.min(280, state.w * 0.82);
    const cardH = 112;
    const startY = state.h * 0.20;

    state.saves.forEach((slot, idx) => {
      const x = (state.w - cardW) * 0.5;
      const y = startY + idx * (cardH + 16);
      const done = slot.clearedIds ? slot.clearedIds.length : 0;
      const pct = ((done / 3) * 100).toFixed(1) + '%';

      ctx.fillStyle = slot.empty ? '#FFFFFF' : '#05070B';
      ctx.fillRect(x, y, cardW, cardH);
      ctx.strokeStyle = '#05070B';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, cardW, cardH);

      if (slot.empty) {
        ctx.fillStyle = '#05070B';
        ctx.font = 'bold 16px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(`SAVE - ${slot.id}`, cx, y + 48);
        ctx.font = '12px system-ui';
        ctx.fillText('- EMPTY (TAP TO START) -', cx, y + 70);
      } else {
        ctx.fillStyle = '#F59E0B';
        ctx.font = 'bold 14px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(`SAVE - ${slot.id}`, cx, y + 26);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '13px system-ui';
        ctx.textAlign = 'left';
        ctx.fillText(`ZONE: ${slot.zone}`, x + 16, y + 54);
        ctx.fillText(`STAGES: ${done} / 3`, x + 16, y + 76);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#FDE68A';
        ctx.fillText(`COMPLETION: ${pct}`, x + cardW - 16, y + 96);
      }
    });
  }

  // SCENE 6: WORLD MAP (3 Connected Stage Nodes)
  else if (state.scene === SCENES.WORLD_MAP) {
    const spaceGrad = ctx.createLinearGradient(0, 0, 0, state.h);
    spaceGrad.addColorStop(0, '#090D16');
    spaceGrad.addColorStop(1, '#1E293B');
    ctx.fillStyle = spaceGrad;
    ctx.fillRect(0, 0, state.w, state.h);

    ctx.fillStyle = '#9CA3AF';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('RELEASE v1.0 — CHAPTER 1', cx, 38);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 26px system-ui';
    ctx.fillText('SILENT WOODLANDS', cx, 66);
    ctx.fillStyle = '#F59E0B';
    ctx.font = '12px system-ui';
    ctx.fillText('TAP PLANET TO SWITCH STAGE  •  3 STAGES', cx, 86);

    const planetRadius = state.w * 0.85;
    const planetCenterY = state.h * 0.56 + planetRadius;
    ctx.fillStyle = '#1D4ED8';
    ctx.beginPath();
    ctx.arc(cx, planetCenterY, planetRadius, 0, Math.PI * 2);
    ctx.fill();

    // Dotted Line Connecting the 3 Stages
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    STAGES_CONFIG.forEach((n, i) => {
      const nx = cx + n.x * state.w;
      const ny = state.h * 0.52 + n.y * state.h;
      if (i === 0) ctx.moveTo(nx, ny);
      else ctx.lineTo(nx, ny);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    STAGES_CONFIG.forEach((n, i) => {
      const nx = cx + n.x * state.w;
      const ny = state.h * 0.52 + n.y * state.h;
      const cleared = isStageCleared(i);
      const unlocked = isStageUnlocked(i);

      ctx.fillStyle = cleared ? '#10B981' : (unlocked ? '#F59E0B' : '#475569');
      ctx.beginPath();
      ctx.arc(nx, ny, i === state.selectedNode ? 17 : 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px system-ui';
      ctx.fillText(`0${n.id}`, nx, ny + 4);
    });

    const activeStage = STAGES_CONFIG[state.selectedNode];
    const btnW = Math.min(290, state.w * 0.82);
    const btnX = (state.w - btnW) * 0.5;
    const btnY = state.h * 0.74;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fillRect(btnX, btnY, btnW, 68);
    ctx.strokeStyle = '#F59E0B';
    ctx.strokeRect(btnX, btnY, btnW, 68);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 15px system-ui';
    ctx.fillText(`STAGE 0${activeStage.id}: ${activeStage.name}`, cx, btnY + 26);
    ctx.fillStyle = '#FDE68A';
    ctx.font = 'bold 13px system-ui';
    ctx.fillText('TAP HERE TO ENTER STAGE ->', cx, btnY + 50);

    const save = getActiveSave();
    const done = save.clearedIds.length;
    const pct = ((done / 3) * 100).toFixed(1);
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, state.h - 38, state.w, 38);
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '11px system-ui';
    ctx.fillText(`COMPLETION: ${pct}%   |   STAGES: ${done} / 3   |   NEXT UPDATE: STAGE 4`, cx, state.h - 15);
  }

  // SCENE 7: STAGE LOADER
  else if (state.scene === SCENES.STAGE_LOADER) {
    state.stageLoadProgress = Math.min(100, state.stageLoadProgress + 2.0);
    const activeStage = STAGES_CONFIG[state.selectedNode];

    ctx.fillStyle = '#090D16';
    ctx.fillRect(0, 0, state.w, state.h);
    drawSilhouetteGround(state.h * 0.74);

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`STAGE 0${activeStage.id} OF 03`, 24, 42);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 26px system-ui';
    ctx.fillText(activeStage.name, 24, 72);

    const barY = state.h - 55;
    ctx.fillStyle = '#FDE68A';
    ctx.font = 'bold 13px system-ui';
    ctx.fillText('◆ Controls Tip', 24, barY - 22);
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '12px system-ui';
    ctx.fillText('Hold Left/Right lower screen to move. Tap upper screen to Jump.', 24, barY - 6);

    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(24, barY, ((state.w - 48) * state.stageLoadProgress) / 100, 4);

    if (state.stageLoadProgress >= 100) {
      const groundY = state.h * 0.72;
      state.player.x = 60;
      state.player.y = groundY;
      state.player.vy = 0;
      state.player.onGround = true;
      state.player.beaconLit = isStageCleared(state.selectedNode);
      state.scene = SCENES.GAMEPLAY;
    }
  }

  // SCENE 8: 2D SILHOUETTE GAMEPLAY (3 Distinct Stages + Jump Physics)
  else if (state.scene === SCENES.GAMEPLAY) {
    const stage = STAGES_CONFIG[state.selectedNode];
    const groundY = state.h * 0.72;
    const pitStart = stage.pitX ? stage.pitX * state.w : -100;
    const pitEnd = pitStart + stage.pitW;

    // Horizontal Movement & Gravity
    state.player.x = Math.max(24, Math.min(state.w - 24, state.player.x + state.player.vx));
    state.player.y += state.player.vy;

    const overPit = stage.pitW > 0 && state.player.x > pitStart && state.player.x < pitEnd;

    if (!overPit && state.player.y >= groundY) {
      state.player.y = groundY;
      state.player.vy = 0;
      state.player.onGround = true;
    } else {
      state.player.vy += 0.52;
      state.player.onGround = false;
    }

    // Respawn if fallen into pit
    if (state.player.y > state.h + 40) {
      state.player.x = 60;
      state.player.y = groundY;
      state.player.vy = 0;
    }

    // Check Beacon Activation
    const beaconX = state.w * stage.beaconXRatio;
    if (Math.abs(state.player.x - beaconX) < 34 && Math.abs(state.player.y - groundY) < 40) {
      if (!state.player.beaconLit) {
        state.player.beaconLit = true;
        const save = getActiveSave();
        if (!save.clearedIds.includes(stage.id)) {
          save.clearedIds.push(stage.id);
          saveProgress();
        }
        // Automatically unlock & focus next stage if available
        if (state.selectedNode + 1 < STAGES_CONFIG.length) {
          state.selectedNode += 1;
        }
      }
    }

    // Sky Rendering
    const sky = ctx.createLinearGradient(0, 0, 0, state.h);
    const colors = state.player.beaconLit ? stage.skyLit : stage.skyDark;
    sky.addColorStop(0, colors[0]);
    sky.addColorStop(1, colors[1]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, state.w, state.h);

    // Beacon Tower Silhouette
    ctx.fillStyle = '#05070B';
    ctx.fillRect(beaconX - 12, groundY - 88, 24, 92);

    if (state.player.beaconLit) {
      const glow = ctx.createRadialGradient(beaconX, groundY - 88, 4, beaconX, groundY - 88, 135);
      glow.addColorStop(0, '#FFFFFF');
      glow.addColorStop(0.35, 'rgba(245, 158, 11, 0.85)');
      glow.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(beaconX, groundY - 88, 135, 0, Math.PI * 2);
      ctx.fill();
    }

    // Foreground Terrain with Shadow Pit
    ctx.fillStyle = '#05070B';
    if (stage.pitW > 0) {
      ctx.fillRect(0, groundY, pitStart, state.h - groundY);
      ctx.fillRect(pitEnd, groundY, state.w - pitEnd, state.h - groundY);
    } else {
      ctx.fillRect(0, groundY, state.w, state.h - groundY);
    }

    // Player Silhouette & Inner Spark
    ctx.fillStyle = '#05070B';
    ctx.fillRect(state.player.x - 13, state.player.y - 26, 26, 26);
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.arc(state.player.x, state.player.y - 13, 6, 0, Math.PI * 2);
    ctx.fill();

    // Top-left Map Button
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(16, 16, 78, 34);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('< WORLD', 55, 37);

    // Stage Banner
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 13px system-ui';
    ctx.fillText(
      state.player.beaconLit
        ? `STAGE 0${stage.id} CLEARED! TAP < WORLD FOR NEXT STAGE`
        : `STAGE 0${stage.id}: ${stage.name} (TAP TOP TO JUMP)`,
      cx,
      state.h - 24
    );
  }

  requestAnimationFrame(render);
}

requestAnimationFrame(render);
