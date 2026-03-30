/**
 * Output Formatting Helpers - P1-10
 *
 * Provides utilities for:
 * - Table formatting
 * - Progress bars
 * - Colors/styling (ANSI codes)
 * - Spinners
 * - Success/error indicators
 */

/**
 * ANSI color codes
 */
export const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',

  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

/**
 * Color a string (with automatic reset)
 */
export function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

/**
 * Success indicator (✓)
 */
export function success(message: string): string {
  return `${colorize('✓', 'green')} ${message}`;
}

/**
 * Error indicator (✗)
 */
export function error(message: string): string {
  return `${colorize('✗', 'red')} ${message}`;
}

/**
 * Warning indicator (⚠)
 */
export function warning(message: string): string {
  return `${colorize('⚠', 'yellow')} ${message}`;
}

/**
 * Info indicator (ℹ)
 */
export function info(message: string): string {
  return `${colorize('ℹ', 'blue')} ${message}`;
}

/**
 * Table formatting options
 */
export interface TableOptions {
  /** Column headers */
  headers?: string[];

  /** Column alignments ('left' | 'center' | 'right') */
  align?: Array<'left' | 'center' | 'right'>;

  /** Whether to use borders */
  borders?: boolean;

  /** Whether to use colors for headers */
  colorHeaders?: boolean;

  /** Maximum column width */
  maxWidth?: number;
}

/**
 * Format data as a table
 */
export function table(rows: string[][], options: TableOptions = {}): string {
  const {
    headers,
    align = [],
    borders = true,
    colorHeaders = true,
    maxWidth = 80,
  } = options;

  if (rows.length === 0) {
    return '';
  }

  // Calculate column widths
  const allRows = headers ? [headers, ...rows] : rows;
  const columnCount = Math.max(...allRows.map(row => row.length));
  const columnWidths: number[] = [];

  for (let col = 0; col < columnCount; col++) {
    const columnValues = allRows.map(row => row[col] || '');
    const maxColWidth = Math.max(...columnValues.map(v => v.length));
    columnWidths.push(Math.min(maxColWidth, maxWidth));
  }

  // Format rows
  const lines: string[] = [];

  // Add top border
  if (borders) {
    lines.push(formatBorder(columnWidths, 'top'));
  }

  // Add headers
  if (headers) {
    const headerLine = formatRow(headers, columnWidths, align, colorHeaders);
    lines.push(headerLine);

    if (borders) {
      lines.push(formatBorder(columnWidths, 'middle'));
    }
  }

  // Add data rows
  for (const row of rows) {
    lines.push(formatRow(row, columnWidths, align, false));
  }

  // Add bottom border
  if (borders) {
    lines.push(formatBorder(columnWidths, 'bottom'));
  }

  return lines.join('\n');
}

/**
 * Format a single table row
 */
function formatRow(
  row: string[],
  columnWidths: number[],
  align: Array<'left' | 'center' | 'right'>,
  useColor: boolean
): string {
  const cells = row.map((cell, i) => {
    const width = columnWidths[i] || 10;
    const alignment = align[i] || 'left';
    const truncated = cell.length > width ? cell.substring(0, width - 3) + '...' : cell;

    let formatted = '';
    if (alignment === 'right') {
      formatted = truncated.padStart(width);
    } else if (alignment === 'center') {
      const leftPad = Math.floor((width - truncated.length) / 2);
      formatted = truncated.padStart(leftPad + truncated.length).padEnd(width);
    } else {
      formatted = truncated.padEnd(width);
    }

    return useColor ? colorize(formatted, 'bold') : formatted;
  });

  return `│ ${cells.join(' │ ')} │`;
}

/**
 * Format table border
 */
function formatBorder(
  columnWidths: number[],
  position: 'top' | 'middle' | 'bottom'
): string {
  const left = position === 'top' ? '┌' : position === 'bottom' ? '└' : '├';
  const right = position === 'top' ? '┐' : position === 'bottom' ? '┘' : '┤';
  const cross = position === 'top' ? '┬' : position === 'bottom' ? '┴' : '┼';

  const segments = columnWidths.map(width => '─'.repeat(width + 2));

  return `${left}${segments.join(cross)}${right}`;
}

/**
 * Progress bar
 */
export class ProgressBar {
  private current: number = 0;
  private readonly total: number;
  private readonly width: number;
  private readonly label: string;

  constructor(total: number, width: number = 40, label: string = 'Progress') {
    this.total = total;
    this.width = width;
    this.label = label;
  }

  /**
   * Update progress
   */
  update(current: number): void {
    this.current = current;
  }

  /**
   * Increment progress
   */
  increment(amount: number = 1): void {
    this.current += amount;
  }

  /**
   * Render progress bar
   */
  render(): string {
    const percentage = this.total > 0 ? (this.current / this.total) * 100 : 0;
    const filled = Math.floor((this.width * percentage) / 100);
    const empty = this.width - filled;

    const bar = `[${'█'.repeat(filled)}${' '.repeat(empty)}]`;
    const percent = `${percentage.toFixed(1)}%`;

    return `${this.label}: ${bar} ${percent} (${this.current}/${this.total})`;
  }

  /**
   * Complete the progress bar
   */
  complete(): string {
    this.current = this.total;
    return this.render() + ' ' + colorize('✓', 'green');
  }
}

/**
 * Create a progress bar
 */
export function progressBar(total: number, width?: number, label?: string): ProgressBar {
  return new ProgressBar(total, width, label);
}

/**
 * Spinner states
 */
const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/**
 * Spinner for long-running operations
 */
export class Spinner {
  private interval?: NodeJS.Timeout;
  private frame: number = 0;
  private readonly message: string;
  private readonly stream: NodeJS.WritableStream;

  constructor(message: string = 'Loading', stream: NodeJS.WritableStream = process.stdout) {
    this.message = message;
    this.stream = stream;
  }

  /**
   * Start spinning
   */
  start(): void {
    this.interval = setInterval(() => {
      const frame = spinnerFrames[this.frame % spinnerFrames.length];
      this.stream.write(`\r${colorize(frame, 'cyan')} ${this.message}`);
      this.frame++;
    }, 80);
  }

  /**
   * Stop spinning and show final message
   */
  stop(finalMessage?: string): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }

    this.stream.write('\r' + ' '.repeat(this.message.length + 10) + '\r');

    if (finalMessage) {
      this.stream.write(finalMessage + '\n');
    }
  }

  /**
   * Stop with success
   */
  succeed(message?: string): void {
    this.stop(success(message || this.message));
  }

  /**
   * Stop with error
   */
  fail(message?: string): void {
    this.stop(error(message || this.message));
  }
}

/**
 * Create a spinner
 */
export function spinner(message?: string, stream?: NodeJS.WritableStream): Spinner {
  return new Spinner(message, stream);
}

/**
 * Box drawing
 */
export interface BoxOptions {
  /** Padding inside box */
  padding?: number;

  /** Border style */
  borderStyle?: 'single' | 'double' | 'rounded';

  /** Title for box */
  title?: string;
}

/**
 * Draw a box around text
 */
export function box(text: string, options: BoxOptions = {}): string {
  const { padding = 1, borderStyle = 'single', title } = options;

  // Border characters
  const borders = {
    single: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
    double: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
    rounded: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' },
  };

  const border = borders[borderStyle];

  const lines = text.split('\n');
  const contentWidth = Math.max(...lines.map(l => l.length));

  // Ensure title fits if provided
  const titleText = title ? ` ${title} ` : '';
  const minWidth = Math.max(contentWidth, titleText.length);
  const innerWidth = minWidth + padding * 2;

  const result: string[] = [];

  // Top border
  if (title) {
    const leftPadding = Math.max(0, Math.floor((innerWidth - titleText.length) / 2));
    const rightPadding = Math.max(0, innerWidth - titleText.length - leftPadding);
    result.push(
      border.tl +
        border.h.repeat(leftPadding) +
        titleText +
        border.h.repeat(rightPadding) +
        border.tr
    );
  } else {
    result.push(border.tl + border.h.repeat(innerWidth) + border.tr);
  }

  // Padding rows
  for (let i = 0; i < padding; i++) {
    result.push(border.v + ' '.repeat(innerWidth) + border.v);
  }

  // Content
  for (const line of lines) {
    const paddedLine =
      ' '.repeat(padding) + line.padEnd(minWidth) + ' '.repeat(padding);
    result.push(border.v + paddedLine + border.v);
  }

  // Padding rows
  for (let i = 0; i < padding; i++) {
    result.push(border.v + ' '.repeat(innerWidth) + border.v);
  }

  // Bottom border
  result.push(border.bl + border.h.repeat(innerWidth) + border.br);

  return result.join('\n');
}

/**
 * List formatting
 */
export function list(items: string[], ordered: boolean = false): string {
  return items
    .map((item, i) => {
      const marker = ordered ? `${i + 1}.` : '•';
      return `  ${marker} ${item}`;
    })
    .join('\n');
}

/**
 * Diff formatting (for showing changes)
 */
export function diff(additions: string[], removals: string[]): string {
  const lines: string[] = [];

  for (const removal of removals) {
    lines.push(colorize(`- ${removal}`, 'red'));
  }

  for (const addition of additions) {
    lines.push(colorize(`+ ${addition}`, 'green'));
  }

  return lines.join('\n');
}

/**
 * Key-value formatting
 */
export function keyValue(data: Record<string, any>, separator: string = ':'): string {
  const maxKeyLength = Math.max(...Object.keys(data).map(k => k.length));

  return Object.entries(data)
    .map(([key, value]) => {
      const paddedKey = key.padEnd(maxKeyLength);
      const coloredKey = colorize(paddedKey, 'cyan');
      return `${coloredKey}${separator} ${value}`;
    })
    .join('\n');
}
