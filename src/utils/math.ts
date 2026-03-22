import * as math from 'mathjs';

export type Mode = 'Basic' | 'Scientific' | 'Matrix' | 'Statistics' | 'Converter' | 'Graph' | 'AI Assistant';

export interface HistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: number;
}

export const evaluateExpression = (expr: string, isDegree: boolean = true) => {
  try {
    if (!expr || expr.trim() === '') return '';
    
    // Custom scope for trig functions to handle Deg/Rad
    const scope = {
      sin: (x: any) => math.sin(isDegree ? math.unit(x, 'deg') : x),
      cos: (x: any) => math.cos(isDegree ? math.unit(x, 'deg') : x),
      tan: (x: any) => math.tan(isDegree ? math.unit(x, 'deg') : x),
      sec: (x: any) => math.sec(isDegree ? math.unit(x, 'deg') : x),
      csc: (x: any) => math.csc(isDegree ? math.unit(x, 'deg') : x),
      cosec: (x: any) => math.csc(isDegree ? math.unit(x, 'deg') : x),
      cot: (x: any) => math.cot(isDegree ? math.unit(x, 'deg') : x),
      asin: (x: any) => {
        const res = math.asin(x);
        return isDegree ? math.unit(res, 'rad').toNumber('deg') : res;
      },
      acos: (x: any) => {
        const res = math.acos(x);
        return isDegree ? math.unit(res, 'rad').toNumber('deg') : res;
      },
      atan: (x: any) => {
        const res = math.atan(x);
        return isDegree ? math.unit(res, 'rad').toNumber('deg') : res;
      },
      asec: (x: any) => {
        const res = math.asec(x);
        return isDegree ? math.unit(res, 'rad').toNumber('deg') : res;
      },
      acsc: (x: any) => {
        const res = math.acsc(x);
        return isDegree ? math.unit(res, 'rad').toNumber('deg') : res;
      },
      acot: (x: any) => {
        const res = math.acot(x);
        return isDegree ? math.unit(res, 'rad').toNumber('deg') : res;
      },
      log: (x: any) => math.log10(x),
      ln: (x: any) => math.log(x),
      abs: (x: any) => math.abs(x),
      sqrt: (x: any) => math.sqrt(x),
      cbrt: (x: any) => math.cbrt(x),
      fact: (n: number) => math.factorial(n),
      Pol: (x: number, y: number) => {
        const r = Math.hypot(x, y);
        let theta = Math.atan2(y, x);
        if (isDegree) theta = theta * (180 / Math.PI);
        return `r = ${math.format(r, { precision: 6 })}, θ = ${math.format(theta, { precision: 6 })}${isDegree ? '°' : ' rad'}`;
      },
      Rec: (r: number, theta: number) => {
        let t = theta;
        if (isDegree) t = t * (Math.PI / 180);
        const x = r * Math.cos(t);
        const y = r * Math.sin(t);
        return `x = ${math.format(x, { precision: 6 })}, y = ${math.format(y, { precision: 6 })}`;
      },
      pi: math.pi,
      e: math.e,
      i: math.i,
      c: 299792458,
      h: 6.62607015e-34,
      eps0: 8.8541878128e-12,
    };

    // Pre-process expression for common notations
    let processedExpr = expr
      .replace(/π/g, 'pi')
      .replace(/√/g, 'sqrt')
      .replace(/∛/g, 'cbrt')
      .replace(/\|([^|]+)\|/g, 'abs($1)')
      .replace(/(\d+)!/g, 'fact($1)')
      .replace(/ε₀/g, 'eps0')
      .replace(/([\d.]+)\s*∠\s*([\d.]+)/g, isDegree ? '($1 * e^(i * $2 * pi / 180))' : '($1 * e^(i * $2))')
      .replace(/×/g, '*')
      .replace(/÷/g, '/');

    const result = math.evaluate(processedExpr, scope);
    
    if (result === undefined || result === null) return '';
    if (typeof result === 'function') return 'Invalid';
    if (typeof result === 'string') return result;
    
    return math.format(result, { precision: 14 }).toString();
  } catch (error: any) {
    if (error.message?.includes('Undefined symbol')) {
      return `Unknown: ${error.message.split(' ').pop()}`;
    }
    return 'Syntax Error';
  }
};

export const matrixOperations = {
  determinant: (m: number[][]) => math.det(m),
  inverse: (m: number[][]) => math.inv(m),
  transpose: (m: number[][]) => math.transpose(m),
  multiply: (a: number[][], b: number[][]) => math.multiply(a, b),
  add: (a: number[][], b: number[][]) => math.add(a, b),
  subtract: (a: number[][], b: number[][]) => math.subtract(a, b),
};

export const statsOperations = {
  mean: (data: number[]) => math.mean(data),
  median: (data: number[]) => math.median(data),
  mode: (data: number[]) => {
    const res = math.mode(data);
    return Array.isArray(res) ? res.join(', ') : res;
  },
  variance: (data: number[]) => math.variance(data),
  stdDev: (data: number[]) => math.std(data),
  factorial: (n: number) => math.factorial(n),
  nPr: (n: number, r: number) => {
    if (n < r) throw new Error('n must be >= r');
    return math.factorial(n) / math.factorial(n - r);
  },
  nCr: (n: number, r: number) => math.combinations(n, r),
};

// Advanced Engineering Converter Logic
export const engineeringConverter = {
  convert: (val: number, from: string, to: string, category: string) => {
    try {
      if (category === 'Number Systems') {
        const decimal = parseInt(val.toString(), from === 'bin' ? 2 : from === 'hex' ? 16 : from === 'oct' ? 8 : 10);
        if (isNaN(decimal)) return null;
        
        if (to === 'bin') return decimal.toString(2);
        if (to === 'hex') return decimal.toString(16).toUpperCase();
        if (to === 'oct') return decimal.toString(8);
        if (to === 'gray') {
          const gray = (decimal ^ (decimal >> 1));
          return gray.toString(2);
        }
        return decimal.toString();
      }

      if (category === 'Gray to Binary') {
        let gray = parseInt(val.toString(), 2);
        let bin = 0;
        for (; gray; gray >>= 1) bin ^= gray;
        return bin.toString(2);
      }

      // Standard units using mathjs
      return math.unit(val, from).toNumber(to);
    } catch (e) {
      console.error('Conversion error:', e);
      return null;
    }
  }
};
