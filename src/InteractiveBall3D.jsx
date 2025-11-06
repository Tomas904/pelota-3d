import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const InteractiveBall3D = () => {
  const containerRef = useRef(null);
  const [isRotating, setIsRotating] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    // Configuración de la escena
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd4cdb8);

    // Cámara
    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    // Grupo principal para la pelota
    const ballGroup = new THREE.Group();
    scene.add(ballGroup);

    // Crear textura de cuero para la esfera base GRIS
    const createLeatherTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      
      // Gris más claro como base
      ctx.fillStyle = '#6d6d6d';
      ctx.fillRect(0, 0, 1024, 1024);
      
      // Textura de piel sutil
      for (let i = 0; i < 6000; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 1024;
        const size = Math.random() * 2;
        const opacity = Math.random() * 0.25;
        ctx.fillStyle = `rgba(120, 120, 120, ${opacity})`;
        ctx.fillRect(x, y, size, size);
      }
      
      return new THREE.CanvasTexture(canvas);
    };

    // Esfera base GRIS completa
    const sphereGeometry = new THREE.SphereGeometry(1, 128, 128);
    const leatherTexture = createLeatherTexture();
    const sphereMaterial = new THREE.MeshStandardMaterial({
      map: leatherTexture,
      color: 0x6d6d6d,
      roughness: 0.85,
      metalness: 0.1,
      bumpMap: leatherTexture,
      bumpScale: 0.005
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    ballGroup.add(sphere);

    // Crear textura detallada para los parches turquesa con relieve
    const createTurquoiseTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      
      ctx.fillStyle = '#2eb8b8';
      ctx.fillRect(0, 0, 1024, 1024);
      
      // Patrón de puntos elevados tipo relieve hexagonal
      const dotSize = 11;
      const spacing = 19;
      
      for (let row = 0; row < 1024 / spacing + 2; row++) {
        for (let col = 0; col < 1024 / spacing + 2; col++) {
          const x = col * spacing + (row % 2) * (spacing / 2);
          const y = row * spacing;
          
          // Sombra inferior del punto (efecto 3D de relieve)
          ctx.fillStyle = 'rgba(25, 130, 130, 0.7)';
          ctx.beginPath();
          ctx.arc(x + 1.5, y + 1.5, dotSize / 2, 0, Math.PI * 2);
          ctx.fill();
          
          // Punto principal con gradiente
          const gradient = ctx.createRadialGradient(x - 1.5, y - 1.5, 0, x, y, dotSize / 2);
          gradient.addColorStop(0, '#50d8d8');
          gradient.addColorStop(0.4, '#2eb8b8');
          gradient.addColorStop(1, '#1fa0a0');
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, dotSize / 2, 0, Math.PI * 2);
          ctx.fill();
          
          // Highlight superior (brillo)
          ctx.fillStyle = 'rgba(120, 240, 240, 0.6)';
          ctx.beginPath();
          ctx.arc(x - 2.5, y - 2.5, dotSize / 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      return new THREE.CanvasTexture(canvas);
    };

    // Crear displacement map para relieve real
    const createDisplacementMap = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, 512, 512);
      
      const dotSize = 5.5;
      const spacing = 9.5;
      
      for (let row = 0; row < 512 / spacing + 2; row++) {
        for (let col = 0; col < 512 / spacing + 2; col++) {
          const x = col * spacing + (row % 2) * (spacing / 2);
          const y = row * spacing;
          
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, dotSize);
          gradient.addColorStop(0, '#ffffff');
          gradient.addColorStop(0.6, '#c0c0c0');
          gradient.addColorStop(1, '#808080');
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, dotSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      return new THREE.CanvasTexture(canvas);
    };

    const turquoiseTexture = createTurquoiseTexture();
    const displacementMap = createDisplacementMap();
    
    const patchMaterial = new THREE.MeshStandardMaterial({
      map: turquoiseTexture,
      roughness: 0.85,
      metalness: 0.05,
      displacementMap: displacementMap,
      displacementScale: 0.015,
      bumpMap: turquoiseTexture,
      bumpScale: 0.02
    });

    // PARCHES turquesa como en versión 4: ondas anchas que NO llegan a los polos
    
    // Parche izquierdo (forma de onda ancha)
    const leftPatchGeometry = new THREE.SphereGeometry(
      1.008, 
      128, 
      128,
      -0.5,   // phi start
      1.3,    // phi length (ancho del parche)
      0.25,   // theta start (NO empieza desde el polo superior)
      2.3     // theta length (NO llega hasta el polo inferior)
    );
    const leftPatch = new THREE.Mesh(leftPatchGeometry, patchMaterial);
    leftPatch.rotation.y = -0.15;
    leftPatch.castShadow = true;
    ballGroup.add(leftPatch);
    
    // Parche derecho (simétrico)
    const rightPatchGeometry = new THREE.SphereGeometry(
      1.008,
      128,
      128,
      -0.5,
      1.3,
      0.25,
      2.3
    );
    const rightPatch = new THREE.Mesh(rightPatchGeometry, patchMaterial);
    rightPatch.rotation.y = Math.PI + 0.15;
    rightPatch.castShadow = true;
    ballGroup.add(rightPatch);

    // Función para crear botones con áreas NEGRAS alrededor
    const createButton = (symbol, position) => {
      const buttonGroup = new THREE.Group();
      
      // Área negra grande alrededor del botón
      const blackAreaGeometry = new THREE.CircleGeometry(0.28, 64);
      const blackAreaMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
        roughness: 0.88,
        metalness: 0.08
      });
      const blackArea = new THREE.Mesh(blackAreaGeometry, blackAreaMaterial);
      blackArea.position.z = -0.002;
      buttonGroup.add(blackArea);
      
      // Depresión circular del botón
      const depressionGeometry = new THREE.CircleGeometry(0.20, 64);
      const depressionMaterial = new THREE.MeshStandardMaterial({
        color: 0x1f1f1f,
        roughness: 0.95,
        metalness: 0.05
      });
      const depression = new THREE.Mesh(depressionGeometry, depressionMaterial);
      depression.position.z = -0.022;
      buttonGroup.add(depression);
      
      // Anillo exterior elevado más grueso
      const ringGeometry = new THREE.TorusGeometry(0.175, 0.020, 16, 64);
      const ringMaterial = new THREE.MeshStandardMaterial({
        color: 0x252525,
        roughness: 0.8,
        metalness: 0.2
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.position.z = -0.010;
      buttonGroup.add(ring);
      
      // Fondo del botón ligeramente más claro
      const buttonBgGeometry = new THREE.CircleGeometry(0.155, 64);
      const buttonBgMaterial = new THREE.MeshStandardMaterial({
        color: 0x282828,
        roughness: 0.9
      });
      const buttonBg = new THREE.Mesh(buttonBgGeometry, buttonBgMaterial);
      buttonBg.position.z = -0.014;
      buttonGroup.add(buttonBg);
      
      // Símbolo en relieve 3D
      const createSymbolMesh = (sym) => {
        const symbolGroup = new THREE.Group();
        const material = new THREE.MeshStandardMaterial({
          color: 0x1a1a1a,
          roughness: 0.7,
          metalness: 0.3
        });
        
        if (sym === '+') {
          const vBar = new THREE.Mesh(
            new THREE.BoxGeometry(0.032, 0.15, 0.014),
            material
          );
          symbolGroup.add(vBar);
          
          const hBar = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.032, 0.014),
            material
          );
          symbolGroup.add(hBar);
        } else if (sym === 'o') {
          const circle = new THREE.Mesh(
            new THREE.TorusGeometry(0.058, 0.020, 16, 32),
            material
          );
          symbolGroup.add(circle);
        } else if (sym === '-') {
          const hBar = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.032, 0.014),
            material
          );
          symbolGroup.add(hBar);
        }
        
        return symbolGroup;
      };
      
      const symbolMesh = createSymbolMesh(symbol);
      symbolMesh.position.z = 0.004;
      buttonGroup.add(symbolMesh);
      
      buttonGroup.position.copy(position);
      const normal = position.clone().normalize();
      buttonGroup.lookAt(normal.multiplyScalar(2));
      
      return buttonGroup;
    };

    // Función para crear la marca/logo (no es un botón)
    const createLogo = (position) => {
      const logoGroup = new THREE.Group();
      
      const material = new THREE.MeshStandardMaterial({
        color: 0x2eb8b8,
        roughness: 0.7,
        metalness: 0.3,
        emissive: 0x0a3535,
        emissiveIntensity: 0.3
      });
      
      // Crear pequeña onda con cilindros
      for (let i = 0; i < 12; i++) {
        const t = i / 11;
        const x = (t - 0.5) * 0.16;
        const y = Math.sin(t * Math.PI * 2.8) * 0.028;
        const angle = Math.cos(t * Math.PI * 2.8) * 0.45;
        
        const segment = new THREE.Mesh(
          new THREE.CylinderGeometry(0.007, 0.007, 0.016, 8),
          material
        );
        segment.position.set(x, y, 0.003);
        segment.rotation.z = angle + Math.PI / 2;
        logoGroup.add(segment);
      }
      
      logoGroup.position.copy(position);
      const normal = position.clone().normalize();
      logoGroup.lookAt(normal.multiplyScalar(2));
      
      return logoGroup;
    };

    // Añadir solo 3 BOTONES en la zona negra central
    ballGroup.add(createButton('+', new THREE.Vector3(0.25, 0.60, 0.78)));
    ballGroup.add(createButton('o', new THREE.Vector3(0.25, 0, 0.97)));
    ballGroup.add(createButton('-', new THREE.Vector3(0.25, -0.60, 0.78)));
    
    // Añadir marca/logo abajo (NO es un botón)
    ballGroup.add(createLogo(new THREE.Vector3(0.25, -0.90, 0.35)));

    // Iluminación mejorada para resaltar el relieve
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.3);
    mainLight.position.set(5, 5, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 15;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-3, 2, -3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffd4a3, 0.6);
    rimLight.position.set(-2, -3, -5);
    scene.add(rimLight);

    const topLight = new THREE.PointLight(0xffffff, 0.65);
    topLight.position.set(0, 4, 2);
    scene.add(topLight);

    // Variables para interacción
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        ballGroup.rotation.y += deltaX * 0.01;
        ballGroup.rotation.x += deltaY * 0.01;

        previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);

    // Touch support
    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        previousMousePosition = { 
          x: e.touches[0].clientX, 
          y: e.touches[0].clientY 
        };
      }
    };

    const onTouchMove = (e) => {
      if (isDragging && e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - previousMousePosition.x;
        const deltaY = e.touches[0].clientY - previousMousePosition.y;

        ballGroup.rotation.y += deltaX * 0.01;
        ballGroup.rotation.x += deltaY * 0.01;

        previousMousePosition = { 
          x: e.touches[0].clientX, 
          y: e.touches[0].clientY 
        };
      }
    };

    const onTouchEnd = () => {
      isDragging = false;
    };

    renderer.domElement.addEventListener('touchstart', onTouchStart);
    renderer.domElement.addEventListener('touchmove', onTouchMove);
    renderer.domElement.addEventListener('touchend', onTouchEnd);

    // Animación
    const animate = () => {
      requestAnimationFrame(animate);

      if (!isDragging && isRotating) {
        ballGroup.rotation.y += 0.003;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Manejo de resize
    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('touchstart', onTouchStart);
      renderer.domElement.removeEventListener('touchmove', onTouchMove);
      renderer.domElement.removeEventListener('touchend', onTouchEnd);
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isRotating]);

  return (
    <div className="w-full h-screen flex flex-col bg-gray-100">
      <div className="p-4 bg-gradient-to-r from-gray-800 to-gray-700 shadow-lg">
        <h1 className="text-2xl font-bold text-white mb-2">Pelota de Masaje 3D</h1>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setIsRotating(!isRotating)}
            className="px-5 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition shadow-md font-medium"
          >
            {isRotating ? '⏸ Pausar' : '▶ Rotar'}
          </button>
        </div>
      </div>
      <div ref={containerRef} className="flex-1" />
    </div>
  );
};

export default InteractiveBall3D;