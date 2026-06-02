var helper = require('./helper');
var LUT = helper.loadScript('filters/lut.js').LUT;

var passed = 0, failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; }
  else { failed++; console.error('FAIL:', msg); }
}

function approx(a, b, tol) {
  return Math.abs(a - b) < (tol || 1e-4);
}

// Identity LUT: output = input (useful for testing interpolation)
function makeIdentityLUT(size) {
  var data = [];
  for (var r = 0; r < size; r++) {
    for (var g = 0; g < size; g++) {
      for (var b = 0; b < size; b++) {
        data.push(r/(size-1), g/(size-1), b/(size-1));
      }
    }
  }
  return { size: size, data: new Float32Array(data) };
}

var lut2 = makeIdentityLUT(2);
var lut33 = makeIdentityLUT(33);

// Exact grid point for 2x2x2
// At grid (0,0,0) -> should be (0,0,0)
var r0 = LUT.trilinearInterpolate(lut2, 0, 0, 0);
assert(r0[0] === 0 && r0[1] === 0 && r0[2] === 0, 'identity 2: grid (0,0,0)');

// At grid (1,1,1) -> should be (1,1,1)
var r1 = LUT.trilinearInterpolate(lut2, 1, 1, 1);
assert(approx(r1[0], 1) && approx(r1[1], 1) && approx(r1[2], 1), 'identity 2: grid (1,1,1)');

// Midpoint of 2x2x2 cell -> (0.5,0.5,0.5)
// In identity LUT of size 2, the 8 corners form a cube where the center should be exactly (0.5,0.5,0.5)
var rMid = LUT.trilinearInterpolate(lut2, 0.5, 0.5, 0.5);
assert(approx(rMid[0], 0.5) && approx(rMid[1], 0.5) && approx(rMid[2], 0.5),
  'identity 2: center (0.5,0.5,0.5) = ' + rMid[0] + ',' + rMid[1] + ',' + rMid[2]);

// Exact grid point for 33x33x33
var r33_0 = LUT.trilinearInterpolate(lut33, 0, 0, 0);
assert(approx(r33_0[0], 0) && approx(r33_0[1], 0) && approx(r33_0[2], 0), 'identity 33: grid (0,0,0)');

var r33_1 = LUT.trilinearInterpolate(lut33, 1, 1, 1);
assert(approx(r33_1[0], 1) && approx(r33_1[1], 1) && approx(r33_1[2], 1), 'identity 33: grid (1,1,1)');

// Grid point at (0.5, 0.5, 0.5) for size=33
// 0.5 maps exactly to grid index 16 (since 0.5 * 32 = 16)
var rHalf = LUT.trilinearInterpolate(lut33, 0.5, 0.5, 0.5);
assert(approx(rHalf[0], 0.5) && approx(rHalf[1], 0.5) && approx(rHalf[2], 0.5),
  'identity 33: grid (16,16,16) at r=0.5 = ' + rHalf[0] + ',' + rHalf[1] + ',' + rHalf[2]);

// Non-grid point: (0.25, 0.25, 0.25) for size=33
// 0.25 * 32 = 8.0 -> exactly at grid index 8
var rQuarter = LUT.trilinearInterpolate(lut33, 0.25, 0.25, 0.25);
assert(approx(rQuarter[0], 0.25) && approx(rQuarter[1], 0.25) && approx(rQuarter[2], 0.25),
  'identity 33: grid (8,8,8) = ' + rQuarter[0] + ',' + rQuarter[1] + ',' + rQuarter[2]);

// Interpolated point between grid points for size=2
// r=0.25, g=0.25, b=0.25 with identity 2x2x2 should be (0.25,0.25,0.25)
var r025 = LUT.trilinearInterpolate(lut2, 0.25, 0.25, 0.25);
assert(approx(r025[0], 0.25) && approx(r025[1], 0.25) && approx(r025[2], 0.25),
  'identity 2: interp (0.25,0.25,0.25) = ' + r025[0] + ',' + r025[1] + ',' + r025[2]);

// Monotonicity: increasing any channel should produce >= output
var rLow = LUT.trilinearInterpolate(lut33, 0.3, 0.3, 0.3);
var rHigh = LUT.trilinearInterpolate(lut33, 0.6, 0.6, 0.6);
assert(rHigh[0] >= rLow[0] && rHigh[1] >= rLow[1] && rHigh[2] >= rLow[2],
  'identity 33: monotonic increasing');

console.log('=== lut-interp.test.js ===');
console.log('Passed:', passed, '/ Failed:', failed);
console.log(passed > 0 && failed === 0 ? 'ALL PASSED' : 'SOME FAILED');
process.exit(failed > 0 ? 1 : 0);
