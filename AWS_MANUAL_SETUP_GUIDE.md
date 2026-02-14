# Comprehensive AWS Setup Guide (Manual)

This guide covers everything from creating an AWS account user to deploying the project. Follow these steps if you are starting from scratch.

## Phase 1: Create an IAM User (AWS Console)

**Why?** You should not use your "Root" account (the email you signed up with) for development. You need a user with programmatic access keys.

1.  **Log in** to the [AWS Console](https://console.aws.amazon.com/).
2.  Search for **IAM** in the top search bar and click it.
3.  Click **Users** on the left sidebar -> **Create user**.
4.  **User details**:
    *   User name: `developer` (or your name).
    *   Click **Next**.
5.  **Permissions**:
    *   Select **Attach policies directly**.
    *   Search for `AdministratorAccess` and check the box. (Note: For production, we'd be more restrictive, but this ensures you don't hit permission errors while learning).
    *   Click **Next** -> **Create user**.
6.  **Create Access Keys**:
    *   Click on the newly created user name.
    *   Click the **Security credentials** tab.
    *   Scroll down to **Access keys** -> **Create access key**.
    *   Select **Command Line Interface (CLI)**.
    *   Check the confirmation box -> **Next**.
    *   **IMPORTANT**: Click **Create access key** and **Download the .csv file** or copy the **Access key ID** and **Secret access key** immediately. You verify won't see the Secret Key again.

## Phase 2: Configure Local Environment

**Why?** Your computer needs these keys to talk to AWS.

1.  **Open your Terminal**.
2.  **Install AWS CLI** (if you haven't):
    ```bash
    brew install awscli
    ```
3.  **Configure Credentials**:
    Run this command and paste the keys you just created:
    ```bash
    aws configure
    ```
    *   **AWS Access Key ID**: [Paste from Phase 1]
    *   **AWS Secret Access Key**: [Paste from Phase 1]
    *   **Default region name**: `us-east-1` (or your preferred region like `us-west-2`)
    *   **Default output format**: `json`

4.  **Verify**:
    ```bash
    aws sts get-caller-identity
    ```
    You should see your user ARN.

## Phase 3: Bootstrap CDK (The Missing Link)

**Why?** AWS CDK needs a special bucket and role in your account to store deployment assets. This was the error you saw earlier.

1.  Navigate to the project infrastructure folder:
    ```bash
    cd infrastructure
    ```
2.  Run the bootstrap command:
    ```bash
    npx cdk bootstrap
    ```
    *   You will see a progress bar. Wait for it to finish.
    *   It should say `Environment aws://<account-id>/<region> bootstrapped.`

## Phase 4: Deploy the Architecture

1.  Still in the `infrastructure` folder, run:
    ```bash
    npx cdk deploy
    ```
2.  **Review & Approve**:
    *   It will show a list of "IAM Statement Changes". This is normal.
    *   Type `y` and press Enter.
3.  **Wait**:
    *   CloudFormation is creating 30+ resources (Lambda, S3, DynamoDB, etc.).
    *   This takes about 5-8 minutes.
4.  **Save the Outputs**:
    At the end, you will see green text like:
    ```
    ResumeInfrastructureStack.UploadApiUrlOutput = ...
    ResumeInfrastructureStack.ListCandidatesApiUrlOutput = ...
    ```
    **Keep this terminal open** or copy these URLs to a notepad.

## Phase 5: Connect the Frontend

1.  Open a new terminal tab (Cmd+T).
2.  Navigate to the frontend folder:
    ```bash
    cd frontend
    ```
3.  Create the environment file:
    ```bash
    touch .env.local
    ```
4.  Open this file in your editor (VS Code) and paste the URLs from Phase 4:
    ```env
    NEXT_PUBLIC_UPLOAD_API_URL=https://<your-id>.lambda-url.us-east-1.on.aws/
    NEXT_PUBLIC_LIST_API_URL=https://<your-id>.lambda-url.us-east-1.on.aws/
    ```
5.  Start the app:
    ```bash
    npm run dev
    ```
6.  Open `http://localhost:3000` in your browser.

## Success!
You now have a fully functional AI Resume Intelligence Platform running on your AWS account.
