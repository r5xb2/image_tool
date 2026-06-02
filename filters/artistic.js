window.FilterArtistic = (function() {
var core = window.Core;
var forEachPixel = core.forEachPixel, clamp = core.clamp, luminance = core.luminance;
var gaussianBlur = core.gaussianBlur, sobelEdgeDetection = core.sobelEdgeDetection;

return {
  oilPainting: {
    name: '油畫效果',
    params: {
      radius: { min: 1, max: 7, default: 3, label: '筆觸半徑', step: 1 },
      levels: { min: 2, max: 16, default: 8, label: '色階數', step: 1 }
    },
    apply: function(imageData, params) {
      var radius = params.radius, levels = params.levels;
      var w = imageData.width, h = imageData.height;
      var src = new Uint8ClampedArray(imageData.data);
      var dst = imageData.data;
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var hist = new Array(levels).fill(0);
          var rSum = new Array(levels).fill(0);
          var gSum = new Array(levels).fill(0);
          var bSum = new Array(levels).fill(0);
          for (var ky = -radius; ky <= radius; ky++) {
            for (var kx = -radius; kx <= radius; kx++) {
              var px = Math.min(w - 1, Math.max(0, x + kx));
              var py = Math.min(h - 1, Math.max(0, y + ky));
              var idx = (py * w + px) * 4;
              var gray = luminance(src[idx], src[idx+1], src[idx+2]);
              var bin = Math.min(levels - 1, Math.floor(gray / (256 / levels)));
              hist[bin]++;
              rSum[bin] += src[idx];
              gSum[bin] += src[idx+1];
              bSum[bin] += src[idx+2];
            }
          }
          var maxBin = 0, maxCount = 0;
          for (var i = 0; i < levels; i++) {
            if (hist[i] > maxCount) { maxCount = hist[i]; maxBin = i; }
          }
          var di = (y * w + x) * 4;
          if (maxCount > 0) {
            dst[di]   = rSum[maxBin] / maxCount;
            dst[di+1] = gSum[maxBin] / maxCount;
            dst[di+2] = bSum[maxBin] / maxCount;
          }
        }
      }
      return imageData;
    }
  },

  pencilSketch: {
    name: '鉛筆素描',
    apply: function(imageData) {
      sobelEdgeDetection(imageData);
      forEachPixel(imageData, function(d, i, r, g, b) {
        var inv = 255 - luminance(r, g, b);
        var blend = clamp(inv * 1.2);
        d[i] = d[i+1] = d[i+2] = 255 - blend;
      });
      return imageData;
    }
  },

  cartoon: {
    name: '卡通化',
    params: { levels: { min: 2, max: 12, default: 5, label: '色階數', step: 1 } },
    apply: function(imageData, params) {
      var levels = params.levels;
      var w = imageData.width, h = imageData.height;
      var src = new Uint8ClampedArray(imageData.data);
      var step = 256 / levels;
      gaussianBlur(imageData, 1);
      var d = imageData.data;
      forEachPixel(imageData, function(_d, i, r, g, b) {
        _d[i]   = clamp(Math.floor(r / step) * step + step / 2);
        _d[i+1] = clamp(Math.floor(g / step) * step + step / 2);
        _d[i+2] = clamp(Math.floor(b / step) * step + step / 2);
      });
      var edgeImg = new ImageData(new Uint8ClampedArray(src), w, h);
      sobelEdgeDetection(edgeImg);
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var idx = (y * w + x) * 4;
          var edge = edgeImg.data[idx];
          if (edge > 60) {
            d[idx] = d[idx+1] = d[idx+2] = clamp(d[idx] * 0.5);
          }
        }
      }
      return imageData;
    }
  },

  pixelate: {
    name: '像素化',
    params: { size: { min: 2, max: 30, default: 8, label: '像素大小', step: 1 } },
    apply: function(imageData, params) {
      var size = params.size;
      var w = imageData.width, h = imageData.height;
      var d = imageData.data;
      for (var y = 0; y < h; y += size) {
        for (var x = 0; x < w; x += size) {
          var r = 0, g = 0, b = 0, count = 0;
          for (var ky = 0; ky < size && y + ky < h; ky++) {
            for (var kx = 0; kx < size && x + kx < w; kx++) {
              var idx = ((y + ky) * w + (x + kx)) * 4;
              r += d[idx]; g += d[idx+1]; b += d[idx+2]; count++;
            }
          }
          r /= count; g /= count; b /= count;
          for (var ky = 0; ky < size && y + ky < h; ky++) {
            for (var kx = 0; kx < size && x + kx < w; kx++) {
              var idx = ((y + ky) * w + (x + kx)) * 4;
              d[idx] = r; d[idx+1] = g; d[idx+2] = b;
            }
          }
        }
      }
      return imageData;
    }
  },

  emboss: {
    name: '浮雕',
    apply: function(imageData) {
      var w = imageData.width, h = imageData.height;
      var src = new Uint8ClampedArray(imageData.data);
      var d = imageData.data;
      var kernel = [[-2, -1, 0], [-1, 1, 1], [0, 1, 2]];
      for (var y = 1; y < h - 1; y++) {
        for (var x = 1; x < w - 1; x++) {
          var val = 0;
          for (var ky = -1; ky <= 1; ky++) {
            for (var kx = -1; kx <= 1; kx++) {
              var idx = ((y + ky) * w + (x + kx)) * 4;
              var gray = luminance(src[idx], src[idx+1], src[idx+2]);
              val += gray * kernel[ky+1][kx+1];
            }
          }
          var idx = (y * w + x) * 4;
          val = clamp(val + 128);
          d[idx] = d[idx+1] = d[idx+2] = val;
        }
      }
      return imageData;
    }
  },

  glow: {
    name: '發光效果',
    params: {
      radius: { min: 1, max: 20, default: 5, label: '發光半徑', step: 1 },
      strength: { min: 0, max: 100, default: 50, label: '強度' }
    },
    apply: function(imageData, params) {
      var radius = params.radius, s = params.strength / 100;
      var src = new Uint8ClampedArray(imageData.data);
      var blurred = new Uint8ClampedArray(imageData.data);
      var blurImg = new ImageData(blurred, imageData.width, imageData.height);
      gaussianBlur(blurImg, radius);
      var d = imageData.data;
      for (var i = 0; i < d.length; i += 4) {
        d[i]   = clamp(255 - (255 - src[i])   * (255 - blurred[i])   / 255 * s + src[i] * (1 - s));
        d[i+1] = clamp(255 - (255 - src[i+1]) * (255 - blurred[i+1]) / 255 * s + src[i+1] * (1 - s));
        d[i+2] = clamp(255 - (255 - src[i+2]) * (255 - blurred[i+2]) / 255 * s + src[i+2] * (1 - s));
      }
      return imageData;
    }
  },

  watercolor: {
    name: '水彩',
    apply: function(imageData) {
      var w = imageData.width, h = imageData.height;
      gaussianBlur(imageData, 2);
      var d = imageData.data;
      var step = 32;
      forEachPixel(imageData, function(_d, i, r, g, b) {
        _d[i]   = clamp(Math.floor(r / step) * step + step / 2);
        _d[i+1] = clamp(Math.floor(g / step) * step + step / 2);
        _d[i+2] = clamp(Math.floor(b / step) * step + step / 2);
      });
      var src = new Uint8ClampedArray(d);
      for (var y = 1; y < h - 1; y++) {
        for (var x = 1; x < w - 1; x++) {
          var idx = (y * w + x) * 4;
          var r = 0, g = 0, b = 0, n = 0;
          for (var ky = -1; ky <= 1; ky++) {
            for (var kx = -1; kx <= 1; kx++) {
              var nidx = ((y + ky) * w + (x + kx)) * 4;
              r += src[nidx]; g += src[nidx+1]; b += src[nidx+2]; n++;
            }
          }
          d[idx] = r / n; d[idx+1] = g / n; d[idx+2] = b / n;
        }
      }
      return imageData;
    }
  }
};

})();
