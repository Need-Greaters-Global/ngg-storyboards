/**
 * NGG Storyboard Comments Module
 * Handles client commenting on storyboard scenes
 */

const CommentsModule = (function() {
  const API_BASE = '/api/comments';
  let clientSlug = '';
  let projectSlug = '';

  /**
   * Initialize the comments module
   * @param {string} client - Client slug (e.g., 'regentx')
   * @param {string} project - Project slug (e.g., 'summit-video-2025')
   */
  function init(client, project) {
    clientSlug = client;
    projectSlug = project;

    // Add comment buttons to each scene
    document.querySelectorAll('.scene').forEach((scene, index) => {
      const sceneNum = index + 1;
      addCommentUI(scene, sceneNum);
    });

    // Add general comment section at bottom
    addGeneralCommentSection();

    // Load existing comments
    loadComments();
  }

  /**
   * Add comment UI to a scene
   */
  function addCommentUI(sceneElement, sceneNumber) {
    const content = sceneElement.querySelector('.scene-content');
    if (!content) return;

    const commentSection = document.createElement('div');
    commentSection.className = 'comment-section';
    commentSection.innerHTML = `
      <div class="comment-toggle" onclick="CommentsModule.toggleCommentForm(${sceneNumber})">
        <span class="comment-icon">💬</span>
        <span>Add Feedback</span>
        <span class="comment-count" id="comment-count-${sceneNumber}"></span>
      </div>
      <div class="comment-form" id="comment-form-${sceneNumber}" style="display: none;">
        <input type="text" placeholder="Your name" id="comment-name-${sceneNumber}" class="comment-input" />
        <textarea placeholder="Your feedback on this scene..." id="comment-text-${sceneNumber}" class="comment-textarea"></textarea>
        <button onclick="CommentsModule.submitComment(${sceneNumber})" class="comment-submit">Submit Feedback</button>
      </div>
      <div class="comments-list" id="comments-list-${sceneNumber}"></div>
    `;
    content.appendChild(commentSection);
  }

  /**
   * Add general comment section
   */
  function addGeneralCommentSection() {
    const container = document.querySelector('.container') || document.body;

    const generalSection = document.createElement('div');
    generalSection.className = 'general-comment-section';
    generalSection.innerHTML = `
      <h2>General Feedback</h2>
      <p>Have overall feedback about this storyboard? Leave it here.</p>
      <div class="comment-form" style="display: block;">
        <input type="text" placeholder="Your name" id="comment-name-general" class="comment-input" />
        <textarea placeholder="Your overall feedback..." id="comment-text-general" class="comment-textarea"></textarea>
        <button onclick="CommentsModule.submitComment(null)" class="comment-submit">Submit Feedback</button>
      </div>
      <div class="comments-list" id="comments-list-general"></div>
    `;

    // Insert before footer or at end
    const footer = document.querySelector('footer');
    if (footer) {
      footer.parentNode.insertBefore(generalSection, footer);
    } else {
      container.appendChild(generalSection);
    }
  }

  /**
   * Toggle comment form visibility
   */
  function toggleCommentForm(sceneNumber) {
    const form = document.getElementById(`comment-form-${sceneNumber}`);
    if (form) {
      form.style.display = form.style.display === 'none' ? 'block' : 'none';
    }
  }

  /**
   * Submit a comment
   */
  async function submitComment(sceneNumber) {
    const suffix = sceneNumber === null ? 'general' : sceneNumber;
    const nameInput = document.getElementById(`comment-name-${suffix}`);
    const textInput = document.getElementById(`comment-text-${suffix}`);

    const authorName = nameInput.value.trim();
    const commentText = textInput.value.trim();

    if (!authorName || !commentText) {
      alert('Please enter your name and feedback.');
      return;
    }

    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: clientSlug,
          project: projectSlug,
          scene: sceneNumber,
          author_name: authorName,
          comment_text: commentText
        })
      });

      if (response.ok) {
        // Clear form
        nameInput.value = '';
        textInput.value = '';

        // Show success message
        alert('Thank you for your feedback!');

        // Reload comments
        loadComments();
      } else {
        alert('Failed to submit feedback. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      alert('Failed to submit feedback. Please try again.');
    }
  }

  /**
   * Load all comments for the storyboard
   */
  async function loadComments() {
    try {
      const response = await fetch(`${API_BASE}?client=${clientSlug}&project=${projectSlug}`);
      if (!response.ok) return;

      const data = await response.json();
      const comments = data.comments || [];

      // Group comments by scene
      const byScene = {};
      comments.forEach(comment => {
        const key = comment.scene_number === null ? 'general' : comment.scene_number;
        if (!byScene[key]) byScene[key] = [];
        byScene[key].push(comment);
      });

      // Render comments for each scene
      Object.keys(byScene).forEach(scene => {
        renderComments(scene, byScene[scene]);
      });

      // Update comment counts
      updateCommentCounts(byScene);

    } catch (error) {
      console.error('Error loading comments:', error);
    }
  }

  /**
   * Render comments for a scene
   */
  function renderComments(sceneKey, comments) {
    const list = document.getElementById(`comments-list-${sceneKey}`);
    if (!list) return;

    if (comments.length === 0) {
      list.innerHTML = '';
      return;
    }

    list.innerHTML = comments.map(comment => `
      <div class="comment ${comment.status === 'resolved' ? 'resolved' : ''}">
        <div class="comment-header">
          <strong>${escapeHtml(comment.author_name)}</strong>
          <span class="comment-date">${formatDate(comment.created_at)}</span>
          ${comment.status === 'resolved' ? '<span class="comment-badge resolved">Resolved</span>' : ''}
        </div>
        <div class="comment-body">${escapeHtml(comment.comment_text)}</div>
        ${comment.team_response ? `
          <div class="team-response">
            <strong>NGG Team:</strong> ${escapeHtml(comment.team_response)}
          </div>
        ` : ''}
      </div>
    `).join('');
  }

  /**
   * Update comment count badges
   */
  function updateCommentCounts(byScene) {
    Object.keys(byScene).forEach(scene => {
      if (scene === 'general') return;
      const countEl = document.getElementById(`comment-count-${scene}`);
      if (countEl) {
        const count = byScene[scene].length;
        countEl.textContent = count > 0 ? `(${count})` : '';
      }
    });
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Format date for display
   */
  function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  return {
    init,
    toggleCommentForm,
    submitComment
  };
})();
