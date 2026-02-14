exports.handler = async (event) => {
    // event is the output from parse-textract
    const extracted = event.extractedData;
    const text = extracted.rawTextSummary.toLowerCase();

    // Mock Scoring Logic
    // In reality, this would query a Job Description or use a Model

    const keywords = ['aws', 'cloud', 'python', 'javascript', 'react', 'node', 'cdk', 'lambda'];
    let score = 0;
    let matches = [];

    keywords.forEach(kw => {
        if (text.includes(kw)) {
            score += 10;
            matches.push(kw);
        }
    });

    // Cap score at 100
    score = Math.min(score, 100);

    // Base score for contact info
    if (extracted.email) score += 10;
    if (extracted.phone) score += 5;

    return {
        ...event,
        score,
        matchedKeywords: matches
    };
};
