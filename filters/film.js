window.FilterFilm = (function() {
var core = window.Core;
var forEachPixel = core.forEachPixel, clamp = core.clamp, luminance = core.luminance;

function vignette(imageData, strength) {
  var w = imageData.width, h = imageData.height;
  var cx = w / 2, cy = h / 2;
  var maxDist = Math.sqrt(cx * cx + cy * cy);
  var d = imageData.data;
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)) / maxDist;
      var factor = 1 - dist * dist * strength;
      var idx = (y * w + x) * 4;
      d[idx] *= factor; d[idx+1] *= factor; d[idx+2] *= factor;
    }
  }
  return imageData;
}

return {
  kodachrome: {
    name: '柯達 Kodachrome',
    params: { strength: { min: 0, max: 100, default: 70, label: '強度' } },
    apply: function(imageData, params) {
      var s = params.strength / 100;
      forEachPixel(imageData, function(d, i, r, g, b) {
        r = clamp(r * (1 + 0.15 * s));
        g = clamp(g * (1 + 0.05 * s));
        b = clamp(b * (1 - 0.1 * s));
        var gray = luminance(r, g, b);
        d[i]   = clamp(r + (r - gray) * 0.2 * s);
        d[i+1] = clamp(g + (g - gray) * 0.1 * s);
        d[i+2] = clamp(b + (b - gray) * (-0.15 * s));
      });
      vignette(imageData, 0.3 * s);
      return imageData;
    }
  },

  fujiVelvia: {
    name: '富士 Velvia',
    params: { strength: { min: 0, max: 100, default: 60, label: '強度' } },
    apply: function(imageData, params) {
      var s = params.strength / 100;
      forEachPixel(imageData, function(d, i, r, g, b) {
        r = clamp(r * (1 + 0.1 * s));
        g = clamp(g * (1 + 0.2 * s));
        b = clamp(b * (1 + 0.25 * s));
      });
      var d = imageData.data;
      for (var y = 0; y < imageData.height; y++) {
        for (var x = 0; x < imageData.width; x++) {
          var idx = (y * imageData.width + x) * 4;
          var r = d[idx], g = d[idx+1], b = d[idx+2];
          var gray = luminance(r, g, b);
          var sat = 1 + 0.4 * s;
          d[idx]   = clamp(gray + (r - gray) * sat);
          d[idx+1] = clamp(gray + (g - gray) * sat);
          d[idx+2] = clamp(gray + (b - gray) * sat);
        }
      }
      return imageData;
    }
  },

  polaroid: {
    name: 'Polaroid 拍立得',
    apply: function(imageData) {
      var w = imageData.width, h = imageData.height;
      var cx = w / 2, cy = h / 2;
      var maxDist = Math.sqrt(cx * cx + cy * cy);
      forEachPixel(imageData, function(d, i, r, g, b) {
        r = clamp(r * 0.92 + 10);
        g = clamp(g * 0.95 + 8);
        b = clamp(b * 1.05 + 15);
        var gray = luminance(r, g, b);
        var sat = 0.75;
        d[i]   = clamp(gray + (r - gray) * sat);
        d[i+1] = clamp(gray + (g - gray) * sat);
        d[i+2] = clamp(gray + (b - gray) * sat);
      });
      var d = imageData.data;
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)) / maxDist;
          var factor = 1 - dist * dist * 0.5;
          var idx = (y * w + x) * 4;
          d[idx] *= factor; d[idx+1] *= factor; d[idx+2] *= factor;
        }
      }
      return imageData;
    }
  },

  vintage: {
    name: '復古懷舊',
    params: { strength: { min: 0, max: 100, default: 60, label: '強度' } },
    apply: function(imageData, params) {
      var s = params.strength / 100;
      forEachPixel(imageData, function(d, i, r, g, b) {
        var sepR = r * 0.393 + g * 0.769 + b * 0.189;
        var sepG = r * 0.349 + g * 0.686 + b * 0.168;
        var sepB = r * 0.272 + g * 0.534 + b * 0.131;
        d[i]   = clamp(r + (sepR - r) * s);
        d[i+1] = clamp(g + (sepG - g) * s);
        d[i+2] = clamp(b + (sepB - b) * s);
      });
      vignette(imageData, 0.4 * s);
      return imageData;
    }
  },

  lomo: {
    name: 'LOMO 風格',
    params: { strength: { min: 0, max: 100, default: 70, label: '強度' } },
    apply: function(imageData, params) {
      var s = params.strength / 100;
      var w = imageData.width, h = imageData.height;
      var cx = w / 2, cy = h / 2;
      var maxDist = Math.sqrt(cx * cx + cy * cy);
      forEachPixel(imageData, function(d, i, r, g, b) {
        var gray = luminance(r, g, b);
        var sat = 1 + 0.5 * s;
        r = clamp(gray + (r - gray) * sat);
        g = clamp(gray + (g - gray) * sat);
        b = clamp(gray + (b - gray) * sat);
        r = clamp(r * (1 + 0.1 * s));
        b = clamp(b * (1 - 0.1 * s));
        var contrast = 1 + 0.3 * s;
        d[i]   = clamp(128 + (r - 128) * contrast);
        d[i+1] = clamp(128 + (g - 128) * contrast);
        d[i+2] = clamp(128 + (b - 128) * contrast);
      });
      var d = imageData.data;
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)) / maxDist;
          var factor = 1 - dist * dist * 0.7 * s;
          var idx = (y * w + x) * 4;
          d[idx] *= factor; d[idx+1] *= factor; d[idx+2] *= factor;
        }
      }
      return imageData;
    }
  },

  oldPhoto: {
    name: '偏黃老照片',
    apply: function(imageData) {
      var w = imageData.width, h = imageData.height;
      var cx = w / 2, cy = h / 2;
      var maxDist = Math.sqrt(cx * cx + cy * cy);
      forEachPixel(imageData, function(d, i, r, g, b) {
        var sepR = r * 0.393 + g * 0.769 + b * 0.189;
        var sepG = r * 0.349 + g * 0.686 + b * 0.168;
        var sepB = r * 0.272 + g * 0.534 + b * 0.131;
        d[i]   = clamp(sepR * 0.85 + 20);
        d[i+1] = clamp(sepG * 0.85 + 10);
        d[i+2] = clamp(sepB * 0.85 + 5);
      });
      var d = imageData.data;
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)) / maxDist;
          var factor = 1 - dist * dist * 0.45;
          var idx = (y * w + x) * 4;
          d[idx] *= factor; d[idx+1] *= factor; d[idx+2] *= factor;
        }
      }
      return imageData;
    }
  }
};

})();
