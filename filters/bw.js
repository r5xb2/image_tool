window.FilterBW = (function() {
var core = window.Core;
var forEachPixel = core.forEachPixel, luminance = core.luminance, clamp = core.clamp;
var gaussianBlur = core.gaussianBlur;

function sCurve(gray, amount) {
  if (amount === 0) return gray;
  var n = gray / 255;
  var k = 4 + amount * 8;
  var s = 1 / (1 + Math.exp(-k * (n - 0.5)));
  var s0 = 1 / (1 + Math.exp(-k * -0.5));
  var s1 = 1 / (1 + Math.exp(-k * 0.5));
  return (s - s0) / (s1 - s0) * 255;
}

function applyVignette(imageData, amount) {
  if (amount === 0) return;
  var w = imageData.width, h = imageData.height;
  var cx = w / 2, cy = h / 2;
  var maxDist = Math.sqrt(cx * cx + cy * cy);
  var d = imageData.data;
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)) / maxDist;
      var factor = 1 - dist * dist * amount * 0.6;
      var idx = (y * w + x) * 4;
      d[idx] *= factor;
      d[idx+1] *= factor;
      d[idx+2] *= factor;
    }
  }
}

return {
  grayscale: {
    name: '標準灰階',
    apply: function(imageData) {
      forEachPixel(imageData, function(d, i, r, g, b) {
        var gray = luminance(r, g, b);
        d[i] = d[i+1] = d[i+2] = gray;
      });
      return imageData;
    }
  },

  ricohGR: {
    name: 'Ricoh GR 黑白',
    params: {
      contrast: { min: 0, max: 100, default: 50, label: '對比' },
      clarity: { min: 0, max: 100, default: 40, label: '清晰度' },
      grain: { min: 0, max: 100, default: 15, label: '顆粒' },
      vignette: { min: 0, max: 100, default: 30, label: '暗角' }
    },
    apply: function(imageData, params) {
      var contrast = params.contrast / 100;
      var clarity = params.clarity / 100;
      var grain = params.grain / 100;
      var vig = params.vignette / 100;
      var w = imageData.width, h = imageData.height;

      var src = new Uint8ClampedArray(imageData.data);

      forEachPixel(imageData, function(d, i, r, g, b) {
        var gray = luminance(r, g, b);
        var val = sCurve(gray, contrast);
        d[i] = d[i+1] = d[i+2] = val;
      });

      if (clarity > 0) {
        var blurred = core.cloneImageData(imageData);
        var blurRadius = Math.max(2, Math.round(Math.min(w, h) * 0.008));
        gaussianBlur(blurred, blurRadius);
        var bd = blurred.data;
        var dd = imageData.data;
        var amount = clarity * 2.5;
        for (var i = 0; i < dd.length; i += 4) {
          var diff = dd[i] - bd[i];
          var enhanced = dd[i] + diff * amount;
          dd[i] = dd[i+1] = dd[i+2] = clamp(enhanced);
        }
      }

      if (grain > 0) {
        forEachPixel(imageData, function(d, i, r) {
          var intensity = r / 255;
          var noise = (Math.random() - 0.5) * grain * 60 * (1 - Math.abs(intensity - 0.5) * 1.5);
          d[i] = d[i+1] = d[i+2] = clamp(r + noise);
        });
      }

      applyVignette(imageData, vig);

      return imageData;
    }
  },

  highContrastBW: {
    name: '高對比黑白',
    params: {
      contrast: { min: 0, max: 100, default: 70, label: '對比' },
      clarity: { min: 0, max: 100, default: 20, label: '清晰度' }
    },
    apply: function(imageData, params) {
      var contrast = params.contrast / 100;
      var clarity = params.clarity / 100;

      forEachPixel(imageData, function(d, i, r, g, b) {
        var gray = luminance(r, g, b);
        var val = sCurve(gray, contrast);
        d[i] = d[i+1] = d[i+2] = val;
      });

      if (clarity > 0) {
        var blurred = core.cloneImageData(imageData);
        var blurRadius = Math.max(2, Math.round(Math.min(imageData.width, imageData.height) * 0.006));
        gaussianBlur(blurred, blurRadius);
        var bd = blurred.data;
        var dd = imageData.data;
        var amount = clarity * 2;
        for (var i = 0; i < dd.length; i += 4) {
          var diff = dd[i] - bd[i];
          dd[i] = dd[i+1] = dd[i+2] = clamp(dd[i] + diff * amount);
        }
      }

      return imageData;
    }
  },

  infraredBW: {
    name: '紅外線黑白',
    apply: function(imageData) {
      forEachPixel(imageData, function(d, i, r, g, b) {
        var ir = r * 0.7 + g * 0.2 + b * 0.1;
        var val = clamp(ir);
        d[i] = d[i+1] = d[i+2] = val;
      });
      return imageData;
    }
  },

  silverGrain: {
    name: '銀鹽粒子',
    params: {
      grain: { min: 0, max: 100, default: 30, label: '顆粒度' },
      contrast: { min: 0, max: 100, default: 20, label: '對比' }
    },
    apply: function(imageData, params) {
      var grain = params.grain / 100;
      var contrast = params.contrast / 100;

      forEachPixel(imageData, function(d, i, r, g, b) {
        var gray = luminance(r, g, b);
        var val = sCurve(gray, contrast);
        var noise = (Math.random() - 0.5) * grain * 70;
        val = clamp(val + noise);
        d[i] = d[i+1] = d[i+2] = val;
      });
      return imageData;
    }
  },

  ilfordHP5: {
    name: 'Ilford HP5 黑白底片',
    params: {
      grain: { min: 0, max: 100, default: 25, label: '顆粒度' },
      vignette: { min: 0, max: 100, default: 20, label: '暗角' }
    },
    apply: function(imageData, params) {
      var grain = params.grain / 100;
      var vig = params.vignette / 100;
      var w = imageData.width, h = imageData.height;

      forEachPixel(imageData, function(d, i, r, g, b) {
        var gray = luminance(r, g, b);
        var noise = (Math.random() - 0.5) * grain * 50;
        var val = clamp(gray + noise);
        d[i] = d[i+1] = d[i+2] = val;
      });

      applyVignette(imageData, vig);

      return imageData;
    }
  }
};

})();
