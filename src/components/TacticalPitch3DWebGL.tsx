import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { SoccerMatch, PlayerPosition } from '../types';
import { SlotDefinition, FormationConfig } from './TacticalPitchFormation';
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
} from 'lucide-react';

interface TacticalPitch3DWebGLProps {
  match: SoccerMatch;
  formation: FormationConfig;
  assignments: Record<string, string>;
  selectedSlotKey: string | null;
  viewMode: 'full' | 'green' | 'blue';
  onSelectSlot: (slotKey: string) => void;
  onSelfClaimSlot: (slot: SlotDefinition) => void;
}

// Convert 0-100 percentage coordinates to 3D Pitch coordinates
// Pitch dimensions: Width X = 46, Length Z = 68 (standard 105x68 proportion scaled)
const PITCH_WIDTH = 44;
const PITCH_LENGTH = 64;

function slotTo3DPos(leftPct: number, topPct: number): THREE.Vector3 {
  // leftPct: 0 (left) to 100 (right) -> X from -PITCH_WIDTH/2 to +PITCH_WIDTH/2
  const x = ((leftPct - 50) / 100) * (PITCH_WIDTH * 0.88);
  // topPct: 0 (north/blue goal) to 100 (south/green goal) -> Z from -PITCH_LENGTH/2 to +PITCH_LENGTH/2
  const z = ((topPct - 50) / 100) * (PITCH_LENGTH * 0.88);
  return new THREE.Vector3(x, 0.45, z);
}

export const TacticalPitch3DWebGL: React.FC<TacticalPitch3DWebGLProps> = ({
  match,
  formation,
  assignments,
  selectedSlotKey,
  viewMode,
  onSelectSlot,
  onSelfClaimSlot,
}) => {
  const { currentUser } = usePitchStore();
  const mountRef = useRef<HTMLDivElement>(null);

  // Camera presets
  const [cameraMode, setCameraMode] = useState<'stadium' | 'top' | 'green_end' | 'blue_end'>('stadium');
  const [isOrbiting, setIsOrbiting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredSlotKey, setHoveredSlotKey] = useState<string | null>(null);

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

    // 1. Create Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x060913);
    scene.fog = new THREE.FogExp2(0x060913, 0.008);

    // 2. Create Camera
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 560;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 500);
    camera.position.set(0, 45, 50);
    cameraRef.current = camera;

    // 3. Create Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
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
      // Light post pole
      const poleGeo = new THREE.CylinderGeometry(0.35, 0.5, fy, 8);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
      const poleMesh = new THREE.Mesh(poleGeo, poleMat);
      poleMesh.position.set(fx, fy / 2, fz);
      scene.add(poleMesh);

      // Light Head Fixture
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

      // Spot Light
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

      // Outer Boundary
      ctx.strokeRect(padX, padY, fieldW, fieldH);

      // Halfway Line
      const midY = ch / 2;
      ctx.beginPath();
      ctx.moveTo(padX, midY);
      ctx.lineTo(padX + fieldW, midY);
      ctx.stroke();

      // Center Circle & Spot
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
      ctx.strokeRect((cw - penBoxW) / 2, padY, penBoxW, penBoxH);

      // North 6-Yard Box
      const sixBoxW = fieldW * 0.28;
      const sixBoxH = fieldH * 0.08;
      ctx.strokeRect((cw - sixBoxW) / 2, padY, sixBoxW, sixBoxH);

      // North Penalty Spot & Arc
      ctx.beginPath();
      ctx.arc(cw / 2, padY + penBoxH * 0.65, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cw / 2, padY + penBoxH * 0.65, centerRadius * 0.7, 0.25 * Math.PI, 0.75 * Math.PI, false);
      ctx.stroke();

      // South Penalty Box (Green End)
      ctx.strokeRect((cw - penBoxW) / 2, padY + fieldH - penBoxH, penBoxW, penBoxH);

      // South 6-Yard Box
      ctx.strokeRect((cw - sixBoxW) / 2, padY + fieldH - sixBoxH, sixBoxW, sixBoxH);

      // South Penalty Spot & Arc
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
    pitchTexture.anisotropy = 8;

    // 6. Pitch Mesh Plane with Beveled Base Board
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

    // Stadium Outer Apron / Ground
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

      // Left & Right Vertical Posts
      const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 16);
      const leftPost = new THREE.Mesh(postGeo, postMat);
      leftPost.position.set(-goalWidth / 2, postHeight / 2, 0);
      leftPost.castShadow = true;
      goalGroup.add(leftPost);

      const rightPost = new THREE.Mesh(postGeo, postMat);
      rightPost.position.set(goalWidth / 2, postHeight / 2, 0);
      rightPost.castShadow = true;
      goalGroup.add(rightPost);

      // Horizontal Crossbar
      const crossGeo = new THREE.CylinderGeometry(postRadius, postRadius, goalWidth + postRadius * 2, 16);
      const crossbar = new THREE.Mesh(crossGeo, postMat);
      crossbar.rotation.z = Math.PI / 2;
      crossbar.position.set(0, postHeight, 0);
      crossbar.castShadow = true;
      goalGroup.add(crossbar);

      // Back Support Net Tubes
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

      // Goal Net Canvas Mesh
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

      // Back Net Wall
      const backNetGeo = new THREE.PlaneGeometry(goalWidth, postHeight);
      const backNet = new THREE.Mesh(backNetGeo, netMat);
      backNet.position.set(0, postHeight / 2, -goalDir * goalDepth);
      goalGroup.add(backNet);

      // Top Sloped Net
      const topNetGeo = new THREE.PlaneGeometry(goalWidth, goalDepth * 1.1);
      const topNet = new THREE.Mesh(topNetGeo, netMat);
      topNet.rotation.x = isNorth ? Math.PI / 2.2 : -Math.PI / 2.2;
      topNet.position.set(0, postHeight * 0.85, -goalDir * (goalDepth / 2));
      goalGroup.add(topNet);

      goalGroup.position.set(0, 0, goalZ);
      return goalGroup;
    };

    scene.add(create3DGoal(true)); // North (Blue)
    scene.add(create3DGoal(false)); // South (Green)

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

    // Resize Handler
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Render Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (cameraRef.current) {
        // Calculate camera position from spherical orbit angles
        const { theta, phi, radius } = orbitAngles.current;
        const cx = radius * Math.sin(phi) * Math.sin(theta);
        const cy = radius * Math.cos(phi);
        const cz = radius * Math.sin(phi) * Math.cos(theta);

        targetCamPos.current.set(cx, Math.max(cy, 5), cz);

        // Smooth camera lerp
        cameraRef.current.position.lerp(targetCamPos.current, 0.08);
        cameraRef.current.lookAt(targetCamLook.current);
      }

      // Billboard all text nameplates towards camera
      if (tokenGroupRef.current && cameraRef.current) {
        tokenGroupRef.current.children.forEach((tokenMesh) => {
          const nameplate = tokenMesh.getObjectByName('nameplate');
          if (nameplate) {
            nameplate.quaternion.copy(cameraRef.current.quaternion);
          }
        });
      }

      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update 3D Player Tokens when match roster, assignments, or formation changes
  useEffect(() => {
    const tokenGroup = tokenGroupRef.current;
    if (!tokenGroup) return;

    // Clear existing tokens
    while (tokenGroup.children.length > 0) {
      const obj = tokenGroup.children[0];
      tokenGroup.remove(obj);
    }
    interactablesRef.current = [];

    const slotsToRender = [
      ...(viewMode === 'full' || viewMode === 'green' ? formation.slots.green : []),
      ...(viewMode === 'full' || viewMode === 'blue' ? formation.slots.blue : []),
    ];

    slotsToRender.forEach((slot) => {
      const pos3D = slotTo3DPos(slot.left, slot.top);
      const isGreen = slot.team === 'green';
      const assignedUserId = assignments[slot.key];
      const assignedPlayer = match.roster.find((p) => p.userId === assignedUserId);
      const isSelected = selectedSlotKey === slot.key;
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
          const initials = assignedPlayer.name
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
        // Pill Background
        nameCtx.fillStyle = assignedPlayer
          ? isCurrentUser
            ? 'rgba(245, 158, 11, 0.95)'
            : 'rgba(15, 23, 42, 0.92)'
          : isGreen
          ? 'rgba(6, 78, 59, 0.85)'
          : 'rgba(30, 58, 138, 0.85)';

        // Rounded rect
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

        // Player Name text
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
  }, [match.roster, assignments, formation, selectedSlotKey, viewMode, currentUser.id]);

  // Pointer & Raycasting Interactions
  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    prevMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging.current) {
      setIsOrbiting(true);
      const deltaX = e.clientX - prevMousePos.current.x;
      const deltaY = e.clientY - prevMousePos.current.y;
      prevMousePos.current = { x: e.clientX, y: e.clientY };

      orbitAngles.current.theta -= deltaX * 0.007;
      // Clamp vertical phi between top view (0.1) and stadium ground horizon (Math.PI/2.2)
      orbitAngles.current.phi = Math.max(0.1, Math.min(Math.PI / 2.2, orbitAngles.current.phi + deltaY * 0.007));
    } else {
      // Hover Raycasting
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

    // If it was a clean click without significant drag, do slot selection
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
          onSelectSlot(parentToken.name);
        }
      }
    }
  };

  // Zoom with Wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    orbitAngles.current.radius = Math.max(25, Math.min(95, orbitAngles.current.radius + e.deltaY * 0.04));
  };

  const handleZoom = (delta: number) => {
    orbitAngles.current.radius = Math.max(25, Math.min(95, orbitAngles.current.radius + delta));
  };

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
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none select-none"
      />

      {/* Floating 3D Stadium HUD Overlay */}
      <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between pointer-events-none gap-2 flex-wrap">
        {/* Moroccan League 3D Badge */}
        <div className="flex items-center gap-2 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-white shadow-xl pointer-events-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-black tracking-wider uppercase bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
            True 3D Pitch
          </span>
          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
            • 360° Orbit & Lighting
          </span>
        </div>

        {/* 3D Viewport Angle Presets & Controls */}
        <div className="flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-xl pointer-events-auto">
          <button
            type="button"
            onClick={() => setCameraMode('stadium')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              cameraMode === 'stadium'
                ? 'bg-emerald-600 text-white shadow-md'
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
                ? 'bg-slate-800 text-white shadow-md'
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
                ? 'bg-emerald-700 text-white shadow-md'
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

          <div className="h-4 w-px bg-slate-700 mx-1" />

          {/* Zoom Buttons */}
          <button
            type="button"
            onClick={() => handleZoom(-8)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleZoom(8)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand 3D Pitch'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Bottom Interactive Guide Tip */}
      <div className="absolute bottom-3 left-3.5 right-3.5 flex items-center justify-between pointer-events-none">
        <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] text-slate-300 flex items-center gap-2 shadow-lg">
          <Info className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            <strong>Interactive 3D:</strong> Drag anywhere to orbit 360° • Click any 3D token to assign or claim your position
          </span>
        </div>

        {hoveredSlotKey && (
          <div className="bg-amber-500 text-slate-950 px-3 py-1 rounded-lg font-bold text-xs shadow-lg animate-bounce hidden sm:block">
            Click to manage slot
          </div>
        )}
      </div>
    </div>
  );
};
