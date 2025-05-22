
"use client";

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { PLAYER_SPEED, PLAYER_SENSITIVITY, GROUND_SIZE } from '@/config/game-constants';

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
    if (!isPaused.current) {
        controlsRef.current?.lock();
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
    scene.background = new THREE.Color(0x2A2A2E);
    scene.fog = new THREE.Fog(0x2A2A2E, GROUND_SIZE / 6, GROUND_SIZE * 0.75);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
    camera.position.set(0, 1.7, 5); // Start slightly further back to see initial area
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    currentMount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new PointerLockControls(camera, renderer.domElement);
    scene.add(controls.getObject());
    controlsRef.current = controls;
    
    const instructionsElement = document.getElementById('instructions');
    const blockerElement = document.getElementById('blocker');
    const pausedMessageElement = document.getElementById('paused-message');


    if (instructionsElement && blockerElement) { 
      blockerElement.addEventListener('click', clickToLockHandler); 
    }
    controls.addEventListener('lock', onLockHandler);
    controls.addEventListener('unlock', onUnlockHandler);
      
    if (pausedMessageElement) pausedMessageElement.style.display = 'none';
    if (!controls.isLocked) {
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
    

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(20, 30, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -GROUND_SIZE; 
    directionalLight.shadow.camera.right = GROUND_SIZE;
    directionalLight.shadow.camera.top = GROUND_SIZE;
    directionalLight.shadow.camera.bottom = -GROUND_SIZE;
    scene.add(directionalLight);
    
    const groundGeometry = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8, metalness: 0.2 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const wallHeight = GROUND_SIZE / 3; 
    const wallThickness = 5; 
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x1A1A1D, roughness: 0.95, metalness: 0.1 }); 
    
    const wallN = new THREE.Mesh(new THREE.BoxGeometry(GROUND_SIZE + wallThickness * 2, wallHeight, wallThickness), wallMaterial);
    wallN.position.set(0, wallHeight/2, -GROUND_SIZE/2 - wallThickness/2);
    wallN.castShadow = true; wallN.receiveShadow = true; scene.add(wallN);
    
    const wallS = new THREE.Mesh(new THREE.BoxGeometry(GROUND_SIZE + wallThickness * 2, wallHeight, wallThickness), wallMaterial);
    wallS.position.set(0, wallHeight/2, GROUND_SIZE/2 + wallThickness/2);
    wallS.castShadow = true; wallS.receiveShadow = true; scene.add(wallS);

    const wallE = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, GROUND_SIZE), wallMaterial);
    wallE.position.set(GROUND_SIZE/2 + wallThickness/2, wallHeight/2, 0);
    wallE.castShadow = true; wallE.receiveShadow = true; scene.add(wallE);

    const wallW = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, GROUND_SIZE), wallMaterial);
    wallW.position.set(-GROUND_SIZE/2 - wallThickness/2, wallHeight/2, 0);
    wallW.castShadow = true; wallW.receiveShadow = true; scene.add(wallW);

    // District Materials
    const residentialMaterial = new THREE.MeshStandardMaterial({ color: 0xA0A0A0, roughness: 0.8, metalness: 0.2 });
    const commercialMaterial = new THREE.MeshStandardMaterial({ color: 0x708090, roughness: 0.6, metalness: 0.4 });
    const industrialMaterial = new THREE.MeshStandardMaterial({ color: 0x4A4A4A, roughness: 0.9, metalness: 0.6 });
    const downtownMaterial = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.4, metalness: 0.7 });

    const buildingOffset = GROUND_SIZE / 4; // Place districts roughly in quadrants

    // Residential Area (NW Quadrant: x < 0, z < 0)
    const house1 = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 5), residentialMaterial);
    house1.position.set(-buildingOffset, 1.5, -buildingOffset + 5);
    house1.castShadow = true; house1.receiveShadow = true; scene.add(house1);

    const house2 = new THREE.Mesh(new THREE.BoxGeometry(5, 2.5, 4), residentialMaterial);
    house2.position.set(-buildingOffset + 8, 1.25, -buildingOffset -2);
    house2.castShadow = true; house2.receiveShadow = true; scene.add(house2);
    
    const apartmentBlock = new THREE.Mesh(new THREE.BoxGeometry(6, 8, 5), residentialMaterial);
    apartmentBlock.position.set(-buildingOffset - 5, 4, -buildingOffset - 8);
    apartmentBlock.castShadow = true; apartmentBlock.receiveShadow = true; scene.add(apartmentBlock);

    // Commercial Zone (NE Quadrant: x > 0, z < 0)
    const shop1 = new THREE.Mesh(new THREE.BoxGeometry(7, 5, 6), commercialMaterial);
    shop1.position.set(buildingOffset, 2.5, -buildingOffset);
    shop1.castShadow = true; shop1.receiveShadow = true; scene.add(shop1);

    const office1 = new THREE.Mesh(new THREE.BoxGeometry(5, 10, 5), commercialMaterial);
    office1.position.set(buildingOffset + 10, 5, -buildingOffset + 8);
    office1.castShadow = true; office1.receiveShadow = true; scene.add(office1);

    // Industrial Sector (SW Quadrant: x < 0, z > 0)
    const warehouse = new THREE.Mesh(new THREE.BoxGeometry(15, 6, 10), industrialMaterial);
    warehouse.position.set(-buildingOffset + 5, 3, buildingOffset);
    warehouse.castShadow = true; warehouse.receiveShadow = true; scene.add(warehouse);

    const factory = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 8), industrialMaterial);
    const factorySmokestack = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 12, 16), industrialMaterial);
    factory.position.set(-buildingOffset - 10, 4, buildingOffset + 12);
    factorySmokestack.position.set(-buildingOffset - 13, 10, buildingOffset + 14); // Position relative to factory
    factory.castShadow = true; factory.receiveShadow = true; scene.add(factory);
    factorySmokestack.castShadow = true; factorySmokestack.receiveShadow = true; scene.add(factorySmokestack);


    // Downtown Hint (SE Quadrant: x > 0, z > 0)
    const tallerBuilding1 = new THREE.Mesh(new THREE.BoxGeometry(6, 15, 6), downtownMaterial);
    tallerBuilding1.position.set(buildingOffset, 7.5, buildingOffset);
    tallerBuilding1.castShadow = true; tallerBuilding1.receiveShadow = true; scene.add(tallerBuilding1);

    const tallerBuilding2 = new THREE.Mesh(new THREE.BoxGeometry(5, 20, 5), downtownMaterial); // Tallest building
    tallerBuilding2.position.set(buildingOffset + 10, 10, buildingOffset + 10);
    tallerBuilding2.castShadow = true; tallerBuilding2.receiveShadow = true; scene.add(tallerBuilding2);


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
      
      if (isPaused.current) {
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
        prevTime.current = time;
        return;
      }
      
      const delta = (time - prevTime.current) / 1000;

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
        const halfGroundMinusWall = GROUND_SIZE / 2 - wallThickness / 2 - 0.5; 
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

    return () => {
      cancelAnimationFrame(animationFrameId);
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
        controlsRef.current.dispose();
      }
      if (rendererRef.current) {
         rendererRef.current.dispose();
         sceneRef.current?.traverse(object => {
            if (object instanceof THREE.Mesh) {
                if (object.geometry) object.geometry.dispose();
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else if (object.material && typeof (object.material as THREE.Material).dispose === 'function') {
                    (object.material as THREE.Material).dispose();
                }
            }
         });
      }
      if (mountRef.current && rendererRef.current?.domElement) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, [onKeyDown, onKeyUp, clickToLockHandler, onLockHandler, onUnlockHandler]);

  return <div ref={mountRef} className="w-full h-full cursor-grab focus:cursor-grabbing" />;
}

