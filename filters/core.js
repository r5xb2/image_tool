window.Core = (function() {

function clamp(v) {
  return Math.min(255, Math.max(0, Math.round(v)));
}

function luminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function forEachPixel(imageData, fn) {
  var d = imageData.data;
  for (var i = 0; i < d.length; i += 4) {
    fn(d, i, d[i], d[i+1], d[i+2], d[i+3]);
  }
  return imageData;
}

function createEmptyData(width, height) {
  return new ImageData(width, height);
}

function cloneImageData(imageData) {
  var c = createEmptyData(imageData.width, imageData.height);
  c.data.set(imageData.data);
  return c;
}

function gaussianBlur(imageData, radius) {
  if (radius < 1) return imageData;
  var w = imageData.width, h = imageData.height;
  var src = new Uint8ClampedArray(imageData.data);
  var dst = imageData.data;
  var size = radius * 2 + 1;
  var sigma = radius / 3;
  var kernel = new Float32Array(size);
  var sum = 0;
  for (var i = 0; i < size; i++) {
    var x = i - radius;
    kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
    sum += kernel[i];
  }
  for (var i = 0; i < size; i++) kernel[i] /= sum;

  var tmp = new Uint8ClampedArray(src.length);

  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var idx = (y * w + x) * 4;
      var r = 0, g = 0, b = 0;
      for (var k = 0; k < size; k++) {
        var sx = Math.min(w - 1, Math.max(0, x + k - radius));
        var sidx = (y * w + sx) * 4;
        r += src[sidx] * kernel[k];
        g += src[sidx+1] * kernel[k];
        b += src[sidx+2] * kernel[k];
      }
      tmp[idx] = r; tmp[idx+1] = g; tmp[idx+2] = b; tmp[idx+3] = src[idx+3];
    }
  }

  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var idx = (y * w + x) * 4;
      var r = 0, g = 0, b = 0;
      for (var k = 0; k < size; k++) {
        var sy = Math.min(h - 1, Math.max(0, y + k - radius));
        var sidx = (sy * w + x) * 4;
        r += tmp[sidx] * kernel[k];
        g += tmp[sidx+1] * kernel[k];
        b += tmp[sidx+2] * kernel[k];
      }
      dst[idx] = r; dst[idx+1] = g; dst[idx+2] = b;
    }
  }
  return imageData;
}

function sobelEdgeDetection(imageData) {
  var w = imageData.width, h = imageData.height;
  var src = new Uint8ClampedArray(imageData.data);
  var dst = imageData.data;
  var gx = [[-1,0,1],[-2,0,2],[-1,0,1]];
  var gy = [[-1,-2,-1],[0,0,0],[1,2,1]];

  for (var y = 1; y < h - 1; y++) {
    for (var x = 1; x < w - 1; x++) {
      var mx = 0, my = 0;
      for (var ky = -1; ky <= 1; ky++) {
        for (var kx = -1; kx <= 1; kx++) {
          var idx = ((y + ky) * w + (x + kx)) * 4;
          var gray = luminance(src[idx], src[idx+1], src[idx+2]);
          mx += gray * gx[ky+1][kx+1];
          my += gray * gy[ky+1][kx+1];
        }
      }
      var mag = Math.min(255, Math.sqrt(mx * mx + my * my));
      var i = (y * w + x) * 4;
      dst[i] = dst[i+1] = dst[i+2] = mag;
    }
  }
  return imageData;
}

function adjustBrightnessContrast(imageData, brightness, contrast) {
  var factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  forEachPixel(imageData, function(d, i, r, g, b) {
    d[i]   = clamp(factor * (r - 128) + 128 + brightness);
    d[i+1] = clamp(factor * (g - 128) + 128 + brightness);
    d[i+2] = clamp(factor * (b - 128) + 128 + brightness);
  });
  return imageData;
}

function adjustSaturation(imageData, amount) {
  forEachPixel(imageData, function(d, i, r, g, b) {
    var gray = luminance(r, g, b);
    d[i]   = clamp(gray + (r - gray) * amount);
    d[i+1] = clamp(gray + (g - gray) * amount);
    d[i+2] = clamp(gray + (b - gray) * amount);
  });
  return imageData;
}

return {
  clamp: clamp,
  luminance: luminance,
  forEachPixel: forEachPixel,
  createEmptyData: createEmptyData,
  cloneImageData: cloneImageData,
  gaussianBlur: gaussianBlur,
  sobelEdgeDetection: sobelEdgeDetection,
  adjustBrightnessContrast: adjustBrightnessContrast,
  adjustSaturation: adjustSaturation
};

})();
