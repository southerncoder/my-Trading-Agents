declare module 'ml-cross-validation' {
  export class CrossValidation {
    constructor(method: string, options?: any);
    train(cv: number, x: number[][], y: number[]): any;
    test(cv: number, x: number[][], y: number[]): any;
    predict(cv: number, x: number[][]): number[];
    score(cv: number, x: number[][], y: number[]): number;
  }

  export function crossValidation(
    regressor: any,
    x: number[][],
    y: number[],
    options?: {
      nfolds?: number;
      randomState?: number;
    }
  ): {
    trainScore: number;
    testScore: number;
    trainScores: number[];
    testScores: number[];
  };
}