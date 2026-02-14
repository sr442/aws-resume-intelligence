# AWS Resume Intelligence Platform (Serverless)

An AI-powered, serverless platform to automate resume screening using AWS.

![Architecture](https://raw.githubusercontent.com/placeholder-image.png)
*(Replace with actual architecture diagram if available)*

## Features

- **Serverless Architecture**: Built on AWS Lambda, Step Functions, S3, and DynamoDB.
- **AI-Powered**: Uses Amazon Textract for OCR and extraction.
- **Automated Scoring**: Intelligent candidate scoring based on keywords and extracted entities.
- **Infrastructure as Code**: Fully defined using AWS CDK (TypeScript).
- **Modern Frontend**: Next.js dashboard for recruiters.

## Architecture

1.  **Ingestion**: Resumes uploaded to S3 via Presigned URLs.
2.  **Orchestration**: S3 event triggers execution of an AWS Step Functions workflow.
3.  **Processing**:
    *   **Textract**: OCR and data extraction.
    *   **Entity Extraction**: Lambda parses text for name, email, skills.
    *   **Scoring**: Logic processes text against job criteria (Mock implementation).
4.  **Storage**: Structured data saved to DynamoDB.
5.  **Analytics**: QuickSight/Athena ready via Glue Crawlers.

## Project Structure

- `infrastructure/`: AWS CDK code for deploying resources.
- `backend/`: Lambda function source code.
- `frontend/`: Next.js web application.

## Quick Start

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Prerequisites
- AWS Account & CLI
- Node.js v18+
- AWS CDK

### One-Line Deploy (Infrastructure)
```bash
cd infrastructure && npm install && npx cdk deploy
```

## Contributing
1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License
MIT
