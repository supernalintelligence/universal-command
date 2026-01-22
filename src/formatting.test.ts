/**
 * Tests for P1-10: Output Formatting Helpers
 */

import { describe, it, expect } from 'vitest';
import {
  colorize,
  success,
  error,
  warning,
  info,
  table,
  progressBar,
  spinner,
  box,
  list,
  diff,
  keyValue,
  colors,
} from './formatting';

describe('P1-10: Output Formatting Helpers', () => {
  describe('Colors', () => {
    it('should colorize text', () => {
      const colored = colorize('hello', 'red');
      expect(colored).toContain('hello');
      expect(colored).toContain(colors.red);
      expect(colored).toContain(colors.reset);
    });

    it('should support all basic colors', () => {
      expect(colorize('test', 'black')).toContain(colors.black);
      expect(colorize('test', 'red')).toContain(colors.red);
      expect(colorize('test', 'green')).toContain(colors.green);
      expect(colorize('test', 'yellow')).toContain(colors.yellow);
      expect(colorize('test', 'blue')).toContain(colors.blue);
      expect(colorize('test', 'cyan')).toContain(colors.cyan);
    });

    it('should support text styles', () => {
      expect(colorize('test', 'bold')).toContain(colors.bold);
      expect(colorize('test', 'dim')).toContain(colors.dim);
      expect(colorize('test', 'underline')).toContain(colors.underline);
    });
  });

  describe('Status Indicators', () => {
    it('should format success messages', () => {
      const msg = success('Operation completed');
      expect(msg).toContain('✓');
      expect(msg).toContain('Operation completed');
    });

    it('should format error messages', () => {
      const msg = error('Operation failed');
      expect(msg).toContain('✗');
      expect(msg).toContain('Operation failed');
    });

    it('should format warning messages', () => {
      const msg = warning('Warning message');
      expect(msg).toContain('⚠');
      expect(msg).toContain('Warning message');
    });

    it('should format info messages', () => {
      const msg = info('Information');
      expect(msg).toContain('ℹ');
      expect(msg).toContain('Information');
    });
  });

  describe('Table Formatting', () => {
    it('should format basic table', () => {
      const data = [
        ['Alice', '30', 'Engineer'],
        ['Bob', '25', 'Designer'],
      ];

      const result = table(data);

      expect(result).toContain('Alice');
      expect(result).toContain('Bob');
      expect(result).toContain('│'); // Border character
    });

    it('should format table with headers', () => {
      const data = [
        ['Alice', '30'],
        ['Bob', '25'],
      ];

      const result = table(data, {
        headers: ['Name', 'Age'],
      });

      expect(result).toContain('Name');
      expect(result).toContain('Age');
      expect(result).toContain('Alice');
    });

    it('should support table without borders', () => {
      const data = [['A', 'B']];

      const result = table(data, { borders: false });

      // Should NOT have borders
      expect(result).not.toContain('┌');
      expect(result).not.toContain('└');
    });

    it('should handle empty table', () => {
      const result = table([]);
      expect(result).toBe('');
    });
  });

  describe('Progress Bar', () => {
    it('should create progress bar', () => {
      const bar = progressBar(100);

      expect(bar).toBeDefined();
      expect(bar.render()).toContain('Progress');
      expect(bar.render()).toContain('[');
      expect(bar.render()).toContain(']');
    });

    it('should update progress', () => {
      const bar = progressBar(100, 40, 'Loading');

      bar.update(50);
      const rendered = bar.render();

      expect(rendered).toContain('50.0%');
      expect(rendered).toContain('50/100');
    });

    it('should increment progress', () => {
      const bar = progressBar(10);

      bar.increment();
      expect(bar.render()).toContain('1/10');

      bar.increment(5);
      expect(bar.render()).toContain('6/10');
    });

    it('should complete progress', () => {
      const bar = progressBar(100);

      const completed = bar.complete();

      expect(completed).toContain('100.0%');
      expect(completed).toContain('✓');
    });

    it('should handle zero total gracefully', () => {
      const bar = progressBar(0);
      const rendered = bar.render();

      expect(rendered).toContain('0.0%');
    });
  });

  describe('Spinner', () => {
    it('should create spinner', () => {
      const spin = spinner('Loading');

      expect(spin).toBeDefined();
    });

    it('should stop spinner', () => {
      const spin = spinner('Testing');

      // Start and immediately stop (no actual spinning in tests)
      spin.stop('Done');

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Box Drawing', () => {
    it('should draw box around text', () => {
      const result = box('Hello World');

      expect(result).toContain('Hello World');
      expect(result).toContain('┌'); // Top-left corner
      expect(result).toContain('┐'); // Top-right corner
      expect(result).toContain('└'); // Bottom-left corner
      expect(result).toContain('┘'); // Bottom-right corner
    });

    it('should support box with title', () => {
      const result = box('Content', { title: 'Title' });

      expect(result).toContain('Title');
      expect(result).toContain('Content');
    });

    it('should support different border styles', () => {
      const single = box('Test', { borderStyle: 'single' });
      const double = box('Test', { borderStyle: 'double' });
      const rounded = box('Test', { borderStyle: 'rounded' });

      expect(single).toContain('┌');
      expect(double).toContain('╔');
      expect(rounded).toContain('╭');
    });

    it('should support padding', () => {
      const result = box('X', { padding: 2 });

      // Should have extra space around content
      expect(result.split('\n').length).toBeGreaterThan(3);
    });

    it('should handle multi-line text', () => {
      const result = box('Line 1\nLine 2\nLine 3');

      expect(result).toContain('Line 1');
      expect(result).toContain('Line 2');
      expect(result).toContain('Line 3');
    });
  });

  describe('List Formatting', () => {
    it('should format unordered list', () => {
      const result = list(['Item 1', 'Item 2', 'Item 3']);

      expect(result).toContain('•');
      expect(result).toContain('Item 1');
      expect(result).toContain('Item 2');
    });

    it('should format ordered list', () => {
      const result = list(['First', 'Second', 'Third'], true);

      expect(result).toContain('1.');
      expect(result).toContain('2.');
      expect(result).toContain('3.');
      expect(result).toContain('First');
    });
  });

  describe('Diff Formatting', () => {
    it('should format additions and removals', () => {
      const result = diff(['added line'], ['removed line']);

      expect(result).toContain('+ added line');
      expect(result).toContain('- removed line');
    });

    it('should handle empty diffs', () => {
      const result = diff([], []);
      expect(result).toBe('');
    });
  });

  describe('Key-Value Formatting', () => {
    it('should format key-value pairs', () => {
      const data = {
        name: 'Alice',
        age: 30,
        role: 'Engineer',
      };

      const result = keyValue(data);

      expect(result).toContain('name');
      expect(result).toContain('Alice');
      expect(result).toContain('age');
      expect(result).toContain('30');
    });

    it('should support custom separator', () => {
      const data = { key: 'value' };

      const result = keyValue(data, ' =');

      expect(result).toContain('=');
    });

    it('should align keys', () => {
      const data = {
        short: 'value',
        veryLongKeyName: 'value',
      };

      const result = keyValue(data);

      // Both lines should have similar structure
      const lines = result.split('\n');
      expect(lines[0].indexOf(':')).toBe(lines[1].indexOf(':'));
    });
  });

  describe('Integration', () => {
    it('should combine multiple formatters', () => {
      const header = box('Report', { title: 'System Status' });
      const tableData = table(
        [
          ['CPU', '45%'],
          ['Memory', '72%'],
        ],
        {
          headers: ['Resource', 'Usage'],
        }
      );
      const footer = success('All systems operational');

      const combined = [header, '', tableData, '', footer].join('\n');

      expect(combined).toContain('System Status');
      expect(combined).toContain('CPU');
      expect(combined).toContain('All systems operational');
    });
  });
});
