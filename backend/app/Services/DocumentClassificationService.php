<?php

namespace App\Services;

use App\Models\Document;

class DocumentClassificationService
{
    /**
     * Classification keywords and patterns for rule-based classification
     */
    private const CLASSIFICATION_RULES = [
        'invoice' => [
            'keywords' => [
                'invoice', 'billing', 'payment due', 'amount due', 'total amount',
                'invoice number', 'invoice date', 'bill to', 'ship to', 'subtotal',
                'tax', 'grand total', 'payment terms', 'due date', 'invoice #',
                'invoice no', 'bill', 'statement', 'receipt', 'payment'
            ],
            'patterns' => [
                '/invoice\s*(?:#|no|number)?\s*:?\s*[\w-]+/i',
                '/total\s+(?:amount|due|payable)/i',
                '/payment\s+due/i',
                '/bill\s+to/i',
            ]
        ],
        'contract' => [
            'keywords' => [
                'contract', 'agreement', 'terms and conditions', 'party a', 'party b',
                'effective date', 'expiration date', 'signature', 'witness', 'notary',
                'legal', 'binding', 'clause', 'section', 'whereas', 'therefore',
                'lease', 'license', 'nda', 'non-disclosure', 'mou', 'memorandum',
                'service agreement', 'employment contract', 'purchase agreement'
            ],
            'patterns' => [
                '/contract\s+(?:#|no|number)?\s*:?\s*[\w-]+/i',
                '/agreement\s+(?:dated|effective)/i',
                '/party\s+[ab]/i',
                '/effective\s+date/i',
            ]
        ],
        'report' => [
            'keywords' => [
                'report', 'analysis', 'summary', 'findings', 'conclusion',
                'recommendations', 'executive summary', 'overview', 'status report',
                'progress report', 'monthly report', 'quarterly report', 'annual report',
                'audit report', 'financial report', 'performance report', 'dashboard',
                'metrics', 'statistics', 'data analysis', 'results'
            ],
            'patterns' => [
                '/report\s+(?:dated|for|period)/i',
                '/executive\s+summary/i',
                '/status\s+report/i',
                '/monthly|quarterly|annual\s+report/i',
            ]
        ],
        'form' => [
            'keywords' => [
                'form', 'application', 'request', 'submission', 'fill out',
                'please complete', 'required fields', 'signature required',
                'date of birth', 'social security', 'application form',
                'registration form', 'enrollment form', 'application #',
                'form number', 'form id', 'submit', 'applicant', 'respondent'
            ],
            'patterns' => [
                '/form\s+(?:#|no|number)?\s*:?\s*[\w-]+/i',
                '/application\s+form/i',
                '/please\s+(?:complete|fill|provide)/i',
                '/required\s+fields/i',
            ]
        ],
    ];

    /**
     * Classify a document using rule-based approach
     *
     * @param Document $document
     * @param string|null $ocrText
     * @return array ['classification' => string, 'confidence' => float, 'method' => string]
     */
    public function classifyByRules(Document $document, ?string $ocrText = null): array
    {
        // Combine title, description, and OCR text for analysis
        $textToAnalyze = strtolower(
            ($document->title ?? '') . ' ' .
            ($document->description ?? '') . ' ' .
            ($ocrText ?? '')
        );

        $scores = [];
        
        foreach (self::CLASSIFICATION_RULES as $type => $rules) {
            $score = 0;
            
            // Check keywords
            foreach ($rules['keywords'] as $keyword) {
                $count = substr_count($textToAnalyze, strtolower($keyword));
                $score += $count * 2; // Keywords are weighted more
            }
            
            // Check patterns
            foreach ($rules['patterns'] as $pattern) {
                if (preg_match($pattern, $textToAnalyze)) {
                    $score += 5; // Patterns are weighted heavily
                }
            }
            
            $scores[$type] = $score;
        }

        // Get the classification with highest score
        arsort($scores);
        $topClassification = array_key_first($scores);
        $topScore = $scores[$topClassification] ?? 0;
        
        // Calculate confidence (0-100)
        $totalScore = array_sum($scores);
        $confidence = $totalScore > 0 
            ? min(100, round(($topScore / max($totalScore, 1)) * 100, 2))
            : 0;

        // If confidence is too low or no clear match, classify as 'other'
        if ($confidence < 30 || $topScore === 0) {
            return [
                'classification' => 'other',
                'confidence' => 0,
                'method' => 'rule-based'
            ];
        }

        return [
            'classification' => $topClassification,
            'confidence' => $confidence,
            'method' => 'rule-based'
        ];
    }

    /**
     * Classify a document using AI (placeholder for future ML integration)
     *
     * @param Document $document
     * @param string|null $ocrText
     * @return array ['classification' => string, 'confidence' => float, 'method' => string]
     */
    public function classifyByAI(Document $document, ?string $ocrText = null): array
    {
        // TODO: Integrate with ML model or external AI service
        // For now, fallback to rule-based classification
        return $this->classifyByRules($document, $ocrText);
    }

    /**
     * Auto-classify a document
     * Tries AI first, falls back to rule-based
     *
     * @param Document $document
     * @param string|null $ocrText
     * @param string $method 'auto', 'rule-based', 'ai'
     * @return array
     */
    public function classify(Document $document, ?string $ocrText = null, string $method = 'auto'): array
    {
        if ($method === 'ai') {
            return $this->classifyByAI($document, $ocrText);
        } elseif ($method === 'rule-based') {
            return $this->classifyByRules($document, $ocrText);
        } else {
            // Auto: try AI first, fallback to rules
            try {
                $result = $this->classifyByAI($document, $ocrText);
                if ($result['confidence'] > 50) {
                    return $result;
                }
            } catch (\Exception $e) {
                \Log::warning('AI classification failed, using rule-based: ' . $e->getMessage());
            }
            
            return $this->classifyByRules($document, $ocrText);
        }
    }

    /**
     * Get all available classification types
     *
     * @return array
     */
    public static function getAvailableClassifications(): array
    {
        return ['invoice', 'contract', 'report', 'form', 'other'];
    }

    /**
     * Get classification rules for a specific type
     *
     * @param string $type
     * @return array|null
     */
    public static function getRulesForType(string $type): ?array
    {
        return self::CLASSIFICATION_RULES[$type] ?? null;
    }
}
