// profile.js — Profile dropdown with photo/emoji, phone, email, about
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { app } from '/wealthmap/shared.js';

const auth = getAuth(app);
const db   = getFirestore(app);

const EMOJIS = ['😊','🧑','👩','👨','🦁','🐯','🦊','🐸','🦄','🌟','💎','🏆','🚀','🌈','🎯'];

export function initProfileDropdown() {
  // Inject dropdown HTML into the nav-user element
  const navUser = document.getElementById('navUser');
  if (!navUser) return;

  // Replace plain sign-out button with the dropdown structure
  const signOutBtn = document.getElementById('navSignOut');

  // Build dropdown
  const dd = document.createElement('div');
  dd.className = 'profile-dd';
  dd.id = 'profileDd';
  dd.innerHTML = `
    <div class="pdd-head">
      <div class="pdd-avatar" id="pddAvatar" onclick="document.getElementById('pddUpload').click()" title="Click to upload photo">
        <span id="pddAvatarContent">U</span>
      </div>
      <div class="pdd-head-info">
        <div class="pdd-name" id="pddName">User</div>
        <div class="pdd-email" id="pddEmail"></div>
        <div class="pdd-edit-link" onclick="window.toggleProfileEdit()">Edit profile →</div>
      </div>
    </div>
    <div class="pdd-body" id="pddEditBody" style="display:none">
      <div class="pdd-section-label">Choose Avatar</div>
      <div class="pdd-avatar-opts" id="pddEmojiOpts">
        ${EMOJIS.map(e=>`<div class="pdd-av-opt" data-emoji="${e}" onclick="window.selectEmoji('${e}')">${e}</div>`).join('')}
        <div class="pdd-av-upload" onclick="document.getElementById('pddUpload').click()" title="Upload photo">📷</div>
      </div>
      <input type="file" id="pddUpload" accept="image/*" style="display:none">
      <div class="pdd-field">
        <label class="pdd-label">Display Name</label>
        <input class="pdd-input" id="pddInputName" placeholder="Your name" maxlength="40">
      </div>
      <div class="pdd-field">
        <label class="pdd-label">Phone Number</label>
        <input class="pdd-input" id="pddInputPhone" placeholder="+91 98765 43210" maxlength="20" type="tel">
      </div>
      <div class="pdd-field">
        <label class="pdd-label">Email (display)</label>
        <input class="pdd-input" id="pddInputEmail" placeholder="your@email.com" maxlength="80">
      </div>
      <div class="pdd-field">
        <label class="pdd-label">About <span style="font-weight:400;text-transform:none;letter-spacing:0">(max 100 words)</span></label>
        <textarea class="pdd-textarea" id="pddInputAbout" placeholder="A short bio about yourself…" oninput="window.checkWordCount(this)"></textarea>
        <div class="pdd-char-count" id="pddWordCount">0 / 100 words</div>
      </div>
      <button class="pdd-save" onclick="window.saveProfile()">💾 Save Profile</button>
      <div class="pdd-div"></div>
    </div>
    <div style="padding:8px 16px 14px">
      <button class="pdd-signout" id="pddSignOut">↪ Sign Out</button>
    </div>`;

  navUser.appendChild(dd);

  // Reflow: move sign out button into the new structure
  if (signOutBtn) signOutBtn.style.display = 'none';
  document.getElementById('pddSignOut').addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = '/');
  });

  // File upload
  document.getElementById('pddUpload').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Image too large (max 2MB)'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const b64 = ev.target.result;
      document.getElementById('pddAvatarContent').innerHTML = `<img src="${b64}" alt="avatar">`;
      document.getElementById('navAv').innerHTML = `<img src="${b64}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      // Clear emoji selection
      document.querySelectorAll('.pdd-av-opt').forEach(o=>o.classList.remove('selected'));
      profileState.avatar = b64;
    };
    reader.readAsDataURL(file);
  });

  // Close dropdown on outside click
  document.addEventListener('click', e => {
    const dd = document.getElementById('profileDd');
    const pill = document.getElementById('navPillU');
    if (dd && pill && !dd.contains(e.target) && !pill.contains(e.target)) {
      dd.classList.remove('open');
    }
  });
}

// In-memory profile state
const profileState = { avatar: null, name: '', phone: '', email: '', about: '' };

export async function loadProfile(user) {
  if (!user) return;
  try {
    const snap = await getDoc(doc(db,'users',user.uid,'profile','data'));
    if (snap.exists()) {
      const d = snap.data();
      profileState.avatar = d.avatar || null;
      profileState.name   = d.name  || '';
      profileState.phone  = d.phone || '';
      profileState.email  = d.email || user.email || '';
      profileState.about  = d.about || '';
    } else {
      profileState.email = user.email || '';
    }
  } catch(e) {
    profileState.email = user.email || '';
  }

  // Update nav avatar
  applyAvatarToNav(profileState.avatar || user.email[0].toUpperCase());

  // Update dropdown head
  const dispName = profileState.name || user.email.split('@')[0];
  const el = id => document.getElementById(id);
  if (el('pddName'))  el('pddName').textContent  = dispName;
  if (el('navNm'))    el('navNm').textContent     = dispName;
  if (el('pddEmail')) el('pddEmail').textContent  = profileState.email || user.email;

  // Populate form
  if (el('pddInputName'))  el('pddInputName').value  = profileState.name;
  if (el('pddInputPhone')) el('pddInputPhone').value = profileState.phone;
  if (el('pddInputEmail')) el('pddInputEmail').value = profileState.email || user.email;
  if (el('pddInputAbout')) {
    el('pddInputAbout').value = profileState.about;
    updateWordCount(el('pddInputAbout'));
  }

  // Restore emoji if no photo
  if (profileState.avatar && !profileState.avatar.startsWith('data:')) {
    const emojiOpt = document.querySelector(`.pdd-av-opt[data-emoji="${profileState.avatar}"]`);
    if (emojiOpt) emojiOpt.classList.add('selected');
    applyAvatarToNav(profileState.avatar);
  } else if (profileState.avatar && profileState.avatar.startsWith('data:')) {
    applyAvatarToNav(profileState.avatar);
  }
}

function applyAvatarToNav(av) {
  const navAv = document.getElementById('navAv');
  const pddAv = document.getElementById('pddAvatarContent');
  if (!navAv) return;
  if (av && av.startsWith('data:')) {
    // photo
    const imgHtml = `<img src="${av}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    navAv.innerHTML = imgHtml;
    if (pddAv) pddAv.innerHTML = `<img src="${av}" alt="avatar">`;
  } else if (av && EMOJIS.includes(av)) {
    navAv.textContent = av;
    navAv.style.fontSize = '.95rem';
    if (pddAv) pddAv.textContent = av;
  } else {
    navAv.textContent = typeof av === 'string' ? av[0]?.toUpperCase() || 'U' : 'U';
    if (pddAv) pddAv.textContent = navAv.textContent;
  }
}

// ── Global functions ──
window.toggleProfileDd = () => {
  document.getElementById('profileDd')?.classList.toggle('open');
};
window.toggleProfileEdit = () => {
  const body = document.getElementById('pddEditBody');
  if (body) body.style.display = body.style.display === 'none' ? 'block' : 'none';
};
window.selectEmoji = emoji => {
  document.querySelectorAll('.pdd-av-opt').forEach(o => o.classList.toggle('selected', o.dataset.emoji === emoji));
  profileState.avatar = emoji;
  applyAvatarToNav(emoji);
};
window.checkWordCount = el => updateWordCount(el);
function updateWordCount(el) {
  const words = el.value.trim() === '' ? 0 : el.value.trim().split(/\s+/).length;
  const cnt = document.getElementById('pddWordCount');
  if (cnt) {
    cnt.textContent = `${words} / 100 words`;
    cnt.className = 'pdd-char-count' + (words > 95 ? ' warn' : '');
  }
  if (words > 100) {
    // Trim to 100 words
    const trimmed = el.value.trim().split(/\s+/).slice(0,100).join(' ');
    el.value = trimmed;
  }
}

window.saveProfile = async () => {
  const user = auth.currentUser;
  if (!user) return;
  const el = id => document.getElementById(id);
  const name  = el('pddInputName')?.value.trim()  || '';
  const phone = el('pddInputPhone')?.value.trim() || '';
  const email = el('pddInputEmail')?.value.trim() || '';
  const about = el('pddInputAbout')?.value.trim() || '';
  const avatar = profileState.avatar || null;

  const btn = document.querySelector('.pdd-save');
  if (btn) { btn.textContent = '⏳ Saving…'; btn.disabled = true; }

  try {
    await setDoc(doc(db,'users',user.uid,'profile','data'), { name, phone, email, about, avatar, updatedAt: new Date().toISOString() }, { merge: true });
    // Update nav name
    const dispName = name || user.email.split('@')[0];
    if (el('navNm'))    el('navNm').textContent    = dispName;
    if (el('pddName'))  el('pddName').textContent  = dispName;
    if (el('pddEmail')) el('pddEmail').textContent = email || user.email;
    showToast('Profile saved ✓');
    // Collapse edit form
    if (el('pddEditBody')) el('pddEditBody').style.display = 'none';
  } catch(e) {
    showToast('Error saving: ' + e.message);
  } finally {
    if (btn) { btn.textContent = '💾 Save Profile'; btn.disabled = false; }
  }
};

function showToast(msg) {
  const t = document.getElementById('toast');
  const m = document.getElementById('toastMsg');
  if (!t || !m) return;
  m.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}
