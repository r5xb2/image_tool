#!/bin/bash
set -e

echo "=== V1: Syntax Check ==="
node --check filters/core.js
node --check filters/bw.js
node --check filters/film.js
node --check filters/artistic.js
node --check filters/color.js
node --check filters/lut.js
node --check app.js
echo "OK"

echo ""
echo "=== V1: Core Unit Tests ==="
node test/core.test.js

echo ""
echo "=== V5: LUT Parse Tests ==="
node test/lut-parse.test.js

echo ""
echo "=== V5: LUT Interpolation Tests ==="
node test/lut-interp.test.js

echo ""
echo "=== V5: Real LUT Verification ==="
node test/lut-real.test.js

echo ""
echo "============================================"
echo "  ALL VERIFICATIONS PASSED"
echo "============================================"
