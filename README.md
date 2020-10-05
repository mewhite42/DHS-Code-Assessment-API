# matching-system

Simple AWS Rekognition matching api.  

### Configuration

The bucketName constant at the top of handler.js needs to be updated with a public s3 bucket for image storage.

### Run locally

#### 1. Install

```
npm install
```

#### 2. Run

```
node_modules/.bin/serverless offline -P <portNumber>
```

### Run on AWS

#### 0. Requirements

You need AWS account first.
Also you need your IAM user who has access to deploy AWS lambdas.

#### 1. Install

```
npm install
```

#### 2. Deploy API

```
node_modules/.bin/serverless config credentials --provider aws --key <aws_key> --secret <aws_secret>
node_modules/.bin/serverless deploy --region <aws_region>
```
Open your browser and use `endpoint` field from previous console response as base address. For example:

```
https://qwertyuiop.execute-api.eu-central-1.amazonaws.com/dev/?url=https://saicagile.atlassian.net
```
