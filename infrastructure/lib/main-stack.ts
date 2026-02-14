import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as glue from 'aws-cdk-lib/aws-glue';
import * as athena from 'aws-cdk-lib/aws-athena';

export class MainStack extends cdk.Stack {
    public readonly resumesBucket: s3.Bucket;
    public readonly processedDataBucket: s3.Bucket;
    public readonly candidatesTable: dynamodb.Table;
    public readonly uploadApiUrl: string;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // ==========================================
        // 1. STORAGE (S3 & DynamoDB)
        // ==========================================

        // S3 Bucket for Raw Resumes
        this.resumesBucket = new s3.Bucket(this, 'ResumesBucket', {
            versioned: true,
            encryption: s3.BucketEncryption.S3_MANAGED,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            cors: [
                {
                    allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.POST, s3.HttpMethods.GET],
                    allowedOrigins: ['*'],
                    allowedHeaders: ['*'],
                },
            ],
        });

        // S3 Bucket for Processed Data
        this.processedDataBucket = new s3.Bucket(this, 'ProcessedDataBucket', {
            encryption: s3.BucketEncryption.S3_MANAGED,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });

        // DynamoDB Table for Candidates
        this.candidatesTable = new dynamodb.Table(this, 'CandidatesTable', {
            partitionKey: { name: 'candidateId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
        });

        // DynamoDB Table for Jobs
        const jobsTable = new dynamodb.Table(this, 'JobsTable', {
            partitionKey: { name: 'jobId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // ==========================================
        // 2. PROCESSING (Lambda & Step Functions)
        // ==========================================

        // Roles
        const textractRole = new iam.Role(this, 'TextractRole', {
            assumedBy: new iam.ServicePrincipal('textract.amazonaws.com'),
        });
        this.resumesBucket.grantRead(textractRole); // Grant Textract access to Input bucket

        // Lambda Functions
        const checkStatusLambda = new lambda.Function(this, 'CheckStatusLambda', {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'check-textract-status.handler',
            code: lambda.Code.fromAsset('../backend/functions'),
        });
        checkStatusLambda.addToRolePolicy(new iam.PolicyStatement({
            actions: ['textract:GetDocumentAnalysis'],
            resources: ['*'],
        }));

        const parseTextractLambda = new lambda.Function(this, 'ParseTextractLambda', {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'parse-textract.handler',
            code: lambda.Code.fromAsset('../backend/functions'),
            environment: {
                PROCESSED_BUCKET: this.processedDataBucket.bucketName,
            },
            timeout: cdk.Duration.seconds(60),
        });
        this.processedDataBucket.grantWrite(parseTextractLambda);
        parseTextractLambda.addToRolePolicy(new iam.PolicyStatement({
            actions: ['textract:GetDocumentAnalysis'],
            resources: ['*'],
        }));

        const calculateScoreLambda = new lambda.Function(this, 'CalculateScoreLambda', {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'calculate-score.handler',
            code: lambda.Code.fromAsset('../backend/functions'),
        });

        const saveCandidateLambda = new lambda.Function(this, 'SaveCandidateLambda', {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'save-candidate.handler',
            code: lambda.Code.fromAsset('../backend/functions'),
            environment: {
                CANDIDATES_TABLE: this.candidatesTable.tableName,
            },
        });
        this.candidatesTable.grantWriteData(saveCandidateLambda);

        // Step Functions Workflow
        const startTextractTask = new tasks.CallAwsService(this, 'StartTextract', {
            service: 'textract',
            action: 'startDocumentAnalysis',
            parameters: {
                DocumentLocation: {
                    S3Object: {
                        Bucket: sfn.JsonPath.stringAt('$.bucket'),
                        Name: sfn.JsonPath.stringAt('$.key'),
                    },
                },
                FeatureTypes: ['TABLES', 'FORMS'],
            },
            iamResources: ['*'],
            resultPath: '$.textractResult',
        });

        const waitTask = new sfn.Wait(this, 'Wait5Seconds', {
            time: sfn.WaitTime.duration(cdk.Duration.seconds(5)),
        });

        const checkStatusTask = new tasks.LambdaInvoke(this, 'CheckStatus', {
            lambdaFunction: checkStatusLambda,
            payload: sfn.TaskInput.fromObject({
                JobId: sfn.JsonPath.stringAt('$.textractResult.JobId'),
            }),
            resultPath: '$.statusResult',
        });

        const parseTask = new tasks.LambdaInvoke(this, 'ParseResults', {
            lambdaFunction: parseTextractLambda,
            payload: sfn.TaskInput.fromObject({
                JobId: sfn.JsonPath.stringAt('$.textractResult.JobId'),
            }),
            resultPath: '$.parsedResult',
        });

        const scoreTask = new tasks.LambdaInvoke(this, 'CalculateScore', {
            lambdaFunction: calculateScoreLambda,
            payload: sfn.TaskInput.fromJsonPathAt('$.parsedResult.Payload'),
            resultPath: '$.scoreResult',
        });

        const saveTask = new tasks.LambdaInvoke(this, 'SaveCandidate', {
            lambdaFunction: saveCandidateLambda,
            payload: sfn.TaskInput.fromJsonPathAt('$.scoreResult.Payload'),
            resultPath: '$.saveResult',
        });

        const definition = startTextractTask
            .next(waitTask)
            .next(checkStatusTask)
            .next(new sfn.Choice(this, 'CheckStatusChoice')
                .when(sfn.Condition.stringEquals('$.statusResult.Payload.Status', 'IN_PROGRESS'), waitTask)
                .when(sfn.Condition.stringEquals('$.statusResult.Payload.Status', 'SUCCEEDED'), parseTask)
                .otherwise(new sfn.Fail(this, 'TextractFailed', {
                    cause: 'Textract Job Failed',
                    error: 'TextractError'
                })));

        parseTask.next(scoreTask).next(saveTask);

        const stateMachine = new sfn.StateMachine(this, 'ResumeProcessingWorkflow', {
            definitionBody: sfn.DefinitionBody.fromChainable(definition),
            timeout: cdk.Duration.minutes(10),
        });

        // Explicitly grant the State Machine role permission to read from the bucket
        // This is needed because the CallAwsService task assumes the StateMachine role
        this.resumesBucket.grantRead(stateMachine);
        stateMachine.addToRolePolicy(new iam.PolicyStatement({
            actions: ['textract:StartDocumentAnalysis', 'textract:GetDocumentAnalysis'],
            resources: ['*'],
        }));

        // Start Processing Lambda
        const startProcessingLambda = new lambda.Function(this, 'StartProcessingLambda', {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'start-processing.handler',
            code: lambda.Code.fromAsset('../backend/functions'),
            environment: {
                STATE_MACHINE_ARN: stateMachine.stateMachineArn,
            },
        });
        stateMachine.grantStartExecution(startProcessingLambda);

        // S3 Trigger
        this.resumesBucket.addEventNotification(
            s3.EventType.OBJECT_CREATED,
            new s3n.LambdaDestination(startProcessingLambda),
            { suffix: '.pdf' }
        );

        // Generate Presigned URL Lambda
        const generatePresignedUrlLambda = new lambda.Function(this, 'GeneratePresignedUrlLambda', {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'generate-presigned-url.handler',
            code: lambda.Code.fromAsset('../backend/functions'),
            environment: {
                BUCKET_NAME: this.resumesBucket.bucketName,
            },
        });
        this.resumesBucket.grantPut(generatePresignedUrlLambda);

        const fnUrl = generatePresignedUrlLambda.addFunctionUrl({
            authType: lambda.FunctionUrlAuthType.NONE,
            cors: {
                allowedOrigins: ['*'],
                allowedMethods: [lambda.HttpMethod.GET],
            },
        });
        this.uploadApiUrl = fnUrl.url;

        // List Candidates API
        const listCandidatesLambda = new lambda.Function(this, 'ListCandidatesLambda', {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'list-candidates.handler',
            code: lambda.Code.fromAsset('../backend/functions'),
            environment: {
                CANDIDATES_TABLE: this.candidatesTable.tableName,
            },
        });
        this.candidatesTable.grantReadData(listCandidatesLambda);

        const listCandidatesUrl = listCandidatesLambda.addFunctionUrl({
            authType: lambda.FunctionUrlAuthType.NONE,
            cors: {
                allowedOrigins: ['*'],
                allowedMethods: [lambda.HttpMethod.GET],
            },
        });

        // ==========================================
        // 3. ANALYTICS (Glue & Athena)
        // ==========================================

        const database = new glue.CfnDatabase(this, 'ResumeDatabase', {
            catalogId: this.account,
            databaseInput: {
                name: 'resume_intelligence_db',
            },
        });

        const glueRole = new iam.Role(this, 'GlueCrawlerRole', {
            assumedBy: new iam.ServicePrincipal('glue.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSGlueServiceRole'),
            ],
        });
        this.candidatesTable.grantReadData(glueRole);

        const crawler = new glue.CfnCrawler(this, 'ResumeCrawler', {
            name: 'resume-crawler',
            role: glueRole.roleArn,
            databaseName: 'resume_intelligence_db',
            targets: {
                dynamoDbTargets: [
                    {
                        path: this.candidatesTable.tableName,
                    },
                ],
            },
        });

        const queryResultsBucket = new s3.Bucket(this, 'QueryResultsBucket', {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });

        new athena.CfnWorkGroup(this, 'ResumeWorkGroup', {
            name: 'resume-workgroup',
            workGroupConfiguration: {
                resultConfiguration: {
                    outputLocation: `s3://${queryResultsBucket.bucketName}/results/`,
                },
            },
        });

        // Outputs
        new cdk.CfnOutput(this, 'UploadApiUrlOutput', {
            value: this.uploadApiUrl,
            description: 'API URL to get presigned upload URL',
        });
        new cdk.CfnOutput(this, 'ListCandidatesApiUrlOutput', {
            value: listCandidatesUrl.url,
            description: 'API URL to list candidates',
        });
        new cdk.CfnOutput(this, 'ResumesBucketName', {
            value: this.resumesBucket.bucketName,
        });
        new cdk.CfnOutput(this, 'CandidatesTableName', {
            value: this.candidatesTable.tableName,
        });
    }
}
