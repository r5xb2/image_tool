(function() {
var cloneImageData = window.Core.cloneImageData;
var LUT = window.LUT;

var lutFilterDefs = [
  // X100VI
  { name: 'X100VI ETERNA (F-Log)', path: 'luts/X100VI/F-Log/ETERNA.cube' },
  { name: 'X100VI ETERNA-BB (F-Log)', path: 'luts/X100VI/F-Log/ETERNA-BB.cube' },
  { name: 'X100VI Rec709 (F-Log)', path: 'luts/X100VI/F-Log/FLog-to-Rec709.cube' },
  { name: 'X100VI WDR (F-Log)', path: 'luts/X100VI/F-Log/WDR.cube' },
  { name: 'X100VI ETERNA (F-Log2)', path: 'luts/X100VI/F-Log2/ETERNA.cube' },
  { name: 'X100VI ETERNA-BB (F-Log2)', path: 'luts/X100VI/F-Log2/ETERNA-BB.cube' },
  { name: 'X100VI Rec709 (F-Log2)', path: 'luts/X100VI/F-Log2/FLog2-to-Rec709.cube' },
  { name: 'X100VI WDR (F-Log2)', path: 'luts/X100VI/F-Log2/WDR.cube' },
  // GFX100SII
  { name: 'GFX100SII ETERNA (F-Log)', path: 'luts/GFX100SII/F-Log/ETERNA.cube' },
  { name: 'GFX100SII ETERNA-BB (F-Log)', path: 'luts/GFX100SII/F-Log/ETERNA-BB.cube' },
  { name: 'GFX100SII Rec709 (F-Log)', path: 'luts/GFX100SII/F-Log/FLog-to-Rec709.cube' },
  { name: 'GFX100SII WDR (F-Log)', path: 'luts/GFX100SII/F-Log/WDR.cube' },
  { name: 'GFX100SII ETERNA (F-Log2)', path: 'luts/GFX100SII/F-Log2/ETERNA.cube' },
  { name: 'GFX100SII ETERNA-BB (F-Log2)', path: 'luts/GFX100SII/F-Log2/ETERNA-BB.cube' },
  { name: 'GFX100SII Rec709 (F-Log2)', path: 'luts/GFX100SII/F-Log2/FLog2-to-Rec709.cube' },
  { name: 'GFX100SII WDR (F-Log2)', path: 'luts/GFX100SII/F-Log2/WDR.cube' },
];

function makeLUTFilter(def) {
  return {
    name: def.name,
    path: def.path,
    params: {
      strength: { label: '強度', min: 0, max: 100, default: 50 }
    },
    apply: function(imgData, params) {
      var lut = window.LUT.cache[def.path];
      if (!lut) {
        var self = this;
        window.LUT.fetchLUT(def.path, function() {
          if (window.__activeFilterPath === def.path) {
            window.__retryApply && window.__retryApply();
          }
        });
        return imgData;
      }
      var s = (params.strength || 100) / 100;
      var logType = def.path.indexOf('F-Log2') !== -1 ? 'F-Log2' : 'F-Log';
      return window.LUT.applyLUT(imgData, lut, s, logType);
    }
  };
}

var categories = [
  { id: 'bw', label: '黑白系', filters: Object.values(window.FilterBW) },
  { id: 'film', label: '復古底片', filters: Object.values(window.FilterFilm) },
  { id: 'artistic', label: '藝術效果', filters: Object.values(window.FilterArtistic) },
  { id: 'color', label: '色彩調整', filters: Object.values(window.FilterColor) },
  { id: 'lut', label: '富士 LUT', filters: lutFilterDefs.map(makeLUTFilter) },
];

var canvas = document.getElementById('preview');
var ctx = canvas.getContext('2d');
var fileInput = document.getElementById('fileInput');
var uploadBtn = document.getElementById('uploadBtn');
var resetBtn = document.getElementById('resetBtn');
var downloadBtn = document.getElementById('downloadBtn');
var filterGrid = document.getElementById('filterGrid');
var categoryTabs = document.getElementById('categoryTabs');
var paramPanel = document.getElementById('paramPanel');
var dropZone = document.getElementById('dropZone');

var originalImageData = null;
var originalImg = null;
var currentFilter = null;
var currentParams = {};
var activeCategory = 'bw';
var activeFilterId = null;

function preloadLUTs() {
  var paths = lutFilterDefs.map(function(d) { return d.path; });
  paths.forEach(function(path) {
    LUT.fetchLUT(path, function(err) {
      if (err) console.warn('LUT load failed:', path, err);
    });
  });
}

function init() {
  renderCategoryTabs();
  switchCategory('bw');
  uploadBtn.addEventListener('click', function() { fileInput.click(); });
  fileInput.addEventListener('change', handleFileUpload);
  resetBtn.addEventListener('click', resetImage);
  downloadBtn.addEventListener('click', downloadImage);
  setupDragDrop();
  preloadLUTs();
}

function setupDragDrop() {
  dropZone.addEventListener('dragover', function(e) {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', function() {
    dropZone.classList.remove('drag-over');
  });
  dropZone.addEventListener('drop', function(e) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    var file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      loadImage(file);
    }
  });
}

function handleFileUpload(e) {
  var file = e.target.files[0];
  if (file) loadImage(file);
}

function loadImage(file) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      originalImg = img;
      var maxW = 800, maxH = 600;
      var w = img.width, h = img.height;
      if (w > maxW) { h = h * maxW / w; w = maxW; }
      if (h > maxH) { w = w * maxH / h; h = maxH; }
      canvas.width = Math.round(w);
      canvas.height = Math.round(h);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      dropZone.classList.add('has-image');
      resetFilterState();
      renderFilterButtons();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function resetFilterState() {
  currentFilter = null;
  activeFilterId = null;
  currentParams = {};
  paramPanel.innerHTML = '';
  paramPanel.style.display = 'none';
  document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
}

function resetImage() {
  if (!originalImageData) return;
  ctx.putImageData(cloneImageData(originalImageData), 0, 0);
  resetFilterState();
}

function downloadImage() {
  if (!originalImageData) return;
  var link = document.createElement('a');
  link.download = 'filtered-image.png';

  if (originalImg) {
    var tempCanvas = document.createElement('canvas');
    tempCanvas.width = originalImg.width;
    tempCanvas.height = originalImg.height;
    var tempCtx = tempCanvas.getContext('2d');

    tempCtx.drawImage(originalImg, 0, 0);

    if (currentFilter) {
      var fullImgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      fullImgData = currentFilter.apply(fullImgData, currentParams);
      tempCtx.putImageData(fullImgData, 0, 0);
    }

    link.href = tempCanvas.toDataURL('image/png');
  } else {
    link.href = canvas.toDataURL('image/png');
  }

  link.click();
}

function renderCategoryTabs() {
  categoryTabs.innerHTML = '';
  categories.forEach(function(cat) {
    var btn = document.createElement('button');
    btn.className = 'tab-btn' + (cat.id === activeCategory ? ' active' : '');
    btn.textContent = cat.label;
    btn.dataset.category = cat.id;
    btn.addEventListener('click', function() { switchCategory(cat.id); });
    categoryTabs.appendChild(btn);
  });
}

function switchCategory(catId) {
  activeCategory = catId;
  document.querySelectorAll('.tab-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.category === catId);
  });
  renderFilterButtons();
}

function renderFilterButtons() {
  var cat = categories.find(function(c) { return c.id === activeCategory; });
  if (!cat) return;
  filterGrid.innerHTML = '';
  cat.filters.forEach(function(filter, idx) {
    var btn = document.createElement('button');
    var fid = activeCategory + '-' + idx;
    btn.className = 'filter-btn' + (fid === activeFilterId ? ' active' : '');
    btn.textContent = filter.name;
    btn.dataset.filterId = fid;
    btn.addEventListener('click', function() { applyFilter(filter, fid); });
    filterGrid.appendChild(btn);
  });
}

function applyFilter(filter, fid) {
  if (!originalImageData) return;
  currentFilter = filter;
  activeFilterId = fid;

  document.querySelectorAll('.filter-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.filterId === fid);
  });

  window.__activeFilterPath = filter.path || null;
  window.__retryApply = function() {
    executeFilter();
  };

  currentParams = {};
  var params = filter.params || {};
  renderParams(params);
  executeFilter();
}

function renderParams(paramDefs) {
  paramPanel.innerHTML = '';
  var keys = Object.keys(paramDefs);
  if (keys.length === 0) {
    paramPanel.style.display = 'none';
    return;
  }
  paramPanel.style.display = 'block';
  keys.forEach(function(key) {
    var def = paramDefs[key];
    currentParams[key] = def.default;
    var group = document.createElement('div');
    group.className = 'param-group';

    var label = document.createElement('label');
    label.className = 'param-label';
    label.textContent = def.label || key;

    if (def.type === 'toggle') {
      var btnGroup = document.createElement('div');
      btnGroup.className = 'toggle-group';
      def.options.forEach(function(opt) {
        var btn = document.createElement('button');
        btn.className = 'toggle-btn' + (opt.value === def.default ? ' active' : '');
        btn.textContent = opt.label;
        btn.addEventListener('click', function() {
          currentParams[key] = opt.value;
          btnGroup.querySelectorAll('.toggle-btn').forEach(function(b) { b.classList.remove('active'); });
          btn.classList.add('active');
          executeFilter();
        });
        btnGroup.appendChild(btn);
      });
      group.appendChild(label);
      group.appendChild(btnGroup);
      paramPanel.appendChild(group);
    } else {
      var valSpan = document.createElement('span');
      valSpan.className = 'param-value';
      valSpan.textContent = def.default;

      var input = document.createElement('input');
      input.type = 'range';
      input.className = 'param-slider';
      input.min = def.min;
      input.max = def.max;
      input.value = def.default;
      input.step = def.step || 1;
      input.addEventListener('input', function() {
        currentParams[key] = parseFloat(input.value);
        valSpan.textContent = input.value;
        executeFilter();
      });

      label.appendChild(valSpan);
      group.appendChild(label);
      group.appendChild(input);
      paramPanel.appendChild(group);
    }
  });
}

function executeFilter() {
  if (!currentFilter || !originalImageData) return;
  var imgData = cloneImageData(originalImageData);
  ctx.putImageData(currentFilter.apply(imgData, currentParams), 0, 0);
}

document.addEventListener('DOMContentLoaded', init);
})();
