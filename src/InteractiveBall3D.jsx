import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';

const InteractiveBall3D = () => {
  const containerRef = useRef(null);
  const [isRotating, setIsRotating] = useState(true);

  // Texturas memoizadas para evitar regeneración y parpadeos
  const textures = useMemo(() => {
    // Cuero gris sutil
    const canvasLeather = document.createElement('canvas');
    canvasLeather.width = 1024; canvasLeather.height = 1024;
    const ctxL = canvasLeather.getContext('2d');
    ctxL.fillStyle = '#6d6d6d';
    ctxL.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 6000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const size = Math.random() * 2;
      const opacity = Math.random() * 0.25;
      ctxL.fillStyle = `rgba(120,120,120,${opacity})`;
      ctxL.fillRect(x, y, size, size);
    }
    const leather = new THREE.CanvasTexture(canvasLeather);

    // Patrón de puntos turquesa sutil
    const canvasTurq = document.createElement('canvas');
    canvasTurq.width = 512; canvasTurq.height = 512;
    const ctxT = canvasTurq.getContext('2d');
    ctxT.fillStyle = '#2eb8b8';
    ctxT.fillRect(0, 0, 512, 512);
    const spacing = 12; const r = 1.6;
    ctxT.fillStyle = 'rgba(22,120,115,0.35)';
    for (let x = spacing/2; x < 512; x += spacing) {
      for (let y = spacing/2; y < 512; y += spacing) {
        ctxT.beginPath(); ctxT.arc(x, y, r, 0, Math.PI*2); ctxT.fill();
      }
    }
    const turquoise = new THREE.CanvasTexture(canvasTurq);

    return { leather, turquoise };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Guardar contenedor para usarlo en resize/cleanup sin cambiar ref
    const container = containerRef.current;

    // Configuración de la escena
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd4cdb8);

    // Cámara
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  // Cursor por defecto para rotación
  renderer.domElement.style.cursor = 'grab';

    // Grupo principal para la pelota
    const ballGroup = new THREE.Group();
    scene.add(ballGroup);

    // Interactividad de botones: raycaster y estado de animaciones
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const interactiveTargets = [];
    const pressStates = new Map(); // Map<buttonGroup, {dir, t, downDur, upDur, depth}>

    const setPointerFromEvent = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      pointer.x = x * 2 - 1;
      pointer.y = -(y * 2 - 1);
    };

    const pressButton = (btnGroup, pressed) => {
      if (!btnGroup) return;
      // Guardar z base de cada mesh al primer uso
      if (!btnGroup.userData._baseZInit) {
        btnGroup.traverse((child) => {
          if (child.isMesh) child.userData.baseZ = child.position.z;
        });
        btnGroup.userData._baseZInit = true;
      }
      const state = pressStates.get(btnGroup) || { dir: 0, t: 0, downDur: 120, upDur: 170, depth: 0.05 };
      state.dir = pressed ? 1 : -1; // 1 presionando, -1 soltando
      pressStates.set(btnGroup, state);
    };

    const easeOut = (x) => 1 - Math.pow(1 - x, 3);
    const easeIn = (x) => x * x * x;

    const updatePressAnimations = (deltaMs) => {
      pressStates.forEach((state, btnGroup) => {
        const dur = state.dir === 1 ? state.downDur : state.upDur;
        state.t = Math.min(1, state.t + deltaMs / dur);
        const k = state.dir === 1 ? easeOut(state.t) : 1 - easeIn(state.t);
        const offset = -state.depth * k; // mover hacia adentro (local -Z)
        btnGroup.traverse((child) => {
          if (child.isMesh && child.userData.baseZ !== undefined) {
            // Solo hundir claramente el botón (fondo y símbolo),
            // mantener anillo/área fija y depresión con leve movimiento
            const role = child.userData.role;
            let factor = 0.0;
            if (role === 'buttonBg' || role === 'symbol') factor = 1.0;
            else if (role === 'depression') factor = 0.35;
            else factor = 0.0; // ring y blackArea no se mueven
            child.position.z = child.userData.baseZ + offset * factor;
          }
        });
        if (state.t >= 1) {
          if (state.dir === -1) {
            // reset y eliminar del mapa
            btnGroup.traverse((child) => {
              if (child.isMesh && child.userData.baseZ !== undefined) {
                child.position.z = child.userData.baseZ;
              }
            });
            pressStates.delete(btnGroup);
          } else {
            // si terminó el down, esperar a que mouse/touch suelte
            state.t = 0; // permitir animación de subida cuando se indique
          }
        }
      });
    };

    // (textura de cuero ahora proviene de useMemo)

    // Esfera base GRIS completa
    const sphereGeometry = new THREE.SphereGeometry(1, 128, 128);
  const leatherTexture = textures.leather;
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

    // (textura turquesa ahora proviene de useMemo)

    // (sin displacement para evitar z-fighting)

  const turquoiseTexture = textures.turquoise;
    
    // Material base para parches (sin displacement, con offset para evitar z-fighting)
    const basePatchMaterial = new THREE.MeshStandardMaterial({
      map: turquoiseTexture,
      color: 0x2eb8b8,
      roughness: 0.7,
      metalness: 0.08,
      bumpMap: turquoiseTexture,
      bumpScale: 0.005,
      side: THREE.FrontSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    // Crear parches laterales con BORDES SUAVES mediante shader mask
    const createWavePatch = (centerPhi) => {
      const mat = basePatchMaterial.clone();
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.centerPhi = { value: centerPhi };
        shader.uniforms.amplitude = { value: 0.35 };     // curvatura tipo onda
        shader.uniforms.frequency = { value: 1.0 };      // onda suave
        shader.uniforms.bandWidth = { value: 0.9 };      // ancho base del parche
        shader.uniforms.edgeSoftness = { value: 0.08 };  // suavidad del borde
        shader.uniforms.widthPower = { value: 1.2 };     // qué tan rápido se estrecha hacia los polos
        shader.uniforms.minWidth = { value: 0.02 };      // ancho mínimo para evitar cortes bruscos

        shader.vertexShader = shader.vertexShader.replace(
          'void main() {',
          'varying vec3 vPos;\nvoid main(){\n  vPos = normalize(position);'
        );
        shader.fragmentShader = shader.fragmentShader
          .replace(
            'void main() {',
            'varying vec3 vPos;\nuniform float centerPhi, amplitude, frequency, bandWidth, edgeSoftness, widthPower, minWidth;\nvoid main(){'
          )
          .replace(
            '#include <alphatest_fragment>',
            `
            float phi = atan(vPos.z, vPos.x);
            float theta = acos(clamp(vPos.y, -1.0, 1.0));
            // Factor senoidal para variar ancho/curvatura con la latitud
            float sTheta = clamp(sin(theta), 0.0, 1.0);
            float widthFactor = pow(sTheta, widthPower);
            float localWidth = mix(minWidth, bandWidth, widthFactor);
            float amp = amplitude * widthFactor;

            float phi0 = centerPhi + amp * sin(frequency * (theta - 1.57079632679));
            // Distancia angular envuelta
            float s = sin(phi - phi0); float c = cos(phi - phi0);
            float d = abs(atan(s, c));

            // Cierre de la figura antes de los polos: desplazamos los límites
            // verticales en función de lo cerca que estemos del borde lateral (d)
            float dNorm = clamp(d / bandWidth, 0.0, 1.0);
            float tBase = 0.10;          // margen base desde los polos
            float closeTaper = 0.35;     // cuánto se adelanta el cierre hacia los polos en los bordes
            float thetaMinLocal = tBase + dNorm * closeTaper;
            float thetaMaxLocal = (3.14159265 - tBase) - dNorm * closeTaper;

            float inTheta = smoothstep(thetaMinLocal, thetaMinLocal + edgeSoftness, theta)
                           * (1.0 - smoothstep(thetaMaxLocal - edgeSoftness, thetaMaxLocal, theta));
            float edge = smoothstep(localWidth, localWidth + edgeSoftness, d);
            float bandMask = 1.0 - edge;

            // Caps redondeados circulares (u^2 + v^2 <= 1) con centro dentro del parche
            float capTheta = 0.22; // radio vertical del cap (ajustable)
            float u = d / max(localWidth, 1e-4);
            float thetaCTop = thetaMinLocal + capTheta;
            float thetaCBot = thetaMaxLocal - capTheta;
            float vTop = (theta - thetaCTop) / capTheta;
            float vBot = (theta - thetaCBot) / capTheta;
            float rTop2 = u*u + vTop*vTop;
            float rBot2 = u*u + vBot*vBot;
            float topMask = 1.0 - smoothstep(1.0, 1.0 + edgeSoftness, rTop2);
            float botMask = 1.0 - smoothstep(1.0, 1.0 + edgeSoftness, rBot2);

            float bodyMask = bandMask * inTheta;
            float mask = max(bodyMask, max(topMask, botMask));
            if(mask < 0.01) discard;
            #include <alphatest_fragment>
            `
          );
      };
      const geom = new THREE.SphereGeometry(1.012, 128, 128);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.castShadow = true;
      return mesh;
    };

  // Calcular la banda central GRIS según la posición del botón central
  // Centro frontal alineado (x=0) para que botones y logo queden en el eje vertical
  const buttonsCenter = new THREE.Vector3(0, 0, 1).normalize();
  const centerPhi = Math.atan2(buttonsCenter.z, buttonsCenter.x);
  const BAND_HALF = 0.85;   // mitad de la banda gris (ajustable) – un poco más ancha
  const PATCH_HALF = 0.9;   // mitad del ancho de cada parche (ajustable)
  const DELTA = BAND_HALF + PATCH_HALF;

  // Crear dos parches a los lados de la banda central
  const leftPatch = createWavePatch(centerPhi - DELTA);
  const rightPatch = createWavePatch(centerPhi + DELTA);
    ballGroup.add(leftPatch);
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
    // Hacer clickeable y rol
    blackArea.userData.buttonGroup = buttonGroup;
    blackArea.userData.role = 'blackArea';
    interactiveTargets.push(blackArea);
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
  depression.userData.role = 'depression';
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
  ring.userData.buttonGroup = buttonGroup;
  ring.userData.role = 'ring';
  interactiveTargets.push(ring);
      buttonGroup.add(ring);
      
      // Fondo del botón ligeramente más claro
      const buttonBgGeometry = new THREE.CircleGeometry(0.155, 64);
      const buttonBgMaterial = new THREE.MeshStandardMaterial({
        color: 0x282828,
        roughness: 0.9
      });
  const buttonBg = new THREE.Mesh(buttonBgGeometry, buttonBgMaterial);
  buttonBg.position.z = -0.014;
  buttonBg.userData.buttonGroup = buttonGroup;
  buttonBg.userData.role = 'buttonBg';
  interactiveTargets.push(buttonBg);
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
  symbolMesh.traverse((c)=>{ if(c.isMesh){ c.userData.role = 'symbol'; }});
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

    // Alinear botones y logo sobre la misma columna frontal usando x fijo y
    // recalculando z para mantenerlos pegados a la superficie de la esfera.
  // Centrar todos los elementos en el eje X=0
  const xFixed = 0.0;
    const makeOnSphere = (x, y) => {
      const r2 = 1 - x * x - y * y;
      const z = r2 > 0 ? Math.sqrt(r2) : 0; // siempre z positivo (frente)
      return new THREE.Vector3(x, y, z);
    };

  // Recalcular posiciones manteniendo distancia vertical uniforme
  const plusPos = makeOnSphere(xFixed, 0.55);
  const centerPos = makeOnSphere(xFixed, 0.0);
  const minusPos = makeOnSphere(xFixed, -0.55);
  const logoPos = makeOnSphere(xFixed, -0.82);

    ballGroup.add(createButton('+', plusPos));
    ballGroup.add(createButton('o', centerPos));
    ballGroup.add(createButton('-', minusPos));
    ballGroup.add(createLogo(logoPos));

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
  let pressedButton = null;

    const onMouseDown = (e) => {
      setPointerFromEvent(e);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(interactiveTargets, true)[0];
      if (hit) {
        pressedButton = hit.object.userData.buttonGroup || hit.object.parent;
        pressButton(pressedButton, true);
        // No iniciar drag si presionó un botón
        renderer.domElement.style.cursor = 'pointer';
        return;
      }
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
      renderer.domElement.style.cursor = 'grabbing';
    };

    const onMouseMove = (e) => {
      // Actualizar cursor según hover sobre botón
      setPointerFromEvent(e);
      raycaster.setFromCamera(pointer, camera);
      const hoverHit = raycaster.intersectObjects(interactiveTargets, true)[0];
      if (pressedButton) {
        renderer.domElement.style.cursor = 'pointer';
      } else if (isDragging) {
        renderer.domElement.style.cursor = 'grabbing';
      } else {
        renderer.domElement.style.cursor = hoverHit ? 'pointer' : 'grab';
      }

      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        ballGroup.rotation.y += deltaX * 0.01;
        ballGroup.rotation.x += deltaY * 0.01;

        previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseUp = () => {
      if (pressedButton) {
        pressButton(pressedButton, false);
        pressedButton = null;
        // actualizar cursor según hover actual
        const hoverHit = raycaster.intersectObjects(interactiveTargets, true)[0];
        renderer.domElement.style.cursor = hoverHit ? 'pointer' : 'grab';
        return;
      }
      isDragging = false;
      // actualizar cursor según hover actual
      const hoverHit = raycaster.intersectObjects(interactiveTargets, true)[0];
      renderer.domElement.style.cursor = hoverHit ? 'pointer' : 'grab';
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);

    // Touch support
    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        setPointerFromEvent(t);
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(interactiveTargets, true)[0];
        if (hit) {
          pressedButton = hit.object.userData.buttonGroup || hit.object.parent;
          pressButton(pressedButton, true);
          return;
        }
        isDragging = true;
        previousMousePosition = { x: t.clientX, y: t.clientY };
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
      if (pressedButton) {
        pressButton(pressedButton, false);
        pressedButton = null;
        return;
      }
      isDragging = false;
    };

    renderer.domElement.addEventListener('touchstart', onTouchStart);
    renderer.domElement.addEventListener('touchmove', onTouchMove);
    renderer.domElement.addEventListener('touchend', onTouchEnd);

    // Animación
    let lastTime = performance.now();
    const animate = () => {
      const now = performance.now();
      const delta = now - lastTime;
      lastTime = now;
      requestAnimationFrame(animate);

      if (!isDragging && isRotating) {
        ballGroup.rotation.y += 0.003;
      }

      updatePressAnimations(delta);
      renderer.render(scene, camera);
    };

    animate();

    // Manejo de resize
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
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
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isRotating, textures]);

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