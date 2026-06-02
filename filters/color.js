window.FilterColor = (function() {
var core = window.Core;
var forEachPixel = core.forEachPixel, clamp = core.clamp, luminance = core.luminance;

return {
  warmTones: {
    name: '暖色調',
    params: { strength: { min: 0, max: 100, default: 50, label: '強度' } },
    apply: function(imageData, params) {
      var s = params.strength / 100;
      forEachPixel(imageData, function(d, i, r, g, b) {
        d[i]   = clamp(r + 30 * s);
        d[i+1] = clamp(g + 10 * s);
        d[i+2] = clamp(b - 20 * s);
      });
      return imageData;
    }
  },

  coolTones: {
    name: '冷色調',
    params: { strength: { min: 0, max: 100, default: 50, label: '強度' } },
    apply: function(imageData, params) {
      var s = params.strength / 100;
      forEachPixel(imageData, function(d, i, r, g, b) {
        d[i]   = clamp(r - 20 * s);
        d[i+1] = clamp(g + 10 * s);
        d[i+2] = clamp(b + 30 * s);
      });
      return imageData;
    }
  },

  posterize: {
    name: '色調分離',
    params: { levels: { min: 2, max: 16, default: 4, label: '色階數', step: 1 } },
    apply: function(imageData, params) {
      var levels = params.levels;
      var step = 256 / levels;
      forEachPixel(imageData, function(d, i, r, g, b) {
        d[i]   = clamp(Math.floor(r / step) * step + step / 2);
        d[i+1] = clamp(Math.floor(g / step) * step + step / 2);
        d[i+2] = clamp(Math.floor(b / step) * step + step / 2);
      });
      return imageData;
    }
  },

  negative: {
    name: '負片效果',
    apply: function(imageData) {
      forEachPixel(imageData, function(d, i, r, g, b) {
        d[i] = 255 - r;
        d[i+1] = 255 - g;
        d[i+2] = 255 - b;
      });
      return imageData;
    }
  },

  crossProcess: {
    name: '交叉沖洗 Cross-process',
    params: { strength: { min: 0, max: 100, default: 60, label: '強度' } },
    apply: function(imageData, params) {
      var s = params.strength / 100;
      forEachPixel(imageData, function(d, i, r, g, b) {
        var gray = luminance(r, g, b);
        r = clamp(r + (gray - r) * 0.15 * s);
        g = clamp(g + (gray - g) * 0.1 * s);
        if (gray < 85) {
          b = clamp(b + (85 - gray) * 0.4 * s);
        } else {
          r = clamp(r + (gray - 128) * 0.2 * s);
          g = clamp(g - (gray - 128) * 0.1 * s);
        }
        d[i] = clamp(r); d[i+1] = clamp(g); d[i+2] = clamp(b);
      });
      var d = imageData.data;
      for (var i = 0; i < d.length; i += 4) {
        d[i]   = clamp(128 + (d[i] - 128) * (1 + 0.15 * s));
        d[i+1] = clamp(128 + (d[i+1] - 128) * (1 + 0.05 * s));
        d[i+2] = clamp(128 + (d[i+2] - 128) * (1 - 0.05 * s));
      }
      return imageData;
    }
  },

  faded: {
    name: '褪色風格',
    params: { strength: { min: 0, max: 100, default: 50, label: '強度' } },
    apply: function(imageData, params) {
      var s = params.strength / 100;
      forEachPixel(imageData, function(d, i, r, g, b) {
        var gray = luminance(r, g, b);
        var sat = 1 - 0.6 * s;
        r = clamp(gray + (r - gray) * sat + 15 * s);
        g = clamp(gray + (g - gray) * sat + 10 * s);
        b = clamp(gray + (b - gray) * sat + 5 * s);
        var contrast = 1 - 0.3 * s;
        d[i]   = clamp(128 + (r - 128) * contrast);
        d[i+1] = clamp(128 + (g - 128) * contrast);
        d[i+2] = clamp(128 + (b - 128) * contrast);
      });
      return imageData;
    }
  }
};

})();
