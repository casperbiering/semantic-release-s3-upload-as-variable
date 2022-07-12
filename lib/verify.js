const _ = require('lodash');
const AggregateError = require('aggregate-error');
const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
const Ajv = require('ajv');

const pluginConfigSchema = {
  type: 'object',
  properties: {
    destinations: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        properties: {
          awsAssumeRoleArn: { type: 'string' },
          awsAssumeRoleSessionName: { type: 'string' },
          awsAssumeRoleDuration: { type: 'number' },
          awsRegion: { type: 'string' },
          s3Bucket: { type: 'string' },
          s3Key: { type: 'string' },
          replaceS3BucketVariable: { type: 'string' },
          replaceS3KeyVariable: { type: 'string' },
          replaceS3VersionIdVariable: { type: 'string' },
        },
        required: [
          'awsRegion',
          's3Bucket',
          's3Key',
          'replaceS3BucketVariable',
          'replaceS3KeyVariable',
        ],
        additionalProperties: false,
      },
    },
    fileGlobs: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'string',
      },
    },
    sourceFile: { type: 'string' },
  },
  required: ['sourceFile', 'destinations', 'fileGlobs'],
};

module.exports = async (pluginConfig, context) => {
  const { logger } = context;

  const ajv = new Ajv();

  const validate = ajv.compile(pluginConfigSchema);
  const valid = validate(pluginConfig);
  if (!valid) {
    throw new AggregateError(validate.errors);
  }

  const errors = [];

  const stsClient = new STSClient();

  const getCallerIdentityResult = await stsClient.send(new GetCallerIdentityCommand());
  logger.log(`Running as ${getCallerIdentityResult.Arn}`);

  const uniqueVariableNames = [];

  _.each(pluginConfig.destinations, (destination) => {
    uniqueVariableNames.push(destination.replaceS3BucketVariable);
    uniqueVariableNames.push(destination.replaceS3KeyVariable);
    if (destination.replaceS3VersionIdVariable) {
      uniqueVariableNames.push(destination.replaceS3VersionIdVariable);
    }
  });

  if (uniqueVariableNames.length !== _.uniq(uniqueVariableNames).length) {
    errors.push(`VariableNames are not unique`);
  }

  if (errors.length > 0) {
    throw new AggregateError(errors);
  }
};
