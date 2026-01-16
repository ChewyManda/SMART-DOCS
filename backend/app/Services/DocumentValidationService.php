<?php

namespace App\Services;

use App\Models\Document;
use App\Models\DocumentFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DocumentValidationService
{
    /**
     * Validate a document against existing database records
     *
     * @param Document $document The document to validate
     * @param array $options Validation options
     * @return array Validation results
     */
    public function validate(Document $document, array $options = []): array
    {
        $results = [
            'is_valid' => true,
            'confidence' => 100,
            'checks' => [],
            'duplicates' => [],
            'warnings' => [],
            'errors' => [],
        ];

        // Load document with files and OCR text
        $document->load('files');

        // Combine OCR text from all files
        $combinedOcrText = $document->files->pluck('ocr_text')
            ->filter()
            ->implode("\n");

        // 1. Check for duplicate documents by title
        $duplicateByTitle = $this->checkDuplicateByTitle($document);
        if ($duplicateByTitle) {
            $results['checks'][] = [
                'type' => 'duplicate_title',
                'status' => 'warning',
                'message' => 'Document with similar title found',
                'matches' => $duplicateByTitle,
            ];
            $results['duplicates'] = array_merge($results['duplicates'], $duplicateByTitle);
            $results['warnings'][] = 'Similar document titles found in database';
            $results['confidence'] = min($results['confidence'], 80);
        }

        // 2. Check for duplicate documents by OCR text similarity
        if (!empty($combinedOcrText)) {
            $duplicateByOcr = $this->checkDuplicateByOcrText($document, $combinedOcrText);
            if ($duplicateByOcr) {
                $results['checks'][] = [
                    'type' => 'duplicate_ocr',
                    'status' => 'warning',
                    'message' => 'Document with similar OCR text found',
                    'matches' => $duplicateByOcr,
                ];
                $results['duplicates'] = array_merge($results['duplicates'], $duplicateByOcr);
                $results['warnings'][] = 'Similar OCR content found in existing documents';
                $results['confidence'] = min($results['confidence'], 70);
            }
        }

        // 3. Check for duplicate document_id (should not happen, but validate)
        $duplicateById = $this->checkDuplicateByDocumentId($document);
        if ($duplicateById) {
            $results['checks'][] = [
                'type' => 'duplicate_document_id',
                'status' => 'error',
                'message' => 'Document ID already exists',
                'matches' => $duplicateById,
            ];
            $results['duplicates'] = array_merge($results['duplicates'], $duplicateById);
            $results['errors'][] = 'Document ID already exists in database';
            $results['is_valid'] = false;
            $results['confidence'] = 0;
        }

        // 4. Validate OCR text quality
        if (!empty($combinedOcrText)) {
            $ocrQuality = $this->validateOcrQuality($combinedOcrText);
            $results['checks'][] = [
                'type' => 'ocr_quality',
                'status' => $ocrQuality['status'],
                'message' => $ocrQuality['message'],
                'score' => $ocrQuality['score'],
            ];
            if ($ocrQuality['status'] === 'warning') {
                $results['warnings'][] = $ocrQuality['message'];
                $results['confidence'] = min($results['confidence'], $ocrQuality['score']);
            }
        } else {
            $results['checks'][] = [
                'type' => 'ocr_quality',
                'status' => 'warning',
                'message' => 'No OCR text extracted from document',
                'score' => 50,
            ];
            $results['warnings'][] = 'No OCR text available for validation';
            $results['confidence'] = min($results['confidence'], 50);
        }

        // 5. Validate document classification consistency
        if ($document->classification) {
            $classificationCheck = $this->validateClassification($document, $combinedOcrText);
            $results['checks'][] = [
                'type' => 'classification_consistency',
                'status' => $classificationCheck['status'],
                'message' => $classificationCheck['message'],
                'expected' => $classificationCheck['expected'],
                'actual' => $document->classification,
            ];
            if ($classificationCheck['status'] === 'warning') {
                $results['warnings'][] = $classificationCheck['message'];
                $results['confidence'] = min($results['confidence'], 85);
            }
        }

        // 6. Check for similar documents by metadata
        $similarByMetadata = $this->checkSimilarByMetadata($document);
        if ($similarByMetadata) {
            $results['checks'][] = [
                'type' => 'similar_metadata',
                'status' => 'info',
                'message' => 'Similar documents found by metadata',
                'matches' => $similarByMetadata,
            ];
        }

        // 7. Validate document structure (has files, proper format, etc.)
        $structureCheck = $this->validateDocumentStructure($document);
        $results['checks'][] = [
            'type' => 'document_structure',
            'status' => $structureCheck['status'],
            'message' => $structureCheck['message'],
        ];
        if ($structureCheck['status'] === 'error') {
            $results['errors'][] = $structureCheck['message'];
            $results['is_valid'] = false;
        }

        // Overall validation status
        if (!empty($results['errors'])) {
            $results['is_valid'] = false;
        }

        return $results;
    }

    /**
     * Check for duplicate documents by title
     *
     * @param Document $document
     * @return array|null
     */
    private function checkDuplicateByTitle(Document $document): ?array
    {
        $title = strtolower(trim($document->title));
        
        if (empty($title)) {
            return null;
        }
        
        // Find documents with similar titles (excluding current document)
        $similar = Document::where('id', '!=', $document->id)
            ->where(function ($query) use ($title) {
                $query->whereRaw('LOWER(TRIM(title)) = ?', [$title])
                    ->orWhereRaw('LOWER(TRIM(title)) LIKE ?', ['%' . $title . '%']);
            })
            ->limit(10)
            ->get(['id', 'title', 'document_id', 'paper_id', 'created_at', 'classification'])
            ->map(function ($doc) use ($title) {
                $similarity = $this->calculateSimilarity($title, strtolower($doc->title));
                return [
                    'id' => $doc->id,
                    'title' => $doc->title,
                    'document_id' => $doc->document_id,
                    'paper_id' => $doc->paper_id,
                    'similarity' => $similarity,
                    'created_at' => $doc->created_at->toIso8601String(),
                    'classification' => $doc->classification,
                ];
            })
            ->filter(function ($doc) {
                return $doc['similarity'] >= 80; // 80% similarity threshold
            })
            ->sortByDesc('similarity')
            ->values()
            ->toArray();

        return !empty($similar) ? $similar : null;
    }

    /**
     * Check for duplicate documents by OCR text similarity
     *
     * @param Document $document
     * @param string $ocrText
     * @return array|null
     */
    private function checkDuplicateByOcrText(Document $document, string $ocrText): ?array
    {
        // Get OCR text from other documents
        $otherDocuments = Document::where('id', '!=', $document->id)
            ->whereHas('files', function ($query) {
                $query->whereNotNull('ocr_text')
                    ->where('ocr_text', '!=', '');
            })
            ->with(['files' => function ($query) {
                $query->whereNotNull('ocr_text')
                    ->where('ocr_text', '!=', '');
            }])
            ->limit(50) // Limit for performance
            ->get();

        $matches = [];
        $ocrTextNormalized = $this->normalizeText($ocrText);

        foreach ($otherDocuments as $otherDoc) {
            $otherOcrText = $otherDoc->files->pluck('ocr_text')
                ->filter()
                ->implode("\n");
            
            if (empty($otherOcrText)) {
                continue;
            }

            $otherOcrTextNormalized = $this->normalizeText($otherOcrText);
            $similarity = $this->calculateTextSimilarity($ocrTextNormalized, $otherOcrTextNormalized);

            if ($similarity >= 70) { // 70% similarity threshold for OCR
                $matches[] = [
                    'id' => $otherDoc->id,
                    'title' => $otherDoc->title,
                    'document_id' => $otherDoc->document_id,
                    'paper_id' => $otherDoc->paper_id,
                    'similarity' => $similarity,
                    'created_at' => $otherDoc->created_at->toIso8601String(),
                    'classification' => $otherDoc->classification,
                ];
            }
        }

        // Sort by similarity and return top matches
        usort($matches, function ($a, $b) {
            return $b['similarity'] <=> $a['similarity'];
        });

        return !empty($matches) ? array_slice($matches, 0, 10) : null;
    }

    /**
     * Check for duplicate document_id
     *
     * @param Document $document
     * @return array|null
     */
    private function checkDuplicateByDocumentId(Document $document): ?array
    {
        $duplicate = Document::where('document_id', $document->document_id)
            ->where('id', '!=', $document->id)
            ->first();

        if ($duplicate) {
            return [[
                'id' => $duplicate->id,
                'title' => $duplicate->title,
                'document_id' => $duplicate->document_id,
                'paper_id' => $duplicate->paper_id,
                'created_at' => $duplicate->created_at->toIso8601String(),
            ]];
        }

        return null;
    }

    /**
     * Validate OCR text quality
     *
     * @param string $ocrText
     * @return array
     */
    private function validateOcrQuality(string $ocrText): array
    {
        $length = strlen($ocrText);
        $wordCount = str_word_count($ocrText);
        $charCount = strlen(preg_replace('/\s+/', '', $ocrText));

        // Check for minimum content
        if ($length < 50) {
            return [
                'status' => 'warning',
                'message' => 'OCR text is too short (less than 50 characters)',
                'score' => 40,
            ];
        }

        if ($wordCount < 10) {
            return [
                'status' => 'warning',
                'message' => 'OCR text contains too few words (less than 10)',
                'score' => 50,
            ];
        }

        // Check for excessive special characters (possible OCR errors)
        $specialCharRatio = (strlen($ocrText) - $charCount) / max($length, 1);
        if ($specialCharRatio > 0.5) {
            return [
                'status' => 'warning',
                'message' => 'OCR text contains excessive special characters',
                'score' => 60,
            ];
        }

        // Check for common OCR error patterns
        $errorPatterns = ['|', '||', '|||', '___', '???'];
        $errorCount = 0;
        foreach ($errorPatterns as $pattern) {
            $errorCount += substr_count($ocrText, $pattern);
        }

        if ($errorCount > 5) {
            return [
                'status' => 'warning',
                'message' => 'OCR text contains potential error patterns',
                'score' => 70,
            ];
        }

        return [
            'status' => 'success',
            'message' => 'OCR text quality is acceptable',
            'score' => 100,
        ];
    }

    /**
     * Validate classification consistency
     *
     * @param Document $document
     * @param string $ocrText
     * @return array
     */
    private function validateClassification(Document $document, string $ocrText): array
    {
        if (empty($ocrText)) {
            return [
                'status' => 'info',
                'message' => 'Cannot validate classification without OCR text',
                'expected' => null,
                'actual' => $document->classification,
            ];
        }

        $classificationService = new DocumentClassificationService();
        $expectedClassification = $classificationService->classify($document, $ocrText, 'rule-based');

        if ($expectedClassification['classification'] !== $document->classification) {
            return [
                'status' => 'warning',
                'message' => sprintf(
                    'Classification mismatch: expected %s (confidence: %s%%), got %s',
                    $expectedClassification['classification'],
                    $expectedClassification['confidence'],
                    $document->classification
                ),
                'expected' => $expectedClassification['classification'],
                'actual' => $document->classification,
            ];
        }

        return [
            'status' => 'success',
            'message' => 'Classification is consistent with OCR content',
            'expected' => $document->classification,
            'actual' => $document->classification,
        ];
    }

    /**
     * Check for similar documents by metadata
     *
     * @param Document $document
     * @return array|null
     */
    private function checkSimilarByMetadata(Document $document): ?array
    {
        $similar = Document::where('id', '!=', $document->id)
            ->where(function ($query) use ($document) {
                if ($document->classification) {
                    $query->where('classification', $document->classification);
                }
            })
            ->where('uploaded_by', $document->uploaded_by)
            ->whereDate('created_at', '>=', now()->subDays(30))
            ->limit(5)
            ->get(['id', 'title', 'document_id', 'paper_id', 'created_at', 'classification'])
            ->map(function ($doc) {
                return [
                    'id' => $doc->id,
                    'title' => $doc->title,
                    'document_id' => $doc->document_id,
                    'paper_id' => $doc->paper_id,
                    'created_at' => $doc->created_at->toIso8601String(),
                    'classification' => $doc->classification,
                ];
            })
            ->toArray();

        return !empty($similar) ? $similar : null;
    }

    /**
     * Validate document structure
     *
     * @param Document $document
     * @return array
     */
    private function validateDocumentStructure(Document $document): array
    {
        if ($document->files->isEmpty()) {
            return [
                'status' => 'error',
                'message' => 'Document has no files attached',
            ];
        }

        $hasOcrText = $document->files->contains(function ($file) {
            return !empty($file->ocr_text);
        });

        if (!$hasOcrText) {
            return [
                'status' => 'warning',
                'message' => 'Document has no OCR text extracted',
            ];
        }

        return [
            'status' => 'success',
            'message' => 'Document structure is valid',
        ];
    }

    /**
     * Calculate similarity between two strings (Levenshtein-based)
     *
     * @param string $str1
     * @param string $str2
     * @return float Similarity percentage (0-100)
     */
    private function calculateSimilarity(string $str1, string $str2): float
    {
        $str1 = strtolower(trim($str1));
        $str2 = strtolower(trim($str2));

        if ($str1 === $str2) {
            return 100;
        }

        $maxLen = max(strlen($str1), strlen($str2));
        if ($maxLen === 0) {
            return 100;
        }

        $distance = levenshtein($str1, $str2);
        $similarity = (1 - ($distance / $maxLen)) * 100;

        return round($similarity, 2);
    }

    /**
     * Calculate text similarity using multiple methods
     *
     * @param string $text1
     * @param string $text2
     * @return float Similarity percentage (0-100)
     */
    private function calculateTextSimilarity(string $text1, string $text2): float
    {
        // Normalize texts
        $text1 = $this->normalizeText($text1);
        $text2 = $this->normalizeText($text2);

        if (empty($text1) || empty($text2)) {
            return 0;
        }

        // Method 1: Jaccard similarity (word-based)
        $words1 = array_unique(str_word_count($text1, 1));
        $words2 = array_unique(str_word_count($text2, 1));
        
        $intersection = count(array_intersect($words1, $words2));
        $union = count(array_unique(array_merge($words1, $words2)));
        
        $jaccardSimilarity = $union > 0 ? ($intersection / $union) * 100 : 0;

        // Method 2: Longest common subsequence
        $lcsLength = $this->longestCommonSubsequence($text1, $text2);
        $maxLen = max(strlen($text1), strlen($text2));
        $lcsSimilarity = $maxLen > 0 ? ($lcsLength / $maxLen) * 100 : 0;

        // Combine both methods (weighted average)
        $similarity = ($jaccardSimilarity * 0.6) + ($lcsSimilarity * 0.4);

        return round($similarity, 2);
    }

    /**
     * Calculate longest common subsequence length
     *
     * @param string $str1
     * @param string $str2
     * @return int
     */
    private function longestCommonSubsequence(string $str1, string $str2): int
    {
        $m = strlen($str1);
        $n = strlen($str2);
        $dp = [];

        for ($i = 0; $i <= $m; $i++) {
            $dp[$i] = array_fill(0, $n + 1, 0);
        }

        for ($i = 1; $i <= $m; $i++) {
            for ($j = 1; $j <= $n; $j++) {
                if ($str1[$i - 1] === $str2[$j - 1]) {
                    $dp[$i][$j] = $dp[$i - 1][$j - 1] + 1;
                } else {
                    $dp[$i][$j] = max($dp[$i - 1][$j], $dp[$i][$j - 1]);
                }
            }
        }

        return $dp[$m][$n];
    }

    /**
     * Normalize text for comparison
     *
     * @param string $text
     * @return string
     */
    private function normalizeText(string $text): string
    {
        // Convert to lowercase
        $text = strtolower($text);
        
        // Remove extra whitespace
        $text = preg_replace('/\s+/', ' ', $text);
        
        // Remove special characters (keep alphanumeric and spaces)
        $text = preg_replace('/[^a-z0-9\s]/', '', $text);
        
        // Trim
        $text = trim($text);
        
        return $text;
    }

    /**
     * Get validation summary for a document
     *
     * @param Document $document
     * @return array
     */
    public function getValidationSummary(Document $document): array
    {
        $validation = $this->validate($document);
        
        return [
            'document_id' => $document->id,
            'document_title' => $document->title,
            'is_valid' => $validation['is_valid'],
            'confidence' => $validation['confidence'],
            'total_checks' => count($validation['checks']),
            'warnings_count' => count($validation['warnings']),
            'errors_count' => count($validation['errors']),
            'duplicates_count' => count($validation['duplicates']),
            'last_validated_at' => now()->toIso8601String(),
        ];
    }
}
