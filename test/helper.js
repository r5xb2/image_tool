var vm = require('vm');
var fs = require('fs');
var path = require('path');

var baseDir = path.resolve(__dirname, '..');

function loadScript(relPath) {
  var fullPath = path.join(baseDir, relPath);
  var code = fs.readFileSync(fullPath, 'utf-8');
  function MockImageData(w, h) {
    this.width = w;
    this.height = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }
  var context = {
    window: {},
    console: console,
    ImageData: MockImageData
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context.window;
}

module.exports = { loadScript: loadScript };
