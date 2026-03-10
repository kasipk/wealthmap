// shared.js — Firebase init, auth state, nav
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
// Profile dropdown is initialised lazily per-page via initProfileDropdown()

const FB = {
  apiKey: "AIzaSyAXHRiYdO-Y6nSWnT7K23mxfFYFu-JELls",
  authDomain: "wealthmap-705a6.firebaseapp.com",
  projectId: "wealthmap-705a6",
  storageBucket: "wealthmap-705a6.firebasestorage.app",
  messagingSenderId: "824878360619",
  appId: "1:824878360619:web:f45bb59b4f78e846bfe26e"
};
const ADMIN = 'kasiviswa@hotmail.com';
export const app = initializeApp(FB);
export const auth = getAuth(app);
export { ADMIN };

// Utility formatter used by calculator & dashboard
export function fmtS(v) {
  if (v >= 10000000) return '₹' + (v/10000000).toFixed(2) + ' Cr';
  if (v >= 100000)   return '₹' + (v/100000).toFixed(1) + 'L';
  if (v >= 1000)     return '₹' + (v/1000).toFixed(1) + 'K';
  return '₹' + Math.round(v).toLocaleString('en-IN');
}

export function initNav(activePage) {
  const nav = document.getElementById('nav');

  // Nav becomes solid white on scroll (on dark-hero pages)
  const lightOnScroll = ['home', 'login'];
  if (!lightOnScroll.includes(activePage)) {
    nav.classList.add('light');
  }
  window.addEventListener('scroll', () => {
    if (lightOnScroll.includes(activePage)) {
      nav.classList.toggle('light', window.scrollY > 60);
    }
  });

  // Highlight active nav link
  const activeId = 'np-' + activePage;
  const activeEl = document.getElementById(activeId);
  if (activeEl) activeEl.classList.add('active');

  onAuthStateChanged(auth, u => {
    const pub    = document.getElementById('navPublic');
    const usr    = document.getElementById('navUser');
    const adm    = document.getElementById('navAdm');
    const npHome = document.getElementById('np-home');

    if (u) {
      if (pub) pub.style.display = 'none';
      if (usr) usr.style.display = 'flex';
      if (document.getElementById('navAv')) document.getElementById('navAv').textContent = u.email[0].toUpperCase();
      if (document.getElementById('navNm')) document.getElementById('navNm').textContent = u.email.split('@')[0];
      if (adm) adm.style.display = u.email === ADMIN ? 'inline-block' : 'none';
      // Init profile dropdown once
      if (!document.getElementById('profileDd')) {
        import('/wealthmap/profile.js').then(m => { m.initProfileDropdown(); m.loadProfile(u); });
      } else {
        import('/wealthmap/profile.js').then(m => m.loadProfile(u));
      }

      // Home link stays visible — it leads to the dashboard when logged in
      // On home page: swap public landing for dashboard view
      if (activePage === 'home') {
        const pubView  = document.getElementById('public-view');
        const dashView = document.getElementById('dash-view');
        if (pubView)  pubView.style.display  = 'none';
        if (dashView) { dashView.style.display = 'block'; }
        nav.classList.add('light');
      }
      // On login page: go to home (dashboard)
      if (activePage === 'login') window.location.href = '/wealthmap/';

    } else {
      if (pub) pub.style.display = 'flex';
      if (usr) usr.style.display = 'none';
    }
  });

  document.getElementById('navSignOut')?.addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = '/wealthmap/');
  });
}

export function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  document.getElementById('toastMsg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}

export function initReveal() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
}
