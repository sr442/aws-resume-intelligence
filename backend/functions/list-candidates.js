const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    const tableName = process.env.CANDIDATES_TABLE;

    try {
        const data = await docClient.scan({
            TableName: tableName
        }).promise();

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(data.Items)
        };
    } catch (err) {
        console.error('Error scanning table:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' })
        };
    }
};
