window.LUT = (function() {

var cache = {};

function srgbToLinear(v) {
  if (v <= 0.04045) return v / 12.92;
  return Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearToSrgb(v) {
  if (v <= 0.0031308) return v * 12.92;
  return 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

function linearToFLog(v) {
  // Fujifilm F-Log (Ver.1.0): out = c * log10(a * in + b) + d
  // a=0.555556, b=0.009468, c=0.344676, d=0.790453, cut1=0.00089
  // e=8.735631, f=0.092864 (linear segment for near-black)
  var cut1 = 0.00089;
  if (v < cut1) return 8.735631 * v + 0.092864;
  return 0.344676 * Math.log10(0.555556 * v + 0.009468) + 0.790453;
}

function linearToFLog2(v) {
  // Fujifilm F-Log2 (Ver.1.1): out = c * log10(a * in + b) + d
  // a=5.555556, b=0.064829, c=0.245281, d=0.384316, cut1=0.000889
  // e=8.799461, f=0.092864 (linear segment for near-black)
  var cut1 = 0.000889;
  if (v < cut1) return 8.799461 * v + 0.092864;
  return 0.245281 * Math.log10(5.555556 * v + 0.064829) + 0.384316;
}

function parseCube(text) {
  var lines = text.split('\n');
  var size = 0;
  var dataLines = [];

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line.length === 0 || line.charAt(0) === '#') continue;

    if (line.indexOf('LUT_3D_SIZE') === 0) {
      size = parseInt(line.split(/\s+/)[1], 10);
      continue;
    }

    if (line.indexOf('LUT_3D_INPUT_RANGE') === 0) continue;
    if (line.indexOf('DOMAIN_') === 0) continue;

    var parts = line.split(/\s+/);
    if (parts.length >= 3) {
      var r = parseFloat(parts[0]);
      var g = parseFloat(parts[1]);
      var b = parseFloat(parts[2]);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        dataLines.push(r, g, b);
      }
    }
  }

  if (size < 2) throw new Error('Invalid LUT: size must be >= 2');
  var expected = size * size * size * 3;
  if (dataLines.length !== expected) {
    throw new Error('Invalid LUT data: expected ' + expected + ' values, got ' + dataLines.length);
  }

  return {
    size: size,
    data: new Float32Array(dataLines)
  };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function trilinearInterpolate(lut, r, g, b) {
  var size = lut.size;
  var data = lut.data;
  var n = size - 1;

  var rp = r * n;
  var gp = g * n;
  var bp = b * n;
  var r0 = Math.min(Math.floor(rp), n);
  var g0 = Math.min(Math.floor(gp), n);
  var b0 = Math.min(Math.floor(bp), n);
  var rf = rp - r0;
  var gf = gp - g0;
  var bf = bp - b0;

  var strideG = size * 3;
  var strideR = size * size * 3;
  var base = 3 * (r0 * size * size + g0 * size + b0);

  var o000 = base;
  var o001 = base + 3;
  var o010 = base + strideG;
  var o011 = base + strideG + 3;
  var o100 = base + strideR;
  var o101 = base + strideR + 3;
  var o110 = base + strideR + strideG;
  var o111 = base + strideR + strideG + 3;

  if (rf === 0 && gf === 0 && bf === 0) {
    return [data[o000], data[o000+1], data[o000+2]];
  }

  function interpChannel(ch) {
    var v000 = data[o000 + ch], v001 = data[o001 + ch];
    var v010 = data[o010 + ch], v011 = data[o011 + ch];
    var v100 = data[o100 + ch], v101 = data[o101 + ch];
    var v110 = data[o110 + ch], v111 = data[o111 + ch];

    var v00 = lerp(v000, v001, bf);
    var v01 = lerp(v010, v011, bf);
    var v10 = lerp(v100, v101, bf);
    var v11 = lerp(v110, v111, bf);

    var v0 = lerp(v00, v01, gf);
    var v1 = lerp(v10, v11, gf);

    return lerp(v0, v1, rf);
  }

  return [
    interpChannel(0),
    interpChannel(1),
    interpChannel(2)
  ];
}

function applyLUT(imageData, lut, strength, logType) {
  var d = imageData.data;
  var size = lut.size;
  var data = lut.data;
  var n = size - 1;

  var strideG = size * 3;
  var strideR = size * size * 3;

  var toLog = (logType === 'F-Log2') ? linearToFLog2 : linearToFLog;

  for (var i = 0; i < d.length; i += 4) {
    var rOrig = d[i];
    var gOrig = d[i + 1];
    var bOrig = d[i + 2];

    var rn = srgbToLinear(rOrig / 255);
    var gn = srgbToLinear(gOrig / 255);
    var bn = srgbToLinear(bOrig / 255);

    rn = toLog(rn);
    gn = toLog(gn);
    bn = toLog(bn);

    var rp = rn * n;
    var gp = gn * n;
    var bp = bn * n;
    var r0 = Math.min(Math.floor(rp), n);
    var g0 = Math.min(Math.floor(gp), n);
    var b0 = Math.min(Math.floor(bp), n);
    var rf = rp - r0;
    var gf = gp - g0;
    var bf = bp - b0;
    var r1 = Math.min(r0 + 1, n);
    var g1 = Math.min(g0 + 1, n);
    var b1 = Math.min(b0 + 1, n);

    if (rf === 0 && gf === 0 && bf === 0) {
      var exactOff = 3 * (r0 * size * size + g0 * size + b0);
      rLut = data[exactOff];
      gLut = data[exactOff + 1];
      bLut = data[exactOff + 2];
    } else {
      var base = 3 * (r0 * size * size + g0 * size + b0);
      var o000 = base, o001 = base + 3;
      var o010 = base + strideG, o011 = base + strideG + 3;
      var o100 = base + strideR, o101 = base + strideR + 3;
      var o110 = base + strideR + strideG, o111 = base + strideR + strideG + 3;

      var v000, v001, v010, v011, v100, v101, v110, v111;
      var v00, v01, v10, v11, v0, v1;

      v000 = data[o000]; v001 = data[o001];
      v010 = data[o010]; v011 = data[o011];
      v100 = data[o100]; v101 = data[o101];
      v110 = data[o110]; v111 = data[o111];
      v00 = lerp(v000, v001, bf); v01 = lerp(v010, v011, bf);
      v10 = lerp(v100, v101, bf); v11 = lerp(v110, v111, bf);
      v0 = lerp(v00, v01, gf); v1 = lerp(v10, v11, gf);
      var rLut = lerp(v0, v1, rf);

      v000 = data[o000 + 1]; v001 = data[o001 + 1];
      v010 = data[o010 + 1]; v011 = data[o011 + 1];
      v100 = data[o100 + 1]; v101 = data[o101 + 1];
      v110 = data[o110 + 1]; v111 = data[o111 + 1];
      v00 = lerp(v000, v001, bf); v01 = lerp(v010, v011, bf);
      v10 = lerp(v100, v101, bf); v11 = lerp(v110, v111, bf);
      v0 = lerp(v00, v01, gf); v1 = lerp(v10, v11, gf);
      var gLut = lerp(v0, v1, rf);

      v000 = data[o000 + 2]; v001 = data[o001 + 2];
      v010 = data[o010 + 2]; v011 = data[o011 + 2];
      v100 = data[o100 + 2]; v101 = data[o101 + 2];
      v110 = data[o110 + 2]; v111 = data[o111 + 2];
      v00 = lerp(v000, v001, bf); v01 = lerp(v010, v011, bf);
      v10 = lerp(v100, v101, bf); v11 = lerp(v110, v111, bf);
      v0 = lerp(v00, v01, gf); v1 = lerp(v10, v11, gf);
      var bLut = lerp(v0, v1, rf);
    }

    if (strength < 1) {
      d[i] = clamp(rOrig + ((rLut * 255) - rOrig) * strength);
      d[i + 1] = clamp(gOrig + ((gLut * 255) - gOrig) * strength);
      d[i + 2] = clamp(bOrig + ((bLut * 255) - bOrig) * strength);
    } else {
      d[i] = Math.round(rLut * 255);
      d[i + 1] = Math.round(gLut * 255);
      d[i + 2] = Math.round(bLut * 255);
    }
  }

  return imageData;
}

function clamp(v) {
  return Math.min(255, Math.max(0, Math.round(v)));
}

function decodeEmbeddedLUT(path) {
  if (!window.__LUT_EMBEDDED) return null;
  var entry = window.__LUT_EMBEDDED[path];
  if (!entry) return null;
  try {
    var binary = atob(entry.data);
    var len = binary.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    var float32Array = new Float32Array(bytes.buffer);
    return { size: entry.size, data: float32Array };
  } catch (e) {
    return null;
  }
}

function fetchLUT(path, callback) {
  if (cache[path]) {
    callback(null, cache[path]);
    return;
  }

  var embedded = decodeEmbeddedLUT(path);
  if (embedded) {
    cache[path] = embedded;
    callback(null, embedded);
    return;
  }

  var xhr = new XMLHttpRequest();
  xhr.open('GET', path, true);
  xhr.onload = function() {
    if (xhr.status === 200 || xhr.status === 0) {
      try {
        var lut = parseCube(xhr.responseText);
        cache[path] = lut;
        callback(null, lut);
      } catch (e) {
        callback(e, null);
      }
    } else {
      callback(new Error('Failed to load ' + path + ': ' + xhr.status), null);
    }
  };
  xhr.onerror = function() {
    callback(new Error('Network error loading ' + path), null);
  };
  xhr.send();
}

function clearCache() {
  cache = {};
}

return {
  parseCube: parseCube,
  srgbToLinear: srgbToLinear,
  linearToSrgb: linearToSrgb,
  linearToFLog: linearToFLog,
  linearToFLog2: linearToFLog2,
  trilinearInterpolate: trilinearInterpolate,
  applyLUT: applyLUT,
  fetchLUT: fetchLUT,
  clearCache: clearCache,
  cache: cache
};

})();
