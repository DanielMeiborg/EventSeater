/* Initially copied from https://github.com/s-soltys/genetic-optimization and modified under the following license:

MIT License

Copyright (c) 2017 Szymon Soltysiak

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
// import * as logger from "firebase-functions/logger";
import * as _ from "lodash";

export class Optimizer<P> {
    constructor(private config: Config<P>) {

    }

    findOptimal(population: P[]) {
        let newPopulation = population;
        let optimal: EvaluatedInput<P> = { input: newPopulation[0], score: Number.NEGATIVE_INFINITY };
        let generation = 0;

        let generationScores = [] as number[];

        let endCondition = false;

        while (!endCondition) {
            generation++;
            let results = newPopulation.map(input => {
                const score = this.config.evaluate(input);
                return ({ input, score: score })
            });

            const best = results.sort((a, b) => b.score - a.score)[0];
            generationScores.push(best.score);
            if (best.score > optimal.score) {
                console.log("NEW OPTIMAL: generation:", generation, "new optimal:", best.score);
                optimal = best;
            }

            endCondition = this.config.endCondition(optimal.input, optimal.score, generation);
            if (endCondition) {
                break;
            }

            newPopulation = this.getNextGeneration(results);
        }
        console.log("generationScores: ", generationScores);
        return optimal;
    }
    // TODO: swap peer groups?

    private getNextGeneration(previousGeneration: EvaluatedInput<P>[]): P[] {
        const fittestCandidates = previousGeneration.sort((a, b) => b.score - a.score).slice(0, Math.max(2, Math.ceil(previousGeneration.length / this.config.selectionStrength)));
        let nextGeneration = [] as P[];
        fittestCandidates.forEach((inputA, index) => {
            if (nextGeneration.length >= previousGeneration.length) {
                return;
            }
            nextGeneration.push(inputA.input);
            for (let i = 0; i < this.config.selectionStrength; i++) {
                {
                    const copy = _.cloneDeep(inputA.input);
                    let mutation = this.config.mutate(copy);
                    if (Math.random() > 0.3) {
                        mutation = this.config.mutate(mutation);
                        if (Math.random() > 0.5) {
                            mutation = this.config.mutate(mutation);
                        }
                    }
                    nextGeneration.push(mutation);
                }
            }
        });
        return nextGeneration;
    }
}

export interface EvaluatedInput<P> {
    input: P;
    score: number;
}

export interface Config<P> {
    endCondition: (currentOptimalInput: P, score: number, generation: number) => boolean;
    evaluate: (input: P) => number;
    mutate: (input: P) => P;
    selectionStrength: number;
}