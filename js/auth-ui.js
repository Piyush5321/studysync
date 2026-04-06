// js/auth-ui.js

function switchTab(tab) {
  const slider = document.getElementById('tabSlider');
  const loginPanel = document.getElementById('loginPanel');
  const signupPanel = document.getElementById('signupPanel');
  const loginTab = document.getElementById('loginTab');
  const signupTab = document.getElementById('signupTab');

  if (tab === 'login') {
    slider.style.transform = 'translateX(0)';
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
    loginPanel.classList.add('active');
    signupPanel.classList.remove('active');
  } else {
    slider.style.transform = 'translateX(100%)';
    signupTab.classList.add('active');
    loginTab.classList.remove('active');
    signupPanel.classList.add('active');
    loginPanel.classList.remove('active');
  }
  document.getElementById('authMessage').classList.add('hidden');
}

function togglePass(id, btn) {
  const inp = document.getElementById(id);
  const icon = btn.querySelector('i');
  if (inp.type === 'password') {
    inp.type = 'text';
    icon.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    inp.type = 'password';
    icon.classList.replace('fa-eye-slash', 'fa-eye');
  }
}

function showMsg(msg, type) {
  const el = document.getElementById('authMessage');
  el.className = `auth-msg ${type}`;
  el.textContent = msg;
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const text = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');
  const arrow = btn.querySelector('.btn-arrow');
  if (loading) {
    text.classList.add('hidden'); loader.classList.remove('hidden'); arrow.classList.add('hidden');
    btn.disabled = true;
  } else {
    text.classList.remove('hidden'); loader.classList.add('hidden'); arrow.classList.remove('hidden');
    btn.disabled = false;
  }
}

// Counter animation
function animateCounters() {
  document.querySelectorAll('.counter').forEach(el => {
    const target = parseInt(el.dataset.target);
    let current = 0;
    const step = target / 60;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { el.textContent = target.toLocaleString() + '+'; clearInterval(timer); }
      else el.textContent = Math.floor(current).toLocaleString();
    }, 16);
  });
}

// Particle canvas
function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const particles = [];
  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.5,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.5 + 0.1
    });
  }
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
      ctx.fill();
      p.x += p.dx; p.y += p.dy;
      if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
    });
    requestAnimationFrame(draw);
  }
  draw();
}

document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  animateCounters();
});
window.switchTab = switchTab;
window.togglePass = togglePass;
window.showMsg = showMsg;
window.setLoading = setLoading;
