// QuickCafe premium standalone login interaction
lucide.createIcons();

const form = document.getElementById("loginForm");
const loginCard = document.querySelector(".login-card");
const cardShell = document.querySelector(".card-shell");
const username = document.getElementById("username");
const password = document.getElementById("password");
const messageBox = document.getElementById("messageBox");
const togglePassword = document.getElementById("togglePassword");
const submitBtn = form.querySelector('.login-btn');

// Element references for dynamic switching
const cardTitle = form.querySelector('h2');
const cardSubtitle = form.querySelector('.login-subtitle');
const field1Group = document.getElementById('field1Group');
const field1Label = field1Group.querySelector('span');
const field2Group = document.getElementById('field2Group');
const field2Label = field2Group.querySelector('span');
const tableSelect = document.getElementById('tableSelect');
const rememberRow = document.querySelector('.form-row');
const secondaryToggleBtn = document.querySelector('.customer-link');

let currentMode = 'admin'; // match initial mockup Admin view

function showMessage(type, text) {
  if (type === 'none') {
    messageBox.className = 'message';
    messageBox.style.display = 'none';
  } else {
    messageBox.className = `message show ${type}`;
    messageBox.style.display = 'block';
    messageBox.textContent = text;
  }
}

// Toggle password eye icon visibility
if (togglePassword) {
  togglePassword.addEventListener("click", () => {
    const isPassword = password.type === "password";
    password.type = isPassword ? "text" : "password";
    togglePassword.innerHTML = isPassword
      ? '<i data-lucide="eye"></i>'
      : '<i data-lucide="eye-off"></i>';
    lucide.createIcons();
  });
}

// Layout Switcher between Admin & Customer logins
function setMode(mode) {
  currentMode = mode;
  showMessage('none', '');
  
  if (mode === 'admin') {
    cardTitle.textContent = 'Admin Login';
    cardSubtitle.textContent = 'Sign in to manage your café seamlessly';
    
    field1Label.textContent = 'Username';
    username.placeholder = 'Enter your username';
    username.value = '';
    username.style.display = 'block';
    username.required = true;
    
    field2Label.textContent = 'Password';
    password.style.display = 'block';
    password.required = true;
    togglePassword.style.display = 'grid';
    tableSelect.style.display = 'none';
    
    rememberRow.style.visibility = 'visible';
    rememberRow.style.position = 'static';
    rememberRow.style.height = 'auto';
    rememberRow.style.marginBottom = '26px';
    
    submitBtn.innerHTML = '<i data-lucide="log-in"></i> Login';
    secondaryToggleBtn.innerHTML = '<i data-lucide="coffee"></i> Back to Customer Site';
  } else {
    cardTitle.textContent = 'Customer Login';
    cardSubtitle.textContent = 'Select your table and start your session';
    
    field1Label.textContent = 'Your Name';
    username.placeholder = 'Enter your name';
    username.value = '';
    username.style.display = 'block';
    username.required = false; // guest session name is optional
    
    field2Label.textContent = 'Table';
    password.style.display = 'none';
    password.required = false;
    togglePassword.style.display = 'none';
    tableSelect.style.display = 'block';
    
    rememberRow.style.visibility = 'hidden';
    rememberRow.style.position = 'absolute';
    rememberRow.style.height = '0';
    rememberRow.style.marginBottom = '0';
    
    submitBtn.innerHTML = '<i data-lucide="coffee"></i> Start Session';
    secondaryToggleBtn.innerHTML = '<i data-lucide="user-round"></i> Switch to Staff Login';
  }
  lucide.createIcons();
}

// Initial setup to match user's default Admin Login
setMode('admin');

// Toggling counter modes with 3D Flip animation
if (secondaryToggleBtn && loginCard) {
  secondaryToggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const nextMode = currentMode === 'admin' ? 'customer' : 'admin';
    
    // Prevent double-clicks during active flip
    if (loginCard.classList.contains('flip-anim')) return;
    
    // Trigger CSS keyframe rotation
    loginCard.classList.add('flip-anim');
    
    // Halfway through rotation (275ms), change inputs & content
    setTimeout(() => {
      setMode(nextMode);
    }, 275);
    
    // Clean up animation class once complete (550ms)
    setTimeout(() => {
      loginCard.classList.remove('flip-anim');
    }, 550);
  });
}

// Form Submission handling
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (currentMode === 'customer') {
    const guestName = username.value.trim() || 'Coffee Lover';
    const tableNumber = tableSelect.value;
    submitBtn.disabled = true;
    const originalContent = submitBtn.innerHTML;
    submitBtn.textContent = 'Selecting table...';

    try {
      const res = await fetch('/api/select-table', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_number: tableNumber })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('qc_guest_name', guestName);
        localStorage.setItem('qc_table', tableNumber);
        showMessage("success", "Session started! Loading menu...");
        document.body.style.opacity = '0.7';
        document.body.style.transition = 'opacity 0.4s';
        setTimeout(() => {
          window.location.href = 'customer.html';
        }, 500);
      } else {
        showMessage("error", data.error || "Could not select table.");
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalContent;
      }
    } catch (err) {
      showMessage("error", "Connection error. Is the server running?");
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalContent;
    }
  } else {
    const user = username.value.trim();
    const pass = password.value.trim();

    if (!user || !pass) {
      showMessage("error", "Please enter username and password.");
      return;
    }

    submitBtn.disabled = true;
    const originalContent = submitBtn.innerHTML;
    submitBtn.textContent = 'Authenticating...';

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
      });
      const data = await res.json();
      if (data.success) {
        showMessage("success", "Login successful. Redirecting...");
        setTimeout(() => {
          window.location.href = 'admin/dashboard.html';
        }, 800);
      } else {
        showMessage("error", data.error || "Invalid credentials.");
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalContent;
      }
    } catch (err) {
      showMessage("error", "Connection error. Is the server running?");
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalContent;
    }
  }
});

// Load live tables dynamically from backend
async function loadTables() {
  try {
    const res = await fetch('/api/tables');
    const data = await res.json();
    if (data.success && data.tables.length) {
      tableSelect.innerHTML = data.tables.map(t => {
        const isSelected = t.table_number === 'Table 07' ? 'selected' : '';
        return `<option value="${t.table_number}" ${isSelected}>${t.table_number} (${t.status})</option>`;
      }).join('');
    }
  } catch (e) {
    // Leave static fallbacks
  }
}
loadTables();

// Logo and title click refreshing page
const brandCorner = document.querySelector('.brand-corner');
if (brandCorner) {
  brandCorner.addEventListener('click', () => {
    window.location.reload();
  });
}
const loginLogo = document.querySelector('.login-logo');
if (loginLogo) {
  loginLogo.addEventListener('click', () => {
    window.location.reload();
  });
}

/* ===================================================================
   Premium micro-interactions: card tilt, button ripple
   =================================================================== */
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hasFinePointer = window.matchMedia("(pointer: fine)").matches;

if (cardShell && loginCard && hasFinePointer && !prefersReducedMotion) {
  let tiltFrame = null;

  cardShell.addEventListener("mousemove", (e) => {
    const rect = loginCard.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;

    if (tiltFrame) cancelAnimationFrame(tiltFrame);
    tiltFrame = requestAnimationFrame(() => {
      loginCard.style.transform = `rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 7).toFixed(2)}deg)`;
      loginCard.style.setProperty("--mx", `${(px + 0.5) * 100}%`);
      loginCard.style.setProperty("--my", `${(py + 0.5) * 100}%`);
    });
  });

  cardShell.addEventListener("mouseleave", () => {
    loginCard.style.transform = "rotateX(0deg) rotateY(0deg)";
  });
}

const loginBtn = document.querySelector(".login-btn");
if (loginBtn) {
  loginBtn.addEventListener("click", (e) => {
    const rect = loginBtn.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.left = `${e.clientX - rect.left}px`;
    ripple.style.top = `${e.clientY - rect.top}px`;
    loginBtn.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove());
  });
}

/* ===================================================================
   Real-time 3D ambient scene — floating coffee-bean & bokeh field
   rendered behind the entire page (and softly visible through the
   glass login card). Built with Three.js; degrades gracefully if the
   library fails to load, and respects prefers-reduced-motion.
   =================================================================== */
function initBg3D() {
  if (typeof THREE === "undefined") return;
  const canvas = document.getElementById("bg-canvas");
  if (!canvas) return;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xfff3e0, 0.012);

  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 22);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  scene.add(new THREE.AmbientLight(0xffe4b5, 0.9));

  const pLight = new THREE.PointLight(0xffb347, 1.4, 60);
  pLight.position.set(-10, 12, 18);
  scene.add(pLight);

  const pLight2 = new THREE.PointLight(0x6b3a16, 0.8, 60);
  pLight2.position.set(12, -8, 10);
  scene.add(pLight2);

  // Soft golden / cream bokeh spheres drifting through the scene
  const bokehColors = [0xf6c875, 0xd89a3d, 0xffffff, 0x9a6737];
  const bokehData = [];
  const bokehGroup = new THREE.Group();

  for (let i = 0; i < 24; i++) {
    const radius = 0.18 + Math.random() * 0.55;
    const geo = new THREE.SphereGeometry(radius, 16, 16);
    const color = bokehColors[i % bokehColors.length];
    const mat = new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity: 0.22 + Math.random() * 0.3,
      roughness: 0.4,
      metalness: 0.1,
      emissive: color,
      emissiveIntensity: 0.35,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const x = (Math.random() - 0.5) * 34;
    const y = (Math.random() - 0.5) * 22;
    const z = -14 + Math.random() * 22;
    mesh.position.set(x, y, z);
    bokehGroup.add(mesh);
    bokehData.push({
      mesh,
      speed: 0.15 + Math.random() * 0.35,
      offset: Math.random() * Math.PI * 2,
      baseX: x,
      baseY: y,
    });
  }
  scene.add(bokehGroup);

  // Tumbling coffee-bean shapes for depth + brand texture
  const beanGroup = new THREE.Group();
  const beanData = [];

  for (let i = 0; i < 5; i++) {
    const geo = new THREE.SphereGeometry(1, 24, 24);
    geo.scale(0.62, 1, 0.4);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x5c2f12,
      roughness: 0.35,
      metalness: 0.25,
      emissive: 0x3b1708,
      emissiveIntensity: 0.25,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const scale = 0.6 + Math.random() * 0.9;
    mesh.scale.setScalar(scale);
    const y = (Math.random() - 0.5) * 18;
    mesh.position.set((Math.random() - 0.5) * 30, y, -10 + Math.random() * 16);
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    beanGroup.add(mesh);
    beanData.push({
      mesh,
      rotSpeed: (Math.random() - 0.5) * 0.006,
      floatSpeed: 0.2 + Math.random() * 0.3,
      offset: Math.random() * Math.PI * 2,
      baseY: y,
    });
  }
  scene.add(beanGroup);

  let mouseX = 0;
  let mouseY = 0;
  window.addEventListener("mousemove", (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();

  function renderFrame() {
    const t = clock.getElapsedTime();

    bokehData.forEach((d) => {
      d.mesh.position.y = d.baseY + Math.sin(t * d.speed + d.offset) * 1.4;
      d.mesh.position.x = d.baseX + Math.cos(t * d.speed * 0.7 + d.offset) * 0.8;
    });

    beanData.forEach((d) => {
      d.mesh.rotation.x += d.rotSpeed;
      d.mesh.rotation.y += d.rotSpeed * 1.4;
      d.mesh.position.y = d.baseY + Math.sin(t * d.floatSpeed + d.offset) * 1.1;
    });

    camera.position.x += (mouseX * 2.4 - camera.position.x) * 0.02;
    camera.position.y += (-mouseY * 1.6 - camera.position.y) * 0.02;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }

  if (prefersReducedMotion) {
    renderFrame();
  } else {
    (function animate() {
      requestAnimationFrame(animate);
      renderFrame();
    })();
  }
}

initBg3D();
