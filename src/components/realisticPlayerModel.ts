import * as THREE from 'three';
import { SlotDefinition } from '../lib/tacticalFormations';

export interface PlayerFigureOptions {
  slot: SlotDefinition;
  assignedPlayer?: {
    userId: string;
    name: string;
    avatarUrl?: string;
    avatar?: string;
    rating?: number;
    jerseyNumber?: number;
  } | null;
  isGreen: boolean;
  isSelected: boolean;
  isCurrentUser: boolean;
  isHovered: boolean;
  language: 'ar' | 'en' | 'fr';
}

// Generate high-resolution jersey texture with team crest and squad number
function createJerseyCanvasTexture(
  teamColor: string,
  accentColor: string,
  number: number,
  isGK: boolean,
  playerName?: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Base jersey color
  ctx.fillStyle = teamColor;
  ctx.fillRect(0, 0, 512, 512);

  // Modern athletic gradient & fabric weave pattern
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
  grad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Shoulder and collar trim accents
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 0, 512, 40); // Collar band
  ctx.fillRect(0, 470, 512, 42); // Bottom hem

  if (isGK) {
    // Goalkeeper modern geometric honeycomb / chevron pattern
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.lineWidth = 10;
    for (let y = 60; y < 460; y += 70) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y + 35);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
  } else {
    // Subtle athletic vertical pinstripes
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let x = 60; x < 512; x += 80) {
      ctx.fillRect(x, 40, 16, 430);
    }
  }

  // Club Crest on left chest
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(140, 130, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = teamColor;
  ctx.beginPath();
  ctx.arc(140, 130, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PM', 140, 130);

  // Moroccan / Botola sponsor watermark in center
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PITCHMATE', 256, 210);

  // Large Squad Number on Back/Front
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 10;
  ctx.font = '900 160px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(number), 256, 340);
  ctx.shadowBlur = 0;

  // Player name if available
  if (playerName) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(playerName.toUpperCase().substring(0, 12), 256, 90);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Generate realistic 3D Soccer Ball texture (Classic Hexagons & Pentagons)
export function createSoccerBallTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Pure leather white base with subtle grain
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 1024, 512);

  // Repeating Telstar Moroccan Botola black pentagon patches
  const drawPentagon = (cx: number, cy: number, r: number) => {
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Golden metallic accent star in center
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
  };

  const patchRadius = 46;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const offset = (row % 2) * 64;
      drawPentagon(col * 130 + offset + 30, row * 105 + 50, patchRadius);
    }
  }

  // Seam stitching lines between panels
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2.5;
  for (let x = 0; x < 1024; x += 65) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Create a realistic 3D Soccer Ball mesh
export function create3DSoccerBall(): THREE.Group {
  const ballGroup = new THREE.Group();
  ballGroup.name = 'soccer_ball';

  // Ground drop shadow
  const shadowGeo = new THREE.PlaneGeometry(1.6, 1.6);
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sCtx = shadowCanvas.getContext('2d');
  if (sCtx) {
    const radGrad = sCtx.createRadialGradient(64, 64, 6, 64, 64, 60);
    radGrad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
    radGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
    radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = radGrad;
    sCtx.fillRect(0, 0, 128, 128);
  }
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.02;
  ballGroup.add(shadowMesh);

  // 3D Sphere with leather physics material
  const ballRadius = 0.55;
  const ballGeo = new THREE.SphereGeometry(ballRadius, 32, 32);
  const ballMat = new THREE.MeshStandardMaterial({
    map: createSoccerBallTexture(),
    roughness: 0.38,
    metalness: 0.05,
  });
  const ballMesh = new THREE.Mesh(ballGeo, ballMat);
  ballMesh.position.y = ballRadius;
  ballMesh.castShadow = true;
  ballGroup.add(ballMesh);

  return ballGroup;
}

/**
 * Creates an authentic 3D Footballer Model with human anatomy, team kit,
 * goalkeeper gear, dynamic tactical postures, and floating identification plaque.
 */
export function create3DPlayerFigure(options: PlayerFigureOptions): {
  playerRoot: THREE.Group;
  hitMesh: THREE.Mesh;
} {
  const { slot, assignedPlayer, isGreen, isSelected, isCurrentUser, isHovered, language } = options;
  const isOccupied = !!assignedPlayer;
  const roleCode = (slot.position || slot.label || '').toUpperCase();
  const isGK = roleCode.includes('GK') || slot.label.includes('GK');
  const isDefender = ['CB', 'LB', 'RB', 'LWB', 'RWB', 'SW'].some((p) => roleCode.includes(p));
  const isForward = ['ST', 'CF', 'LW', 'RW', 'FW'].some((p) => roleCode.includes(p));

  const playerRoot = new THREE.Group();
  playerRoot.name = slot.key;
  (playerRoot as any).slotData = slot;

  // Determine Orientations: North team faces South (rot = 0), South team faces North (rot = Math.PI)
  const isSouthTeam = isGreen;
  const facingRotation = isSouthTeam ? Math.PI : 0;

  // Colors & Kits
  // Team Green: Deep Forest & Emerald Kit
  // Team Blue: Royal Sapphire Blue Kit
  // Goalkeeper: Vivid Neon Lime / Sun Yellow Kit
  let jerseyBaseColor = isGreen ? '#047857' : '#1d4ed8';
  let jerseyAccentColor = isGreen ? '#f59e0b' : '#ffffff';
  let shortsColor = isGreen ? '#ffffff' : '#0f172a';
  let socksColor = isGreen ? '#059669' : '#2563eb';

  if (isGK) {
    jerseyBaseColor = '#84cc16'; // Vivid Neon Keeper Lime
    jerseyAccentColor = '#0f172a';
    shortsColor = '#1e293b';
    socksColor = '#eab308'; // High-vis gold socks
  }

  // Derive Squad Number
  const defaultNumber = isGK
    ? 1
    : isDefender
    ? 4
    : isForward
    ? 9
    : 8;
  const jerseyNumber = assignedPlayer?.jerseyNumber || defaultNumber;

  // 1. Interactive Base Hit Cylinder (Ensures 100% accurate clicks from all angles)
  const hitGeo = new THREE.CylinderGeometry(1.65, 1.65, 5.2, 16);
  const hitMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const hitMesh = new THREE.Mesh(hitGeo, hitMat);
  hitMesh.position.y = 2.6;
  hitMesh.name = `hit_${slot.key}`;
  playerRoot.add(hitMesh);

  // 2. Soft Ground Ambient Occlusion Shadow
  const shadowGeo = new THREE.PlaneGeometry(3.6, 3.6);
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sCtx = shadowCanvas.getContext('2d');
  if (sCtx) {
    const radGrad = sCtx.createRadialGradient(64, 64, 8, 64, 64, 60);
    radGrad.addColorStop(0, 'rgba(5, 20, 10, 0.7)');
    radGrad.addColorStop(0.45, 'rgba(5, 20, 10, 0.35)');
    radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = radGrad;
    sCtx.fillRect(0, 0, 128, 128);
  }
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: isSelected ? 0.9 : 0.65,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.02;
  playerRoot.add(shadowMesh);

  // 3. Tactical Positioning Target Ring on Turf
  const ringRadius = 1.6;
  const ringColor = isSelected
    ? 0xf59e0b
    : isCurrentUser
    ? 0xeab308
    : isOccupied
    ? isGreen
      ? 0x10b981
      : 0x3b82f6
    : isHovered
    ? 0xfacc15
    : 0x64748b;

  const ringGeo = new THREE.RingGeometry(ringRadius * 0.85, ringRadius, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: ringColor,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: isSelected ? 0.95 : isOccupied ? 0.75 : 0.5,
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.y = 0.04;
  playerRoot.add(ringMesh);

  // If slot is vacant (Open position waiting for user to claim), add pulsating dashed helper ring
  if (!isOccupied) {
    const beaconGeo = new THREE.RingGeometry(ringRadius * 1.05, ringRadius * 1.18, 32);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    beaconMesh.rotation.x = -Math.PI / 2;
    beaconMesh.position.y = 0.05;
    playerRoot.add(beaconMesh);
  }

  // 4. 3D Body Hierarchy
  const bodyGroup = new THREE.Group();
  bodyGroup.rotation.y = facingRotation;
  playerRoot.add(bodyGroup);

  // Elevation if selected
  if (isSelected) {
    bodyGroup.position.y = 0.35;
  }

  // Ethereal / Hologram Material for Vacant Slot, or Realistic Standard Material for Occupied Player
  const isPhantom = !isOccupied;

  const skinMat = isPhantom
    ? new THREE.MeshStandardMaterial({
        color: isGreen ? 0x34d399 : 0x60a5fa,
        transparent: true,
        opacity: 0.45,
        roughness: 0.4,
        emissive: isGreen ? 0x059669 : 0x1d4ed8,
        emissiveIntensity: 0.4,
      })
    : new THREE.MeshStandardMaterial({
        color: 0xd4a373, // Natural Mediterranean warm skin tone
        roughness: 0.65,
        metalness: 0.05,
      });

  const hairMat = isPhantom
    ? skinMat
    : new THREE.MeshStandardMaterial({
        color: 0x1e1b18, // Deep dark hair
        roughness: 0.85,
      });

  const jerseyTex = createJerseyCanvasTexture(
    jerseyBaseColor,
    jerseyAccentColor,
    jerseyNumber,
    isGK,
    assignedPlayer?.name
  );

  const jerseyMat = isPhantom
    ? new THREE.MeshStandardMaterial({
        color: isGreen ? 0x10b981 : 0x3b82f6,
        transparent: true,
        opacity: 0.5,
        roughness: 0.5,
        wireframe: true,
      })
    : new THREE.MeshStandardMaterial({
        map: jerseyTex,
        roughness: 0.45,
        metalness: 0.1,
      });

  const shortsMat = isPhantom
    ? jerseyMat
    : new THREE.MeshStandardMaterial({
        color: shortsColor,
        roughness: 0.5,
        metalness: 0.05,
      });

  const socksMat = isPhantom
    ? jerseyMat
    : new THREE.MeshStandardMaterial({
        color: socksColor,
        roughness: 0.5,
      });

  const bootsMat = isPhantom
    ? jerseyMat
    : new THREE.MeshStandardMaterial({
        color: 0x0f172a, // Modern black speed boots with neon trim
        roughness: 0.3,
        metalness: 0.2,
      });

  // --- LOWER BODY: Boots, Socks & Legs ---
  const legSpacing = isGK ? 0.42 : isDefender ? 0.36 : 0.32; // GK has wider ready stance
  const bootLength = 0.58;
  const bootWidth = 0.28;
  const bootHeight = 0.22;

  [-legSpacing, legSpacing].forEach((legX, i) => {
    // Soccer Boot (Cleat)
    const bootGeo = new THREE.BoxGeometry(bootWidth, bootHeight, bootLength);
    const bootMesh = new THREE.Mesh(bootGeo, bootsMat);
    bootMesh.position.set(legX, bootHeight / 2, 0.08);
    bootMesh.castShadow = true;
    bodyGroup.add(bootMesh);

    // Boot Neon Swoosh / Stripes
    if (!isPhantom) {
      const stripeGeo = new THREE.BoxGeometry(bootWidth * 1.05, 0.04, 0.22);
      const stripeMat = new THREE.MeshBasicMaterial({ color: isGK ? 0xeab308 : 0xf59e0b });
      const stripeMesh = new THREE.Mesh(stripeGeo, stripeMat);
      stripeMesh.position.set(legX, bootHeight * 0.7, 0.08);
      bodyGroup.add(stripeMesh);
    }

    // Shin / Sock (Long soccer sock up to knee)
    const sockHeight = 0.95;
    const sockGeo = new THREE.CylinderGeometry(0.16, 0.14, sockHeight, 14);
    const sockMesh = new THREE.Mesh(sockGeo, socksMat);
    sockMesh.position.set(legX, bootHeight + sockHeight / 2, 0);
    sockMesh.castShadow = true;
    bodyGroup.add(sockMesh);

    // Sock White Turnover Band under Knee
    if (!isPhantom) {
      const bandGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.12, 14);
      const bandMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
      const bandMesh = new THREE.Mesh(bandGeo, bandMat);
      bandMesh.position.set(legX, bootHeight + sockHeight - 0.06, 0);
      bodyGroup.add(bandMesh);
    }

    // Knee & Thigh (Above knee to shorts)
    const thighHeight = 0.65;
    const thighGeo = new THREE.CylinderGeometry(0.18, 0.16, thighHeight, 14);
    const thighMesh = new THREE.Mesh(thighGeo, skinMat);
    thighMesh.position.set(legX, bootHeight + sockHeight + thighHeight / 2, 0);
    bodyGroup.add(thighMesh);
  });

  // --- SHORTS & PELVIS (Y = 1.75 to 2.4) ---
  const shortsHeight = 0.65;
  const shortsGeo = new THREE.BoxGeometry(1.05, shortsHeight, 0.68);
  const shortsMesh = new THREE.Mesh(shortsGeo, shortsMat);
  shortsMesh.position.set(0, 1.75 + shortsHeight / 2, 0);
  shortsMesh.castShadow = true;
  bodyGroup.add(shortsMesh);

  // --- TORSO / ATHLETIC KIT JERSEY (Y = 2.4 to 3.75) ---
  const torsoHeight = 1.35;
  const torsoTopW = 1.25;
  const torsoBottomW = 0.95;
  const torsoGeo = new THREE.CylinderGeometry(torsoTopW / 2, torsoBottomW / 2, torsoHeight, 16);
  // Slightly flatten torso on Z-axis for natural human chest/back ratio
  torsoGeo.scale(1.0, 1.0, 0.65);
  const torsoMesh = new THREE.Mesh(torsoGeo, jerseyMat);
  torsoMesh.position.set(0, 2.4 + torsoHeight / 2, 0);
  torsoMesh.castShadow = true;
  bodyGroup.add(torsoMesh);

  // --- ARMS & HANDS (Dynamic Tactical Poses) ---
  [-0.72, 0.72].forEach((armX, idx) => {
    const isLeft = idx === 0;
    const armGroup = new THREE.Group();
    armGroup.position.set(armX, 3.45, 0);

    // Shoulder joint
    const shoulderGeo = new THREE.SphereGeometry(0.18, 12, 12);
    const shoulderMesh = new THREE.Mesh(shoulderGeo, jerseyMat);
    armGroup.add(shoulderMesh);

    // Sleeve
    const sleeveGeo = new THREE.CylinderGeometry(0.18, 0.16, 0.45, 12);
    const sleeveMesh = new THREE.Mesh(sleeveGeo, jerseyMat);
    sleeveMesh.position.set(0, -0.22, 0);
    armGroup.add(sleeveMesh);

    // Forearm & Hand
    const forearmGeo = new THREE.CylinderGeometry(0.14, 0.12, 0.65, 12);
    const forearmMesh = new THREE.Mesh(forearmGeo, skinMat);
    forearmMesh.position.set(0, -0.65, 0);
    armGroup.add(forearmMesh);

    if (isGK) {
      // GOALKEEPER PADDED GLOVES: Large, thick latex match gloves with neon backing
      const gloveGeo = new THREE.BoxGeometry(0.26, 0.32, 0.16);
      const gloveMat = isPhantom
        ? jerseyMat
        : new THREE.MeshStandardMaterial({
            color: 0xf97316, // Vibrant orange goalkeeper match gloves
            roughness: 0.25,
            metalness: 0.1,
          });
      const gloveMesh = new THREE.Mesh(gloveGeo, gloveMat);
      gloveMesh.position.set(0, -1.02, 0.04);
      armGroup.add(gloveMesh);

      // Goalkeeper Ready Stance: Arms wide and flexed forward
      armGroup.rotation.z = isLeft ? 0.42 : -0.42;
      armGroup.rotation.x = -0.38;
    } else if (isForward) {
      // Striker sprint poised stance
      armGroup.rotation.z = isLeft ? 0.28 : -0.28;
      armGroup.rotation.x = isLeft ? -0.4 : 0.3;
    } else if (isDefender) {
      // Solid defender stance
      armGroup.rotation.z = isLeft ? 0.18 : -0.18;
      armGroup.rotation.x = 0.05;
    } else {
      // Midfielder dynamic stance
      armGroup.rotation.z = isLeft ? 0.22 : -0.22;
      armGroup.rotation.x = -0.15;
    }

    bodyGroup.add(armGroup);
  });

  // --- NECK & HEAD (Y = 3.75 to 4.65) ---
  const neckGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.3, 14);
  const neckMesh = new THREE.Mesh(neckGeo, skinMat);
  neckMesh.position.set(0, 3.82, 0);
  bodyGroup.add(neckMesh);

  // Head sphere
  const headGeo = new THREE.SphereGeometry(0.38, 20, 20);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.position.set(0, 4.22, 0.04);
  headMesh.castShadow = true;
  bodyGroup.add(headMesh);

  // Athletic modern fade haircut
  const hairGeo = new THREE.SphereGeometry(0.39, 20, 16, 0, Math.PI * 2, 0, Math.PI / 1.7);
  const hairMesh = new THREE.Mesh(hairGeo, hairMat);
  hairMesh.position.set(0, 4.25, 0.02);
  bodyGroup.add(hairMesh);

  // 5. 3D FLOATING NAMEPLATE BILLBOARD (Above Player's Head)
  const nameplateCanvas = document.createElement('canvas');
  nameplateCanvas.width = 440;
  nameplateCanvas.height = 110;
  const nCtx = nameplateCanvas.getContext('2d');
  if (nCtx) {
    // Rounded Glassmorphic Card Backing
    const rx = 8,
      ry = 8,
      rw = 424,
      rh = 94,
      rad = 22;

    nCtx.fillStyle = isOccupied
      ? isCurrentUser
        ? 'rgba(234, 179, 8, 0.95)' // Gold header for user
        : 'rgba(8, 11, 16, 0.92)'
      : isGreen
      ? 'rgba(6, 78, 59, 0.88)'
      : 'rgba(30, 58, 138, 0.88)';

    nCtx.beginPath();
    nCtx.moveTo(rx + rad, ry);
    nCtx.lineTo(rx + rw - rad, ry);
    nCtx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rad);
    nCtx.lineTo(rx + rw, ry + rh - rad);
    nCtx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rad, ry + rh);
    nCtx.lineTo(rx + rad, ry + rh);
    nCtx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - rad);
    nCtx.lineTo(rx, ry + rad);
    nCtx.quadraticCurveTo(rx, ry, rx + rad, ry);
    nCtx.closePath();
    nCtx.fill();

    // Border stroke
    nCtx.lineWidth = 4;
    nCtx.strokeStyle = isSelected
      ? '#f59e0b'
      : isCurrentUser
      ? '#ffffff'
      : isOccupied
      ? isGreen
        ? '#10b981'
        : '#3b82f6'
      : '#f59e0b';
    nCtx.stroke();

    // Position Badge Pill
    const posBg = isGK ? '#eab308' : isGreen ? '#059669' : '#2563eb';
    nCtx.fillStyle = posBg;
    nCtx.beginPath();
    nCtx.roundRect ? nCtx.roundRect(24, 26, 68, 58, 12) : nCtx.rect(24, 26, 68, 58);
    nCtx.fill();

    nCtx.fillStyle = '#ffffff';
    nCtx.font = '900 28px sans-serif';
    nCtx.textAlign = 'center';
    nCtx.textBaseline = 'middle';
    nCtx.fillText(slot.label, 58, 56);

    // Player Name or "Join This Position"
    if (isOccupied) {
      nCtx.fillStyle = isCurrentUser ? '#0f172a' : '#ffffff';
      nCtx.font = 'bold 30px sans-serif';
      nCtx.textAlign = 'left';
      nCtx.fillText(assignedPlayer.name.substring(0, 18), 108, 44);

      // Subtitle: Number & Role
      nCtx.font = 'bold 20px sans-serif';
      nCtx.fillStyle = isCurrentUser ? '#1e293b' : isGreen ? '#6ee7b7' : '#93c5fd';
      const roleText = isGK
        ? language === 'ar'
          ? 'حارس مرمى • Goalkeeper'
          : 'Goalkeeper'
        : isDefender
        ? language === 'ar'
          ? 'مدافع • Defender'
          : 'Defender'
        : isForward
        ? language === 'ar'
          ? 'مهاجم • Striker'
          : 'Forward'
        : language === 'ar'
        ? 'وسط • Midfield'
        : 'Midfielder';
      nCtx.fillText(`#${jerseyNumber} • ${roleText}`, 108, 74);
    } else {
      // Vacant slot invitation
      nCtx.fillStyle = '#fef08a';
      nCtx.font = 'bold 26px sans-serif';
      nCtx.textAlign = 'left';
      nCtx.fillText(
        language === 'ar' ? 'مركز متاح • إضغط للحجز' : '+ Available • Click to Claim',
        106,
        45
      );

      nCtx.font = 'bold 20px sans-serif';
      nCtx.fillStyle = '#ffffff';
      nCtx.fillText(
        language === 'ar' ? `إنضم كـ ${slot.position}` : `Join as ${slot.position}`,
        106,
        74
      );
    }
  }

  const nameTex = new THREE.CanvasTexture(nameplateCanvas);
  const nameMat = new THREE.MeshBasicMaterial({
    map: nameTex,
    transparent: true,
    depthTest: false,
  });
  const nameGeo = new THREE.PlaneGeometry(4.6, 1.15);
  const nameplateMesh = new THREE.Mesh(nameGeo, nameMat);
  nameplateMesh.name = 'nameplate';
  nameplateMesh.position.y = (isSelected ? 0.35 : 0) + 5.25;
  playerRoot.add(nameplateMesh);

  return {
    playerRoot,
    hitMesh,
  };
}
