'use strict';

(() => {
  const STORAGE_KEY = 'aat1-placement-tracker-applications-v1';
  const DEMO_KEY = 'aat1-placement-tracker-demo-seeded-v1';
  const DEMO_RECORDS = [
    { id: 'demo-northstar', company: 'Northstar Labs', role: 'Frontend Developer Intern', jobType: 'Internship', deadline: offsetDate(2), status: 'Interview', package: '5.5 LPA', notes: 'Review component design and accessibility. Prepare a short project walkthrough.', demo: true, updatedAt: '2026-10-17T09:30:00.000Z' },
    { id: 'demo-bluepeak', company: 'BluePeak Systems', role: 'Graduate Software Engineer', jobType: 'Full-Time', deadline: offsetDate(5), status: 'Online Test', package: '8.5 LPA', notes: 'Practice arrays, strings and SQL joins before the assessment.', demo: true, updatedAt: '2026-10-18T08:00:00.000Z' },
    { id: 'demo-pixel', company: 'Pixel & Pine', role: 'Product Design Intern', jobType: 'Internship + PPO', deadline: offsetDate(0), status: 'Applied', package: '6 LPA', notes: 'Portfolio submitted. Follow up with the campus coordinator.', demo: true, updatedAt: '2026-10-18T12:20:00.000Z' },
    { id: 'demo-orbit', company: 'Orbit Financial', role: 'Junior Data Analyst', jobType: 'Full-Time', deadline: offsetDate(-2), status: 'Offered', package: '10 LPA', notes: 'Offer received. Review the joining timeline and benefits.', demo: true, updatedAt: '2026-10-16T10:10:00.000Z' },
    { id: 'demo-cedar', company: 'Cedar Cloud', role: 'Cloud Engineering Intern', jobType: 'Internship', deadline: offsetDate(12), status: 'Wishlist', package: '', notes: 'Check eligibility criteria and prepare an updated resume.', demo: true, updatedAt: '2026-10-15T14:45:00.000Z' }
  ];
  const JOB_TYPES = ['Internship', 'Full-Time', 'Internship + PPO'];
  const STATUSES = ['Wishlist', 'Applied', 'Online Test', 'Interview', 'Offered', 'Rejected'];
  const $ = (selector) => document.querySelector(selector);
  const elements = {
    list: $('#application-list'), empty: $('#empty-state'), dialog: $('#application-dialog'), form: $('#application-form'),
    search: $('#search-input'), statusFilter: $('#status-filter'), typeFilter: $('#type-filter'), sort: $('#sort-select'),
    notes: $('#notes'), notesCount: $('#notes-count'), importFile: $('#import-file'), toastRegion: $('#toast-region')
  };
  let toastTimer;
  let records = loadRecords();

  function offsetDate(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return localDate(date);
  }

  function localDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function validRecord(record) {
    return record && typeof record === 'object' && typeof record.id === 'string' &&
      typeof record.company === 'string' && record.company.trim() &&
      typeof record.role === 'string' && record.role.trim() &&
      JOB_TYPES.includes(record.jobType) && STATUSES.includes(record.status) &&
      typeof record.deadline === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(record.deadline) &&
      typeof (record.notes ?? '') === 'string' && (record.notes ?? '').length <= 500;
  }

  function loadRecords() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = stored === null ? null : JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed.filter(validRecord);
      if (stored !== null) localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Could not read saved applications; starting with a clean list.', error);
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* Storage may be unavailable. */ }
      showToast('Saved data could not be read. A fresh list is ready.', true);
    }
    try {
      if (localStorage.getItem(DEMO_KEY) !== 'true') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_RECORDS));
        localStorage.setItem(DEMO_KEY, 'true');
        return DEMO_RECORDS.map((record) => ({ ...record }));
      }
    } catch (error) {
      console.warn('LocalStorage is unavailable.', error);
    }
    return [];
  }

  function saveRecords() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      return true;
    } catch (error) {
      console.error('Could not save applications.', error);
      showToast('Unable to save. Browser storage may be full or disabled.', true);
      return false;
    }
  }

  function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `toast${isError ? ' error' : ''}`;
    toast.setAttribute('role', isError ? 'alert' : 'status');
    toast.textContent = message;
    elements.toastRegion.replaceChildren(toast);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.remove(), 3500);
  }

  function formatDate(dateString, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Intl.DateTimeFormat('en-IN', options).format(new Date(year, month - 1, day));
  }

  function deadlineInfo(dateString) {
    const today = new Date();
    const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const [year, month, day] = dateString.split('-').map(Number);
    const deadline = new Date(year, month - 1, day);
    const difference = Math.round((deadline - current) / 86400000);
    if (difference < 0) return { text: 'Deadline passed', className: 'passed' };
    if (difference === 0) return { text: 'Deadline today', className: 'today' };
    if (difference === 1) return { text: 'Deadline tomorrow', className: 'tomorrow' };
    if (difference <= 7) return { text: `In ${difference} days`, className: 'urgent' };
    return { text: '', className: '' };
  }

  function statusClass(status) {
    return `status-${status.toLowerCase().replaceAll(' ', '-')}`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  }

  function visibleRecords() {
    const query = elements.search.value.trim().toLocaleLowerCase();
    const selectedStatus = elements.statusFilter.value;
    const selectedType = elements.typeFilter.value;
    const filtered = records.filter((record) => {
      const matchesQuery = !query || `${record.company} ${record.role}`.toLocaleLowerCase().includes(query);
      return matchesQuery && (!selectedStatus || record.status === selectedStatus) && (!selectedType || record.jobType === selectedType);
    });
    switch (elements.sort.value) {
      case 'deadline-desc': filtered.sort((a, b) => b.deadline.localeCompare(a.deadline)); break;
      case 'company-asc': filtered.sort((a, b) => a.company.localeCompare(b.company)); break;
      case 'updated-desc': filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); break;
      default: filtered.sort((a, b) => a.deadline.localeCompare(b.deadline));
    }
    return filtered;
  }

  function render() {
    const filtered = visibleRecords();
    const inProgress = records.filter((record) => ['Applied', 'Online Test', 'Interview'].includes(record.status)).length;
    const offers = records.filter((record) => record.status === 'Offered').length;
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const soon = new Date(todayStart);
    soon.setDate(soon.getDate() + 7);
    const deadlines = records.filter((record) => {
      if (['Offered', 'Rejected'].includes(record.status)) return false;
      const [year, month, day] = record.deadline.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date >= todayStart && date <= soon;
    }).length;
    $('#stat-total').textContent = records.length;
    $('#stat-progress').textContent = inProgress;
    $('#stat-offers').textContent = offers;
    $('#stat-deadlines').textContent = deadlines;
    $('#nav-count').textContent = records.length;
    $('#results-count').textContent = `${filtered.length} ${filtered.length === 1 ? 'application' : 'applications'}`;
    elements.list.innerHTML = filtered.map((record) => {
      const deadline = deadlineInfo(record.deadline);
      const packageText = record.package ? `${escapeHtml(record.package)}${/^\d+(\.\d+)?$/.test(record.package) ? ' LPA' : ''}` : 'Not specified';
      const demoLabel = record.demo ? ' <span class="demo-mark">Demo</span>' : '';
      return `<article class="application-card" data-record-id="${escapeHtml(record.id)}">
        <div class="company-block"><div class="company-avatar" aria-hidden="true">${escapeHtml(record.company.trim().slice(0, 1).toUpperCase())}</div><div class="company-copy"><strong>${escapeHtml(record.company)}${demoLabel}</strong><span>${escapeHtml(record.role)}</span></div></div>
        <div class="type-cell"><span class="data-label">JOB TYPE</span><span class="job-type">${escapeHtml(record.jobType)}</span></div>
        <div class="deadline-cell"><span class="data-label">PACKAGE · DEADLINE</span><span class="deadline-date">${packageText} · ${formatDate(record.deadline)}</span>${deadline.text ? `<span class="deadline-message ${deadline.className}">${deadline.text}</span>` : ''}</div>
        <div class="status-cell"><span class="data-label">STATUS</span><span class="status-badge ${statusClass(record.status)}">${escapeHtml(record.status)}</span></div>
        <div class="card-actions"><button class="icon-button edit-button" type="button" data-action="edit" aria-label="Edit ${escapeHtml(record.company)} application" title="Edit application">✎</button><button class="icon-button danger delete-button" type="button" data-action="delete" aria-label="Delete ${escapeHtml(record.company)} application" title="Delete application">⌫</button></div>
      </article>`;
    }).join('');
    const isFiltered = Boolean(elements.search.value || elements.statusFilter.value || elements.typeFilter.value);
    elements.empty.hidden = filtered.length > 0;
    elements.list.hidden = filtered.length === 0;
    $('#empty-title').textContent = isFiltered ? 'No matching applications' : 'Your pipeline starts here';
    $('#empty-copy').textContent = isFiltered ? 'Try another search or clear the selected filters.' : 'Add your first opportunity and keep every next step in view.';
    $('#empty-add').hidden = isFiltered;
  }

  function openDialog(record = null) {
    elements.form.reset();
    clearValidation();
    $('#record-id').value = record?.id || '';
    $('#dialog-title').textContent = record ? 'Edit application' : 'Add application';
    $('#save-button').textContent = record ? 'Save changes' : 'Save application';
    $('#company').value = record?.company || '';
    $('#role').value = record?.role || '';
    $('#job-type').value = record?.jobType || JOB_TYPES[0];
    $('#status').value = record?.status || STATUSES[0];
    $('#deadline').value = record?.deadline || '';
    $('#package').value = record?.package ? record.package.replace(/\s*LPA$/i, '') : '';
    $('#notes').value = record?.notes || '';
    elements.notesCount.textContent = `${$('#notes').value.length} / 500`;
    elements.dialog.showModal();
    $('#company').focus();
  }

  function clearValidation() {
    ['company', 'role', 'deadline', 'package', 'notes'].forEach((name) => $(`#${name}-error`).textContent = '');
    $('#form-feedback').hidden = true;
    $('#form-feedback').textContent = '';
  }

  function validateForm() {
    clearValidation();
    const values = {
      company: $('#company').value.trim(), role: $('#role').value.trim(), deadline: $('#deadline').value,
      package: $('#package').value, notes: $('#notes').value
    };
    let isValid = true;
    if (!values.company) { $('#company-error').textContent = 'Enter a company name.'; isValid = false; }
    if (!values.role) { $('#role-error').textContent = 'Enter a job role.'; isValid = false; }
    if (!values.deadline) { $('#deadline-error').textContent = 'Choose an application deadline.'; isValid = false; }
    if (values.package && (!Number.isFinite(Number(values.package)) || Number(values.package) < 0 || Number(values.package) > 999)) { $('#package-error').textContent = 'Enter a package from 0 to 999 LPA.'; isValid = false; }
    if (values.notes.length > 500) { $('#notes-error').textContent = 'Notes must be 500 characters or fewer.'; isValid = false; }
    if (!isValid) {
      $('#form-feedback').textContent = 'Please correct the highlighted fields.';
      $('#form-feedback').hidden = false;
    }
    return isValid ? values : null;
  }

  function handleSubmit(event) {
    event.preventDefault();
    const values = validateForm();
    if (!values) return;
    const id = $('#record-id').value;
    const existing = records.find((record) => record.id === id);
    const packageValue = values.package ? `${Number(values.package)} LPA` : '';
    const nextRecord = {
      id: id || (globalThis.crypto?.randomUUID?.() ?? `application-${Date.now()}-${Math.random().toString(16).slice(2)}`),
      company: values.company, role: values.role, jobType: $('#job-type').value,
      deadline: values.deadline, status: $('#status').value, package: packageValue,
      notes: values.notes.trim(), demo: existing?.demo ?? false, updatedAt: new Date().toISOString()
    };
    const nextRecords = existing ? records.map((record) => record.id === id ? nextRecord : record) : [nextRecord, ...records];
    const previous = records;
    records = nextRecords;
    if (saveRecords()) {
      elements.dialog.close();
      render();
      showToast(existing ? 'Application updated.' : 'Application added.');
    } else {
      records = previous;
    }
  }

  function editRecord(id) {
    const record = records.find((entry) => entry.id === id);
    if (record) openDialog(record);
  }

  function deleteRecord(id) {
    const record = records.find((entry) => entry.id === id);
    if (!record) return;
    if (!confirm(`Delete the ${record.demo ? 'demonstration ' : ''}application for ${record.company}? This cannot be undone.`)) return;
    const previous = records;
    records = records.filter((entry) => entry.id !== id);
    if (saveRecords()) {
      render();
      showToast('Application deleted.');
    } else records = previous;
  }

  function exportRecords() {
    const backup = { format: 'aat1-placement-tracker', version: 1, exportedAt: new Date().toISOString(), applications: records };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `placement-applications-${localDate(new Date())}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('JSON backup downloaded.');
  }

  function importRecords(file) {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const imported = Array.isArray(parsed) ? parsed : parsed?.applications;
        if (!Array.isArray(imported) || !imported.every(validRecord)) throw new Error('The file does not contain valid application records.');
        if (!confirm(`Restore ${imported.length} application${imported.length === 1 ? '' : 's'}? This replaces the current list.`)) return;
        const previous = records;
        records = imported.map((record) => ({ ...record, demo: Boolean(record.demo), updatedAt: record.updatedAt || new Date().toISOString() }));
        if (saveRecords()) {
          render();
          showToast(`${records.length} application${records.length === 1 ? '' : 's'} restored.`);
        } else records = previous;
      } catch (error) {
        showToast(error.message || 'Could not read that backup file.', true);
      } finally {
        elements.importFile.value = '';
      }
    });
    reader.addEventListener('error', () => showToast('Could not read that backup file.', true));
    reader.readAsText(file);
  }

  function clearDemoRecords() {
    const demoRecords = records.filter((record) => record.demo);
    if (!demoRecords.length) { showToast('There are no demonstration records to clear.'); return; }
    if (!confirm(`Remove all ${demoRecords.length} clearly labelled demonstration records? Your own applications will be kept.`)) return;
    const previous = records;
    records = records.filter((record) => !record.demo);
    if (saveRecords()) {
      try { localStorage.setItem(DEMO_KEY, 'true'); } catch (_) { /* Records remain usable for this session. */ }
      render();
      showToast('Demonstration records cleared.');
    } else records = previous;
  }

  $('#today-label').textContent = new Intl.DateTimeFormat('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date());
  ['#add-top', '#add-main', '#empty-add'].forEach((selector) => $(selector).addEventListener('click', () => openDialog()));
  $('#close-dialog').addEventListener('click', () => elements.dialog.close());
  $('#cancel-dialog').addEventListener('click', () => elements.dialog.close());
  elements.dialog.addEventListener('click', (event) => { if (event.target === elements.dialog) elements.dialog.close(); });
  elements.form.addEventListener('submit', handleSubmit);
  elements.notes.addEventListener('input', () => { elements.notesCount.textContent = `${elements.notes.value.length} / 500`; });
  [elements.search, elements.statusFilter, elements.typeFilter, elements.sort].forEach((element) => element.addEventListener(element === elements.search ? 'input' : 'change', render));
  elements.list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    const card = event.target.closest('[data-record-id]');
    if (!button || !card) return;
    if (button.dataset.action === 'edit') editRecord(card.dataset.recordId);
    if (button.dataset.action === 'delete') deleteRecord(card.dataset.recordId);
  });
  $('#reset-filters').addEventListener('click', () => {
    elements.search.value = '';
    elements.statusFilter.value = '';
    elements.typeFilter.value = '';
    elements.sort.value = 'deadline-asc';
    render();
  });
  $('#export-button').addEventListener('click', exportRecords);
  $('#import-button').addEventListener('click', () => elements.importFile.click());
  elements.importFile.addEventListener('change', () => { if (elements.importFile.files?.[0]) importRecords(elements.importFile.files[0]); });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !elements.dialog.open) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      elements.search.focus();
    }
  });

  const demoButton = document.createElement('button');
  demoButton.type = 'button';
  demoButton.className = 'text-button demo-clear-button';
  demoButton.textContent = 'Clear demo records';
  demoButton.title = 'Remove only the clearly labelled fictional demonstration applications';
  demoButton.addEventListener('click', clearDemoRecords);
  $('.list-meta').append(demoButton);

  render();
})();
