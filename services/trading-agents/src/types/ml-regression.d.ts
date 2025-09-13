declare module 'ml-regression' {
  export class SimpleLinearRegression {
    constructor(x: number[], y: number[]);
    predict(x: number): number;
    score(): number;
    toString(): string;
    static load(model: any): SimpleLinearRegression;
  }

  export class PolynomialRegression {
    constructor(x: number[], y: number[], degree?: number);
    predict(x: number): number;
    score(): number;
    toString(): string;
  }

  export class MultivariableLinearRegression {
    constructor(x: number[][], y: number[]);
    predict(x: number[]): number;
    score(): number;
    toString(): string;
  }
}