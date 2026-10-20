'use strict';

// Small, independent initialisers keep each interaction easier to read and test.
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function safelyReadStorage(key) {
  try { return window.localStorage.getItem(key); }
  catch (error) { return null; }
}
function safelyWriteStorage(key, value) {
  try { window.localStorage.setItem(key, value); return true; }
  catch (error) { return false; }
}

function initThemeToggle() {
  const button = $('#theme-toggle');
  if (!button) return;
  const stored = safelyReadStorage('noel-portfolio-theme');
  const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = stored === 'light' || stored === 'dark' ? stored : (systemDark ? 'dark' : 'light');
  setTheme(initial, false);

  function setTheme(theme, persist = true) {
    document.documentElement.dataset.theme = theme;
    const isDark = theme === 'dark';
    button.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
    button.setAttribute('title', isDark ? 'Switch to light theme' : 'Switch to dark theme');
    const themeColor = $('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute('content', isDark ? '#101b2d' : '#f5f7fb');
    if (persist) safelyWriteStorage('noel-portfolio-theme', theme);
  }
  button.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
}

function initMobileNavigation() {
  const toggle = $('#menu-toggle');
  const nav = $('#primary-nav');
  if (!toggle || !nav) return;
  const links = $$('.nav-link', nav);
  function closeMenu(focusToggle = false) {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation');
    if (focusToggle) toggle.focus();
  }
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
  links.forEach(link => link.addEventListener('click', () => closeMenu()));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) closeMenu(true);
  });
  document.addEventListener('click', event => {
    if (nav.classList.contains('is-open') && !nav.contains(event.target) && !toggle.contains(event.target)) closeMenu();
  });
  window.addEventListener('resize', () => { if (window.innerWidth > 760) closeMenu(); });
}

function initActiveNavigation() {
  const links = $$('.nav-link[href^="#"]');
  const sections = links.map(link => $(link.getAttribute('href'))).filter(Boolean);
  if (!('IntersectionObserver' in window) || !sections.length) return;
  const observer = new IntersectionObserver(entries => {
    const candidates = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
    if (!candidates.length) return;
    const currentId = candidates[0].target.id;
    links.forEach(link => {
      const active = link.getAttribute('href') === `#${currentId}`;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-24% 0px -58% 0px', threshold: [0, 0.15, 0.35, 0.6] });
  sections.forEach(section => observer.observe(section));
}

function initProjectSearchAndFilters() {
  const cards = $$('.project-card');
  const search = $('#project-search');
  const filters = $$('.filter-button');
  const status = $('#results-status');
  const emptyState = $('#empty-state');
  const grid = $('#project-grid');
  const clearButton = $('#clear-filters');
  if (!cards.length || !search || !filters.length || !status || !emptyState) return;
  let activeFilter = 'all';

  function updateProjects() {
    const query = search.value.trim().toLocaleLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const categoryMatches = activeFilter === 'all' || card.dataset.category === activeFilter;
      const text = `${card.dataset.search || ''} ${card.textContent || ''}`.toLocaleLowerCase();
      const searchMatches = !query || text.includes(query);
      const show = categoryMatches && searchMatches;
      card.hidden = !show;
      if (show) visible += 1;
    });
    status.textContent = `Showing ${visible} of ${cards.length} project${cards.length === 1 ? '' : 's'}`;
    emptyState.hidden = visible !== 0;
    if (grid) grid.hidden = visible === 0;
  }
  filters.forEach(button => button.addEventListener('click', () => {
    activeFilter = button.dataset.filter || 'all';
    filters.forEach(item => {
      const selected = item === button;
      item.classList.toggle('is-selected', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    updateProjects();
  }));
  search.addEventListener('input', updateProjects);
  if (clearButton) clearButton.addEventListener('click', () => {
    search.value = '';
    activeFilter = 'all';
    filters.forEach(button => {
      const selected = button.dataset.filter === 'all';
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    updateProjects();
    search.focus();
  });
  updateProjects();
}

function initProjectDialog() {
  const dialog = $('#project-dialog');
  const dataNode = $('#project-data');
  const closeButton = $('#dialog-close');
  if (!dialog || !dataNode || typeof dialog.showModal !== 'function') {
    $$('.project-detail').forEach(button => { button.disabled = true; button.title = 'Project details require a modern browser.'; });
    return;
  }
  let projectData;
  try { projectData = JSON.parse(dataNode.textContent); }
  catch (error) { console.error('Project detail data could not be read.'); return; }
  let lastTrigger = null;
  const setText = (id, value) => { const element = $(`#${id}`); if (element) element.textContent = value || ''; };

  $$('.project-detail').forEach(button => button.addEventListener('click', () => {
    const project = projectData[button.dataset.project];
    if (!project) return;
    lastTrigger = button;
    setText('dialog-number', project.number);
    setText('dialog-category', project.category);
    setText('dialog-title', project.title);
    setText('dialog-summary', project.summary);
    setText('dialog-objective', project.objective);
    setText('dialog-contribution', project.contribution);
    setText('dialog-status', project.status);
    const reminder = $('#dialog-reminder');
    if (reminder) {
      reminder.textContent = project.reminder || '';
      reminder.hidden = !project.reminder;
    }
    dialog.showModal();
    if (closeButton) closeButton.focus();
  }));
  if (closeButton) closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => { if (lastTrigger && lastTrigger.isConnected) lastTrigger.focus(); });
}

function showToast(message) {
  const toast = $('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('is-visible');
  if (showToast.timer) window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

function initCopyEmail() {
  const button = $('#copy-email');
  const link = $('#email-link');
  if (!button || !link) return;
  button.addEventListener('click', async () => {
    const email = link.textContent.trim();
    if (!email || email === 'YOUR_EMAIL_HERE' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Edit the email placeholder in index.html first.');
      return;
    }
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(email);
      } else {
        const helper = document.createElement('textarea');
        helper.value = email;
        helper.setAttribute('readonly', '');
        helper.style.position = 'fixed';
        helper.style.opacity = '0';
        document.body.append(helper);
        helper.select();
        const copied = document.execCommand('copy');
        helper.remove();
        if (!copied) throw new Error('Clipboard not available');
      }
      showToast('Email address copied.');
    } catch (error) {
      showToast('Copy failed. Select the email address and copy it manually.');
    }
  });
}

function initScrollUtilities() {
  const progress = $('#reading-progress-bar');
  const backToTop = $('#back-to-top');
  let scheduled = false;
  function update() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const percentage = scrollable > 0 ? Math.min(100, Math.max(0, (scrollTop / scrollable) * 100)) : 0;
    if (progress) progress.style.width = `${percentage}%`;
    if (backToTop) backToTop.classList.toggle('is-visible', scrollTop > 550);
    scheduled = false;
  }
  function requestUpdate() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(update);
  }
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  update();
  if (backToTop) backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
}

function initScrollReveal() {
  const elements = $$('.reveal');
  if (!elements.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    elements.forEach(element => element.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -20px 0px' });
  elements.forEach(element => observer.observe(element));
}

function initContactForm() {
  const form = $('#contact-form');
  const feedback = $('#form-feedback');
  const emailLink = $('#email-link');
  if (!form || !feedback || !emailLink) return;
  const fields = [$('#sender-name'), $('#sender-email'), $('#sender-message')].filter(Boolean);
  fields.forEach(field => field.addEventListener('input', () => {
    field.removeAttribute('aria-invalid');
    feedback.textContent = '';
    feedback.classList.remove('is-error');
  }));

  form.addEventListener('submit', event => {
    event.preventDefault();
    feedback.classList.remove('is-error');
    const name = $('#sender-name');
    const senderEmail = $('#sender-email');
    const message = $('#sender-message');
    const requiredFields = [name, senderEmail, message].filter(Boolean);
    const invalid = requiredFields.find(field => !field.checkValidity());
    if (invalid) {
      invalid.setAttribute('aria-invalid', 'true');
      invalid.reportValidity();
      feedback.textContent = 'Please check the highlighted field and complete the form.';
      feedback.classList.add('is-error');
      return;
    }
    const destination = emailLink.textContent.trim();
    if (destination === 'YOUR_EMAIL_HERE' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destination)) {
      feedback.textContent = 'Replace YOUR_EMAIL_HERE with your real email in index.html before using this form.';
      feedback.classList.add('is-error');
      return;
    }
    const subject = `Portfolio message from ${name.value.trim()}`;
    const body = `Name: ${name.value.trim()}\nReply-to: ${senderEmail.value.trim()}\n\n${message.value.trim()}`;
    const mailto = `mailto:${destination}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    feedback.textContent = 'Opening your email application. Send the message from there to complete delivery.';
    window.location.href = mailto;
  });
}

function initFooterYear() {
  const year = $('#current-year');
  if (year) year.textContent = String(new Date().getFullYear());
}

// Progressive enhancement: content remains visible if JavaScript is unavailable.
document.documentElement.classList.add('js-enabled');
initThemeToggle();
initMobileNavigation();
initActiveNavigation();
initProjectSearchAndFilters();
initProjectDialog();
initCopyEmail();
initScrollUtilities();
initScrollReveal();
initContactForm();
initFooterYear();
