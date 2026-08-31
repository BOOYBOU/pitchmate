import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { SoccerMatch, PlayerPosition } from '../types';
import {
  SlotDefinition,
  FormationConfig,
  FORMATIONS,
  getNormalizedFormationKey,
  getDefaultFormationForFormat,
  generateDynamicTacticalSlots,
} from '../lib/tacticalFormations';
import { usePitchStore } from '../lib/usePitchStore';
import {
  Rotate3d,
  Layers,
  Compass,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Info,
  Lock,
  Unlock,
  AlertCircle,
  Users,
  Check,
} from 'lucide-react';

export interface TacticalPitch3DWebGLProps {
  match: SoccerMatch;
  formation?: FormationConfig;
  assignments?: Record<string, string>;
  selectedSlotKey?: string | null;
  viewMode?: 'full' | 'green' | 'blue';
  onSelectSlot?: (slotKey: string) => void;
  onSelfClaimSlot?: (slot: SlotDefinition) => void;
  selectedPlayerId?: string | null;
  onSelectPlayer?: (player: any) => void;
}

// Convert 0-100 percentage coordinates to 3D Pitch coordinates
// Pitch dimensions: Width X = 44, Length Z = 64 (standard 105x68 proportion scaled)
const PITCH_WIDTH = 44;
const PITCH_LENGTH = 64;

function disposeThreeObject(obj: THREE.Object3D) {
  if (!obj) return;
  if (obj.children) {
    for (let i = obj.children.length - 1; i >= 0; i--) {
      disposeThreeObject(obj.children[i]);
    }
  }
  if ((obj as any).geometry) {
    (obj as any).geometry.dispose();
  }
  if ((obj as any).material) {
    if (Array.isArray((obj as any).material)) {
      (obj as any).material.forEach((mat: THREE.Material) => {
        if ((mat as any).map) (mat as any).map.dispose();
        mat.dispose();
      });
    } else {
      if ((obj as any).material.map) (obj as any).material.map.dispose();
      (obj as any).material.dispose();
    }
  }
}

function slotTo3DPos(leftPct: number, topPct: number): THREE.Vector3 {
  const x = ((leftPct - 50) / 100) * (PITCH_WIDTH * 0.88);
  const z = ((topPct - 50) / 100) * (PITCH_LENGTH * 0.88);
  return new THREE.Vector3(x, 0.45, z);
}

export const TacticalPitch3DWebGL: React.FC<TacticalPitch3DWebGLProps> = ({
  match,
  formation,
  assignments,
  selectedSlotKey = null,
  viewMode = 'full',
  onSelectSlot,
  onSelfClaimSlot,
  selectedPlayerId,
  onSelectPlayer,
}) => {
  const { currentUser } = usePitchStore();
  const mountRef = useRef<HTMLDivElement>(null);
  const [webGlError, setWebGlError] = useState(false);

  // Safely resolve the active formation and assignments
  const normalizedKey = getNormalizedFormationKey(match?.formationGreen, match?.format, match?.maxPlayers);
  const activeFormation: FormationConfig = React.useMemo(() => {
    if (formation) return formation;
    if (FORMATIONS[normalizedKey]) return FORMATIONS[normalizedKey];
    const defKey = getDefaultFormationForFormat(match?.format, match?.maxPlayers);
    if (FORMATIONS[defKey]) return FORMATIONS[defKey];
    const teamSize = Math.max(3, Math.floor((match?.maxPlayers || 14) / 2));
    return {
      label: `${teamSize}v${teamSize} (Dynamic Tactical Setup)`,
      category: 'custom' as const,
      slots: {
        green: generateDynamicTacticalSlots(teamSize, 'green'),
        blue: generateDynamicTacticalSlots(teamSize, 'blue'),
      },
    };
  }, [formation, normalizedKey, match?.format, match?.maxPlayers]);

  const activeAssignments: Record<string, string> =
    assignments || match?.tacticalAssignments || {};

  const activeViewMode = viewMode || 'full';

  // Camera presets
  const [cameraMode, setCameraMode] = useState<'stadium' | 'top' | 'green_end' | 'blue_end'>('stadium');
  const [isOrbiting, setIsOrbiting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredSlotKey, setHoveredSlotKey] = useState<string | null>(null);
  const [isTouchOrbitLocked, setIsTouchOrbitLocked] = useState(false);

  // Target camera positions for smooth interpolation
  const targetCamPos = useRef(new THREE.Vector3(0, 42, 48));
  const targetCamLook = useRef(new THREE.Vector3(0, 0, 0));

  // Three.js internal references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const tokenGroupRef = useRef<THREE.Group | null>(null);
  const interactablesRef = useRef<THREE.Object3D[]>([]);

  // Drag interaction state
  const isDragging = useRef(false);
  const prevMousePos = useRef({ x: 0, y: 0 });
  const orbitAngles = useRef({ theta: 0, phi: Math.PI / 3.4, radius: 64 });

  // Update target camera based on mode
  useEffect(() => {
    switch (cameraMode) {
      case 'stadium':
        orbitAngles.current = { theta: 0, phi: Math.PI / 3.2, radius: 62 };
        targetCamLook.current.set(0, 0, 0);
        break;
      case 'top':
        orbitAngles.current = { theta: 0, phi: 0.05, radius: 68 };
        targetCamLook.current.set(0, 0, 0);
        break;
      case 'green_end':
        orbitAngles.current = { theta: 0, phi: Math.PI / 2.6, radius: 46 };
        targetCamLook.current.set(0, 0, -10);
        break;
      case 'blue_end':
        orbitAngles.current = { theta: Math.PI, phi: Math.PI / 2.6, radius: 46 };
        targetCamLook.current.set(0, 0, 10);
        break;
    }
  }, [cameraMode]);

  // Main Scene Initialization
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'default',
      });
    } catch (err) {
      console.warn('WebGL initialization failed, falling back to 2D tactical view', err);
      setWebGlError(true);
      return;
    }

    // 1. Create Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x060913);
    scene.fog = new THREE.FogExp2(0x060913, 0.008);

    // 2. Create Camera
    const width = Math.max(container.clientWidth || 0, 400);
    const height = Math.max(container.clientHeight || 0, 300);
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 500);
    camera.position.set(0, 45, 50);
    cameraRef.current = camera;

    // 3. Configure Renderer
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xe0f2fe, 1.4);
    dirLight.position.set(25, 55, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 150;
    const d = 45;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    // Secondary backlight for rim depth
    const backLight = new THREE.DirectionalLight(0x10b981, 0.6);
    backLight.position.set(-30, 40, -40);
    scene.add(backLight);

    // 4 Stadium Floodlight Pillars
    const floodlightPositions = [
      [-32, 28, -42],
      [32, 28, -42],
      [-32, 28, 42],
      [32, 28, 42],
    ];

    floodlightPositions.forEach(([fx, fy, fz]) => {
      const poleGeo = new THREE.CylinderGeometry(0.35, 0.5, fy, 8);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
      const poleMesh = new THREE.Mesh(poleGeo, poleMat);
      poleMesh.position.set(fx, fy / 2, fz);
      scene.add(poleMesh);

      const headGeo = new THREE.BoxGeometry(3, 1.8, 1.5);
      const headMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.3,
      });
      const headMesh = new THREE.Mesh(headGeo, headMat);
      headMesh.position.set(fx, fy, fz);
      headMesh.lookAt(0, 0, 0);
      scene.add(headMesh);

      const spot = new THREE.SpotLight(0xffffff, 1.2, 120, Math.PI / 5, 0.4, 1);
      spot.position.set(fx, fy, fz);
      spot.target.position.set(0, 0, 0);
      scene.add(spot);
      scene.add(spot.target);
    });

    // 5. Generate Procedural Canvas Texture for 3D Turf & Lines
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 3072;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const cw = canvas.width;
      const ch = canvas.height;

      // Fill base grass
      ctx.fillStyle = '#14532d';
      ctx.fillRect(0, 0, cw, ch);

      // Alternating mown stripes
      const stripeCount = 20;
      const stripeH = ch / stripeCount;
      for (let i = 0; i < stripeCount; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#15803d' : '#166534';
        ctx.fillRect(0, i * stripeH, cw, stripeH);
      }

      // Grass texture noise
      for (let n = 0; n < 25000; n++) {
        const nx = Math.random() * cw;
        const ny = Math.random() * ch;
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)';
        ctx.fillRect(nx, ny, 2, 3);
      }

      // Pitch White Markings
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 14;
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 4;

      const padX = 140;
      const padY = 160;
      const fieldW = cw - padX * 2;
      const fieldH = ch - padY * 2;

      ctx.strokeRect(padX, padY, fieldW, fieldH);

      const midY = ch / 2;
      ctx.beginPath();
      ctx.moveTo(padX, midY);
      ctx.lineTo(padX + fieldW, midY);
      ctx.stroke();

      const centerRadius = fieldW * 0.16;
      ctx.beginPath();
      ctx.arc(cw / 2, midY, centerRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cw / 2, midY, 18, 0, Math.PI * 2);
      ctx.fill();

      // North Penalty Box (Blue End)
      const penBoxW = fieldW * 0.56;
      const penBoxH = fieldH * 0.2;
      const sixBoxW = fieldW * 0.28;
      const sixBoxH = fieldH * 0.08;
      ctx.strokeRect((cw - penBoxW) / 2, padY, penBoxW, penBoxH);
      ctx.strokeRect((cw - sixBoxW) / 2, padY, sixBoxW, sixBoxH);

      ctx.beginPath();
      ctx.arc(cw / 2, padY + penBoxH * 0.65, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cw / 2, padY + penBoxH * 0.65, centerRadius * 0.7, 0.25 * Math.PI, 0.75 * Math.PI, false);
      ctx.stroke();

      // South Penalty Box (Green End)
      ctx.strokeRect((cw - penBoxW) / 2, padY + fieldH - penBoxH, penBoxW, penBoxH);
      ctx.strokeRect((cw - sixBoxW) / 2, padY + fieldH - sixBoxH, sixBoxW, sixBoxH);

      ctx.beginPath();
      ctx.arc(cw / 2, padY + fieldH - penBoxH * 0.65, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cw / 2, padY + fieldH - penBoxH * 0.65, centerRadius * 0.7, 1.25 * Math.PI, 1.75 * Math.PI, false);
      ctx.stroke();

      // Corner Arcs
      const cornerR = 50;
      ctx.beginPath();
      ctx.arc(padX, padY, cornerR, 0, 0.5 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(padX + fieldW, padY, cornerR, 0.5 * Math.PI, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(padX, padY + fieldH, cornerR, 1.5 * Math.PI, 2 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(padX + fieldW, padY + fieldH, cornerR, Math.PI, 1.5 * Math.PI);
      ctx.stroke();
    }

    const pitchTexture = new THREE.CanvasTexture(canvas);
    pitchTexture.anisotropy = 4;

    // 6. Pitch Mesh Plane
    const pitchMat = new THREE.MeshStandardMaterial({
      map: pitchTexture,
      roughness: 0.75,
      metalness: 0.1,
    });
    const pitchGeo = new THREE.BoxGeometry(PITCH_WIDTH, 1.2, PITCH_LENGTH);
    const pitchMesh = new THREE.Mesh(pitchGeo, pitchMat);
    pitchMesh.position.set(0, -0.6, 0);
    pitchMesh.receiveShadow = true;
    scene.add(pitchMesh);

    // Stadium Outer Apron
    const groundGeo = new THREE.PlaneGeometry(160, 160);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0a0f1d,
      roughness: 0.9,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -1.25;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // 7. 3D Realistic Goalposts & Net Structures
    const create3DGoal = (isNorth: boolean) => {
      const goalGroup = new THREE.Group();
      const goalZ = isNorth ? -PITCH_LENGTH * 0.44 : PITCH_LENGTH * 0.44;
      const goalDir = isNorth ? 1 : -1;

      const postRadius = 0.22;
      const postHeight = 3.6;
      const goalWidth = 10.5;
      const goalDepth = 3.2;

      const postMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.9,
        roughness: 0.2,
      });

      const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 16);
      const leftPost = new THREE.Mesh(postGeo, postMat);
      leftPost.position.set(-goalWidth / 2, postHeight / 2, 0);
      leftPost.castShadow = true;
      goalGroup.add(leftPost);

      const rightPost = new THREE.Mesh(postGeo, postMat);
      rightPost.position.set(goalWidth / 2, postHeight / 2, 0);
      rightPost.castShadow = true;
      goalGroup.add(rightPost);

      const crossGeo = new THREE.CylinderGeometry(postRadius, postRadius, goalWidth + postRadius * 2, 16);
      const crossbar = new THREE.Mesh(crossGeo, postMat);
      crossbar.rotation.z = Math.PI / 2;
      crossbar.position.set(0, postHeight, 0);
      crossbar.castShadow = true;
      goalGroup.add(crossbar);

      const netSupportMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.6, roughness: 0.4 });
      const supGeo = new THREE.CylinderGeometry(0.12, 0.12, goalDepth * 1.3, 8);

      const leftTopSup = new THREE.Mesh(supGeo, netSupportMat);
      leftTopSup.rotation.x = isNorth ? -Math.PI / 3.5 : Math.PI / 3.5;
      leftTopSup.position.set(-goalWidth / 2, postHeight * 0.6, -goalDir * (goalDepth / 2));
      goalGroup.add(leftTopSup);

      const rightTopSup = new THREE.Mesh(supGeo, netSupportMat);
      rightTopSup.rotation.x = isNorth ? -Math.PI / 3.5 : Math.PI / 3.5;
      rightTopSup.position.set(goalWidth / 2, postHeight * 0.6, -goalDir * (goalDepth / 2));
      goalGroup.add(rightTopSup);

      const netCanvas = document.createElement('canvas');
      netCanvas.width = 128;
      netCanvas.height = 128;
      const netCtx = netCanvas.getContext('2d');
      if (netCtx) {
        netCtx.fillStyle = 'rgba(255,255,255,0.05)';
        netCtx.fillRect(0, 0, 128, 128);
        netCtx.strokeStyle = 'rgba(255,255,255,0.75)';
        netCtx.lineWidth = 3;
        for (let i = 0; i <= 128; i += 16) {
          netCtx.beginPath();
          netCtx.moveTo(i, 0);
          netCtx.lineTo(i, 128);
          netCtx.stroke();
          netCtx.beginPath();
          netCtx.moveTo(0, i);
          netCtx.lineTo(128, i);
          netCtx.stroke();
        }
      }
      const netTexture = new THREE.CanvasTexture(netCanvas);
      netTexture.wrapS = THREE.RepeatWrapping;
      netTexture.wrapT = THREE.RepeatWrapping;
      netTexture.repeat.set(4, 2);

      const netMat = new THREE.MeshStandardMaterial({
        map: netTexture,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
        roughness: 0.9,
      });

      const backNetGeo = new THREE.PlaneGeometry(goalWidth, postHeight);
      const backNet = new THREE.Mesh(backNetGeo, netMat);
      backNet.position.set(0, postHeight / 2, -goalDir * goalDepth);
      goalGroup.add(backNet);

      const topNetGeo = new THREE.PlaneGeometry(goalWidth, goalDepth * 1.1);
      const topNet = new THREE.Mesh(topNetGeo, netMat);
      topNet.rotation.x = isNorth ? Math.PI / 2.2 : -Math.PI / 2.2;
      topNet.position.set(0, postHeight * 0.85, -goalDir * (goalDepth / 2));
      goalGroup.add(topNet);

      goalGroup.position.set(0, 0, goalZ);
      return goalGroup;
    };

    scene.add(create3DGoal(true));
    scene.add(create3DGoal(false));

    // 8. 3D Stadium Advertising LED Boards
    const createAdBanner = (text: string, w: number, x: number, z: number, rotY: number) => {
      const adCanvas = document.createElement('canvas');
      adCanvas.width = 512;
      adCanvas.height = 64;
      const adCtx = adCanvas.getContext('2d');
      if (adCtx) {
        adCtx.fillStyle = '#0f172a';
        adCtx.fillRect(0, 0, 512, 64);
        adCtx.fillStyle = '#10b981';
        adCtx.font = 'bold 24px sans-serif';
        adCtx.textAlign = 'center';
        adCtx.textBaseline = 'middle';
        adCtx.fillText(text, 256, 32);
      }
      const adTex = new THREE.CanvasTexture(adCanvas);
      const adMat = new THREE.MeshStandardMaterial({ map: adTex, emissive: 0x10b981, emissiveIntensity: 0.25 });
      const adGeo = new THREE.BoxGeometry(w, 1.2, 0.4);
      const adMesh = new THREE.Mesh(adGeo, adMat);
      adMesh.position.set(x, 0.6, z);
      adMesh.rotation.y = rotY;
      scene.add(adMesh);
    };

    createAdBanner('⚽ PITCHMATE MAROC • CASABLANCA PICKUP LEAGUE', PITCH_LENGTH * 0.95, -PITCH_WIDTH / 2 - 2, 0, Math.PI / 2);
    createAdBanner('⚽ MOROCCO 2030 • BOTOLA PICKUP SOCCER', PITCH_LENGTH * 0.95, PITCH_WIDTH / 2 + 2, 0, -Math.PI / 2);

    // Group for 3D Player Tokens
    const tokenGroup = new THREE.Group();
    scene.add(tokenGroup);
    tokenGroupRef.current = tokenGroup;

    // Visibility and Active tab detection
    let isElementVisible = true;
    let isTabVisible = !document.hidden;

    // Resize Handler using ResizeObserver for smooth responsiveness
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = Math.max(container.clientWidth || 0, 320);
      const h = Math.max(container.clientHeight || 0, 260);
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(container);
    }
    window.addEventListener('resize', handleResize);

    let intersectionObserver: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      intersectionObserver = new IntersectionObserver(([entry]) => {
        isElementVisible = entry.isIntersecting;
      }, { threshold: 0.05 });
      intersectionObserver.observe(container);
    }

    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Animation Render Loop with inactive tab & off-screen throttling
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Only perform costly rendering when the tab is focused and the element is in view
      if (!isTabVisible || !isElementVisible) return;

      if (cameraRef.current) {
        const { theta, phi, radius } = orbitAngles.current;
        const cx = radius * Math.sin(phi) * Math.sin(theta);
        const cy = radius * Math.cos(phi);
        const cz = radius * Math.sin(phi) * Math.cos(theta);

        targetCamPos.current.set(cx, Math.max(cy, 5), cz);

        cameraRef.current.position.lerp(targetCamPos.current, 0.08);
        cameraRef.current.lookAt(targetCamLook.current);
      }

      // Billboard all text nameplates towards camera
      if (tokenGroupRef.current && cameraRef.current) {
        tokenGroupRef.current.children.forEach((tokenMesh) => {
          const nameplate = tokenMesh.getObjectByName('nameplate');
          if (nameplate && cameraRef.current) {
            nameplate.quaternion.copy(cameraRef.current.quaternion);
          }
        });
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (resizeObserver) resizeObserver.disconnect();
      if (intersectionObserver) intersectionObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      if (sceneRef.current) {
        disposeThreeObject(sceneRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current.forceContextLoss();
      }
      if (container && renderer && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update 3D Player Tokens when match roster, assignments, or formation changes
  useEffect(() => {
    const tokenGroup = tokenGroupRef.current;
    if (!tokenGroup) return;

    // Clear existing tokens and dispose their resources
    while (tokenGroup.children.length > 0) {
      const obj = tokenGroup.children[0];
      tokenGroup.remove(obj);
      disposeThreeObject(obj);
    }
    interactablesRef.current = [];

    const greenSlots = activeFormation?.slots?.green || [];
    const blueSlots = activeFormation?.slots?.blue || [];

    const slotsToRender = [
      ...(activeViewMode === 'full' || activeViewMode === 'green' ? greenSlots : []),
      ...(activeViewMode === 'full' || activeViewMode === 'blue' ? blueSlots : []),
    ];

    const roster = match?.roster || [];

    slotsToRender.forEach((slot) => {
      const pos3D = slotTo3DPos(slot.left, slot.top);
      const isGreen = slot.team === 'green';
      const assignedUserId = activeAssignments[slot.key];
      const assignedPlayer = roster.find((p) => p.userId === assignedUserId);
      const isSelected = selectedSlotKey === slot.key || selectedPlayerId === assignedUserId;
      const isCurrentUser = assignedPlayer?.userId === currentUser.id;

      const tokenRoot = new THREE.Group();
      tokenRoot.position.copy(pos3D);
      tokenRoot.name = slot.key;
      (tokenRoot as any).slotData = slot;

      // 1. Soft Grass Drop Shadow Circle
      const shadowGeo = new THREE.PlaneGeometry(3.6, 3.6);
      const shadowMat = new THREE.MeshBasicMaterial({
        color: isGreen ? 0x064e3b : 0x1e3a8a,
        transparent: true,
        opacity: isSelected ? 0.8 : 0.45,
      });
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.y = -0.38;
      tokenRoot.add(shadowMesh);

      // 2. Tactile 3D Cylinder Pedestal Token
      const tokenRadius = 1.35;
      const tokenHeight = 0.7;
      const tokenGeo = new THREE.CylinderGeometry(tokenRadius, tokenRadius * 1.1, tokenHeight, 32);

      const tokenBaseColor = assignedPlayer
        ? isGreen
          ? 0x059669
          : 0x2563eb
        : isGreen
        ? 0x064e3b
        : 0x1e3a8a;

      const tokenMat = new THREE.MeshStandardMaterial({
        color: isSelected ? 0xf59e0b : tokenBaseColor,
        metalness: isSelected ? 0.7 : 0.4,
        roughness: 0.3,
        emissive: isSelected ? 0xd97706 : isCurrentUser ? 0xf59e0b : 0x000000,
        emissiveIntensity: isSelected ? 0.6 : isCurrentUser ? 0.3 : 0,
      });

      const tokenMesh = new THREE.Mesh(tokenGeo, tokenMat);
      tokenMesh.position.y = isSelected ? 0.4 : 0;
      tokenMesh.castShadow = true;
      tokenMesh.receiveShadow = true;
      tokenRoot.add(tokenMesh);

      // 3. Metallic Rim Ring
      const rimGeo = new THREE.TorusGeometry(tokenRadius, 0.12, 16, 32);
      const rimMat = new THREE.MeshStandardMaterial({
        color: isSelected ? 0xfef08a : isCurrentUser ? 0xfbbf24 : 0xffffff,
        metalness: 0.9,
        roughness: 0.1,
      });
      const rimMesh = new THREE.Mesh(rimGeo, rimMat);
      rimMesh.rotation.x = Math.PI / 2;
      rimMesh.position.y = (isSelected ? 0.4 : 0) + tokenHeight / 2;
      tokenRoot.add(rimMesh);

      // 4. Token Cap Canvas (Avatar Monogram + Role Badge)
      const capCanvas = document.createElement('canvas');
      capCanvas.width = 256;
      capCanvas.height = 256;
      const capCtx = capCanvas.getContext('2d');
      if (capCtx) {
        capCtx.fillStyle = assignedPlayer
          ? isGreen
            ? '#10b981'
            : '#3b82f6'
          : isGreen
          ? '#047857'
          : '#1d4ed8';
        capCtx.beginPath();
        capCtx.arc(128, 128, 124, 0, Math.PI * 2);
        capCtx.fill();

        // Border ring
        capCtx.lineWidth = 10;
        capCtx.strokeStyle = isSelected ? '#fbbf24' : '#ffffff';
        capCtx.stroke();

        if (assignedPlayer) {
          // Player Monogram & Name Initials
          capCtx.fillStyle = '#ffffff';
          capCtx.font = 'bold 80px sans-serif';
          capCtx.textAlign = 'center';
          capCtx.textBaseline = 'middle';
          const initials = (assignedPlayer.name || 'P')
            .split(' ')
            .map((n) => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
          capCtx.fillText(initials, 128, 100);

          // Sub role text
          capCtx.font = 'bold 36px monospace';
          capCtx.fillStyle = '#fef08a';
          capCtx.fillText(slot.label, 128, 175);
        } else {
          // Open Role label
          capCtx.fillStyle = '#ffffff';
          capCtx.font = 'bold 70px sans-serif';
          capCtx.textAlign = 'center';
          capCtx.textBaseline = 'middle';
          capCtx.fillText(slot.label, 128, 105);

          capCtx.font = 'bold 34px sans-serif';
          capCtx.fillStyle = isGreen ? '#a7f3d0' : '#bfdbfe';
          capCtx.fillText(slot.position, 128, 170);
        }
      }

      const capTex = new THREE.CanvasTexture(capCanvas);
      const capGeo = new THREE.CircleGeometry(tokenRadius * 0.95, 32);
      const capMat = new THREE.MeshBasicMaterial({ map: capTex, side: THREE.DoubleSide });
      const capMesh = new THREE.Mesh(capGeo, capMat);
      capMesh.rotation.x = -Math.PI / 2;
      capMesh.position.y = (isSelected ? 0.4 : 0) + tokenHeight / 2 + 0.02;
      tokenRoot.add(capMesh);

      // 5. 3D Floating Nameplate Billboard
      const nameCanvas = document.createElement('canvas');
      nameCanvas.width = 380;
      nameCanvas.height = 96;
      const nameCtx = nameCanvas.getContext('2d');
      if (nameCtx) {
        nameCtx.fillStyle = assignedPlayer
          ? isCurrentUser
            ? 'rgba(245, 158, 11, 0.95)'
            : 'rgba(15, 23, 42, 0.92)'
          : isGreen
          ? 'rgba(6, 78, 59, 0.85)'
          : 'rgba(30, 58, 138, 0.85)';

        const rx = 10,
          ry = 10,
          rw = 360,
          rh = 76,
          r = 24;
        nameCtx.beginPath();
        nameCtx.moveTo(rx + r, ry);
        nameCtx.lineTo(rx + rw - r, ry);
        nameCtx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + r);
        nameCtx.lineTo(rx + rw, ry + rh - r);
        nameCtx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - r, ry + rh);
        nameCtx.lineTo(rx + r, ry + rh);
        nameCtx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - r);
        nameCtx.lineTo(rx, ry + r);
        nameCtx.quadraticCurveTo(rx, ry, rx + r, ry);
        nameCtx.closePath();
        nameCtx.fill();

        nameCtx.lineWidth = 4;
        nameCtx.strokeStyle = isSelected
          ? '#f59e0b'
          : assignedPlayer
          ? isCurrentUser
            ? '#fef08a'
            : '#475569'
          : isGreen
          ? '#10b981'
          : '#3b82f6';
        nameCtx.stroke();

        nameCtx.fillStyle = assignedPlayer && isCurrentUser ? '#0f172a' : '#ffffff';
        nameCtx.font = 'bold 32px sans-serif';
        nameCtx.textAlign = 'center';
        nameCtx.textBaseline = 'middle';
        const displayName = assignedPlayer ? assignedPlayer.name : `${slot.label} (Open)`;
        nameCtx.fillText(displayName, 190, 48);
      }

      const nameTex = new THREE.CanvasTexture(nameCanvas);
      const nameMat = new THREE.MeshBasicMaterial({
        map: nameTex,
        transparent: true,
        depthTest: false,
      });
      const nameGeo = new THREE.PlaneGeometry(4.2, 1.1);
      const nameplateMesh = new THREE.Mesh(nameGeo, nameMat);
      nameplateMesh.name = 'nameplate';
      nameplateMesh.position.y = (isSelected ? 0.4 : 0) + tokenHeight + 1.2;
      tokenRoot.add(nameplateMesh);

      tokenGroup.add(tokenRoot);
      interactablesRef.current.push(tokenMesh);
    });
  }, [match?.roster, activeAssignments, activeFormation, selectedSlotKey, selectedPlayerId, activeViewMode, currentUser?.id]);

  const handleSelectSlotSafe = (key: string) => {
    if (onSelectSlot) {
      onSelectSlot(key);
    }
    const allSlots = [
      ...(activeFormation?.slots?.green || []),
      ...(activeFormation?.slots?.blue || []),
    ];
    const targetSlot = allSlots.find((s) => s.key === key);
    if (targetSlot && onSelectPlayer) {
      const assignedUserId = activeAssignments[key];
      const player = (match?.roster || []).find((p) => p.userId === assignedUserId);
      if (player) {
        onSelectPlayer(player);
      }
    }
  };

  // Pointer & Raycasting Interactions
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isTouchOrbitLocked && e.pointerType === 'touch') {
      return;
    }
    isDragging.current = true;
    prevMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging.current) {
      if (isTouchOrbitLocked && e.pointerType === 'touch') return;
      setIsOrbiting(true);
      const deltaX = e.clientX - prevMousePos.current.x;
      const deltaY = e.clientY - prevMousePos.current.y;
      prevMousePos.current = { x: e.clientX, y: e.clientY };

      orbitAngles.current.theta -= deltaX * 0.007;
      orbitAngles.current.phi = Math.max(0.1, Math.min(Math.PI / 2.2, orbitAngles.current.phi + deltaY * 0.007));
    } else {
      if (!mountRef.current || !cameraRef.current || !sceneRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);
      const intersects = raycaster.intersectObjects(interactablesRef.current, false);

      if (intersects.length > 0) {
        const parentToken = intersects[0].object.parent;
        if (parentToken) {
          setHoveredSlotKey(parentToken.name);
          mountRef.current.style.cursor = 'pointer';
        }
      } else {
        setHoveredSlotKey(null);
        mountRef.current.style.cursor = 'grab';
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const wasDragging = isOrbiting;
    isDragging.current = false;
    setIsOrbiting(false);

    if (!wasDragging && mountRef.current && cameraRef.current && sceneRef.current) {
      const rect = mountRef.current.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);
      const intersects = raycaster.intersectObjects(interactablesRef.current, false);

      if (intersects.length > 0) {
        const parentToken = intersects[0].object.parent;
        if (parentToken) {
          handleSelectSlotSafe(parentToken.name);
        }
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    orbitAngles.current.radius = Math.max(25, Math.min(95, orbitAngles.current.radius + e.deltaY * 0.04));
  };

  const handleZoom = (delta: number) => {
    orbitAngles.current.radius = Math.max(25, Math.min(95, orbitAngles.current.radius + delta));
  };

  // Fallback 2D Tactical Pitch in case WebGL context is not supported
  if (webGlError) {
    const greenSlots = activeFormation?.slots?.green || [];
    const blueSlots = activeFormation?.slots?.blue || [];
    const slotsToRender = [
      ...(activeViewMode === 'full' || activeViewMode === 'green' ? greenSlots : []),
      ...(activeViewMode === 'full' || activeViewMode === 'blue' ? blueSlots : []),
    ];

    return (
      <div className="relative w-full rounded-3xl overflow-hidden border border-slate-800 bg-[#07130c] p-4 sm:p-6 shadow-2xl min-h-[460px] flex flex-col items-center justify-center">
        <div className="w-full max-w-2xl bg-emerald-950/60 border-2 border-emerald-500/50 rounded-2xl relative aspect-[3/4] sm:aspect-[4/3] shadow-inner overflow-hidden flex flex-col justify-between p-4">
          {/* Halfway line & center circle */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/40 -translate-y-1/2" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border border-white/40" />

          {/* Goal areas */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-16 border-b-2 border-l-2 border-r-2 border-white/40 rounded-b-lg" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-16 border-t-2 border-l-2 border-r-2 border-white/40 rounded-t-lg" />

          {/* Slots */}
          {slotsToRender.map((slot) => {
            const assignedUserId = activeAssignments[slot.key];
            const player = (match?.roster || []).find((p) => p.userId === assignedUserId);
            const isGreen = slot.team === 'green';
            const isSelected = selectedSlotKey === slot.key;

            return (
              <button
                key={slot.key}
                type="button"
                onClick={() => handleSelectSlotSafe(slot.key)}
                style={{ top: `${slot.top}%`, left: `${slot.left}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 cursor-pointer transition-all hover:scale-110 ${
                  isSelected ? 'z-20 scale-110' : 'z-10'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-lg border-2 ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 border-white ring-4 ring-amber-300/50'
                      : player
                      ? isGreen
                        ? 'bg-emerald-600 text-white border-emerald-300'
                        : 'bg-blue-600 text-white border-blue-300'
                      : isGreen
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-600/60'
                      : 'bg-blue-950 text-blue-300 border-blue-600/60'
                  }`}
                >
                  {player ? (player.name ? player.name[0] : 'P') : slot.label}
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-950/80 text-white border border-slate-700 whitespace-nowrap shadow-sm">
                  {player ? player.name.split(' ')[0] : slot.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <span>Interactive 2D tactical view (Hardware acceleration fallback)</span>
        </div>
      </div>
    );
  }

  return (
    <div
      id="tactical-3d-webgl-wrapper"
      className={`relative w-full rounded-3xl overflow-hidden border border-slate-800 bg-[#060913] shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-4 z-50 rounded-2xl' : 'aspect-[16/10] sm:aspect-[16/9] min-h-[460px]'
      }`}
    >
      {/* 3D WebGL Canvas Viewport */}
      <div
        ref={mountRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        className={`w-full h-full select-none ${
          isTouchOrbitLocked ? 'touch-auto cursor-default' : 'touch-none cursor-grab active:cursor-grabbing'
        }`}
      />

      {/* Floating 3D Stadium HUD Overlay */}
      <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between pointer-events-none gap-2 flex-wrap">
        {/* Moroccan League 3D Badge */}
        <div className="flex items-center gap-2 bg-[#080B10]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#E5B869]/30 text-white shadow-xl pointer-events-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-[#E5B869] animate-pulse" />
          <span className="text-xs font-black tracking-wider uppercase bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] bg-clip-text text-transparent">
            Moroccan 3D Stadium
          </span>
          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
            • 360° Tactical Orbit
          </span>
        </div>

        {/* 3D Viewport Angle Presets & Controls */}
        <div className="flex items-center gap-1.5 bg-[#080B10]/90 backdrop-blur-md p-1 rounded-xl border border-[#E5B869]/30 shadow-xl pointer-events-auto">
          <button
            type="button"
            onClick={() => setCameraMode('stadium')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              cameraMode === 'stadium'
                ? 'bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
            title="3D Stadium Isometric Angle"
          >
            <Rotate3d className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">3D Stadium</span>
          </button>

          <button
            type="button"
            onClick={() => setCameraMode('top')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              cameraMode === 'top'
                ? 'bg-[#141A26] text-[#F5D794] border border-[#E5B869]/30 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Overhead Bird's Eye View"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Top-Down</span>
          </button>

          <button
            type="button"
            onClick={() => setCameraMode('green_end')}
            className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              cameraMode === 'green_end'
                ? 'bg-[#0D503C] text-white shadow-md'
                : 'text-slate-400 hover:text-emerald-300'
            }`}
            title="Green Goal End Perspective"
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Green Goal</span>
          </button>

          <button
            type="button"
            onClick={() => setCameraMode('blue_end')}
            className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              cameraMode === 'blue_end'
                ? 'bg-blue-700 text-white shadow-md'
                : 'text-slate-400 hover:text-blue-300'
            }`}
            title="Blue Goal End Perspective"
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Blue Goal</span>
          </button>

          <div className="h-4 w-px bg-[#E5B869]/20 mx-1" />

          {/* Zoom Buttons */}
          <button
            type="button"
            onClick={() => handleZoom(-8)}
            className="p-1.5 text-slate-400 hover:text-[#F5D794] rounded-lg transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleZoom(8)}
            className="p-1.5 text-slate-400 hover:text-[#F5D794] rounded-lg transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Touch Orbit Lock (Mobile Ergonomics) */}
          <button
            type="button"
            onClick={() => setIsTouchOrbitLocked(!isTouchOrbitLocked)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer sm:hidden ${
              isTouchOrbitLocked
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-[#F5D794]'
            }`}
            title={isTouchOrbitLocked ? 'Unlock 3D Camera Orbit' : 'Lock 3D Camera (Allow Page Scroll)'}
          >
            {isTouchOrbitLocked ? <Lock className="w-3.5 h-3.5 text-amber-300" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-slate-400 hover:text-[#F5D794] rounded-lg transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand 3D Pitch'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Bottom Interactive Guide Tip & 3D Selected Position Callout */}
      <div className="absolute bottom-3.5 left-3.5 right-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pointer-events-none">
        {/* Left: General 3D guide or Slot Info */}
        {!selectedSlotKey ? (
          <div className="bg-[#080B10]/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-[#E5B869]/30 text-[11px] text-slate-300 flex items-center gap-2 shadow-xl pointer-events-auto">
            <Info className="w-4 h-4 text-[#E5B869] shrink-0" />
            <span>
              <strong className="text-[#F5D794]">3D Pitch:</strong> Click any player token to select & lock your exact playing position
            </span>
          </div>
        ) : (
          (() => {
            const allSlots = formation ? [...formation.slots.green, ...formation.slots.blue] : [];
            const activeSlot = allSlots.find((s) => s.key === selectedSlotKey);
            const occupantId = assignments ? assignments[selectedSlotKey] : null;
            const occupant = occupantId ? match.roster.find((p) => p.userId === occupantId) : null;

            if (!activeSlot) return null;

            return (
              <div className="bg-[#141A26]/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border-2 border-[#E5B869] shadow-2xl flex items-center justify-between gap-3 text-white pointer-events-auto animate-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shadow-md ${
                      activeSlot.team === 'green' ? 'bg-[#0D503C] text-white' : 'bg-blue-600 text-white'
                    }`}
                  >
                    {activeSlot.label}
                  </div>
                  <div>
                    <div className="text-xs font-black text-[#F5D794] flex items-center gap-1.5">
                      <span>{activeSlot.team === 'green' ? 'Team Green' : 'Team Blue'}</span>
                      <span>• {activeSlot.label} ({activeSlot.roleDescription})</span>
                    </div>
                    <div className="text-[11px] text-slate-300 flex items-center gap-1.5 mt-0.5">
                      {occupant ? (
                        occupant.userId === currentUser.id ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Locked by You
                          </span>
                        ) : (
                          <span className="text-amber-300 font-medium flex items-center gap-1">
                            <Lock className="w-3 h-3 text-amber-400" /> Locked & Reserved by {occupant.name}
                          </span>
                        )
                      ) : (
                        <span className="text-emerald-300 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Open Position (Available to lock)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {onSelfClaimSlot && (
                  occupant && occupant.userId !== currentUser.id ? (
                    <div className="px-3 py-1.5 bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold rounded-xl flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Position Reserved</span>
                    </div>
                  ) : occupant && occupant.userId === currentUser.id ? (
                    <div className="px-3.5 py-1.5 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-black rounded-xl shadow-lg flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Your Locked Spot</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelfClaimSlot(activeSlot)}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:opacity-90 text-slate-950 text-xs font-black rounded-xl shadow-lg border border-[#F5D794] flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                    >
                      <Lock className="w-3.5 h-3.5 text-slate-950" />
                      <span>Lock & Reserve Position</span>
                    </button>
                  )
                )}
              </div>
            );
          })()
        )}

        {hoveredSlotKey && !selectedSlotKey && (
          <div className="bg-gradient-to-r from-[#F5D794] to-[#E5B869] text-slate-950 px-3.5 py-1.5 rounded-xl font-black text-xs shadow-xl animate-pulse pointer-events-auto self-end">
            Click to select position ⚽
          </div>
        )}
      </div>
    </div>
  );
};
