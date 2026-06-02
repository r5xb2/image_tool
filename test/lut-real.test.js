var helper = require('./helper');
var fs = require('fs');
var path = require('path');
var LUT = helper.loadScript('filters/lut.js').LUT;

var passed = 0, failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; }
  else { failed++; console.error('FAIL:', msg); }
}

var baseDir = path.resolve(__dirname, '..');
var lutFiles = [
  'luts/X100VI/F-Log/ETERNA.cube',
  'luts/X100VI/F-Log/ETERNA-BB.cube',
  'luts/X100VI/F-Log/FLog-to-Rec709.cube',
  'luts/X100VI/F-Log/WDR.cube',
  'luts/X100VI/F-Log2/ETERNA.cube',
  'luts/X100VI/F-Log2/ETERNA-BB.cube',
  'luts/X100VI/F-Log2/FLog2-to-Rec709.cube',
  'luts/X100VI/F-Log2/WDR.cube',
  'luts/GFX100SII/F-Log/ETERNA.cube',
  'luts/GFX100SII/F-Log/ETERNA-BB.cube',
  'luts/GFX100SII/F-Log/FLog-to-Rec709.cube',
  'luts/GFX100SII/F-Log/WDR.cube',
  'luts/GFX100SII/F-Log2/ETERNA.cube',
  'luts/GFX100SII/F-Log2/ETERNA-BB.cube',
  'luts/GFX100SII/F-Log2/FLog2-to-Rec709.cube',
  'luts/GFX100SII/F-Log2/WDR.cube',
];

var expectedSizes = {};
lutFiles.forEach(function(f) { expectedSizes[f] = 33; });

lutFiles.forEach(function(filePath) {
  var fullPath = path.join(baseDir, filePath);
  if (!fs.existsSync(fullPath)) {
    console.error('FAIL: LUT file not found:', filePath);
    failed++;
    return;
  }

  var content = fs.readFileSync(fullPath, 'utf-8');
  try {
    var lut = LUT.parseCube(content);
    assert(lut.size === 33, filePath + ' size = 33');
    assert(lut.data.length === 33*33*33*3, filePath + ' data length = ' + (33*33*33*3));

    // Verify first and last entries are in valid range
    assert(lut.data[0] >= 0 && lut.data[0] <= 1, filePath + ' first R in range');
    assert(lut.data[1] >= 0 && lut.data[1] <= 1, filePath + ' first G in range');
    assert(lut.data[2] >= 0 && lut.data[2] <= 1, filePath + ' first B in range');

    var lastIdx = lut.data.length - 3;
    assert(lut.data[lastIdx] >= 0 && lut.data[lastIdx] <= 1, filePath + ' last R in range');
    assert(lut.data[lastIdx+1] >= 0 && lut.data[lastIdx+1] <= 1, filePath + ' last G in range');
    assert(lut.data[lastIdx+2] >= 0 && lut.data[lastIdx+2] <= 1, filePath + ' last B in range');

    // Test interpolation with real LUT
    var result = LUT.trilinearInterpolate(lut, 0, 0, 0);
    assert(result.length === 3, filePath + ' trilinearInterpolate returns 3 values');
    assert(result[0] >= 0 && result[0] <= 1, filePath + ' interp R in range');
    assert(result[1] >= 0 && result[1] <= 1, filePath + ' interp G in range');
    assert(result[2] >= 0 && result[2] <= 1, filePath + ' interp B in range');

    // Test with white input
    var rWhite = LUT.trilinearInterpolate(lut, 1, 1, 1);
    assert(rWhite.length === 3, filePath + ' white interp returns 3 values');

    // Memory check: each LUT should be ~432KB
    var memMB = lut.data.byteLength / (1024 * 1024);
    assert(memMB < 1, filePath + ' memory < 1MB (' + memMB.toFixed(2) + 'MB)');

    console.log('  OK:', filePath, '(' + (lut.data.length/3).toFixed(0) + ' entries, ' +
      memMB.toFixed(2) + 'MB)');
    console.log('      black->(' + result.map(function(v) { return v.toFixed(4); }).join(',') + ')' +
      ' white->(' + rWhite.map(function(v) { return v.toFixed(4); }).join(',') + ')');

  } catch(e) {
    console.error('FAIL:', filePath, '-', e.message);
    failed++;
  }
});

console.log('\n=== lut-real.test.js ===');
console.log('Passed:', passed, '/ Failed:', failed);
console.log(passed > 0 && failed === 0 ? 'ALL PASSED' : 'SOME FAILED');
process.exit(failed > 0 ? 1 : 0);
