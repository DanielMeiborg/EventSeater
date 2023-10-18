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

export class Optimizer<P> {
    constructor(private config: Config<P>) {

    }

    findOptimal(population: P[]) {
        let newPopulation = population;
        let optimal: EvaluatedInput<P> = { input: newPopulation[0], score: Number.NEGATIVE_INFINITY };
        let generation = 0;

        let numCrossoverImprovements = 0;
        let numMutationImprovements = 0;
        let generationScores = [] as number[];

        while (!this.config.endCondition(optimal.input, optimal.score, generation++)) {
            let results = newPopulation.map(input => {
                const score = this.config.evaluate(input);
                return ({ input, score: score })
            });

            generationScores.push(results.map(input => input.score).sort((a, b) => b - a)[0]);

            results.forEach(current => {
                if (current.score > optimal.score) {
                    console.log("IMPROVING OPTIMAL: generation:", generation, "new optimal:", current.score, current.input);
                    optimal = current;
                }
            });

            const bestBeforeCrossover = optimal.score;
            newPopulation = this.crossover(results);
            const bestAfterCrossover = newPopulation.map(input => this.config.evaluate(input)).reduce((a, b) => Math.max(a, b), Number.NEGATIVE_INFINITY);
            if (bestAfterCrossover > bestBeforeCrossover) {
                numCrossoverImprovements++;
            }

            const bestBeforeMutation = bestAfterCrossover;
            newPopulation = newPopulation.map((input: P) => {
                if (Math.random() < this.config.mutationChance) {
                    return this.config.mutate(input);
                }
                return input;
            });
            const bestAfterMutation = newPopulation.map(input => this.config.evaluate(input)).reduce((a, b) => Math.max(a, b), Number.NEGATIVE_INFINITY);
            if (bestAfterMutation > bestBeforeMutation) {
                numMutationImprovements++;
            }
        }
        console.log("final optimal: ", optimal);
        console.log("numCrossoverImprovements: ", numCrossoverImprovements);
        console.log("numMutationImprovements: ", numMutationImprovements);
        console.log("generationScores: ", generationScores);
        return optimal;
    }

    private crossover(previousGeneration: EvaluatedInput<P>[]): P[] {
        const fittestCandidates = previousGeneration.sort((a, b) => b.score - a.score).slice(0, Math.max(2, Math.ceil(previousGeneration.length / this.config.selectionStrength)));
        let nextGeneration = [] as P[];
        fittestCandidates.forEach((inputA, index) => {
            let inputB = fittestCandidates[Math.floor(Math.random() * fittestCandidates.length)];
            while (inputA === inputB) {
                inputB = fittestCandidates[Math.floor(Math.random() * fittestCandidates.length)];
            }
            for (let i = 0; i < this.config.selectionStrength; i++) {
                nextGeneration.push(this.config.crossover(inputA.input, inputB.input));
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
    crossover: (inputA: P, inputB: P) => P;
    evaluate: (input: P) => number;
    mutate: (input: P) => P;
    selectionStrength: number;
    mutationChance: number;
}