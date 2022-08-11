const { mockClient } = require('aws-sdk-client-mock');
const fsMock = require('mock-fs');
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { STSClient, AssumeRoleCommand } = require('@aws-sdk/client-sts');
const prepare = require('../lib/prepare');

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
  fsMock({
    'output/package.zip': 'dummy file',
    'terraform/base/semantic-release.auto.tfvars.json': JSON.stringify({
      s3_bucket: 'A',
      s3_key: 'B',
      s3_object_version: 'C',
    }),
    __tests__: fsMock.load(path.resolve(__dirname, '../__tests__')),
    lib: fsMock.load(path.resolve(__dirname, '../lib')),
    node_modules: fsMock.load(path.resolve(__dirname, '../node_modules')),
  });
});

afterAll(() => {
  fsMock.restore();
});

test('prepare success', async () => {
  const pluginConfig = {
    destinations: [
      {
        awsRegion: 'eu-west-1',
        s3Bucket: 'production-eu-bucket',
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

  mockClient(S3Client).on(PutObjectCommand).resolves({ VersionId: 'RandomString' });

  await expect(prepare(pluginConfig, context)).resolves.toBeUndefined();

  const patchedFile = JSON.parse(
    fs.readFileSync('terraform/base/semantic-release.auto.tfvars.json', {
      encoding: 'utf8',
    }),
  );

  expect(patchedFile.s3_bucket).toMatch('production-eu-bucket');
  expect(patchedFile.s3_key).toMatch('builds/v123.123.123.zip');
  expect(patchedFile.s3_object_version).toMatch('RandomString');
});

test('prepare success with assume', async () => {
  const pluginConfig = {
    destinations: [
      {
        awsAssumeRoleArn: 'arn:aws:iam::account:role/role-name-with-path',
        awsRegion: 'eu-west-1',
        s3Bucket: 'production-eu-bucket',
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

  mockClient(S3Client).on(PutObjectCommand).resolves({ VersionId: 'RandomString' });
  mockClient(STSClient)
    .on(AssumeRoleCommand)
    .resolves({
      Credentials: {
        AccessKeyId: 'A',
        SecretAccessKey: 'B',
        SessionToken: 'C',
        Expiration: 'D',
      },
    });

  await expect(prepare(pluginConfig, context)).resolves.toBeUndefined();
});

test('version variable not bucket not versioned', async () => {
  const pluginConfig = {
    destinations: [
      {
        awsRegion: 'eu-west-1',
        s3Bucket: 'production-eu-bucket',
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

  mockClient(S3Client).on(PutObjectCommand).resolves({ VersionId: '' });

  await expect(prepare(pluginConfig, context)).rejects.toThrowError(
    /Bucket production-eu-bucket doesn't have versioning enabled/,
  );
});
