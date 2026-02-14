const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    // event contains all data including score
    const { jobId, extractedData, s3Location, score, matchedKeywords } = event;

    const candidateId = extractedData.email || `unknown-${jobId}`;

    const item = {
        candidateId: candidateId,
        jobId: jobId, // Using JobId from textract as a proxy or generated ID
        name: extractedData.name,
        email: extractedData.email,
        phone: extractedData.phone,
        score: score,
        skills: matchedKeywords,
        s3ProcessedUrl: `s3://${s3Location.bucket}/${s3Location.key}`,
        createdAt: new Date().toISOString(),
        status: 'PROCESSED'
    };

    await docClient.put({
        TableName: process.env.CANDIDATES_TABLE,
        Item: item
    }).promise();

    return {
        status: 'Success',
        candidateId
    };
};
