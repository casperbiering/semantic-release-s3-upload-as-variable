const { mockClient } = require('aws-sdk-client-mock');
const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
const verify = require('../lib/verify');

process.env.AWS_REGION = 'us-west-2';
process.env.AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';
process.env.AWS_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

const context = {
  logger: {
    log: () => {
      // console.log('Log', message);
    },
    success: () => {
      // console.log('Success', message);
    },
  },
  nextRelease: {
    version: 'v123.123.123',
    notes: '',
  },
  branch: {
    name: 'main',
  },
};

beforeAll(() => {
  mockClient(STSClient)
    .on(GetCallerIdentityCommand)
    .resolves({ Arn: 'arn:aws:iam::account:role/role-name-with-path' });
});

test('verify success', async () => {
  const pluginConfig = {
    destinations: [
      {
        awsRegion: 'eu-west-1',
        s3Bucket: 'production-eu-bucket',
        s3Key: `builds/\${nextRelease.version}.zip`,
        s3LegalHold: true,
        replaceS3BucketVariable: 's3_bucket_eu',
        replaceS3KeyVariable: 's3_key_eu',
        replaceS3VersionIdVariable: 's3_object_version_eu',
      },
    ],
    fileGlobs: ['terraform/**/semantic-release.auto.tfvars.json'],
    sourceFile: 'output/package.zip',
  };

  await expect(verify(pluginConfig, context)).resolves.toBeUndefined();
});

test('require unique variable names', async () => {
  const pluginConfig = {
    destinations: [
      {
        awsRegion: 'eu-west-1',
        s3Bucket: 'production-eu-bucket',
        s3Key: `builds/\${nextRelease.version}.zip`,
        s3LegalHold: true,
        replaceS3BucketVariable: 's3_bucket',
        replaceS3KeyVariable: 's3_key',
      },
      {
        awsRegion: 'us-east-1',
        s3Bucket: 'production-us-bucket',
        s3Key: `builds/\${nextRelease.version}.zip`,
        s3LegalHold: true,
        replaceS3BucketVariable: 's3_bucket',
        replaceS3KeyVariable: 's3_key',
        replaceS3VersionIdVariable: 's3_object_version',
      },
    ],
    fileGlobs: ['terraform/**/semantic-release.auto.tfvars.json'],
    sourceFile: 'output/package.zip',
  };

  await expect(verify(pluginConfig, context)).rejects.toThrowError(/VariableNames are not unique/);
});

test('missing required', async () => {
  const pluginConfig = {};

  await expect(verify(pluginConfig, context)).rejects.toThrowError(/must have required property/);
});
