const AWS = require('aws-sdk');
const stepfunctions = new AWS.StepFunctions();

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event));

    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));

    const params = {
        stateMachineArn: process.env.STATE_MACHINE_ARN, // Defined in CDK
        input: JSON.stringify({
            bucket,
            key
        }),
        name: `Exec-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
    };

    try {
        const data = await stepfunctions.startExecution(params).promise();
        console.log('Started execution:', data.executionArn);
        return { statusCode: 200, body: 'Success' };
    } catch (err) {
        console.error('Error starting execution:', err);
        throw err;
    }
};
