declare module 'ml-regression' {
  export class SimpleLinearRegression {
    constructor(x: number[], y: number[]);
    predict(x: number): number;
    slope: number;
    intercept: number;
    toString(): string;
    toLaTeX(): string;
  }

  export class PolynomialRegression {
    constructor(x: number[], y: number[], degree: number);
    predict(x: number): number;
    coefficients: number[];
    toString(): string;
    toLaTeX(): string;
  }
} 