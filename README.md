# semantic-release-s3-upload-as-variable

This is a plugin for _semantic-release_. It uploads a `sourceFile` to S3 and then patches variables in your sourcecode. This may be used

[![npm latest version](https://img.shields.io/npm/v/@casperbiering/semantic-release-s3-upload-as-variable/latest.svg)](https://www.npmjs.com/package/@casperbiering/semantic-release-s3-upload-as-variable)


| Step               | Description |
|--------------------|-------------|
| `verifyConditions` | Verify the presence of AWS identity via environment variables, and that variable names are unique. |
| `prepare`          | Uploads the `sourceFile` to S3 and then patches variables in your sourcecode. |

## Install

```bash
$ npm install @casperbiering/semantic-release-s3-upload-as-variable -D
```

## Usage

The plugin can be configured in the [**semantic-release** configuration file](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md#configuration):

```json
{
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    [
      "@casperbiering/semantic-release-s3-upload-as-variable",
      {
        "destinations": [
          {
            "awsAssumeRoleArn": null,
            "awsAssumeRoleSessionName": null,
            "awsAssumeRoleDuration": null,
            "awsRegion": "eu-west-1",
            "s3Bucket": "production-eu-bucket",
            "s3Key": "builds/${nextRelease.version}.zip",
            "replaceS3BucketVariable": "s3_bucket_eu",
            "replaceS3KeyVariable": "s3_key_eu",
            "replaceS3VersionIdVariable": "s3_object_version_eu"
          },
          {
            "awsAssumeRoleArn": null,
            "awsAssumeRoleSessionName": null,
            "awsAssumeRoleDuration": null,
            "awsRegion": "us-east-1",
            "s3Bucket": "production-us-bucket",
            "s3Key": "builds/${nextRelease.version}.zip",
            "replaceS3BucketVariable": "s3_bucket_us",
            "replaceS3KeyVariable": "s3_key_us",
            "replaceS3VersionIdVariable": "s3_object_version_us"
          }
        ],
        "fileGlobs": [
          "terraform/**/semantic-release.auto.tfvars.json"
        ],
        "sourceFile": "output/package.zip"
      }
    ],
    [
      "@semantic-release/git",
      {
        "assets": [
          "terraform/**/semantic-release.auto.tfvars.json",
        ]
      }
    ]
  ]
}
```

## Configuration


### Environment variables

The plugin uses [AWS SDK for JavaScript v3](https://github.com/aws/aws-sdk-js-v3#readme) here are some examples of variables it supports:

* `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
* `AWS_ROLE_ARN` and `AWS_WEB_IDENTITY_TOKEN_FILE`
* `AWS_SHARED_CREDENTIALS_FILE`
* `AWS_PROFILE`

### Options

| Options      | Description                                                                                                         | Default                                                                                                                          |
|--------------|---------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|
| `sourceFile` | (REQUIRED) Whether to publish the `npm` package to the registry. If `false` the `package.json` version will still be updated  | N/A |
| `fileGlobs` | (REQUIRED) List of globs to find files that contains the variables to patch | N/A |
| `destinations.*.awsAssumeRoleArn` | Assume different role for this destination | `null` |
| `destinations.*.awsAssumeRoleSessionName` | SessionName for assuming different role | `semantic-release` |
| `destinations.*.awsAssumeRoleDuration` | Duration for assuming different role | `900` |
| `destinations.*.awsRegion` | (REQUIRED) AWS Region | N/A |
| `destinations.*.s3Bucket` | (REQUIRED) AWS Region | N/A |
| `destinations.*.s3Key` | (REQUIRED) Key for sourceFile. It's templateable with `branch` name and `nextRelease` | N/A |
| `destinations.*.replaceS3BucketVariable` | (REQUIRED) Variable to patch this destinations S3 bucket name | N/A |
| `destinations.*.replaceS3KeyVariable` | (REQUIRED) Variable to patch this destinations S3 key | N/A |
| `destinations.*.replaceS3VersionIdVariable` | Variable to patch this destinations S3 Object Version Id. This is only supported if the bucket has enabled versioning. It's HIGHLY recommended though, since it's the only way to have immutability. | `null` |

### Examples

Example of an `semantic-release.auto.tfvars.json`:

```json
{
  "s3_bucket_eu": "production-eu-bucket",
  "s3_key_eu": "builds/v1.0.0.zip",
  "s3_object_version_eu": "zva1bXh1iNveYL7TBAg8UQstwLQpd.VI",
  "s3_bucket_us": "production-us-bucket",
  "s3_key_us": "builds/v1.0.0.zip",
  "s3_object_version_us": "saiN1johzohDie8Va0FaC5AizuVoh2or"
}
```
