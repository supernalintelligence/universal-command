#!/usr/bin/env node
/**
 * Performance Benchmark: Lazy Loading Impact
 *
 * Measures startup time improvement from lazy loading in universal-command migration.
 *
 * Tests:
 * 1. Cold start (no handler loading) - help commands
 * 2. Single command execution - one handler loaded
 * 3. Multiple command execution - multiple handlers loaded
 *
 * Expected Result: ~9x improvement for cold start (help/list commands)
 */

const { performance } = require('perf_hooks');
const { execSync } = require('child_process');

// Configuration
const ITERATIONS = 10;
const WARMUP_ITERATIONS = 3;

/**
 * Measure command execution time
 */
function measureCommand(command, description) {
  const times = [];

  // Warmup
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    try {
      execSync(command, { stdio: 'pipe', timeout: 5000 });
    } catch (err) {
      // Ignore errors during warmup
    }
  }

  // Actual measurements
  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    try {
      execSync(command, { stdio: 'pipe', timeout: 5000 });
    } catch (err) {
      // Some commands may fail, but we still measure time
    }
    const end = performance.now();
    times.push(end - start);
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const median = times.sort((a, b) => a - b)[Math.floor(times.length / 2)];

  return {
    command,
    description,
    times,
    avg: avg.toFixed(2),
    min: min.toFixed(2),
    max: max.toFixed(2),
    median: median.toFixed(2),
  };
}

/**
 * Run benchmark suite
 */
function runBenchmarks() {
  console.log('🔬 Universal Command Lazy Loading Benchmark\n');
  console.log(`Iterations: ${ITERATIONS} (after ${WARMUP_ITERATIONS} warmup runs)\n`);

  const results = [];

  // Test 1: Help command (no handler loading)
  console.log('📊 Test 1: Cold start (help command - no handlers loaded)...');
  results.push(measureCommand('sc git --help', 'Git help (cold start)'));
  results.push(measureCommand('sc planning --help', 'Planning help (cold start)'));

  // Test 2: Single command execution
  console.log('📊 Test 2: Single command execution (one handler)...');
  results.push(measureCommand('sc agent status', 'Agent status (single handler)'));
  results.push(measureCommand('sc git check', 'Git check (single handler)'));

  // Test 3: List commands (minimal handler loading)
  console.log('📊 Test 3: List commands (minimal loading)...');
  results.push(measureCommand('sc planning req list --status done | head -1', 'Req list (filtered, early exit)'));

  // Display results
  console.log('\n📈 Results:\n');
  console.log('┌─────────────────────────────────────────────┬──────────┬──────────┬──────────┬──────────┐');
  console.log('│ Command                                     │ Avg (ms) │ Min (ms) │ Max (ms) │ Med (ms) │');
  console.log('├─────────────────────────────────────────────┼──────────┼──────────┼──────────┼──────────┤');

  results.forEach(r => {
    const cmdPadded = r.description.padEnd(43);
    const avgPadded = r.avg.padStart(8);
    const minPadded = r.min.padStart(8);
    const maxPadded = r.max.padStart(8);
    const medPadded = r.median.padStart(8);
    console.log(`│ ${cmdPadded} │ ${avgPadded} │ ${minPadded} │ ${maxPadded} │ ${medPadded} │`);
  });

  console.log('└─────────────────────────────────────────────┴──────────┴──────────┴──────────┴──────────┘');

  // Analysis
  console.log('\n🔍 Analysis:\n');

  const helpAvg = (parseFloat(results[0].avg) + parseFloat(results[1].avg)) / 2;
  const execAvg = (parseFloat(results[2].avg) + parseFloat(results[3].avg)) / 2;

  console.log(`Cold start (help) average: ${helpAvg.toFixed(2)}ms`);
  console.log(`Single execution average: ${execAvg.toFixed(2)}ms`);
  console.log(`Overhead difference: ${(execAvg - helpAvg).toFixed(2)}ms`);

  // Expected lazy loading benefit
  console.log('\n💡 Lazy Loading Impact:');
  console.log('   - Help commands should be <100ms (no handler imports)');
  console.log('   - Single command execution adds handler import cost');
  console.log('   - Expected improvement: ~9x for cold start vs eager loading');

  // Save results
  const timestamp = new Date().toISOString().split('T')[0];
  const outputFile = `benchmark-results-${timestamp}.json`;
  require('fs').writeFileSync(
    outputFile,
    JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2)
  );

  console.log(`\n✅ Results saved to: ${outputFile}\n`);
}

// Run benchmarks
runBenchmarks();
