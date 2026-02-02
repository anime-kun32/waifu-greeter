
  
  console.log("Welcome");
  
// lightdm state 
const state = {
  currentUser: null,
  selectedSession: null,
  blurValue: 12,
  dimValue: 40,
  openDropdown: null,
  isAuthenticating: false,
  manualLoginMode: false,
  showAllUsers: false,
  usernameInput: '',
  passwordInput: ''
  
};

  // DOM helper
  function getElement(id) {
    return document.getElementById(id);
  }

  // initialise lightdm
  function initLightDM() {
    console.log("🔧 Initializing LightDM...");
    console.log("lightdm available:", !!window.lightdm);
    console.log("lightdm users:", window.lightdm?.users);
    console.log("lightdm sessions:", window.lightdm?.sessions);
    
    // If LightDM is already available, use it
    if (window.lightdm) {
      console.log(" LightDM is already available!");
      loadRealUsersAndSessions();
      setupLightDMEvents();
    } else {
      // Wait for GreeterReady event
      console.log(" Waiting for GreeterReady event...");
      if (window._ready_event) {
        window.addEventListener("GreeterReady", function() {
          console.log(" GreeterReady event fired!");
          loadRealUsersAndSessions();
          setupLightDMEvents();
        });
      } else {
        // Poll for LightDM
        console.log(" No _ready_event, polling for LightDM...");
        const pollInterval = setInterval(() => {
          if (window.lightdm) {
            clearInterval(pollInterval);
            console.log(" LightDM found via polling!");
            loadRealUsersAndSessions();
            setupLightDMEvents();
          }
        }, 100);
        
        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(pollInterval);
          if (!window.lightdm) {
            console.error("❌ LightDM still not available after 5 seconds");
            showFallbackUsers();
          }
        }, 5000);
      }
    }
  }

  // get system users 
  function loadRealUsersAndSessions() {
    console.log(" finding users");
    
    const lightdm = window.lightdm;
    
    if (!lightdm) {
      console.error(" LightDM is not available at all");
      showFallbackUsers();
      return;
    }
    
    if (!lightdm.users || !Array.isArray(lightdm.users)) {
      console.error(" lightdm.users is not an array:", lightdm.users);
      showFallbackUsers();
      return;
    }
    
    console.log(` Found ${lightdm.users.length} REAL system users:`, lightdm.users);
    console.log(` Found ${lightdm.sessions?.length || 0} sessions:`, lightdm.sessions);
    
    // Update session dropdown with REAL sessions
    const sessionList = getElement('sessionList');
    if (sessionList && lightdm.sessions && lightdm.sessions.length > 0) {
      sessionList.innerHTML = '';
      lightdm.sessions.forEach((session, index) => {
        const isDefault = session.key === lightdm.default_session || 
                         (index === 0 && !state.selectedSession);
        const div = document.createElement('div');
        div.className = `dropdown-item ${isDefault ? 'selected' : ''}`;
        div.dataset.session = session.key;
        div.textContent = session.name || session.key;
        sessionList.appendChild(div);
        
        if (isDefault) {
          state.selectedSession = session.key;
          getElement('currentSession').textContent = session.name || session.key;
          console.log(` Set default session: ${session.key} (${session.name})`);
        }
      });
    } else if (sessionList) {
      // Fallback sessions
      console.log(" Using fallback sessions");
      sessionList.innerHTML = `
        <div class="dropdown-item selected" data-session="ubuntu">Ubuntu</div>
        <div class="dropdown-item" data-session="ubuntu-wayland">Ubuntu (Wayland)</div>
        <div class="dropdown-item" data-session="ubuntu-xorg">Ubuntu (Xorg)</div>
      `;
      getElement('currentSession').textContent = 'Ubuntu';
      state.selectedSession = 'ubuntu';
    }
    
    // Update user dropdown menu
    const userList = getElement('userList');
    if (userList) {
      userList.innerHTML = `
        <div class="dropdown-item" id="showAllUsersBtn">
          <i class="fas fa-users mr-2"></i> All Users
        </div>
        <div class="dropdown-item" id="manualLoginBtn">
          <i class="fas fa-keyboard mr-2"></i> Manual Login
        </div>
      `;
    }
    
    // Set default user
    if (lightdm.select_user_hint) {
      console.log(` LightDM suggests user: ${lightdm.select_user_hint}`);
      const defaultUser = lightdm.users.find(u => u.username === lightdm.select_user_hint);
      if (defaultUser) {
        state.currentUser = defaultUser;
        console.log(` Using suggested user: ${defaultUser.username}`);
        showCenterUser(defaultUser);
      } else if (lightdm.users.length > 0) {
        state.currentUser = lightdm.users[0];
        console.log(` Using first available user: ${lightdm.users[0].username}`);
        showCenterUser(lightdm.users[0]);
      } else {
        console.log(" No users found, showing manual login");
        showFallbackUsers();
      }
    } else if (lightdm.users.length > 0) {
      state.currentUser = lightdm.users[0];
      console.log(` Using first user: ${lightdm.users[0].username}`);
      showCenterUser(lightdm.users[0]);
    } else {
      console.log(" No users in LightDM, showing manual login");
      showFallbackUsers();
    }
  }
// fallback users if no users are found 
  function showFallbackUsers() {
    console.log(" Showing fallback user interface");
    const sessionList = getElement('sessionList');
    if (sessionList) {
      sessionList.innerHTML = `
        <div class="dropdown-item selected" data-session="ubuntu">Ubuntu</div>
        <div class="dropdown-item" data-session="ubuntu-wayland">Ubuntu (Wayland)</div>
        <div class="dropdown-item" data-session="ubuntu-xorg">Ubuntu (Xorg)</div>
      `;
      getElement('currentSession').textContent = 'Ubuntu';
      state.selectedSession = 'ubuntu';
    }
    
    // Show manual login by default
    state.manualLoginMode = true;
    showCenterUser({username: '', display_name: ''});
  }

  // Event handlers
  function setupLightDMEvents() {
    const lightdm = window.lightdm;
    if (!lightdm) {
      console.error(" Cannot  setup events - LightDM not available");
      return;
    }
    
    console.log(" Setting up LightDM event handlers...");
    
    // Handle authentication messages
    if (typeof lightdm.show_message === 'function' || lightdm.show_message) {
      if (lightdm.show_message.connect) {
        lightdm.show_message.connect((message, type) => {
          console.log(` LightDM Message (type ${type}): ${message}`);
          showAuthStatus(message, type === 1 ? 'error' : 'info');
        });
      } else {
        console.log(" lightdm.show_message.connect not available");
      }
    }
    
    // Handle prompts (for username/password) 
    if (typeof lightdm.show_prompt === 'function' || lightdm.show_prompt) {
      if (lightdm.show_prompt.connect) {
        lightdm.show_prompt.connect((message, type) => {
          console.log(`❓ LightDM Prompt (type ${type}, secret: ${type === 1}): ${message}`);
          const isSecret = type === 1; // 1 = password prompt, 0 = text prompt
          handleLightDMPrompt(message, isSecret);
        });
      } else {
        console.log(" lightdm.show_prompt.connect not available");
      }
    }
    
    // Handle authentication complete 
    if (typeof lightdm.authentication_complete === 'function' || lightdm.authentication_complete) {
      if (lightdm.authentication_complete.connect) {
        lightdm.authentication_complete.connect(() => {
          console.log(" Authentication complete! Starting session...");
          showAuthStatus("Authentication successful! Starting session...", "success");
          startSession();
        });
      } else {
        console.log(" lightdm.authentication_complete.connect not available");
      }
    }
    
    // Handle reset
    if (typeof lightdm.reset === 'function' || lightdm.reset) {
      if (lightdm.reset.connect) {
        lightdm.reset.connect(() => {
          console.log(" Authentication reset by LightDM");
          state.isAuthenticating = false;
          state.authStep = 'idle';
          showAuthStatus("", "info");
          const passwordInput = getElement('passwordInput');
          if (passwordInput) {
            passwordInput.value = '';
            passwordInput.disabled = false;
            passwordInput.focus();
          }
        });
      } else {
        console.log(" lightdm.reset.connect not available");
      }
    }
    
    console.log(" LightDM event handlers setup complete");
  }

  
 function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function authenticateUser(username) {
  const lightdm = window.lightdm;
  if (!lightdm) {
    console.error(" LightDM not available for authentication");
    showAuthStatus("System error: LightDM not available", "error");
    return false;
  }
  
  console.log(` Starting authentication for user: ${username}`);
  
  // Cancel any existing authentication
  if (lightdm.in_authentication) {
    console.log(" Cancelling existing authentication");
    lightdm.cancel_authentication();
  }
  
  // Start authentication
  try {
    const success = lightdm.authenticate(username);
    console.log(` lightdm.authenticate("${username}") returned:`, success);
    
    if (!success) {
      console.error(" lightdm.authenticate() failed");
      showAuthStatus("Failed to start authentication", "error");
      return false;
    }
    
    state.isAuthenticating = true;
    state.authStep = 'authenticating';
    showAuthStatus("Authenticating...", "info");
    
    // Start progress animation
    const progressFill = document.querySelector('.auth-progress-fill');
    if (progressFill) {
      progressFill.style.width = '30%';
    }
    
    return true;
  } catch (error) {
    console.error(" Exception in authentication:", error);
    showAuthStatus(`Authentication error: ${error.message}`, "error");
    return false;
  }
}
 
function startSession() {
  const lightdm = window.lightdm;
  if (!lightdm) {
    console.error(" Cannot start session - LightDM not available");
    showAuthStatus("Cannot start session", "error");
    return;
  }
  
  console.log(`🚀 Starting session for user: ${state.currentUser?.username}`);
  
  // Update progress to complete
  const progressFill = document.querySelector('.auth-progress-fill');
  if (progressFill) {
    progressFill.style.width = '100%';
  }
  
  showAuthStatus("Starting desktop session...", "success");
  
  // Disable login button
  const loginBtn = getElement('loginButton');
  if (loginBtn) loginBtn.disabled = true;
  
  // Fade out UI
  document.body.style.opacity = '0.5';
  document.body.style.transition = 'opacity 1s';
  
  // Start the session
  setTimeout(() => {
    try {
      const sessionToStart = state.selectedSession || lightdm.default_session || 'ubuntu';
      console.log(` Starting session: ${sessionToStart}`);
      
      lightdm.start_session(sessionToStart);
      
    } catch (error) {
      console.error(" Session start error:", error);
      showAuthStatus(`Session error: ${error.message}`, "error");
      
      // Reset after error
      setTimeout(() => {
        state.isAuthenticating = false;
        state.authStep = 'idle';
        if (loginBtn) loginBtn.disabled = false;
        if (progressFill) progressFill.style.width = '0%';
      }, 2000);
    }
  }, 1000);
}
  // ui handlers
function handleLightDMPrompt(message, isSecret) {
  console.log(` LightDM prompt (ignored): "${message}" (secret: ${isSecret})`);

}

  function showAuthStatus(message, type = 'info') {
    const statusEl = getElement('authStatus');
    if (!statusEl) return;
    
    if (!message) {
      statusEl.innerHTML = '';
      statusEl.className = 'auth-status';
      return;
    }
    
    const icons = {
      info: 'fa-info-circle',
      error: 'fa-times-circle',
      success: 'fa-check-circle',
      warning: 'fa-exclamation-triangle'
    };
    
    statusEl.className = `auth-status ${type}`;
    statusEl.innerHTML = `
      <i class="fas ${icons[type]} mr-2"></i> ${message}
    `;
  }

  // update password handling 
  function setupPasswordHandling() {
    const passwordInput = getElement('passwordInput');
    const togglePassword = getElement('togglePassword');
    const loginButton = getElement('loginButton');
    
    if (!passwordInput) {
      console.error(" Password input not found");
      return;
    }
    
    console.log(" Setting up password handling...");
    
    // Toggle password visibility
    let isPasswordVisible = false;
    if (togglePassword) {
      togglePassword.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        isPasswordVisible = !isPasswordVisible;
        passwordInput.type = isPasswordVisible ? 'text' : 'password';
        togglePassword.innerHTML = isPasswordVisible ? 
          '<i class="fas fa-eye-slash"></i>' : 
          '<i class="fas fa-eye"></i>';
      });
    }
    
    // Handle input based on auth step
    // Handle input
passwordInput.addEventListener('input', () => {
  const value = passwordInput.value;
  
  if (state.manualLoginMode && !state.currentUser) {
    // In manual mode without user selected, it's username
    state.usernameInput = value;
  } else {
    // Otherwise it's password
    state.passwordInput = value;
  }
  
  // Enable/disable login button
  if (loginButton) {
    const lightdm = window.lightdm;
    const isGuest = state.currentUser && state.currentUser.username === '*guest';
    
    if (isGuest && lightdm?.has_guest_account) {
      loginButton.disabled = false;
    } else {
      loginButton.disabled = value.length === 0;
    }
  }
});
    
    // Handle Enter key
    passwordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (loginButton && !loginButton.disabled) {
          attemptLogin();
        }
      }
    });
    
    // Handle login button
    if (loginButton) {
      loginButton.addEventListener('click', attemptLogin);
    }
    
    // Focus the input
    setTimeout(() => {
      passwordInput.focus();
      console.log(`Focused input, authStep: ${state.authStep}`);
    }, 50);
  }

async function attemptLogin() {
  console.log(" Attempting login...");
  
  const passwordInput = getElement('passwordInput');
  const loginButton = getElement('loginButton');
  
  if (!passwordInput || !loginButton) return;
  
  // Disable login button immediately
  loginButton.disabled = true;
  
  // Guest login
  const lightdm = window.lightdm;
  if (state.currentUser && lightdm?.has_guest_account && 
      state.currentUser.username === '*guest') {
    console.log(" Guest login attempt");
    showAuthStatus("Logging in as guest...", "info");
    
    try {
      lightdm.cancel_authentication();
      if (lightdm.authenticate_as_guest) {
        console.log(" Using lightdm.authenticate_as_guest()");
        lightdm.authenticate_as_guest();
        await wait(100);
        startSession();
      }
    } catch (error) {
      console.error(" Guest login error:", error);
      showAuthStatus("Guest login failed", "error");
      loginButton.disabled = false;
    }
    return;
  }
  
  // Get username and password
  let username = '';
  let password = '';
  
  // Handle manual login mode (username entry)
  if (state.manualLoginMode && !state.currentUser) {
    username = state.usernameInput || passwordInput.value;
    if (!username) {
      showAuthStatus("Please enter a username", "warning");
      loginButton.disabled = false;
      return;
    }
    
    // Find if this is a real user
    const realUser = lightdm?.users?.find(u => u.username === username);
    if (realUser) {
      state.currentUser = realUser;
    } else {
      // Try anyway
      state.currentUser = {
        username: username,
        display_name: username
      };
    }
    
    state.manualLoginMode = false;
    console.log(` User set to: ${username}`);
    
    // Show password prompt for this user
    showAuthStatus(`Enter password for ${username}`, "info");
    
    // Clear and focus password input
    if (passwordInput) {
      passwordInput.value = '';
      passwordInput.placeholder = 'Enter password';
      passwordInput.type = 'password';
      passwordInput.focus();
    }
    
    loginButton.disabled = false;
    return;
  }
  
  // Normal login flow - we should have a user selected
  if (!state.currentUser) {
    showAuthStatus("Please select a user first", "warning");
    loginButton.disabled = false;
    return;
  }
  
  username = state.currentUser.username;
  password = passwordInput.value;
  
  if (!password) {
    showAuthStatus("Please enter your password", "warning");
    loginButton.disabled = false;
    return;
  }
  
  console.log(` Authenticating ${username} with password`);
  showAuthStatus("Authenticating...", "info");
  
  // THE SIMPLE FLOW FROM THE EXAMPLE
  try {
    // Cancel any existing auth
    lightdm.cancel_authentication();
    
    // Start authentication
    lightdm.authenticate(username);
    
    // Wait like the example
    await wait(100);
    
    // Respond with password
    lightdm.respond(password);
    
    // Wait for auth to process
    await wait(300);
    
    // Start session
    startSession();
    
  } catch (error) {
    console.error(" Login error:", error);
    showAuthStatus("Login failed - check credentials", "error");
    
    // Clear password field
    if (passwordInput) {
      passwordInput.value = '';
      passwordInput.focus();
    }
    
    loginButton.disabled = false;
  }
}
  // update user display
  function showCenterUser(user, preservePassword = false) {
    const centerUser = getElement('centerUser');
    if (!centerUser) return;
    
    const isGuest = user.username === '*guest';
    const displayName = user.display_name || user.username || 'User';
    const avatarUrl = user.image || `/var/lib/AccountsService/icons/${user.username}` || 
      `https://placehold.co/150x150/CCCCCC/333333?text=${encodeURIComponent(displayName.charAt(0))}`;
    
    // Check if image exists
    const checkImage = avatarUrl.startsWith('/var/lib/AccountsService/icons/') ? 
      ` onerror="this.src='https://placehold.co/150/CCCCCC/333333?text=${encodeURIComponent(displayName.charAt(0))}'"` : '';
    
    let passwordBox = '';
    
    if (state.manualLoginMode) {
      passwordBox = `
        <div class="password-container fade-in">
          <div class="relative">
            <input 
              type="text" 
              id="passwordInput" 
              class="password-input" 
              placeholder="Enter username"
              autocomplete="username"
              value="${state.usernameInput}"
            />
            <button type="button" id="togglePassword" class="toggle-password" style="display: none;">
              <i class="fas fa-eye"></i>
            </button>
          </div>
          <button id="loginButton" class="login-btn" ${state.usernameInput ? '' : 'disabled'}>
            <i class="fas fa-sign-in-alt mr-2"></i>Continue
          </button>
          <div id="authStatus" class="auth-status info mt-3"></div>
          <div class="auth-progress">
            <div class="auth-progress-fill"></div>
          </div>
        </div>
      `;
    } else {
      passwordBox = `
        <div class="password-container fade-in">
          <div class="relative">
            <input 
              type="password" 
              id="passwordInput" 
              class="password-input" 
              placeholder="${isGuest ? 'No password required' : 'Enter password'}"
              autocomplete="current-password"
              ${isGuest ? 'disabled' : ''}
              ${preservePassword && state.passwordInput ? `value="${state.passwordInput}"` : ''}
            />
            <button type="button" id="togglePassword" class="toggle-password" ${isGuest ? 'style="display: none;"' : ''}>
              <i class="fas fa-eye"></i>
            </button>
          </div>
          <button id="loginButton" class="login-btn" ${isGuest ? '' : 'disabled'}>
            <i class="fas fa-sign-in-alt mr-2"></i>${isGuest ? 'Login as Guest' : 'Login'}
          </button>
          <div id="authStatus" class="auth-status info mt-3"></div>
          <div class="auth-progress">
            <div class="auth-progress-fill"></div>
          </div>
        </div>
      `;
    }
    
    centerUser.innerHTML = `
      <div class="fade-in flex flex-col items-center">
        <div class="avatar-glow w-40 h-40 rounded-full mb-6 overflow-hidden border-4 border-white/30">
          <img src="${avatarUrl}" alt="${displayName}" class="w-full h-full object-cover"${checkImage}>
        </div>
        <h2 class="text-3xl font-light mb-2">${displayName}</h2>
        ${state.manualLoginMode ? '<p class="opacity-80 mb-2">Enter your username</p>' : 
          isGuest ? '<p class="opacity-80 mb-2">Guest account - no password required</p>' : 
          '<p class="opacity-80 mb-2">Enter your password to continue</p>'}
        ${passwordBox}
      </div>
    `;
    
    // Set up password handling
    setTimeout(setupPasswordHandling, 10);
    
   // Reset auth state
    showAuthStatus("", "info");
    // Reset progress
    const progressFill = document.querySelector('.auth-progress-fill');
    if (progressFill) {
      progressFill.style.width = '0%';
    }
  }

  // the user list view
  function showAllUsers() {
    const centerUser = getElement('centerUser');
    const lightdm = window.lightdm;
    
    if (!centerUser) return;
    
    state.showAllUsers = true;
    
    let usersHtml = '';
    if (lightdm?.users && lightdm.users.length > 0) {
      console.log(`👥 Showing ${lightdm.users.length} users in grid`);
      
      lightdm.users.forEach(user => {
        const displayName = user.display_name || user.username;
        const avatarUrl = user.image || `/var/lib/AccountsService/icons/${user.username}` || 
          `https://placehold.co/100x100/CCCCCC/333333?text=${encodeURIComponent(displayName.charAt(0))}`;
        
        const isSelected = state.currentUser?.username === user.username;
        
        usersHtml += `
          <div class="user-option ${isSelected ? 'selected' : ''}" 
               data-username="${user.username}"
               title="${displayName}">
            <div class="user-avatar">
              <img src="${avatarUrl}" alt="${displayName}" class="w-full h-full object-cover"
                   onerror="this.src='https://placehold.co/100x100/CCCCCC/333333?text=${encodeURIComponent(displayName.charAt(0))}'">
            </div>
            <div class="user-name">${displayName}</div>
          </div>
        `;
      });
      
      // Add guest account if available
      if (lightdm.has_guest_account) {
        const isGuestSelected = state.currentUser?.username === '*guest';
        usersHtml += `
          <div class="user-option ${isGuestSelected ? 'selected' : ''}" 
               data-username="*guest"
               title="Guest Account">
            <div class="user-avatar">
              <img src="https://placehold.co/100x100/999999/FFFFFF?text=G" alt="Guest" class="w-full h-full object-cover">
            </div>
            <div class="user-name">Guest</div>
          </div>
        `;
      }
    } else {
      // Fallback users - just in case
      console.log("⚠️ No users from LightDM, showing fallback");
      usersHtml = `
        <div class="user-option selected" data-username="anime-kun32" title="anime-kun32">
          <div class="user-avatar">
            <img src="https://placehold.co/100x100/FF6BCB/FFFFFF?text=A" alt="anime-kun32" class="w-full h-full object-cover">
          </div>
          <div class="user-name">anime-kun32</div>
        </div>
      `;
    }
    
    centerUser.innerHTML = `
      <div class="fade-in">
        <h2 class="text-3xl font-light mb-6 text-center">Select User</h2>
        <div class="user-list">
          ${usersHtml}
        </div>
        <div class="text-center mt-8">
          <button id="backToLoginBtn" class="login-btn">
            <i class="fas fa-arrow-left mr-2"></i>Back
          </button>
          <button id="manualLoginFromListBtn" class="login-btn ml-4">
            <i class="fas fa-keyboard mr-2"></i>Manual Login
          </button>
        </div>
      </div>
    `;
    
    // Add click handlers for user selection
    document.querySelectorAll('.user-option').forEach(option => {
      option.addEventListener('click', () => {
        const username = option.dataset.username;
        console.log(`👤 User selected: ${username}`);
        
        const lightdm = window.lightdm;
        
        if (username === '*guest') {
          state.currentUser = {
            username: '*guest',
            display_name: 'Guest'
          };
        } else if (lightdm?.users) {
          const user = lightdm.users.find(u => u.username === username);
          if (user) {
            state.currentUser = user;
          } else {
            // Fallback user
            state.currentUser = {
              username: username,
              display_name: username.charAt(0).toUpperCase() + username.slice(1)
            };
          }
        } else {
          // Fallback user
          state.currentUser = {
            username: username,
            display_name: username.charAt(0).toUpperCase() + username.slice(1)
          };
        }
        
        state.showAllUsers = false;
        state.manualLoginMode = false;
        showCenterUser(state.currentUser);
      });
    });
    
    // Back button
    getElement('backToLoginBtn')?.addEventListener('click', () => {
      state.showAllUsers = false;
      if (state.currentUser) {
        showCenterUser(state.currentUser);
      } else {
        state.manualLoginMode = true;
        showCenterUser({username: '', display_name: ''});
      }
    });
    
    // Manual login from list
    getElement('manualLoginFromListBtn')?.addEventListener('click', () => {
      state.showAllUsers = false;
      state.manualLoginMode = true;
      state.currentUser = null;
      showCenterUser({username: '', display_name: ''});
    });
  }

  // dropdown management
  function initDropdowns() {
    console.log(" Initializing dropdowns...");
    
    // Show/hide dropdown function
    function toggleDropdown(menuId, show) {
      const menu = getElement(menuId);
      if (!menu) return;
      
      if (show) {
        menu.style.display = 'block';
        menu.offsetHeight;
        menu.classList.add('show');
      } else {
        menu.classList.remove('show');
        setTimeout(() => {
          if (!menu.classList.contains('show')) {
            menu.style.display = 'none';
          }
        }, 250);
      }
    }
    
    // Button click handlers
    getElement('deBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log("📱 Session button clicked");
      
      if (state.openDropdown === 'sessionList') {
        toggleDropdown('sessionList', false);
        state.openDropdown = null;
      } else {
        ['userList', 'settingsList', 'powerList'].forEach(id => toggleDropdown(id, false));
        toggleDropdown('sessionList', true);
        state.openDropdown = 'sessionList';
      }
    });
    
    getElement('userBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log(" User button clicked");
      
      if (state.openDropdown === 'userList') {
        toggleDropdown('userList', false);
        state.openDropdown = null;
      } else {
        ['sessionList', 'settingsList', 'powerList'].forEach(id => toggleDropdown(id, false));
        toggleDropdown('userList', true);
        state.openDropdown = 'userList';
      }
    });
    
    getElement('settingsBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log(" Settings button clicked");
      
      if (state.openDropdown === 'settingsList') {
        toggleDropdown('settingsList', false);
        state.openDropdown = null;
      } else {
        ['sessionList', 'userList', 'powerList'].forEach(id => toggleDropdown(id, false));
        toggleDropdown('settingsList', true);
        state.openDropdown = 'settingsList';
        setTimeout(initSliders, 10);
      }
    });
    
    getElement('powerBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log("Power button clicked");
      
      if (state.openDropdown === 'powerList') {
        toggleDropdown('powerList', false);
        state.openDropdown = null;
      } else {
        ['sessionList', 'userList', 'settingsList'].forEach(id => toggleDropdown(id, false));
        toggleDropdown('powerList', true);
        state.openDropdown = 'powerList';
      }
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
      if (state.openDropdown) {
        console.log(` Closing dropdown: ${state.openDropdown}`);
        toggleDropdown(state.openDropdown, false);
        state.openDropdown = null;
      }
    });
    
    // Session selection
    const sessionList = getElement('sessionList');
    if (sessionList) {
      sessionList.addEventListener('click', (e) => {
        const item = e.target.closest('.dropdown-item');
        if (!item) return;
        
        e.stopPropagation();
        e.preventDefault();
        
        console.log(`📱 Session selected: ${item.dataset.session}`);
        
        // Remove selected class from all items
        sessionList.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('selected'));
        // Add selected class to clicked item
        item.classList.add('selected');
        
        const sessionKey = item.dataset.session;
        state.selectedSession = sessionKey;
        getElement('currentSession').textContent = item.textContent;
        
        toggleDropdown('sessionList', false);
        state.openDropdown = null;
      });
    }
    
    // User menu actions
    setTimeout(() => {
      const showAllUsersBtn = getElement('showAllUsersBtn');
      const manualLoginBtn = getElement('manualLoginBtn');
      
      if (showAllUsersBtn) {
        showAllUsersBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          console.log("👥 Showing all users");
          showAllUsers();
          toggleDropdown('userList', false);
          state.openDropdown = null;
        });
      }
      
      if (manualLoginBtn) {
        manualLoginBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          console.log("⌨️ Switching to manual login");
          state.manualLoginMode = true;
          state.currentUser = null;
          showCenterUser({username: '', display_name: ''});
          toggleDropdown('userList', false);
          state.openDropdown = null;
        });
      }
    }, 100);
    
    // Power menu actions
    const lightdm = window.lightdm;
    ['restartAction', 'suspendAction', 'shutdownAction'].forEach(id => {
      const element = getElement(id);
      if (element) {
        element.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          
          const action = element.textContent.trim().toLowerCase();
          console.log(`⚡ Power action: ${action}`);
          
          if (action.includes('restart') || action.includes('shut down')) {
            if (!confirm(`Are you sure you want to ${action}?`)) {
              return;
            }
          }
          
          // Execute real LightDM action
          if (lightdm) {
            let success = false;
            if (action.includes('restart') && lightdm.can_restart) {
              console.log("Attempting restart");
              success = lightdm.restart();
            } else if (action.includes('suspend') && lightdm.can_suspend) {
              console.log(" Attempting suspend");
              success = lightdm.suspend();
            } else if (action.includes('shut down') && lightdm.can_shutdown) {
              console.log(" Attempting shutdown");
              success = lightdm.shutdown();
            }
            
            if (!success) {
              alert(`Failed to ${action}. Check permissions.`);
            }
          } else {
            alert(`System would ${action} now.`);
          }
          
          toggleDropdown('powerList', false);
          state.openDropdown = null;
        });
      }
    });
    
    // Login action in power menu
    const loginAction = getElement('loginAction');
    if (loginAction) {
      loginAction.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        console.log("🚀 Login from power menu");
        if (state.currentUser) {
          attemptLogin();
        }
        toggleDropdown('powerList', false);
        state.openDropdown = null;
      });
    }
    
    console.log(" Dropdowns initialized");
  }

  // ========== SLIDERS ==========
  function initSliders() {
    function getSliderElements(prefix) {
      return {
        range: getElement(`${prefix}Range`),
        fill: getElement(`${prefix}Fill`),
        thumb: getElement(`${prefix}Thumb`),
        value: getElement(`${prefix}Value`),
        tooltip: getElement(`${prefix}ValueTooltip`)
      };
    }
    
    function updateSlider(elements, isBlur = true) {
      if (!elements.range || !elements.fill || !elements.thumb) return;
      
      const value = parseInt(elements.range.value);
      const max = parseInt(elements.range.max);
      const min = parseInt(elements.range.min);
      const percent = ((value - min) / (max - min)) * 100;
      
      elements.fill.style.width = `${percent}%`;
      elements.thumb.style.left = `${percent}%`;
      
      const displayText = isBlur ? `${value}px` : `${value}%`;
      if (elements.value) elements.value.textContent = displayText;
      if (elements.tooltip) elements.tooltip.textContent = displayText;
      
      if (isBlur) {
        state.blurValue = value;
        document.documentElement.style.setProperty('--blur', `${value}px`);
      } else {
        state.dimValue = value;
        document.documentElement.style.setProperty('--dim', `${value/100}`);
      }
    }
    
    const blurElements = getSliderElements('blur');
    const dimElements = getSliderElements('dim');
    
    if (blurElements.range) {
      updateSlider(blurElements, true);
      blurElements.range.addEventListener('input', (e) => {
        e.stopPropagation();
        updateSlider(blurElements, true);
        if (blurElements.thumb) blurElements.thumb.classList.add('active');
      });
      blurElements.range.addEventListener('mousedown', (e) => e.stopPropagation());
    }
    
    if (dimElements.range) {
      updateSlider(dimElements, false);
      dimElements.range.addEventListener('input', (e) => {
        e.stopPropagation();
        updateSlider(dimElements, false);
        if (dimElements.thumb) dimElements.thumb.classList.add('active');
      });
      dimElements.range.addEventListener('mousedown', (e) => e.stopPropagation());
    }
  }

  // clock
  function updateClock() {
    const clock = getElement('clock');
    if (!clock) return;
    
    const now = new Date();
    const time = now.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    clock.textContent = time;
  }
  setInterval(updateClock, 1000);
  updateClock();

  // enter key event handless
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const startScreen = getElement('startScreen');
      if (startScreen && !startScreen.classList.contains('hidden')) {
        console.log("🚪 Enter pressed - starting login screen");
        startScreen.style.opacity = '0';
        startScreen.style.transform = 'translateY(-20px)';
        startScreen.style.transition = 'opacity 0.5s, transform 0.5s';
        
        setTimeout(() => {
          startScreen.classList.add('hidden');
          const loginScreen = getElement('loginScreen');
          if (loginScreen) loginScreen.classList.remove('hidden');
          
          // Initialize with  LightDM data
          console.log(" Initializing LightDM integration...");
          initLightDM();
          initDropdowns();
          
          // If no user selected, show manual login
          if (!state.currentUser) {
            state.manualLoginMode = true;
            showCenterUser({username: '', display_name: ''});
          }
        }, 300);
      }
    }
    
  // Escape key to go back from user list
if (e.key === 'Escape' && state.showAllUsers) {
  state.showAllUsers = false;
  if (state.currentUser) {
    showCenterUser(state.currentUser);
  } else {
    state.manualLoginMode = true;
    showCenterUser({username: '', display_name: ''});
  }
}
  });

  // ========== INITIALIZATION ==========
  // Set CSS custom properties
  document.documentElement.style.setProperty('--blur', '12px');
  document.documentElement.style.setProperty('--dim', '0.4');
  
  // Visual fade in
  setTimeout(() => {
    document.body.style.opacity = '1';
    document.body.style.transition = 'opacity 0.5s';
  }, 100);
  
  // Debug: log LightDM availability
  console.log(" LightDM Integration Ready");
  console.log("lightdm object exists:", !!window.lightdm);
  console.log("lightdm.users:", window.lightdm?.users);
  console.log("lightdm.sessions:", window.lightdm?.sessions);
  console.log(" Press Enter to start login");
  
  // Auto-start if LightDM is already prompting
  if (window.lightdm?.in_authentication) {
    console.log(" LightDM already in authentication state");
    // Show login screen immediately
    const startScreen = getElement('startScreen');
    const loginScreen = getElement('loginScreen');
    if (startScreen && loginScreen) {
      startScreen.classList.add('hidden');
      loginScreen.classList.remove('hidden');
      initLightDM();
      initDropdowns();
    }
  }
