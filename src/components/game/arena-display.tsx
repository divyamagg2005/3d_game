
"use client";

import { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { PLAYER_SPEED, PLAYER_SENSITIVITY, GROUND_SIZE } from '@/config/game-constants';

interface DayNightPhase {
  name: string;
  duration: number; // as a fraction of total cycle time
  ambient: [number, number]; // [color, intensity]
  directional: [number, number]; // [color, intensity]
  background: number; // color
  fog: number; // color
}

const dayNightCycleConfig = {
  cycleDuration: 120, // 120 seconds for a full cycle (2 minutes)
  phases: [
    { name: 'Day', duration: 0.4, ambient: [0xffffff, 0.9], directional: [0xffffff, 1.2], background: 0x87CEEB, fog: 0x87CEEB },
    { name: 'Dusk', duration: 0.15, ambient: [0xffaa55, 0.6], directional: [0xffaa55, 0.8], background: 0xffaa55, fog: 0xffaa55 },
    { name: 'Night', duration: 0.3, ambient: [0x222244, 0.3], directional: [0x444488, 0.4], background: 0x00001a, fog: 0x00001a },
    { name: 'Dawn', duration: 0.15, ambient: [0xffaa55, 0.5], directional: [0xffaa55, 0.7], background: 0x4A3422, fog: 0x4A3422 },
  ] as DayNightPhase[],
};

interface DayNightCycleState {
  currentTime: number;
  currentPhaseDetails: {
    ambientColor: THREE.Color;
    ambientIntensity: number;
    directionalColor: THREE.Color;
    directionalIntensity: number;
    backgroundColor: THREE.Color;
    fogColor: THREE.Color;
  };
}

function getInterpolatedColor(color1: THREE.Color, color2: THREE.Color, factor: number): THREE.Color {
  return new THREE.Color().lerpColors(color1, color2, factor);
}

function getInterpolatedFloat(val1: number, val2: number, factor: number): number {
  return val1 + (val2 - val1) * factor;
}


export default function ArenaDisplay() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<PointerLockControls | null>(null);
  
  const moveForward = useRef(false);
  const moveBackward = useRef(false);
  const moveLeft = useRef(false);
  const moveRight = useRef(false);
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const prevTime = useRef(performance.now());
  const isPaused = useRef(false);

  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const directionalLightRef = useRef<THREE.DirectionalLight | null>(null);

  const [dayNightCycle, setDayNightCycle] = useState<DayNightCycleState>(() => {
    const initialPhase = dayNightCycleConfig.phases[0];
    return {
      currentTime: 0,
      currentPhaseDetails: {
        ambientColor: new THREE.Color(initialPhase.ambient[0]),
        ambientIntensity: initialPhase.ambient[1],
        directionalColor: new THREE.Color(initialPhase.directional[0]),
        directionalIntensity: initialPhase.directional[1],
        backgroundColor: new THREE.Color(initialPhase.background),
        fogColor: new THREE.Color(initialPhase.fog),
      },
    };
  });


  const onKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        moveForward.current = true;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        moveLeft.current = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        moveBackward.current = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        moveRight.current = true;
        break;
      case 'KeyP': {
        isPaused.current = !isPaused.current;
        const pausedMessageEl = document.getElementById('paused-message');
        const instructionsEl = document.getElementById('instructions');
        const blockerEl = document.getElementById('blocker');

        if (isPaused.current) {
          if (controlsRef.current?.isLocked) {
            controlsRef.current.unlock(); 
          } else {
            if (blockerEl) blockerEl.style.display = 'grid';
            if (pausedMessageEl) pausedMessageEl.style.display = 'block';
            if (instructionsEl) instructionsEl.style.display = 'none';
          }
        } else {
          if (pausedMessageEl) pausedMessageEl.style.display = 'none';
          if (instructionsEl) instructionsEl.style.display = ''; 
          if (blockerEl && !controlsRef.current?.isLocked) blockerEl.style.display = 'grid';
        }
        break;
      }
    }
  }, []);

  const onKeyUp = useCallback((event: KeyboardEvent) => {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        moveForward.current = false;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        moveLeft.current = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        moveBackward.current = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        moveRight.current = false;
        break;
    }
  }, []);

  const clickToLockHandler = useCallback(() => {
    if (!isPaused.current && controlsRef.current && !controlsRef.current.isLocked) {
        controlsRef.current.lock();
    }
  }, []);

  const onLockHandler = useCallback(() => {
    const instructionsEl = document.getElementById('instructions');
    const blockerEl = document.getElementById('blocker');
    const pausedMessageEl = document.getElementById('paused-message');

    if (instructionsEl) instructionsEl.style.display = 'none';
    if (blockerEl) blockerEl.style.display = 'none';
    if (pausedMessageEl) pausedMessageEl.style.display = 'none';
    
    isPaused.current = false; 
  }, []);

  const onUnlockHandler = useCallback(() => {
    const instructionsEl = document.getElementById('instructions');
    const blockerEl = document.getElementById('blocker');
    const pausedMessageEl = document.getElementById('paused-message');

    if (blockerEl) blockerEl.style.display = 'grid';

    if (isPaused.current) {
      if (pausedMessageEl) pausedMessageEl.style.display = 'block';
      if (instructionsEl) instructionsEl.style.display = 'none';
    } else {
      if (pausedMessageEl) pausedMessageEl.style.display = 'none';
      if (instructionsEl) instructionsEl.style.display = '';
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !mountRef.current) return;

    const currentMount = mountRef.current;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
    camera.position.set(0, 1.7, 5); 
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    currentMount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new PointerLockControls(camera, renderer.domElement);
    controls.pointerSpeed = PLAYER_SENSITIVITY / 0.002; 
    scene.add(controls.getObject());
    controlsRef.current = controls;
    
    const instructionsElement = document.getElementById('instructions');
    const blockerElement = document.getElementById('blocker');
    const pausedMessageElement = document.getElementById('paused-message');

    if (blockerElement) { 
      blockerElement.addEventListener('click', clickToLockHandler); 
    }
    controls.addEventListener('lock', onLockHandler);
    controls.addEventListener('unlock', onUnlockHandler);
      
    if (pausedMessageElement) pausedMessageElement.style.display = 'none';
    if (!controls.isLocked && currentMount) { 
      if (blockerElement) blockerElement.style.display = 'grid';
      if (instructionsElement) instructionsElement.style.display = '';
      if (isPaused.current) { 
           if (pausedMessageElement) pausedMessageElement.style.display = 'block';
           if (instructionsElement) instructionsElement.style.display = 'none';
      }
    } else {
      if (blockerElement) blockerElement.style.display = 'none';
      if (instructionsElement) instructionsElement.style.display = 'none';
      if (pausedMessageElement) pausedMessageElement.style.display = 'none';
      isPaused.current = false; 
    }
    
    ambientLightRef.current = new THREE.AmbientLight();
    scene.add(ambientLightRef.current);

    directionalLightRef.current = new THREE.DirectionalLight();
    directionalLightRef.current.position.set(20, 50, 20);
    directionalLightRef.current.castShadow = true;
    directionalLightRef.current.shadow.mapSize.width = 2048;
    directionalLightRef.current.shadow.mapSize.height = 2048;
    directionalLightRef.current.shadow.camera.near = 0.5;
    directionalLightRef.current.shadow.camera.far = 500;
    directionalLightRef.current.shadow.camera.left = -GROUND_SIZE; 
    directionalLightRef.current.shadow.camera.right = GROUND_SIZE;
    directionalLightRef.current.shadow.camera.top = GROUND_SIZE;
    directionalLightRef.current.shadow.camera.bottom = -GROUND_SIZE;
    scene.add(directionalLightRef.current);
    
    // Texture Loading
    const textureLoader = new THREE.TextureLoader();
    const groundTexture = textureLoader.load('/textures/ground-texture.jpeg');
    const roofTexture = textureLoader.load('/textures/roof-texture.jpeg');
    const wallTexture1 = textureLoader.load('/textures/wall-texture-1.jpeg'); // Residential
    const wallTexture2 = textureLoader.load('/textures/wall-texture-2.jpeg'); // Commercial & Downtown
    const wallTexture3 = textureLoader.load('/textures/wall-texture-3.jpeg'); // Industrial

    const allTextures = [groundTexture, roofTexture, wallTexture1, wallTexture2, wallTexture3];
    allTextures.forEach(texture => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
    });

    groundTexture.repeat.set(GROUND_SIZE / 10, GROUND_SIZE / 10); 

    // Materials
    const texturedGroundMaterial = new THREE.MeshStandardMaterial({ 
      map: groundTexture, 
      roughness: 0.9, 
      metalness: 0.1 
    });
    
    const placeholderBottomMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9, metalness: 0.1 });

    const makeBuildingFaceMaterials = (wallMap: THREE.Texture, roofMap: THREE.Texture, sideRoughness: number, sideMetalness: number) => [
      new THREE.MeshStandardMaterial({ map: wallMap, roughness: sideRoughness, metalness: sideMetalness }), 
      new THREE.MeshStandardMaterial({ map: wallMap, roughness: sideRoughness, metalness: sideMetalness }), 
      new THREE.MeshStandardMaterial({ map: roofMap, roughness: 0.8, metalness: 0.2 }),    
      placeholderBottomMaterial,                                                                             
      new THREE.MeshStandardMaterial({ map: wallMap, roughness: sideRoughness, metalness: sideMetalness }), 
      new THREE.MeshStandardMaterial({ map: wallMap, roughness: sideRoughness, metalness: sideMetalness })  
    ];

    const residentialMaterials = makeBuildingFaceMaterials(wallTexture1, roofTexture, 0.8, 0.2);
    const commercialMaterials = makeBuildingFaceMaterials(wallTexture2, roofTexture, 0.6, 0.4);
    const industrialMaterials = makeBuildingFaceMaterials(wallTexture3, roofTexture, 0.9, 0.6);
    const downtownMaterials = makeBuildingFaceMaterials(wallTexture2, roofTexture, 0.4, 0.7); 
    
    const smokestackMaterial = new THREE.MeshStandardMaterial({ map: wallTexture3, roughness: 0.9, metalness: 0.6 });


    const groundGeometry = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE);
    const ground = new THREE.Mesh(groundGeometry, texturedGroundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const wallHeight = GROUND_SIZE ; 
    const wallThickness = 10; 
    const boundaryWallMaterial = new THREE.MeshStandardMaterial({ color: 0x1A1A1D, roughness: 0.95, metalness: 0.1 }); 
    
    const wallN = new THREE.Mesh(new THREE.BoxGeometry(GROUND_SIZE + wallThickness * 2, wallHeight, wallThickness), boundaryWallMaterial);
    wallN.position.set(0, wallHeight/2, -GROUND_SIZE/2 - wallThickness/2);
    wallN.castShadow = true; wallN.receiveShadow = true; scene.add(wallN);
    
    const wallS = new THREE.Mesh(new THREE.BoxGeometry(GROUND_SIZE + wallThickness * 2, wallHeight, wallThickness), boundaryWallMaterial);
    wallS.position.set(0, wallHeight/2, GROUND_SIZE/2 + wallThickness/2);
    wallS.castShadow = true; wallS.receiveShadow = true; scene.add(wallS);

    const wallE = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, GROUND_SIZE), boundaryWallMaterial);
    wallE.position.set(GROUND_SIZE/2 + wallThickness/2, wallHeight/2, 0);
    wallE.castShadow = true; wallE.receiveShadow = true; scene.add(wallE);

    const wallW = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, GROUND_SIZE), boundaryWallMaterial);
    wallW.position.set(-GROUND_SIZE/2 - wallThickness/2, wallHeight/2, 0);
    wallW.castShadow = true; wallW.receiveShadow = true; scene.add(wallW);

    const buildingOffset = GROUND_SIZE / 4; 
    const buildings: THREE.Mesh[] = [];

    // Function to add a building
    const addBuilding = (geometry: THREE.BufferGeometry, materials: THREE.Material | THREE.Material[], x: number, y: number, z: number) => {
      const building = new THREE.Mesh(geometry, materials);
      building.position.set(x, y, z);
      building.castShadow = true;
      building.receiveShadow = true;
      scene.add(building);
      buildings.push(building);
    };
    
    // Residential Area (More houses and blocks)
    addBuilding(new THREE.BoxGeometry(4, 3, 5), residentialMaterials, -buildingOffset, 1.5, -buildingOffset + 5);
    addBuilding(new THREE.BoxGeometry(5, 2.5, 4), residentialMaterials, -buildingOffset + 8, 1.25, -buildingOffset -2);
    addBuilding(new THREE.BoxGeometry(6, 8, 5), residentialMaterials, -buildingOffset - 5, 4, -buildingOffset - 8);
    addBuilding(new THREE.BoxGeometry(4.5, 3.5, 5.5), residentialMaterials, -buildingOffset - 12, 1.75, -buildingOffset + 10);
    addBuilding(new THREE.BoxGeometry(5, 3, 4.5), residentialMaterials, -buildingOffset + 15, 1.5, -buildingOffset + 15);
    addBuilding(new THREE.BoxGeometry(3.5, 2, 6), residentialMaterials, -buildingOffset + 2, 1, -buildingOffset -15);


    // Commercial Zone (More shops and offices)
    addBuilding(new THREE.BoxGeometry(7, 5, 6), commercialMaterials, buildingOffset, 2.5, -buildingOffset);
    addBuilding(new THREE.BoxGeometry(5, 10, 5), commercialMaterials, buildingOffset + 10, 5, -buildingOffset + 8);
    addBuilding(new THREE.BoxGeometry(8, 6, 7), commercialMaterials, buildingOffset - 8, 3, -buildingOffset - 10);
    addBuilding(new THREE.BoxGeometry(6, 9, 6), commercialMaterials, buildingOffset + 18, 4.5, -buildingOffset - 5);
    addBuilding(new THREE.BoxGeometry(7.5, 5.5, 6.5), commercialMaterials, buildingOffset + 3, 2.75, -buildingOffset + 18);


    // Industrial Sector (More warehouses and factories)
    addBuilding(new THREE.BoxGeometry(15, 6, 10), industrialMaterials, -buildingOffset + 5, 3, buildingOffset);
    const factory = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 8), industrialMaterials);
    factory.position.set(-buildingOffset - 10, 4, buildingOffset + 12);
    factory.castShadow = true; factory.receiveShadow = true; scene.add(factory); buildings.push(factory);
    const factorySmokestack = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 18, 16), smokestackMaterial); 
    factorySmokestack.position.set(-buildingOffset - 13.5, 9 + 1.5, buildingOffset + 14); 
    factorySmokestack.castShadow = true; factorySmokestack.receiveShadow = true; scene.add(factorySmokestack); buildings.push(factorySmokestack);
    addBuilding(new THREE.BoxGeometry(12, 7, 9), industrialMaterials, -buildingOffset - 20, 3.5, buildingOffset - 5);
    addBuilding(new THREE.BoxGeometry(18, 5, 12), industrialMaterials, -buildingOffset + 20, 2.5, buildingOffset + 20);


    // Downtown Area (More taller buildings)
    addBuilding(new THREE.BoxGeometry(6, 15, 6), downtownMaterials, buildingOffset, 7.5, buildingOffset);
    addBuilding(new THREE.BoxGeometry(7, 25, 7), downtownMaterials, buildingOffset + 12, 12.5, buildingOffset + 12); // Landmark
    addBuilding(new THREE.BoxGeometry(5.5, 20, 5.5), downtownMaterials, buildingOffset - 7, 10, buildingOffset + 8);
    addBuilding(new THREE.BoxGeometry(6.5, 18, 6.5), downtownMaterials, buildingOffset + 20, 9, buildingOffset - 10);
    addBuilding(new THREE.BoxGeometry(5, 22, 5), downtownMaterials, buildingOffset - 15, 11, buildingOffset - 15);

    // Some smaller, generic obstacles for more hiding spots
    addBuilding(new THREE.BoxGeometry(2, 2, 2), commercialMaterials, 0, 1, 15);
    addBuilding(new THREE.BoxGeometry(3, 1.5, 4), residentialMaterials, -10, 0.75, 20);
    addBuilding(new THREE.BoxGeometry(2.5, 3, 2.5), industrialMaterials, 15, 1.5, -20);
    addBuilding(new THREE.BoxGeometry(4, 2.5, 3), downtownMaterials, 25, 1.25, 25);


    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    const handleResize = () => {
      if (cameraRef.current && rendererRef.current && mountRef.current) {
        cameraRef.current.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const time = performance.now();
      const delta = (time - prevTime.current) / 1000;
      
      if (isPaused.current) {
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
        prevTime.current = time - delta * 1000; 
        return;
      }
      
      if (controlsRef.current?.isLocked === true) {
        velocity.current.x -= velocity.current.x * 10.0 * delta;
        velocity.current.z -= velocity.current.z * 10.0 * delta;

        direction.current.z = Number(moveForward.current) - Number(moveBackward.current);
        direction.current.x = Number(moveRight.current) - Number(moveLeft.current);
        direction.current.normalize();

        if (moveForward.current || moveBackward.current) velocity.current.z -= direction.current.z * PLAYER_SPEED * 10.0 * delta;
        if (moveLeft.current || moveRight.current) velocity.current.x -= direction.current.x * PLAYER_SPEED * 10.0 * delta;
        
        controlsRef.current.moveRight(-velocity.current.x * delta);
        controlsRef.current.moveForward(-velocity.current.z * delta);

        const camPos = controlsRef.current.getObject().position;
        const halfGroundMinusWall = GROUND_SIZE / 2 - wallThickness / 2 - 1.0; 
        camPos.x = Math.max(-halfGroundMinusWall, Math.min(halfGroundMinusWall, camPos.x));
        camPos.z = Math.max(-halfGroundMinusWall, Math.min(halfGroundMinusWall, camPos.z));
        camPos.y = 1.7; 
      }
      prevTime.current = time;
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Day/Night cycle interval
    const cycleIntervalId = setInterval(() => {
      if (isPaused.current) return;

      setDayNightCycle(prev => {
        const newTime = (prev.currentTime + 1) % dayNightCycleConfig.cycleDuration;
        let accumulatedDuration = 0;
        let currentPhaseIndex = 0;
        let nextPhaseIndex = 0;
        let segmentProgress = 0;

        for (let i = 0; i < dayNightCycleConfig.phases.length; i++) {
          const phase = dayNightCycleConfig.phases[i];
          const phaseActualDuration = phase.duration * dayNightCycleConfig.cycleDuration;
          if (newTime < accumulatedDuration + phaseActualDuration) {
            currentPhaseIndex = i;
            nextPhaseIndex = (i + 1) % dayNightCycleConfig.phases.length;
            segmentProgress = (newTime - accumulatedDuration) / phaseActualDuration;
            break;
          }
          accumulatedDuration += phaseActualDuration;
        }

        const currentPhase = dayNightCycleConfig.phases[currentPhaseIndex];
        const nextPhase = dayNightCycleConfig.phases[nextPhaseIndex];

        const newDetails = {
          ambientColor: getInterpolatedColor(new THREE.Color(currentPhase.ambient[0]), new THREE.Color(nextPhase.ambient[0]), segmentProgress),
          ambientIntensity: getInterpolatedFloat(currentPhase.ambient[1], nextPhase.ambient[1], segmentProgress),
          directionalColor: getInterpolatedColor(new THREE.Color(currentPhase.directional[0]), new THREE.Color(nextPhase.directional[0]), segmentProgress),
          directionalIntensity: getInterpolatedFloat(currentPhase.directional[1], nextPhase.directional[1], segmentProgress),
          backgroundColor: getInterpolatedColor(new THREE.Color(currentPhase.background), new THREE.Color(nextPhase.background), segmentProgress),
          fogColor: getInterpolatedColor(new THREE.Color(currentPhase.fog), new THREE.Color(nextPhase.fog), segmentProgress),
        };
        return { currentTime: newTime, currentPhaseDetails: newDetails };
      });
    }, 1000); // Update cycle every second


    return () => {
      cancelAnimationFrame(animationFrameId);
      clearInterval(cycleIntervalId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);

      const currentBlocker = document.getElementById('blocker');
      if (currentBlocker) {
        currentBlocker.removeEventListener('click', clickToLockHandler);
      }
      
      if (controlsRef.current) {
        controlsRef.current.removeEventListener('lock', onLockHandler);
        controlsRef.current.removeEventListener('unlock', onUnlockHandler);
        if (controlsRef.current.isLocked) { 
          controlsRef.current.unlock();
        }
        controlsRef.current.dispose();
      }

      allTextures.forEach(texture => texture.dispose());
      placeholderBottomMaterial.dispose();
      residentialMaterials.forEach(material => material.dispose());
      commercialMaterials.forEach(material => material.dispose());
      industrialMaterials.forEach(material => material.dispose());
      downtownMaterials.forEach(material => material.dispose());
      smokestackMaterial.dispose();
      boundaryWallMaterial.dispose();
      texturedGroundMaterial.dispose();
      
      if (rendererRef.current) {
         rendererRef.current.dispose();
         if (sceneRef.current) {
             sceneRef.current.traverse(object => {
                if (object instanceof THREE.Mesh) {
                    if (object.geometry) object.geometry.dispose();
                    // Materials are disposed above or handled by the arrays
                }
             });
             buildings.forEach(building => {
                if(building.geometry) building.geometry.dispose();
                // materials disposed above
             });
         }
      }
      
      if (mountRef.current && rendererRef.current?.domElement && currentMount.contains(rendererRef.current.domElement)) {
           currentMount.removeChild(rendererRef.current.domElement);
      }
      
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
      ambientLightRef.current = null;
      directionalLightRef.current = null;
    };
  }, [onKeyDown, onKeyUp, clickToLockHandler, onLockHandler, onUnlockHandler]); 

  useEffect(() => {
    if (sceneRef.current && ambientLightRef.current && directionalLightRef.current) {
      sceneRef.current.background = dayNightCycle.currentPhaseDetails.backgroundColor;
      sceneRef.current.fog = new THREE.Fog(dayNightCycle.currentPhaseDetails.fogColor, GROUND_SIZE / 6, GROUND_SIZE * 0.75);
      ambientLightRef.current.color = dayNightCycle.currentPhaseDetails.ambientColor;
      ambientLightRef.current.intensity = dayNightCycle.currentPhaseDetails.ambientIntensity;
      directionalLightRef.current.color = dayNightCycle.currentPhaseDetails.directionalColor;
      directionalLightRef.current.intensity = dayNightCycle.currentPhaseDetails.directionalIntensity;
    }
  }, [dayNightCycle]);


  return <div ref={mountRef} className="w-full h-full cursor-grab focus:cursor-grabbing" tabIndex={-1} />;
}
