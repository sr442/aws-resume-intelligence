# Manual AWS Deployment Guide - AWS Resume Intelligence Platform

This guide details how to manually deploy the infrastructure and application to your AWS account.

## Prerequisites

1.  **AWS Account**: You need an active AWS account.
2.  **AWS CLI**: Installed and configured with `aws configure`.
    *   [Install AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
3.  **Node.js & npm**: Installed (v18 or later).
    *   [Install Node.js](https://nodejs.org/en/download/)
4.  **AWS CDK**: Installed globally.
    ```bash
    npm install -g aws-cdk
    ```

## 1. Clone & Install Dependencies

```bash
git clone <repository-url>
cd aws-resume-intelligence

# Install Infrastructure Dependencies
cd infrastructure
npm install

# Install Frontend Dependencies
cd ../frontend
npm install
```

## 2. Infrastructure Deployment (Back-end)

1.  **Bootstrap CDK** (One time per region):
    ```bash
    cd infrastructure
    npx cdk bootstrap
    ```

2.  **Deploy the Stack**:
    ```bash
    npx cdk deploy
    ```
    *   Confirm the security changes by typing `y`.
    *   Wait for the deployment to complete (approx. 5-10 mins).

3.  **Note the Outputs**:
    After deployment, you will see outputs in the terminal similar to:
    ```
    ResumeInfrastructureStack.UploadApiUrlOutput = https://xyz.lambda-url.us-east-1.on.aws/
    ResumeInfrastructureStack.ListCandidatesApiUrlOutput = https://abc.lambda-url.us-east-1.on.aws/
    ResumeInfrastructureStack.ResumesBucketName = resumeinfrastructurestack-resumesbucket...
    ResumeInfrastructureStack.CandidatesTableName = ResumeInfrastructureStack-CandidatesTable...
    ```
    **Copy these URLs**, you will need them for the frontend.

## 3. Frontend Configuration & Execution

1.  **Configure Environment Variables**:
    *   Navigate to the `frontend` directory.
    *   Create a file named `.env.local`:
        ```bash
        touch .env.local
        ```
    *   Add the API URLs from the previous step:
        ```env
        NEXT_PUBLIC_UPLOAD_API_URL=https://xyz.lambda-url.us-east-1.on.aws/
        NEXT_PUBLIC_LIST_API_URL=https://abc.lambda-url.us-east-1.on.aws/
        ```

2.  **Run Locally**:
    ```bash
    npm run dev
    ```
    *   Open [http://localhost:3000](http://localhost:3000) in your browser.

3.  **(Optional) Deploy Frontend**:
    *   You can deploy the Next.js app to Vercel or AWS Amplify.
    *   **Amplify Gen 2**:
        *   Connect your repo.
        *   Add the environment variables in the Amplify Console.
    *   **Vercel**:
        *   Import the project.
        *   Add `NEXT_PUBLIC_UPLOAD_API_URL` and `NEXT_PUBLIC_LIST_API_URL` in Project Settings -> Environment Variables.

## 4. Verification

1.  **Upload a Resume**:
    *   On the landing page, click the upload area and select a PDF resume.
    *   You should see a success message.

2.  **Check Processing**:
    *   Go to the **AWS Console** -> **Step Functions**.
    *   Find `ResumeProcessingWorkflow`.
    *   You should see a new execution in "Running" or "Succeeded" state.

3.  **View Results**:
    *   Go to the Dashboard page (`/dashboard`).
    *   Wait for the processing to complete (approx. 30s).
    *   The candidate should appear in the list with a score and extracted skills.

## 5. Clean Up (Teardown)

To avoid incurring future costs, destroy the infrastructure when finished:

```bash
cd infrastructure
npx cdk destroy
```
*Note: The S3 buckets and DynamoDB tables are configured to auto-delete content on destroy for this demo, but verify in the console that they are gone.*
