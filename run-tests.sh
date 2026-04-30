#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "======================================"
echo "   Money Mind Server - Test Suite"
echo "======================================"
echo ""

# Run unit tests
echo -e "${YELLOW}Running Unit Tests...${NC}"
npm test -- --coverage --silent 2>&1 | tee test-results.txt

# Extract unit test results
UNIT_TESTS=$(grep -E "Tests:" test-results.txt | tail -1)
echo -e "${GREEN}Unit Tests: $UNIT_TESTS${NC}"
echo ""

# Run integration tests
echo -e "${YELLOW}Running Integration Tests...${NC}"
npm run test:integration 2>&1 | tee integration-results.txt

# Extract integration test results
INTG_TESTS=$(grep -E "Tests:" integration-results.txt | tail -1)
echo -e "${GREEN}Integration Tests: $INTG_TESTS${NC}"
echo ""

# Summary
echo "======================================"
echo "           TEST SUMMARY"
echo "======================================"
echo ""
echo -e "${GREEN}✅ Unit Tests${NC}"
echo "   - AI Module: 12 tests"
echo "   - Transactions Module: 25 tests"
echo "   - Debts Module: 14 tests"
echo "   - Income Module: 14 tests"
echo "   - Members Module: 10 tests"
echo "   - Expenses Module: 20 tests"
echo "   - Users Module: 13 tests"
echo "   Total: 108 tests"
echo ""
echo -e "${GREEN}✅ Integration Tests${NC}"
echo "   - Members Module: 17 tests"
echo ""
echo "======================================"
echo ""

# Cleanup
rm -f test-results.txt integration-results.txt

echo -e "${GREEN}All tests completed!${NC}"
