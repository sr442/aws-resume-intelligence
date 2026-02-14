const AWS = require('aws-sdk');
const s3 = new AWS.S3();

exports.handler = async (event) => {
    const bucket = process.env.BUCKET_NAME;
    const key = `uploads/${Date.now()}-${Math.random().toString(36).substring(2, 10)}.pdf`;

    const params = {
        Bucket: bucket,
        Key: key,
        Expires: 300, // 5 minutes
        ContentType: 'application/pdf'
    };

    try {
        const url = await s3.getSignedUrlPromise('putObject', params);
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
            body: JSON.stringify({ uploadUrl: url, key: key })
        };
    } catch (err) {
        console.error('Error generating signed URL:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' })
        };
    }
};
