/* ============================================================
   Money Map — Firebase Authentication (Google Sign-In)
   ============================================================
   SETUP INSTRUCTIONS:
   1. Go to https://console.firebase.google.com
   2. Click "Add project" → name it "Money Map" → continue
   3. Disable Google Analytics (optional) → "Create project"
   4. In the project dashboard, click the </> (Web) icon to add a web app
   5. Register the app (name it "Money Map Web") → copy the firebaseConfig below
   6. Go to Build → Authentication → Get started
   7. Click "Sign-in method" tab → Enable "Google" → Save
   8. Go to Authentication → Settings → Authorized domains
      → Add "localhost" and your deployed domain (e.g. yourdomain.com)
   9. Replace the placeholder config object below with your real config

   FINDING YOUR CONFIG:
   Project Settings (gear icon) → General → Your apps → SDK setup and configuration
   ============================================================ */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

// ─── REPLACE WITH YOUR FIREBASE CONFIG ─────────────────────
// Get this from: Firebase Console → Project Settings → General → Your apps
const firebaseConfig = {
  apiKey:            "AIzaSyBy2fggNIzBp_lkhd72tOHIem_4e561ItQ",
  authDomain:        "money-mapping-ca37a.firebaseapp.com",
  projectId:         "money-mapping-ca37a",
  storageBucket:     "money-mapping-ca37a.firebasestorage.app",
  messagingSenderId: "877921192553",
  appId:             "1:877921192553:web:4b60d4250d377474cbb0f8"
};
// ───────────────────────────────────────────────────────────



// Guard: if config is still placeholder, disable Firebase silently
const isConfigured = firebaseConfig.apiKey !== 'YOUR_API_KEY';

console.log('🚀 js/auth.js module loading... isConfigured:', isConfigured);

let auth = null;
let googleProvider = null;

if (isConfigured) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
}

// ─── Persistent OTP Verification Helper ─────────────────────
function isUserOTPVerified(uid) {
  return localStorage.getItem(`mm_otp_verified_${uid}`) === 'true';
}

function setUserOTPVerified(uid, status) {
  if (status) {
    localStorage.setItem(`mm_otp_verified_${uid}`, 'true');
  } else {
    localStorage.removeItem(`mm_otp_verified_${uid}`);
  }
}

// ─── DOM Helpers ────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);

// ─── Profile UI Update ──────────────────────────────────────
function updateProfileUI(user) {
  const sidebarAvatar  = $('.sidebar__avatar');
  const sidebarName    = $('.sidebar__user-name');
  const sidebarRole    = $('.sidebar__user-role');
  const greetingEl     = $('#greeting');
  const profileNameEl  = $('#profileName');
  const profileEmailEl = $('#profileEmail');

  if (!user) return;

  const displayName = user.displayName || user.name || 'User';
  const email       = user.email || '';
  const photoURL    = user.photoURL || null;
  const firstLetter = displayName.charAt(0).toUpperCase();

  // --- Sidebar avatar (photo or letter fallback) ---
  if (sidebarAvatar) {
    if (photoURL) {
      sidebarAvatar.innerHTML = `
        <img
          src="${photoURL}"
          alt="${displayName}"
          id="sidebarAvatarImg"
          style="width:100%; height:100%; border-radius:50%; object-fit:cover; display:block;"
          onerror="this.style.display='none'; document.getElementById('sidebarAvatarFallback').style.display='flex';"
        >
        <span id="sidebarAvatarFallback" style="display:none; width:100%; height:100%; align-items:center; justify-content:center;">
          ${firstLetter}
        </span>`;
      sidebarAvatar.style.padding = '0';
      sidebarAvatar.style.overflow = 'hidden';
    } else {
      sidebarAvatar.textContent = firstLetter;
    }
  }

  // --- Sidebar user info ---
  if (sidebarName) sidebarName.textContent = displayName;
  if (sidebarRole) sidebarRole.textContent = user.isGuest ? 'Guest Mode' : 'Google Account';

  // --- Topbar greeting ---
  if (greetingEl) {
    const hour = new Date().getHours();
    let timeGreeting = 'Good Evening,';
    if (hour < 12) timeGreeting = 'Good Morning,';
    else if (hour < 18) timeGreeting = 'Good Afternoon,';
    greetingEl.innerHTML = `<h1>${timeGreeting}</h1><p>${displayName} 👋</p>`;
  }

  // --- Settings profile form ---
  if (profileNameEl)  profileNameEl.value = displayName;
  if (profileEmailEl) profileEmailEl.value = email;

  // Show/hide login button based on authentication status (hide if logged in with Google, show if guest)
  const loginBtn = $('#loginBtn');
  if (loginBtn) {
    if (user.isLoggedIn && !user.isGuest) {
      loginBtn.style.display = 'none';
    } else {
      loginBtn.style.display = '';
    }
  }
}

// ─── Show / Hide App Sections ───────────────────────────────
function showApp(user) {
  const authOverlay = $('#auth-overlay');
  const appLayout   = $('#appLayout');
  if (!authOverlay || !appLayout) return;

  // Fade out auth overlay
  authOverlay.style.transition = 'opacity 0.35s ease';
  authOverlay.style.opacity = '0';

  setTimeout(() => {
    authOverlay.style.display = 'none';
    authOverlay.style.opacity = '1';

    appLayout.style.opacity = '0';
    appLayout.style.display = 'flex';
    appLayout.style.transition = 'opacity 0.35s ease';
    requestAnimationFrame(() => {
      appLayout.style.opacity = '1';
    });

    updateProfileUI(user);
  }, 320);
}

function showAuth() {
  const authOverlay = $('#auth-overlay');
  const appLayout   = $('#appLayout');
  if (!authOverlay || !appLayout) return;

  appLayout.style.display  = 'none';
  authOverlay.style.display = 'flex';

  const loginBtn = $('#loginBtn');
  if (loginBtn) loginBtn.style.display = '';

  // Reset login form
  const loginEmail = $('#loginEmail');
  const loginPass  = $('#loginPassword');
  if (loginEmail) loginEmail.value = '';
  if (loginPass)  loginPass.value  = '';
  $('#loginError') && ($('#loginError').style.display = 'none');

  // Reset Google button state
  const googleBtn = $('#googleSignInBtn');
  if (googleBtn) {
    googleBtn.disabled = false;
    googleBtn.innerHTML = getGoogleBtnHTML();
  }
}

// ─── Email/Password Authentication Mode ─────────────────────
let authMode = 'login'; // 'login' or 'signup'

function toggleMode(mode) {
  authMode = mode;
  const loginTab = $('#authTabLogin');
  const signupTab = $('#authTabSignup');
  const nameGroup = $('#signupNameGroup');
  const subtitle = $('#authSubtitle');
  const submitBtn = $('#authSubmitBtn');
  const loginError = $('#loginError');

  if (loginError) loginError.style.display = 'none';

  if (authMode === 'signup') {
    if (loginTab) loginTab.classList.remove('active');
    if (signupTab) signupTab.classList.add('active');
    if (nameGroup) nameGroup.style.display = 'block';
    if (subtitle) subtitle.textContent = 'Create an account to manage your finances';
    if (submitBtn) submitBtn.textContent = 'Create Account';
    const signupNameInput = $('#signupName');
    if (signupNameInput) signupNameInput.required = true;
  } else {
    if (signupTab) signupTab.classList.remove('active');
    if (loginTab) loginTab.classList.add('active');
    if (nameGroup) nameGroup.style.display = 'none';
    if (subtitle) subtitle.textContent = 'Log in to manage your finances';
    if (submitBtn) submitBtn.textContent = 'Log In';
    const signupNameInput = $('#signupName');
    if (signupNameInput) signupNameInput.required = false;
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();

  if (!isConfigured) {
    alert(
      '⚠️ Firebase not configured yet.\n\n' +
      'Please open js/auth.js and replace the firebaseConfig placeholder with your real Firebase config.'
    );
    return;
  }

  const email = $('#loginEmail').value.trim();
  const password = $('#loginPassword').value.trim();
  const name = $('#signupName') ? $('#signupName').value.trim() : '';
  const submitBtn = $('#authSubmitBtn');
  const loginError = $('#loginError');

  if (!email || !password) return;
  if (authMode === 'signup' && !name) {
    alert('Please enter your full name.');
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = authMode === 'signup' ? 'Creating Account…' : 'Logging In…';
  }
  if (loginError) loginError.style.display = 'none';

  try {
    let userCredential;
    if (authMode === 'signup') {
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await updateProfile(user, { displayName: name });
      
      // Store pending verification session details
      currentOTPPendingUser = {
        user: user,
        displayName: name,
        email: email
      };

      // Send Firebase verification email
      await sendVerificationEmail(user);

      // Transition to verification card
      $('#otpEmailDisplay').textContent = email;
      $('#authCard').style.display = 'none';
      $('#otpCard').style.display = 'block';
      $('#otpError').style.display = 'none';

      startOTPTimer();

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
      }
      return;
    } else {
      userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Restrict login until email is verified
      if (!isUserOTPVerified(user.uid)) {
        currentOTPPendingUser = {
          user: user,
          displayName: user.displayName || 'User',
          email: user.email
        };

        // Send a new verification email
        await sendVerificationEmail(user);

        // Transition to verification card
        $('#otpEmailDisplay').textContent = user.email;
        $('#authCard').style.display = 'none';
        $('#otpCard').style.display = 'block';
        $('#otpError').style.display = 'none';

        startOTPTimer();

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Log In';
        }
        return;
      }
    }

    const user = userCredential.user;

    const savedRaw = localStorage.getItem('mm-state');
    const saved = savedRaw ? JSON.parse(savedRaw) : {};
    saved.user = {
      name: user.displayName || name || 'User',
      email: user.email || email,
      photoURL: user.photoURL || null,
      isLoggedIn: true,
      uid: user.uid,
      isGuest: false
    };
    localStorage.setItem('mm-state', JSON.stringify(saved));

    if (window.appSetUserState) {
      window.appSetUserState(saved.user);
    }

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = authMode === 'signup' ? 'Create Account' : 'Log In';
    }

    showApp(saved.user);

  } catch (err) {
    console.error('Email/Password auth error:', err);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = authMode === 'signup' ? 'Create Account' : 'Log In';
    }

    let msg = 'Authentication failed. Please try again.';
    if (err.code === 'auth/email-already-in-use') msg = 'This email address is already in use.';
    if (err.code === 'auth/weak-password')         msg = 'Password should be at least 6 characters.';
    if (err.code === 'auth/invalid-email')         msg = 'Invalid email address format.';
    if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      msg = 'Invalid email or password.';
    }

    if (loginError) {
      loginError.textContent = msg;
      loginError.style.display = 'block';
    } else {
      alert(msg);
    }
  }
}

// ─── Firebase Email Verification Logic ──────────────────────
let currentOTPPendingUser = null;
let otpTimerInterval = null;

async function sendVerificationEmail(user) {
  try {
    await sendEmailVerification(user);
    console.log('✉️ Firebase verification email sent to:', user.email);
    return true;
  } catch (error) {
    console.error('❌ Failed to send verification email:', error.message);
    const otpError = $('#otpError');
    if (otpError) {
      if (error.code === 'auth/too-many-requests') {
        otpError.textContent = '⚠️ Too many requests. Please wait a moment before trying again.';
      } else {
        otpError.textContent = '⚠️ Failed to send verification email. Please try again.';
      }
      otpError.style.display = 'block';
    }
    return false;
  }
}

function startOTPTimer() {
  const timerSecondsEl = $('#otpTimerSeconds');
  const timerEl = $('#otpTimer');
  const resendBtn = $('#otpResendBtn');
  if (!timerSecondsEl || !timerEl || !resendBtn) return;

  clearInterval(otpTimerInterval);
  let timeLeft = 60;
  timerSecondsEl.textContent = timeLeft;
  timerEl.style.display = 'inline';
  resendBtn.style.display = 'none';
  resendBtn.disabled = true;

  otpTimerInterval = setInterval(() => {
    timeLeft--;
    timerSecondsEl.textContent = timeLeft;

    if (timeLeft <= 0) {
      clearInterval(otpTimerInterval);
      timerEl.style.display = 'none';
      resendBtn.style.display = 'inline-block';
      resendBtn.disabled = false;
    }
  }, 1000);
}

async function handleVerifyClick() {
  const submitBtn = $('#otpSubmitBtn');
  const otpError = $('#otpError');

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite; flex-shrink:0;">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
      </svg>
      Checking…`;
  }
  if (otpError) otpError.style.display = 'none';

  let user = null;
  let displayName = 'User';
  let email = '';

  if (currentOTPPendingUser && currentOTPPendingUser.user) {
    user = currentOTPPendingUser.user;
    displayName = currentOTPPendingUser.displayName;
    email = currentOTPPendingUser.email;
  } else if (auth && auth.currentUser) {
    user = auth.currentUser;
    displayName = user.displayName || 'User';
    email = user.email;
  }

  if (!user) {
    if (otpError) {
      otpError.textContent = '❌ Session expired. Please sign up or log in again.';
      otpError.style.display = 'block';
    }
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" style="flex-shrink:0;"><polyline points="20 6 9 17 4 12"/></svg> I've Verified My Email`;
    }
    return;
  }

  // Reload user to get latest emailVerified status from Firebase
  try {
    await user.reload();
  } catch (err) {
    console.error('Failed to reload user:', err);
  }

  if (user.emailVerified) {
    console.log('✅ Email verified successfully!');
    setUserOTPVerified(user.uid, true);

    const savedRaw = localStorage.getItem('mm-state');
    const saved = savedRaw ? JSON.parse(savedRaw) : {};
    saved.user = {
      name: displayName,
      email: email,
      photoURL: user.photoURL || null,
      isLoggedIn: true,
      uid: user.uid,
      isGuest: false
    };
    localStorage.setItem('mm-state', JSON.stringify(saved));

    if (window.appSetUserState) {
      window.appSetUserState(saved.user);
    }

    showApp(saved.user);

    currentOTPPendingUser = null;
    clearInterval(otpTimerInterval);
  } else {
    console.log('❌ Email not yet verified.');

    const otpCard = $('#otpCard');
    if (otpCard) {
      otpCard.classList.add('shake');
      setTimeout(() => otpCard.classList.remove('shake'), 400);
    }

    if (otpError) {
      otpError.textContent = '⚠️ Email not verified yet. Please check your inbox (and spam folder) and click the verification link first.';
      otpError.style.display = 'block';
    }
  }

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" style="flex-shrink:0;"><polyline points="20 6 9 17 4 12"/></svg> I've Verified My Email`;
  }
}

function handleOTPBack() {
  clearInterval(otpTimerInterval);
  currentOTPPendingUser = null;
  if (auth) {
    signOut(auth);
  }
  
  $('#otpCard').style.display = 'none';
  $('#authCard').style.display = 'block';
}

async function handleOTPResend() {
  const resendBtn = $('#otpResendBtn');
  const otpError = $('#otpError');
  if (resendBtn) {
    resendBtn.disabled = true;
    resendBtn.textContent = 'Sending…';
  }
  if (otpError) otpError.style.display = 'none';

  let user = null;
  if (currentOTPPendingUser && currentOTPPendingUser.user) {
    user = currentOTPPendingUser.user;
  } else if (auth && auth.currentUser) {
    user = auth.currentUser;
  }

  if (user) {
    await sendVerificationEmail(user);
  }

  if (resendBtn) {
    resendBtn.textContent = 'Resend Verification Email';
  }
  startOTPTimer();
}

// ─── Google Button HTML ─────────────────────────────────────
function getGoogleBtnHTML() {
  return `
    <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <path fill="none" d="M0 0h48v48H0z"/>
    </svg>
    <span>Sign in with Google</span>`;
}

// ─── Google Sign-In Handler ─────────────────────────────────
async function handleGoogleSignIn() {
  if (!isConfigured) {
    alert(
      '⚠️ Firebase not configured yet.\n\n' +
      'Please open js/auth.js and replace the firebaseConfig placeholder with your real Firebase config.\n\n' +
      'See the setup instructions at the top of the file.'
    );
    return;
  }

  const googleBtn = $('#googleSignInBtn');
  if (googleBtn) {
    googleBtn.disabled = true;
    googleBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite; flex-shrink:0;">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
      </svg>
      <span>Signing in…</span>`;
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Persist to app.js state via localStorage bridge
    const savedRaw = localStorage.getItem('mm-state');
    const saved = savedRaw ? JSON.parse(savedRaw) : {};
    saved.user = {
      name: user.displayName || 'User',
      email: user.email || '',
      photoURL: user.photoURL || null,
      isLoggedIn: true,
      uid: user.uid,
      isGuest: false
    };
    localStorage.setItem('mm-state', JSON.stringify(saved));

    showApp(saved.user);

  } catch (err) {
    console.error('Google Sign-In error:', err);

    let msg = 'Sign-in failed. Please try again.';
    if (err.code === 'auth/popup-closed-by-user')   msg = 'Sign-in cancelled.';
    if (err.code === 'auth/popup-blocked')          msg = 'Popup was blocked by your browser. Please allow popups for this site.';
    if (err.code === 'auth/network-request-failed') msg = 'Network error. Check your connection and try again.';
    if (err.code === 'auth/operation-not-allowed') {
      msg = 'Google Sign-In is not enabled in your Firebase Console. Go to Build → Authentication → Sign-in method and enable Google.';
    }
    if (err.code === 'auth/unauthorized-domain') {
      msg = 'This domain is not authorized in Firebase.\n\nGo to Firebase Console → Authentication → Settings → Authorized Domains and add this domain.';
    }

    if (googleBtn) {
      googleBtn.disabled = false;
      googleBtn.innerHTML = getGoogleBtnHTML();
    }

    // Show inline error
    const errEl = $('#googleSignInError');
    if (errEl) {
      errEl.textContent = msg;
      errEl.style.display = 'block';
      setTimeout(() => { errEl.style.display = 'none'; }, 5000);
    } else {
      alert(msg);
    }
  }
}

// ─── Logout Handler ─────────────────────────────────────────
async function handleLogout() {
  // Clear Google auth state if signed in via Firebase
  if (auth && isConfigured) {
    try { await signOut(auth); } catch (_) { /* ignore */ }
  }

  // Clear user from localStorage (keep transactions/budgets/goals)
  const savedRaw = localStorage.getItem('mm-state');
  if (savedRaw) {
    const saved = JSON.parse(savedRaw);
    saved.user = { name: 'Demo Student', email: '', isLoggedIn: false, isGuest: false };
    localStorage.setItem('mm-state', JSON.stringify(saved));
  }

  showAuth();
}

// ─── Auth State Observer ────────────────────────────────────
function initAuthStateObserver() {
  if (!isConfigured || !auth) {
    console.log('📡 Firebase not configured. Skipping Auth State Observer.');
    return;
  }

  console.log('📡 Starting Firebase Auth State Observer...');
  onAuthStateChanged(auth, (user) => {
    console.log('📡 Firebase Auth State Changed. User:', user);
    const savedRaw = localStorage.getItem('mm-state');
    const saved    = savedRaw ? JSON.parse(savedRaw) : {};
    const isGuest  = saved.user && saved.user.isGuest === true;

    if (user && !isGuest) {
      // Check if signed in via Google (bypass OTP verification)
      const isGoogleUser = user.providerData && user.providerData.some(p => p.providerId === 'google.com');
      if (isGoogleUser) {
        setUserOTPVerified(user.uid, true);
      }

      if (!isUserOTPVerified(user.uid)) {
        console.log('📡 Firebase user detected but OTP is unverified. Signing out...');
        signOut(auth);
        showAuth();
        return;
      }

      // Firebase user is signed in (not a guest session)
      // Update localStorage so app.js state is in sync
      saved.user = {
        name: user.displayName || 'User',
        email: user.email || '',
        photoURL: user.photoURL || null,
        isLoggedIn: true,
        uid: user.uid,
        isGuest: false
      };
      localStorage.setItem('mm-state', JSON.stringify(saved));

      // Show the app if the overlay is still visible
      const authOverlay = $('#auth-overlay');
      if (authOverlay && authOverlay.style.display !== 'none') {
        showApp(saved.user);
      } else {
        // Overlay already hidden (e.g., from demo login) — just update profile UI
        updateProfileUI(saved.user);
      }
    } else if (!isGuest && saved.user && saved.user.isLoggedIn) {
      // Firebase session expired but localStorage says logged in → trust localStorage for demo users
      // (demo/guest login doesn't use Firebase so it's always "no Firebase user")
      updateProfileUI(saved.user);
    }
  });
}

// ─── Bootstrap ──────────────────────────────────────────────
function init() {
  console.log('🚀 Initializing Firebase Auth...');

  // Wire up Google Sign-In button
  const googleBtn = $('#googleSignInBtn');
  if (googleBtn) {
    googleBtn.innerHTML = getGoogleBtnHTML();
    googleBtn.addEventListener('click', handleGoogleSignIn);
  }

  // Wire up Logout button (replaces app.js handler for Firebase sign-out)
  const logoutBtn = $('#logoutBtn');
  if (logoutBtn) {
    // Clone to remove any existing listeners added by app.js
    const newLogoutBtn = logoutBtn.cloneNode(true);
    logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
    newLogoutBtn.addEventListener('click', handleLogout);
  }

  // Wire up Login button in the topbar header to show the auth overlay
  const loginBtn = $('#loginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', showAuth);
  }

  // Wire up Login/Signup form tabs
  const tabLogin = $('#authTabLogin');
  const tabSignup = $('#authTabSignup');
  if (tabLogin) tabLogin.addEventListener('click', () => toggleMode('login'));
  if (tabSignup) tabSignup.addEventListener('click', () => toggleMode('signup'));

  // Wire up Login/Signup Form (replaces app.js handler for Firebase email/password auth)
  const loginForm = $('#loginForm');
  if (loginForm) {
    const newLoginForm = loginForm.cloneNode(true);
    loginForm.parentNode.replaceChild(newLoginForm, loginForm);
    newLoginForm.addEventListener('submit', handleFormSubmit);

    // Re-wire up guest mode button inside the cloned form
    const demoLoginBtn = newLoginForm.querySelector('#demoLoginBtn');
    if (demoLoginBtn) {
      demoLoginBtn.addEventListener('click', () => {
        const savedRaw = localStorage.getItem('mm-state');
        const saved = savedRaw ? JSON.parse(savedRaw) : {};
        saved.user = {
          name: 'Guest',
          email: 'guest@demo.com',
          photoURL: null,
          isLoggedIn: true,
          isGuest: true
        };
        localStorage.setItem('mm-state', JSON.stringify(saved));
        if (window.appSetUserState) {
          window.appSetUserState(saved.user);
        }
        showApp(saved.user);
      });
    }
  }

  // Wire up Email Verification button
  const otpSubmitBtn = $('#otpSubmitBtn');
  if (otpSubmitBtn) {
    otpSubmitBtn.addEventListener('click', handleVerifyClick);
  }

  // Wire up OTP Back button
  const otpBackBtn = $('#otpBackBtn');
  if (otpBackBtn) {
    otpBackBtn.addEventListener('click', handleOTPBack);
  }

  // Wire up Resend Verification Email button
  const otpResendBtn = $('#otpResendBtn');
  if (otpResendBtn) {
    otpResendBtn.addEventListener('click', handleOTPResend);
  }

  // Read current saved state
  const savedRaw = localStorage.getItem('mm-state');
  const saved    = savedRaw ? JSON.parse(savedRaw) : {};

  // If already logged in via localStorage (app.js bootstrap already ran),
  // update the profile UI with any photo data
  if (saved.user && saved.user.isLoggedIn) {
    updateProfileUI(saved.user);
  }

  // Start Firebase auth state observer
  initAuthStateObserver();
}

// Run after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
