const AWS = require('aws-sdk');
const textract = new AWS.Textract();

exports.handler = async (event) => {
    const jobId = event.JobId;

    const params = {
        JobId: jobId,
        MaxResults: 1 // We only need the status
    };

    try {
        const data = await textract.getDocumentAnalysis(params).promise();
        return {
            JobId: jobId,
            Status: data.JobStatus
        };
    } catch (err) {
        console.error('Error checking status:', err);
        throw err;
    }
};
