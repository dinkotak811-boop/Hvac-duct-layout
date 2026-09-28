import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { CalculationResult } from '../types';
import { 
  Box, 
  RotateCcw, 
  Eye, 
  Play, 
  Pause, 
  Layers, 
  Maximize2, 
  Compass, 
  Wind,
  Sun,
  Camera
} from 'lucide-react';

interface Model3DViewerProps {
  result: CalculationResult;
  lang: 'en' | 'bn';
}

export const Model3DViewer: React.FC<Model3DViewerProps> = ({ result, lang }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [wireframeOnly, setWireframeOnly] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [showAirflow, setShowAirflow] = useState<boolean>(true);
  const [showAxes, setShowAxes] = useState<boolean>(true);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const airflowGroupRef = useRef<THREE.Group | null>(null);
  const reqIdRef = useRef<number | null>(null);

  // Mouse interaction state for manual orbit and pan
  const isMouseDownRef = useRef(false);
  const isRightDownRef = useRef(false);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const sphericalRef = useRef({ radius: 1600, theta: Math.PI / 4, phi: Math.PI / 3 });
  const panOffsetRef = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    if (!mountRef.current) return;
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1120); // Dark Slate CAD background
    sceneRef.current = scene;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(42, width / height, 1, 30000);
    cameraRef.current = camera;

    // 3. WebGL Renderer with Antialiasing
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Studio Multi-Point Lighting (Engineered for Sheet Metal Specular Sheen)
    const ambientLight = new THREE.AmbientLight(0xf1f5f9, 0.85);
    scene.add(ambientLight);

    // Key light (Top right front)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(1500, 2200, 1500);
    scene.add(keyLight);

    // Fill light (Cool blue from opposite side)
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.9);
    fillLight.position.set(-1500, 800, -1200);
    scene.add(fillLight);

    // Rim light (Highlight metallic edges from below/back)
    const rimLight = new THREE.DirectionalLight(0x94a3b8, 0.6);
    rimLight.position.set(0, -1200, -1500);
    scene.add(rimLight);

    // Floor Grid Helper
    const grid = new THREE.GridHelper(3000, 30, 0x334155, 0x1e293b);
    grid.position.y = -500;
    scene.add(grid);

    // Axes Helper
    const axesHelper = new THREE.AxesHelper(300);
    axesHelper.position.set(-1000, -490, -1000);
    scene.add(axesHelper);

    // Groups
    const meshGroup = new THREE.Group();
    scene.add(meshGroup);
    meshGroupRef.current = meshGroup;

    const airflowGroup = new THREE.Group();
    scene.add(airflowGroup);
    airflowGroupRef.current = airflowGroup;

    // Camera update function
    const updateCamera = () => {
      const { radius, theta, phi } = sphericalRef.current;
      const target = panOffsetRef.current;
      camera.position.x = target.x + radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = target.y + radius * Math.cos(phi);
      camera.position.z = target.z + radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(target.x, target.y, target.z);
    };
    updateCamera();

    // Animation Loop
    const animate = () => {
      reqIdRef.current = requestAnimationFrame(animate);
      if (autoRotate && !isMouseDownRef.current && !isRightDownRef.current) {
        sphericalRef.current.theta += 0.005;
        updateCamera();
      }
      renderer.render(scene, camera);
    };
    animate();

    // Mouse handlers
    const dom = renderer.domElement;
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        isMouseDownRef.current = true;
      } else if (e.button === 2) {
        isRightDownRef.current = true;
      }
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    const onMouseMove = (e: MouseEvent) => {
      if (!isMouseDownRef.current && !isRightDownRef.current) return;
      const dx = e.clientX - mousePosRef.current.x;
      const dy = e.clientY - mousePosRef.current.y;
      mousePosRef.current = { x: e.clientX, y: e.clientY };

      if (isMouseDownRef.current) {
        // Orbit rotate
        sphericalRef.current.theta -= dx * 0.007;
        sphericalRef.current.phi = Math.max(0.08, Math.min(Math.PI - 0.08, sphericalRef.current.phi - dy * 0.007));
        updateCamera();
      } else if (isRightDownRef.current) {
        // Pan
        const panSpeed = sphericalRef.current.radius * 0.001;
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
        const up = camera.up.clone().normalize();

        panOffsetRef.current.addScaledVector(right, -dx * panSpeed);
        panOffsetRef.current.addScaledVector(up, dy * panSpeed);
        updateCamera();
      }
    };

    const onMouseUp = () => {
      isMouseDownRef.current = false;
      isRightDownRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.12 : 0.88;
      sphericalRef.current.radius = Math.max(150, Math.min(8000, sphericalRef.current.radius * zoomFactor));
      updateCamera();
    };

    dom.addEventListener('mousedown', onMouseDown);
    dom.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
      dom.removeEventListener('mousedown', onMouseDown);
      dom.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update Geometry whenever calculation result changes
  useEffect(() => {
    if (!meshGroupRef.current || !airflowGroupRef.current) return;
    const meshGroup = meshGroupRef.current;
    const airflowGroup = airflowGroupRef.current;

    // Clear previous objects
    while (meshGroup.children.length > 0) {
      const obj = meshGroup.children[0] as THREE.Mesh;
      meshGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach(m => m.dispose());
      } else if (obj.material) {
        obj.material.dispose();
      }
    }

    while (airflowGroup.children.length > 0) {
      const obj = airflowGroup.children[0];
      airflowGroup.remove(obj);
    }

    const { vertices, indices, wireframeLines, boundingBox } = result.geometry3D;
    if (!vertices || vertices.length === 0) return;

    // Center geometry around bounding box centroid
    const cx = (boundingBox.min.x + boundingBox.max.x) / 2;
    const cy = (boundingBox.min.y + boundingBox.max.y) / 2;
    const cz = (boundingBox.min.z + boundingBox.max.z) / 2;

    const centeredVertices: number[] = [];
    for (let i = 0; i < vertices.length; i += 3) {
      centeredVertices.push(
        vertices[i] - cx,
        vertices[i + 1] - cy,
        vertices[i + 2] - cz
      );
    }

    // 1. Create Main Sheet Metal Mesh
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(centeredVertices, 3));
    if (indices && indices.length > 0) {
      geometry.setIndex(indices);
    }
    geometry.computeVertexNormals();

    // Galvanized Sheet Metal PBR Material
    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,        // Galvanized zinc steel tone
      metalness: 0.82,
      roughness: 0.32,
      side: THREE.DoubleSide,
      wireframe: wireframeOnly,
      flatShading: false,
    });

    const ductMesh = new THREE.Mesh(geometry, metalMaterial);
    meshGroup.add(ductMesh);

    // 2. High-precision CAD Edges Geometry
    if (!wireframeOnly) {
      const edgesGeom = new THREE.EdgesGeometry(geometry, 28);
      const edgeMaterial = new THREE.LineBasicMaterial({
        color: 0x38bdf8,      // Electric CAD Cyan
        linewidth: 1.5,
        transparent: true,
        opacity: 0.85,
      });
      const edgeLines = new THREE.LineSegments(edgesGeom, edgeMaterial);
      meshGroup.add(edgeLines);
    }

    // 3. Custom Wireframe Lines from Engine (Miter rings, seams, vanes)
    if (wireframeLines && wireframeLines.length > 0) {
      const wireMat = new THREE.LineBasicMaterial({ color: 0x0284c7, linewidth: 2 });
      wireframeLines.forEach(linePts => {
        if (linePts.length < 2) return;
        const pts = linePts.map(p => new THREE.Vector3(p.x - cx, p.y - cy, p.z - cz));
        const lineGeom = new THREE.BufferGeometry().setFromPoints(pts);
        const line = new THREE.Line(lineGeom, wireMat);
        meshGroup.add(line);
      });
    }

    // 4. Airflow Indicator Arrows (Green for Inlet, Cyan for Outlet)
    if (showAirflow) {
      const maxDim = Math.max(
        boundingBox.max.x - boundingBox.min.x,
        boundingBox.max.y - boundingBox.min.y,
        boundingBox.max.z - boundingBox.min.z
      );
      const arrowLength = Math.max(80, maxDim * 0.22);
      const headLength = arrowLength * 0.3;
      const headWidth = headLength * 0.5;

      // Primary Airflow vector along Z axis
      const inletPos = new THREE.Vector3(0, 0, (boundingBox.min.z - cz) - arrowLength * 0.9);
      const inletDir = new THREE.Vector3(0, 0, 1);
      const inletArrow = new THREE.ArrowHelper(inletDir, inletPos, arrowLength, 0x10b981, headLength, headWidth);
      airflowGroup.add(inletArrow);

      const outletPos = new THREE.Vector3(0, 0, (boundingBox.max.z - cz) + 10);
      const outletDir = new THREE.Vector3(0, 0, 1);
      const outletArrow = new THREE.ArrowHelper(outletDir, outletPos, arrowLength, 0x06b6d4, headLength, headWidth);
      airflowGroup.add(outletArrow);
    }

    // Adjust camera distance to comfortably frame the duct
    const maxDim = Math.max(
      boundingBox.max.x - boundingBox.min.x,
      boundingBox.max.y - boundingBox.min.y,
      boundingBox.max.z - boundingBox.min.z
    );
    sphericalRef.current.radius = Math.max(500, maxDim * 2.3);
    panOffsetRef.current.set(0, 0, 0);

    if (cameraRef.current) {
      const { radius, theta, phi } = sphericalRef.current;
      cameraRef.current.position.x = radius * Math.sin(phi) * Math.sin(theta);
      cameraRef.current.position.y = radius * Math.cos(phi);
      cameraRef.current.position.z = radius * Math.sin(phi) * Math.cos(theta);
      cameraRef.current.lookAt(0, 0, 0);
    }
  }, [result, wireframeOnly, showAirflow]);

  const setViewOrientation = (theta: number, phi: number) => {
    sphericalRef.current.theta = theta;
    sphericalRef.current.phi = phi;
    panOffsetRef.current.set(0, 0, 0);
    if (cameraRef.current) {
      const { radius } = sphericalRef.current;
      cameraRef.current.position.x = radius * Math.sin(phi) * Math.sin(theta);
      cameraRef.current.position.y = radius * Math.cos(phi);
      cameraRef.current.position.z = radius * Math.sin(phi) * Math.cos(theta);
      cameraRef.current.lookAt(0, 0, 0);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-full select-none">
      {/* 3D Viewer Toolbar */}
      <div className="bg-slate-850 border-b border-slate-800 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Box className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            {lang === 'bn' ? '৩ডি অ্যাসেম্বলি মডেল' : '3D Duct Assembly Model'}
          </span>
          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
            [{result.modelName}]
          </span>
        </div>

        {/* View Controls & Toggles */}
        <div className="flex items-center space-x-1.5">
          {/* Wireframe toggle */}
          <button
            onClick={() => setWireframeOnly(!wireframeOnly)}
            className={`p-1.5 rounded-lg text-xs transition border ${
              wireframeOnly 
                ? 'bg-cyan-600/30 border-cyan-500 text-cyan-300' 
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Toggle Wireframe Only"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>

          {/* Airflow vector toggle */}
          <button
            onClick={() => setShowAirflow(!showAirflow)}
            className={`p-1.5 rounded-lg text-xs transition border ${
              showAirflow 
                ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300' 
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Toggle Airflow Vector Indicators"
          >
            <Wind className="w-3.5 h-3.5" />
          </button>

          {/* Auto Rotate toggle */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-1.5 rounded-lg text-xs transition border ${
              autoRotate 
                ? 'bg-cyan-600/30 border-cyan-500 text-cyan-300' 
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Toggle Auto Turntable Rotation"
          >
            {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          {/* Preset Camera Views */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-[10px] font-mono">
            <button
              onClick={() => setViewOrientation(Math.PI / 4, Math.PI / 3)}
              className="px-1.5 py-0.5 hover:text-white text-slate-400 hover:bg-slate-700 rounded transition"
              title="Isometric View"
            >
              ISO
            </button>
            <button
              onClick={() => setViewOrientation(0, 0.05)}
              className="px-1.5 py-0.5 hover:text-white text-slate-400 hover:bg-slate-700 rounded transition"
              title="Top View (Plan)"
            >
              TOP
            </button>
            <button
              onClick={() => setViewOrientation(0, Math.PI / 2)}
              className="px-1.5 py-0.5 hover:text-white text-slate-400 hover:bg-slate-700 rounded transition"
              title="Front View (Elevation)"
            >
              FRONT
            </button>
            <button
              onClick={() => setViewOrientation(Math.PI / 2, Math.PI / 2)}
              className="px-1.5 py-0.5 hover:text-white text-slate-400 hover:bg-slate-700 rounded transition"
              title="Side View (Right)"
            >
              SIDE
            </button>
          </div>
        </div>
      </div>

      {/* 3D WebGL Canvas Viewport */}
      <div 
        ref={mountRef} 
        className="flex-1 w-full relative overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ minHeight: '450px' }}
      >
        {/* Overlay Navigation Help */}
        <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur border border-slate-800/80 px-2.5 py-1.5 rounded-lg text-[10px] text-slate-400 space-y-0.5 pointer-events-none">
          <div><span className="text-cyan-400 font-semibold">Left Click + Drag:</span> Orbit 360°</div>
          <div><span className="text-cyan-400 font-semibold">Right Click + Drag:</span> Pan Camera</div>
          <div><span className="text-cyan-400 font-semibold">Scroll Wheel:</span> Zoom In/Out</div>
        </div>

        {/* Real-time Dimensions Badge */}
        <div className="absolute top-3 right-3 bg-slate-950/85 backdrop-blur border border-slate-800 px-3 py-2 rounded-lg text-xs font-mono space-y-1 text-slate-300 shadow-lg pointer-events-none">
          <div className="text-[10px] text-cyan-400 font-sans font-bold uppercase tracking-wider">
            {lang === 'bn' ? 'অ্যাসেম্বলি সাইজ' : 'Envelope Size'}
          </div>
          <div className="text-slate-200">
            W: {Math.round(result.geometry3D.boundingBox.max.x - result.geometry3D.boundingBox.min.x)} mm
          </div>
          <div className="text-slate-200">
            H: {Math.round(result.geometry3D.boundingBox.max.y - result.geometry3D.boundingBox.min.y)} mm
          </div>
          <div className="text-slate-200">
            L: {Math.round(result.geometry3D.boundingBox.max.z - result.geometry3D.boundingBox.min.z)} mm
          </div>
        </div>
      </div>
    </div>
  );
};
