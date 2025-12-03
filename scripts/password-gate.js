/**
 * NGG Storyboard Password Gate
 * Simple client-side password protection for storyboard pages
 */

const PasswordGate = (function() {
  const STORAGE_KEY = 'ngg_storyboard_auth';

  /**
   * Initialize password protection
   * @param {Object} config
   * @param {string} config.password - The password required to access
   * @param {string} config.pageId - Unique ID for this page (for session storage)
   * @param {string} config.title - Title shown on password prompt (optional)
   * @param {string} config.subtitle - Subtitle/description (optional)
   */
  function init(config) {
    const { password, pageId, title, subtitle } = config;

    if (!password || !pageId) {
      console.error('PasswordGate: password and pageId are required');
      return;
    }

    // Check if already authenticated for this page
    if (isAuthenticated(pageId)) {
      showContent();
      return;
    }

    // Hide content and show password gate
    hideContent();
    showPasswordGate(password, pageId, title, subtitle);
  }

  /**
   * Check if user is authenticated for this page
   */
  function isAuthenticated(pageId) {
    try {
      const auth = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
      return auth[pageId] === true;
    } catch {
      return false;
    }
  }

  /**
   * Mark page as authenticated
   */
  function setAuthenticated(pageId) {
    try {
      const auth = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
      auth[pageId] = true;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } catch {
      // Fallback if sessionStorage fails
    }
  }

  /**
   * Hide page content
   */
  function hideContent() {
    document.body.style.overflow = 'hidden';
  }

  /**
   * Show page content
   */
  function showContent() {
    document.body.style.overflow = '';
    const gate = document.getElementById('password-gate');
    if (gate) {
      gate.remove();
    }
  }

  /**
   * Create and show the password gate overlay
   */
  function showPasswordGate(password, pageId, title, subtitle) {
    const gate = document.createElement('div');
    gate.id = 'password-gate';
    gate.innerHTML = `
      <div class="password-gate-overlay"></div>
      <div class="password-gate-modal">
        <div class="password-gate-logo">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <h2 class="password-gate-title">${title || 'Protected Content'}</h2>
        ${subtitle ? `<p class="password-gate-subtitle">${subtitle}</p>` : ''}
        <form class="password-gate-form" onsubmit="return false;">
          <input
            type="password"
            id="password-gate-input"
            class="password-gate-input"
            placeholder="Enter password"
            autocomplete="off"
          />
          <button type="submit" class="password-gate-button" id="password-gate-submit">
            Access
          </button>
        </form>
        <p class="password-gate-error" id="password-gate-error"></p>
        <p class="password-gate-footer">Need Greaters Global</p>
      </div>
    `;

    document.body.appendChild(gate);

    // Focus input
    setTimeout(() => {
      document.getElementById('password-gate-input').focus();
    }, 100);

    // Handle form submission
    const form = gate.querySelector('.password-gate-form');
    const input = document.getElementById('password-gate-input');
    const errorEl = document.getElementById('password-gate-error');
    const submitBtn = document.getElementById('password-gate-submit');

    function attemptLogin() {
      const entered = input.value.trim();

      if (entered === password) {
        setAuthenticated(pageId);
        gate.classList.add('password-gate-success');
        setTimeout(() => {
          showContent();
        }, 300);
      } else {
        errorEl.textContent = 'Incorrect password';
        input.classList.add('password-gate-input-error');
        input.value = '';
        input.focus();

        setTimeout(() => {
          errorEl.textContent = '';
          input.classList.remove('password-gate-input-error');
        }, 2000);
      }
    }

    submitBtn.addEventListener('click', attemptLogin);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        attemptLogin();
      }
    });
  }

  return { init };
})();
