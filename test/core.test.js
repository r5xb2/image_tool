var helper = require('./helper');
var Core = helper.loadScript('filters/core.js').Core;

var passed = 0, failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; }
  else { failed++; console.error('FAIL:', msg); }
}

function approx(a, b, tol) {
  return Math.abs(a - b) < (tol || 0.01);
}

// clamp
assert(Core.clamp(0, 0, 255) === 0, 'clamp middle value');
assert(Core.clamp(-10, 0, 255) === 0, 'clamp below min');
assert(Core.clamp(300, 0, 255) === 255, 'clamp above max');
assert(Core.clamp(128, 0, 255) === 128, 'clamp normal');
assert(Core.clamp(-1, 0, 255) === 0, 'clamp just below');
assert(Core.clamp(256, 0, 255) === 255, 'clamp just above');

// luminance
assert(Core.luminance(0, 0, 0) === 0, 'luminance black');
assert(Core.luminance(255, 255, 255) === 255, 'luminance white');
assert(approx(Core.luminance(255, 0, 0), 76.245), 'luminance red');
assert(approx(Core.luminance(0, 255, 0), 149.685), 'luminance green');
assert(approx(Core.luminance(0, 0, 255), 29.07), 'luminance blue');

// forEachPixel
var mockData = { data: new Uint8ClampedArray([10, 20, 30, 255, 40, 50, 60, 255]), width: 1, height: 2 };
Core.forEachPixel(mockData, function(d, i, r, g, b) {
  d[i] = 0; d[i+1] = 0; d[i+2] = 0;
});
assert(mockData.data[0] === 0, 'forEachPixel modifies pixel 1');
assert(mockData.data[4] === 0, 'forEachPixel modifies pixel 2');

// cloneImageData
var cloned = Core.cloneImageData(mockData);
assert(cloned.width === mockData.width, 'cloneImageData width');
assert(cloned.height === mockData.height, 'cloneImageData height');
assert(cloned.data[0] === mockData.data[0], 'cloneImageData data match');
cloned.data[0] = 255;
assert(mockData.data[0] === 0, 'cloneImageData deep copy');

// adjustBrightnessContrast
var bcData = { data: new Uint8ClampedArray([100, 100, 100, 255]), width: 1, height: 1 };
Core.adjustBrightnessContrast(bcData, 0, 0);
assert(bcData.data[0] === 100, 'brightness 0 contrast 0 no change');
bcData.data.set([100, 100, 100, 255]);
Core.adjustBrightnessContrast(bcData, 20, 0);
assert(bcData.data[0] === 120, 'brightness +20');

// adjustSaturation
var satData = { data: new Uint8ClampedArray([100, 50, 50, 255]), width: 1, height: 1 };
Core.adjustSaturation(satData, 0);
assert(satData.data[0] === satData.data[1] && satData.data[1] === satData.data[2], 'saturation 0 = grayscale');
satData.data.set([100, 50, 50, 255]);
Core.adjustSaturation(satData, 2);
assert(satData.data[0] > 100, 'saturation 200% increases red');

// gaussianBlur
var blurData = {
  data: new Uint8ClampedArray([
    0, 0, 0, 255,  255, 255, 255, 255,  0, 0, 0, 255,
    0, 0, 0, 255,  255, 255, 255, 255,  0, 0, 0, 255,
    0, 0, 0, 255,  255, 255, 255, 255,  0, 0, 0, 255,
  ]),
  width: 3, height: 3
};
Core.gaussianBlur(blurData, 1);
assert(blurData.data[4*4+0] > 0 && blurData.data[4*4+0] < 255, 'gaussianBlur center blurred');

// sobelEdgeDetection (horizontal gradient: dark left, bright right)
var edgeData = {
  data: new Uint8ClampedArray([
    10,10,10,255, 100,100,100,255, 200,200,200,255,
    10,10,10,255, 100,100,100,255, 200,200,200,255,
    10,10,10,255, 100,100,100,255, 200,200,200,255,
  ]),
  width: 3, height: 3
};
Core.sobelEdgeDetection(edgeData);
var edgeCenter = edgeData.data[4*4+0];
assert(edgeCenter > 80, 'sobelEdgeDetection detects edge at center: ' + edgeCenter);

console.log('=== core.test.js ===');
console.log('Passed:', passed, '/ Failed:', failed);
console.log(passed > 0 && failed === 0 ? 'ALL PASSED' : 'SOME FAILED');
process.exit(failed > 0 ? 1 : 0);
