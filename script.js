const API_BASE = 'https://forgery-detection-1o7g.onrender.com';
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const dropZone = document.getElementById('dropZone');
const uploadContent = document.getElementById('uploadContent');
const previewWrap = document.getElementById('previewWrap');
const previewImage = document.getElementById('previewImage');
const analyzeBtn = document.getElementById('analyzeBtn');
const removeBtn = document.getElementById('removeBtn');
const loadingPanel = document.getElementById('loadingPanel');
const resultSection = document.getElementById('resultSection');
const resultCard = document.getElementById('resultCard');
let selectedFile = null;
let previewUrl = null;
let startedAt = null;
let timerInterval = null;

// API health indicator (Render free instances may take a moment to wake up).
async function checkAPI() {
  const status = document.getElementById('apiStatus');
  const dot = document.getElementById('apiDot');
  status.textContent = 'API STATUS · WAKING UP';
  dot.className = 'status-dot';
  try {
    const response = await fetch(`${API_BASE}/health`, { method: 'GET' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const health = await response.json();
    if (health.model_loaded) {
      status.textContent = 'API STATUS · ONLINE';
      dot.className = 'status-dot online';
    } else {
      status.textContent = 'API STATUS · MODEL LOADING';
      dot.className = 'status-dot';
    }
  } catch (error) {
    status.textContent = 'API STATUS · UNREACHABLE';
    dot.className = 'status-dot offline';
  }
}
checkAPI();

browseBtn.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('click', (e) => {
  if (!selectedFile && !e.target.closest('button')) fileInput.click();
});
fileInput.addEventListener('change', () => { if (fileInput.files[0]) setFile(fileInput.files[0]); });
['dragenter','dragover'].forEach(type => dropZone.addEventListener(type, e => {
  e.preventDefault(); e.stopPropagation(); dropZone.classList.add('dragover');
}));
['dragleave','dragend'].forEach(type => dropZone.addEventListener(type, e => {
  e.preventDefault(); dropZone.classList.remove('dragover');
}));
dropZone.addEventListener('drop', e => {
  e.preventDefault(); e.stopPropagation(); dropZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0]; if (file) setFile(file);
});

function setFile(file) {
  const allowed = ['image/jpeg','image/png','image/webp','image/bmp'];
  if (!allowed.includes(file.type)) return showToast('Please choose a JPG, PNG, WEBP, or BMP image.');
  if (file.size > 10 * 1024 * 1024) return showToast('File exceeds the 10 MB limit.');
  selectedFile = file;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  previewImage.src = previewUrl;
  document.getElementById('fileName').textContent = file.name;
  document.getElementById('fileMeta').textContent = `${formatBytes(file.size)} · ${file.type || 'image file'}`;
  uploadContent.hidden = true;
  previewWrap.hidden = false;
  analyzeBtn.disabled = false;
  loadingPanel.hidden = true;
  resultSection.hidden = true;
}
function resetUpload() {
  selectedFile = null;
  fileInput.value = '';
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  previewImage.removeAttribute('src');
  previewWrap.hidden = true;
  uploadContent.hidden = false;
  analyzeBtn.disabled = true;
  loadingPanel.hidden = true;
  resultSection.hidden = true;
  clearInterval(timerInterval);
}
removeBtn.addEventListener('click', e => { e.stopPropagation(); resetUpload(); });
document.getElementById('newAnalysisBtn').addEventListener('click', resetUpload);
analyzeBtn.addEventListener('click', analyzeImage);

async function analyzeImage() {
  if (!selectedFile) return;
  analyzeBtn.disabled = true;
  resultSection.hidden = true;
  loadingPanel.hidden = false;
  startedAt = Date.now();
  document.getElementById('loadingTime').textContent = '0.0s';
  timerInterval = setInterval(() => {
    document.getElementById('loadingTime').textContent = `${((Date.now()-startedAt)/1000).toFixed(1)}s`;
  }, 100);
  const formData = new FormData();
  formData.append('file', selectedFile);
  try {
    const response = await fetch(`${API_BASE}/predict`, { method: 'POST', body: formData });
    let payload;
    try { payload = await response.json(); } catch { payload = {}; }
    if (!response.ok) throw new Error(payload.detail || `API request failed (${response.status})`);
    if (!payload.label || typeof payload.confidence !== 'number') throw new Error('Unexpected response from API.');
    showResult(payload);
  } catch (error) {
    showToast(error.message || 'Could not reach the analysis API. Try again in a moment.');
    loadingPanel.hidden = true;
    analyzeBtn.disabled = false;
    checkAPI();
  } finally {
    clearInterval(timerInterval);
  }
}
function showResult(data) {
  loadingPanel.hidden = true;
  resultSection.hidden = false;
  const isAuthentic = String(data.label).toLowerCase() === 'authentic';
  const confidence = Math.max(0, Math.min(1, data.confidence));
  const percent = (confidence * 100).toFixed(2);
  resultCard.className = `result-card ${isAuthentic ? 'authentic' : 'tampered'}`;
  document.getElementById('resultSymbol').textContent = isAuthentic ? '✓' : '⚠';
  document.getElementById('resultLabel').textContent = String(data.label).toUpperCase();
  document.getElementById('resultDescription').textContent = isAuthentic
    ? 'The model classified this image as authentic. No strong manipulation signal was detected by this model.'
    : 'The model classified this image as tampered. Its visual compression patterns may indicate manipulation.';
  document.getElementById('confidenceValue').textContent = `${percent}%`;
  document.getElementById('confidenceBar').style.width = `${percent}%`;
  document.getElementById('resultTimestamp').textContent = new Date().toLocaleString(undefined, {dateStyle:'medium',timeStyle:'short'});
  analyzeBtn.disabled = false;
  resultSection.scrollIntoView({behavior:'smooth',block:'start'});
}
function formatBytes(bytes) { return bytes < 1024*1024 ? `${(bytes/1024).toFixed(1)} KB` : `${(bytes/(1024*1024)).toFixed(2)} MB`; }
function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) { toast = document.createElement('div'); toast.id = 'toast'; document.body.appendChild(toast); }
  toast.textContent = message;
  toast.className = 'toast-visible';
  setTimeout(() => toast.className = '', 3200);
}
