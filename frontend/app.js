(() => {
  const API_BASE = '/api';

  const rowsInput = document.getElementById('rows');
  const colsInput = document.getElementById('cols');
  const wallProbInput = document.getElementById('wallProb');
  const btnGenerate = document.getElementById('btnGenerate');
  const btnEdit = document.getElementById('btnEdit');
  const btnSolve = document.getElementById('btnSolve');
  const algoSelect = document.getElementById('algorithm');
  const statusEl = document.getElementById('status');
  const stepsEl = document.getElementById('steps');
  const messageEl = document.getElementById('message');
  const editor = document.getElementById('editor');
  const ctx = editor.getContext('2d');
  const threeContainer = document.getElementById('threeContainer');

  let grid = createEmptyGrid(parseInt(rowsInput.value, 10), parseInt(colsInput.value, 10));
  let start = [0, 0];
  let end = [grid.length - 1, grid[0].length - 1];
  let editMode = true;

  function createEmptyGrid(r, c) {
    return Array.from({ length: r }, () => Array.from({ length: c }, () => 0));
  }

  function resizeEditor() {
    const size = Math.min(editor.clientWidth, 700);
    editor.width = size;
    editor.height = size;
    drawEditor();
  }

  function drawEditor(path = [], visited = []) {
    const r = grid.length, c = grid[0].length;
    const cell = Math.floor(editor.width / Math.max(r, c));
    ctx.clearRect(0, 0, editor.width, editor.height);

    // grid
    ctx.fillStyle = '#0b0e1f';
    ctx.fillRect(0, 0, editor.width, editor.height);

    // visited heat
    for (const [vr, vc] of visited) {
      ctx.fillStyle = 'rgba(167,139,250,0.15)';
      ctx.fillRect(vc * cell, vr * cell, cell, cell);
    }

    // walls
    for (let i = 0; i < r; i++) {
      for (let j = 0; j < c; j++) {
        if (grid[i][j] === 1) {
          ctx.fillStyle = '#2b335f';
          ctx.fillRect(j * cell, i * cell, cell, cell);
      ctx.strokeStyle = 'rgba(110, 231, 249, 0.5)';
      ctx.strokeRect(j * cell + 0.5, i * cell + 0.5, cell - 1, cell - 1);
        }
      }
    }

    // start/end
    ctx.fillStyle = '#00b894';
    ctx.fillRect(start[1] * cell + 2, start[0] * cell + 2, cell - 4, cell - 4);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(end[1] * cell + 2, end[0] * cell + 2, cell - 4, cell - 4);

    // path
    if (path.length > 0) {
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = Math.max(2, Math.floor(cell / 6));
      ctx.beginPath();
      for (let k = 0; k < path.length; k++) {
        const [pr, pc] = path[k];
        const x = pc * cell + cell / 2;
        const y = pr * cell + cell / 2;
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= r; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * cell + 0.5);
      ctx.lineTo(c * cell, i * cell + 0.5);
      ctx.stroke();
    }
    for (let j = 0; j <= c; j++) {
      ctx.beginPath();
      ctx.moveTo(j * cell + 0.5, 0);
      ctx.lineTo(j * cell + 0.5, r * cell);
      ctx.stroke();
    }

    // outer border around the maze area
    const gridW = c * cell;
    const gridH = r * cell;
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(59, 74, 161, 0.8)';
    ctx.strokeRect(0.5, 0.5, gridW - 1, gridH - 1);

    // subtle inner highlight on the black portion to better delineate walls area
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(110, 231, 249, 0.25)';
    ctx.strokeRect(1.5, 1.5, gridW - 3, gridH - 3);
  }

  editor.addEventListener('click', (e) => {
    if (!editMode) return;
    const { row, col } = eventToCell(e);
    if (e.shiftKey) {
      start = [row, col];
      grid[row][col] = 0;
    } else if (e.altKey) {
      end = [row, col];
      grid[row][col] = 0;
    } else {
      grid[row][col] = grid[row][col] === 1 ? 0 : 1;
    }
    drawEditor();
  });

  function eventToCell(e) {
    const rect = editor.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const r = grid.length, c = grid[0].length;
    const cell = Math.floor(editor.width / Math.max(r, c));
    const col = Math.min(c - 1, Math.max(0, Math.floor(x / cell)));
    const row = Math.min(r - 1, Math.max(0, Math.floor(y / cell)));
    return { row, col };
  }

  // Three.js 3D View
  let renderer, scene, camera, wallsGroup, edgesGroup, boundaryGroup, pathLine;
  function setupThree() {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(threeContainer.clientWidth, threeContainer.clientHeight);
    threeContainer.innerHTML = '';
    threeContainer.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    const aspect = threeContainer.clientWidth / Math.max(1, threeContainer.clientHeight);
    camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    camera.position.set(-10, 18, 18);
    camera.lookAt(0, 0, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(10, 20, 10);
    scene.add(dir);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({ color: 0x0b0e1f, metalness: 0.2, roughness: 0.9 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    scene.add(floor);

    wallsGroup = new THREE.Group();
    edgesGroup = new THREE.Group();
    boundaryGroup = new THREE.Group();
    scene.add(wallsGroup);
    scene.add(edgesGroup);
    scene.add(boundaryGroup);

    animate();
  }

  function updateThree(path = []) {
    // clear walls, edges and boundary
    while (wallsGroup.children.length) wallsGroup.remove(wallsGroup.children[0]);
    while (edgesGroup.children.length) edgesGroup.remove(edgesGroup.children[0]);
    while (boundaryGroup.children.length) boundaryGroup.remove(boundaryGroup.children[0]);
    if (pathLine) { scene.remove(pathLine); pathLine.geometry.dispose(); }

    const r = grid.length, c = grid[0].length;
    const scale = 0.6;
    const offsetX = -((c - 1) * scale) / 2;
    const offsetZ = -((r - 1) * scale) / 2;

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x2b335f });
    const wallGeo = new THREE.BoxGeometry(scale, scale, scale);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x6ee7f9, transparent: true, opacity: 0.6, linewidth: 1 });
    for (let i = 0; i < r; i++) {
      for (let j = 0; j < c; j++) {
        if (grid[i][j] === 1) {
          const cube = new THREE.Mesh(wallGeo, wallMat);
          cube.position.set(offsetX + j * scale, scale / 2, offsetZ + i * scale);
          wallsGroup.add(cube);

          // outline edges for visual border
          const edges = new THREE.EdgesGeometry(wallGeo);
          const line = new THREE.LineSegments(edges, edgeMat);
          line.position.copy(cube.position);
          edgesGroup.add(line);
        }
      }
    }

    // perimeter frame (square outline) around the entire maze
    const half = scale / 2;
    const minX = offsetX - half;
    const maxX = offsetX + (c - 1) * scale + half;
    const minZ = offsetZ - half;
    const maxZ = offsetZ + (r - 1) * scale + half;
    const boundaryPts = [
      new THREE.Vector3(minX, 0.02, minZ),
      new THREE.Vector3(maxX, 0.02, minZ),
      new THREE.Vector3(maxX, 0.02, maxZ),
      new THREE.Vector3(minX, 0.02, maxZ)
    ];
    const boundaryGeo = new THREE.BufferGeometry().setFromPoints(boundaryPts);
    const boundaryMat = new THREE.LineBasicMaterial({ color: 0x3b4aa1, transparent: true, opacity: 0.9 });
    const boundary = new THREE.LineLoop(boundaryGeo, boundaryMat);
    boundaryGroup.add(boundary);

    // start and end markers
    const startGeom = new THREE.ConeGeometry(scale * 0.35, scale * 0.8, 16);
    const startMat = new THREE.MeshStandardMaterial({ color: 0x00b894 });
    const startMesh = new THREE.Mesh(startGeom, startMat);
    startMesh.rotation.x = Math.PI;
    startMesh.position.set(offsetX + start[1] * scale, scale * 0.4, offsetZ + start[0] * scale);
    scene.add(startMesh);

    const endGeom = new THREE.SphereGeometry(scale * 0.35, 20, 20);
    const endMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
    const endMesh = new THREE.Mesh(endGeom, endMat);
    endMesh.position.set(offsetX + end[1] * scale, scale * 0.4, offsetZ + end[0] * scale);
    scene.add(endMesh);

    // path line
    if (path.length > 0) {
      const pts = path.map(([pr, pc]) => new THREE.Vector3(offsetX + pc * scale, scale * 0.45, offsetZ + pr * scale));
      const curve = new THREE.CatmullRomCurve3(pts);
      const g = new THREE.TubeGeometry(curve, Math.max(10, path.length * 2), scale * 0.08, 8, false);
      const m = new THREE.MeshStandardMaterial({ color: 0xa78bfa, emissive: 0x6a5acd, emissiveIntensity: 0.4 });
      pathLine = new THREE.Mesh(g, m);
      scene.add(pathLine);
    }
  }

  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }

  function setStatus(text) { statusEl.textContent = text; }
  function setMessage(text, isError = false) {
    messageEl.textContent = text;
    messageEl.style.color = isError ? '#f87171' : '#9aa0b4';
  }

  async function generateRandom() {
    setStatus('Generating...');
    try {
      const body = {
        rows: parseInt(rowsInput.value, 10),
        cols: parseInt(colsInput.value, 10),
        wallProbability: parseFloat(wallProbInput.value)
      };
      const res = await fetch(`${API_BASE}/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Request failed');
      grid = data.grid;
      start = data.start;
      end = data.end;
      editMode = false;
      drawEditor();
      updateThree([]);
      setMessage('Random maze generated.');
    } catch (err) {
      console.error(err);
      setMessage(err.message, true);
    } finally {
      setStatus('');
    }
  }

  async function solveMaze() {
    setStatus('Solving...');
    try {
      const body = { grid, start, end };
      body.algorithm = (algoSelect?.value || 'bfs');
      const res = await fetch(`${API_BASE}/solve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Request failed');
      if (!data.found) {
        stepsEl.textContent = 'Steps: -';
        drawEditor([], data.visited_order || []);
        updateThree([]);
        setMessage('No path found.', true);
        return;
      }
      stepsEl.textContent = `Steps: ${data.steps}`;
      drawEditor(data.path, data.visited_order || []);
      updateThree(data.path);
      setMessage('Solved!');
    } catch (err) {
      console.error(err);
      setMessage(err.message, true);
    } finally {
      setStatus('');
    }
  }

  function enterEditMode() {
    const r = parseInt(rowsInput.value, 10);
    const c = parseInt(colsInput.value, 10);
    grid = createEmptyGrid(r, c);
    start = [0, 0];
    end = [r - 1, c - 1];
    editMode = true;
    stepsEl.textContent = 'Steps: -';
    setMessage('Edit mode: draw walls, set start/end.');
    drawEditor();
    updateThree([]);
  }

  btnGenerate.addEventListener('click', generateRandom);
  btnSolve.addEventListener('click', solveMaze);
  btnEdit.addEventListener('click', enterEditMode);
  window.addEventListener('resize', () => { resizeEditor(); if (renderer) { renderer.setSize(threeContainer.clientWidth, threeContainer.clientHeight); } });

  resizeEditor();
  setupThree();
  drawEditor();
  updateThree([]);
})();


