var helper = require('./helper');
var LUT = helper.loadScript('filters/lut.js').LUT;

var passed = 0, failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; }
  else { failed++; console.error('FAIL:', msg); }
}

function approx(a, b, tol) {
  return Math.abs(a - b) < (tol || 1e-6);
}

// Basic parse
var cubeContent = [
  '# comment line',
  '# another comment',
  'LUT_3D_SIZE 2',
  '0.0 0.0 0.0',
  '0.0 0.0 1.0',
  '0.0 1.0 0.0',
  '0.0 1.0 1.0',
  '1.0 0.0 0.0',
  '1.0 0.0 1.0',
  '1.0 1.0 0.0',
  '1.0 1.0 1.0',
].join('\n');

var lut = LUT.parseCube(cubeContent);
assert(lut.size === 2, 'parseCube size = 2');
assert(lut.data.length === 2*2*2*3, 'parseCube data length = 24');

// First entry (r=0,g=0,b=0)
assert(lut.data[0] === 0 && lut.data[1] === 0 && lut.data[2] === 0, 'first entry');

// Last entry (r=1,g=1,b=1)
assert(lut.data[21] === 1 && lut.data[22] === 1 && lut.data[23] === 1, 'last entry');

// Entry at (r=0,g=0,b=1) = index 1
assert(lut.data[3] === 0 && lut.data[4] === 0 && lut.data[5] === 1, 'entry (0,0,1)');

// Parse 33 size
var cube33Content = 'LUT_3D_SIZE 33\n' +
  Array(33*33*33+1).join('0.1 0.2 0.3\n');
try {
  var lut33 = LUT.parseCube(cube33Content);
  assert(lut33.size === 33, 'size 33');
  assert(lut33.data.length === 33*33*33*3, 'size 33 data length');
} catch(e) {
  console.error('FAIL: 33 parse error:', e.message);
  failed++;
}

// Error handling: invalid data count
var badContent = 'LUT_3D_SIZE 2\n0.1 0.2 0.3\n0.4 0.5 0.6\n';
try {
  LUT.parseCube(badContent);
  console.error('FAIL: should have thrown for invalid data count');
  failed++;
} catch(e) {
  assert(e.message.indexOf('expected') >= 0, 'error message for invalid data');
}

// Error handling: small size
try {
  LUT.parseCube('LUT_3D_SIZE 1\n0.5 0.5 0.5\n');
  console.error('FAIL: should have thrown for size < 2');
  failed++;
} catch(e) {
  assert(true, 'rejects size < 2');
}

// Whitespace handling
var wsContent = 'LUT_3D_SIZE  2\n\t0.0  0.0  0.0\n\t1.0  0.0  0.0\n  0.0  1.0  0.0\n  1.0  1.0  0.0\n0.0 0.0 1.0\n1.0 0.0 1.0\n0.0 1.0 1.0\n1.0 1.0 1.0\n';
var lutWs = LUT.parseCube(wsContent);
assert(lutWs.size === 2, 'handles extra whitespace');
assert(lutWs.data.length === 24, 'extra whitespace data length');

// sRGB/Linear conversion
assert(LUT.srgbToLinear(0.0) === 0, 'srgbToLinear black');
assert(approx(LUT.srgbToLinear(0.04045), 0.04045/12.92), 'srgbToLinear at threshold');
assert(approx(LUT.linearToSrgb(0.0), 0), 'linearToSrgb black');
assert(approx(LUT.linearToSrgb(1.0), 1.0), 'linearToSrgb white');

console.log('=== lut-parse.test.js ===');
console.log('Passed:', passed, '/ Failed:', failed);
console.log(passed > 0 && failed === 0 ? 'ALL PASSED' : 'SOME FAILED');
process.exit(failed > 0 ? 1 : 0);
