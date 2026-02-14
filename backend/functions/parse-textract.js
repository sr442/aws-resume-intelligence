const AWS = require('aws-sdk');
const textract = new AWS.Textract();
const s3 = new AWS.S3();

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event));

    const jobId = event.JobId; // Passed from Step Function
    // Or if using Sync, event might contain the blocks directly if mocked, but for Async we use JobId

    let paginationToken = null;
    let finished = false;
    let allBlocks = [];

    // 1. Get all blocks from Textract
    while (!finished) {
        const params = {
            JobId: jobId,
            NextToken: paginationToken
        };

        const response = await textract.getDocumentAnalysis(params).promise();
        allBlocks.push(...response.Blocks);

        if (response.NextToken) {
            paginationToken = response.NextToken;
        } else {
            finished = true;
        }
    }

    // 2. Extract Text
    const rawText = allBlocks
        .filter(b => b.BlockType === 'LINE')
        .map(b => b.Text)
        .join('\n');

    console.log('Extracted lines:', rawText.split('\n').length);

    // 3. Simple Entity Extraction (Regex/Heuristic)
    // In a real app, use Amazon Comprehend or a dedicated ML model
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/;
    const phoneRegex = /(\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/;

    const emailMatch = rawText.match(emailRegex);
    const phoneMatch = rawText.match(phoneRegex);

    const email = emailMatch ? emailMatch[0] : null;
    const phone = phoneMatch ? phoneMatch[0] : null;

    // Heuristic for name: First line or check lines with 2-3 words
    const name = rawText.split('\n')[0].trim();

    // 4. Save full JSON to S3 (Processed Bucket)
    const processedBucket = process.env.PROCESSED_BUCKET;
    const objectKey = `parsed/${jobId}.json`;

    await s3.putObject({
        Bucket: processedBucket,
        Key: objectKey,
        Body: JSON.stringify({ rawText, allBlocks, extracted: { name, email, phone } }),
        ContentType: 'application/json'
    }).promise();

    return {
        jobId,
        extractedData: {
            name,
            email,
            phone,
            rawTextSummary: rawText.substring(0, 1000) // Truncate for Step Function
        },
        s3Location: {
            bucket: processedBucket,
            key: objectKey
        }
    };
};
