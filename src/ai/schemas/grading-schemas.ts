import { z } from 'zod';

export const gradeCardDetailsSchema = z.object({
    overallGrade: z.number().min(1).max(10).describe('Overall grade from 1-10 (10 being gem mint)'),
    condition: z.string().describe('Condition string: Gem Mint, Mint, Near Mint, Excellent, Good, Fair, or Poor'),

    // Front Analysis
    frontAnalysis: z.object({
        corners: z.object({
            score: z.number().min(1).max(10).describe('Corner quality score 1-10'),
            topLeft: z.string().describe('Top left corner condition'),
            topRight: z.string().describe('Top right corner condition'),
            bottomLeft: z.string().describe('Bottom left corner condition'),
            bottomRight: z.string().describe('Bottom right corner condition'),
            notes: z.string().describe('Overall corner notes'),
        }),
        centering: z.object({
            score: z.number().min(1).max(10).describe('Centering quality score 1-10'),
            leftRight: z.string().describe('Left-right centering ratio (e.g., 55/45, 50/50)'),
            topBottom: z.string().describe('Top-bottom centering ratio'),
            notes: z.string().describe('Centering analysis notes'),
        }),
        edges: z.object({
            score: z.number().min(1).max(10).describe('Edge quality score 1-10'),
            top: z.string().describe('Top edge condition'),
            right: z.string().describe('Right edge condition'),
            bottom: z.string().describe('Bottom edge condition'),
            left: z.string().describe('Left edge condition'),
            notes: z.string().describe('Edge wear/whitening notes'),
        }),
        surface: z.object({
            score: z.number().min(1).max(10).describe('Surface quality score 1-10'),
            scratches: z.boolean().describe('Presence of scratches'),
            printLines: z.boolean().describe('Presence of print lines'),
            notes: z.string().describe('Surface condition notes'),
        }),
    }),

    // Back Analysis
    backAnalysis: z.object({
        corners: z.object({
            score: z.number().min(1).max(10).describe('Corner quality score 1-10'),
            notes: z.string().describe('Back corner condition notes'),
        }),
        centering: z.object({
            score: z.number().min(1).max(10).describe('Centering quality score 1-10'),
            notes: z.string().describe('Back centering notes'),
        }),
        edges: z.object({
            score: z.number().min(1).max(10).describe('Edge quality score 1-10'),
            notes: z.string().describe('Back edge condition notes'),
        }),
        surface: z.object({
            score: z.number().min(1).max(10).describe('Surface quality score 1-10'),
            notes: z.string().describe('Back surface condition notes'),
        }),
    }),

    // Overall Assessment
    strengths: z.array(z.string()).describe('List of card strengths'),
    weaknesses: z.array(z.string()).describe('List of card weaknesses/flaws'),
    recommendations: z.string().describe('Grading recommendations and selling advice'),
    estimatedValue: z.object({
        min: z.number().describe('Minimum estimated value in AUD'),
        max: z.number().describe('Maximum estimated value in AUD'),
        notes: z.string().describe('Value estimation notes'),
    }),
});

export type GradeCardDetailsOutput = z.infer<typeof gradeCardDetailsSchema>;
