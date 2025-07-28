#!/usr/bin/env python3
"""
Comprehensive test runner for TwinGraph.

This script runs all test suites and generates reports.
"""

import os
import sys
import argparse
import subprocess
import json
from datetime import datetime
from pathlib import Path


class TestRunner:
    """Run and report on TwinGraph tests."""
    
    def __init__(self, verbose=False, coverage=False):
        self.verbose = verbose
        self.coverage = coverage
        self.results = {
            'timestamp': datetime.now().isoformat(),
            'tests': {},
            'summary': {
                'total': 0,
                'passed': 0,
                'failed': 0,
                'skipped': 0
            }
        }
    
    def run_test_suite(self, name: str, path: str, markers: str = None):
        """Run a specific test suite."""
        print(f"\n{'='*60}")
        print(f"Running {name} tests...")
        print('='*60)
        
        cmd = ['pytest', path]
        
        if self.verbose:
            cmd.append('-v')
        
        if self.coverage:
            cmd.extend(['--cov=twingraph', '--cov-report=term-missing'])
        
        if markers:
            cmd.extend(['-m', markers])
        
        # Add JSON report
        report_file = f'test_results_{name.lower().replace(" ", "_")}.json'
        cmd.extend(['--json-report', f'--json-report-file={report_file}'])
        
        # Run tests
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        # Parse results
        if os.path.exists(report_file):
            with open(report_file, 'r') as f:
                report = json.load(f)
                
            self.results['tests'][name] = {
                'passed': report['summary'].get('passed', 0),
                'failed': report['summary'].get('failed', 0),
                'skipped': report['summary'].get('skipped', 0),
                'total': report['summary'].get('total', 0),
                'duration': report['duration']
            }
            
            # Update summary
            self.results['summary']['total'] += report['summary'].get('total', 0)
            self.results['summary']['passed'] += report['summary'].get('passed', 0)
            self.results['summary']['failed'] += report['summary'].get('failed', 0)
            self.results['summary']['skipped'] += report['summary'].get('skipped', 0)
            
            # Clean up report file
            os.remove(report_file)
        
        # Print output
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        
        return result.returncode == 0
    
    def run_all_tests(self):
        """Run all test suites."""
        test_suites = [
            ('Unit Tests', 'tests/unit', None),
            ('Integration Tests', 'tests/integration', None),
            ('Regression Tests', 'tests/regression', None),
            ('Performance Benchmarks', 'tests/benchmarks', 'benchmark'),
        ]
        
        all_passed = True
        
        for name, path, markers in test_suites:
            if not os.path.exists(path):
                print(f"Warning: {path} not found, skipping {name}")
                continue
            
            passed = self.run_test_suite(name, path, markers)
            all_passed = all_passed and passed
        
        return all_passed
    
    def generate_report(self):
        """Generate test report."""
        print(f"\n{'='*60}")
        print("TEST SUMMARY")
        print('='*60)
        
        # Summary statistics
        total = self.results['summary']['total']
        passed = self.results['summary']['passed']
        failed = self.results['summary']['failed']
        skipped = self.results['summary']['skipped']
        
        if total > 0:
            pass_rate = (passed / total) * 100
        else:
            pass_rate = 0
        
        print(f"\nTotal Tests: {total}")
        print(f"Passed: {passed} ({pass_rate:.1f}%)")
        print(f"Failed: {failed}")
        print(f"Skipped: {skipped}")
        
        # Per-suite results
        print("\nPer-Suite Results:")
        for suite, results in self.results['tests'].items():
            print(f"\n  {suite}:")
            print(f"    Total: {results['total']}")
            print(f"    Passed: {results['passed']}")
            print(f"    Failed: {results['failed']}")
            print(f"    Duration: {results['duration']:.2f}s")
        
        # Save detailed report
        report_file = f"test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"\nDetailed report saved to: {report_file}")
        
        return failed == 0
    
    def run_specific_test(self, test_path: str):
        """Run a specific test file or directory."""
        print(f"Running specific test: {test_path}")
        
        cmd = ['pytest', test_path]
        
        if self.verbose:
            cmd.append('-v')
        
        if self.coverage:
            cmd.extend(['--cov=twingraph', '--cov-report=term-missing'])
        
        result = subprocess.run(cmd)
        return result.returncode == 0


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Run TwinGraph test suites'
    )
    
    parser.add_argument(
        'test',
        nargs='?',
        help='Specific test file or directory to run'
    )
    
    parser.add_argument(
        '-v', '--verbose',
        action='store_true',
        help='Verbose output'
    )
    
    parser.add_argument(
        '-c', '--coverage',
        action='store_true',
        help='Generate coverage report'
    )
    
    parser.add_argument(
        '--unit',
        action='store_true',
        help='Run only unit tests'
    )
    
    parser.add_argument(
        '--integration',
        action='store_true',
        help='Run only integration tests'
    )
    
    parser.add_argument(
        '--regression',
        action='store_true',
        help='Run only regression tests'
    )
    
    parser.add_argument(
        '--benchmarks',
        action='store_true',
        help='Run only benchmarks'
    )
    
    parser.add_argument(
        '--quick',
        action='store_true',
        help='Run quick tests only (skip slow tests)'
    )
    
    args = parser.parse_args()
    
    # Create test runner
    runner = TestRunner(verbose=args.verbose, coverage=args.coverage)
    
    # Determine what to run
    if args.test:
        # Run specific test
        success = runner.run_specific_test(args.test)
    elif args.unit:
        success = runner.run_test_suite('Unit Tests', 'tests/unit')
    elif args.integration:
        success = runner.run_test_suite('Integration Tests', 'tests/integration')
    elif args.regression:
        success = runner.run_test_suite('Regression Tests', 'tests/regression')
    elif args.benchmarks:
        success = runner.run_test_suite('Benchmarks', 'tests/benchmarks', 'benchmark')
    elif args.quick:
        # Run only fast tests
        success = runner.run_test_suite('Quick Tests', 'tests', 'not slow')
    else:
        # Run all tests
        success = runner.run_all_tests()
        runner.generate_report()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()