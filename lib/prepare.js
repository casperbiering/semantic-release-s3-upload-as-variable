const _ = require('lodash');
const escapeStringRegexp = require('escape-string-regexp');
const fs = require('fs');
const fg = require('fast-glob');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { STSClient, AssumeRoleCommand } = require('@aws-sdk/client-sts');

async function handleDestination({ pluginConfig, context, destination }) {
  const { logger, branch, nextRelease } = context;

  let credentials;
  if (destination.awsAssumeRoleArn) {
    logger.log(`Assuming role ${destination.awsAssumeRoleArn}`);

    const assumeRoleParams = {
      RoleArn: destination.awsAssumeRoleArn,
      RoleSessionName: destination.awsAssumeRoleSessionName || 'semantic-release',
      DurationSeconds: destination.awsAssumeRoleDuration || 900,
    };

    const stsClient = new STSClient({
      region: destination.awsRegion,
    });

    const assumeRoleResult = await stsClient.send(new AssumeRoleCommand(assumeRoleParams));

    credentials = {
      accessKeyId: assumeRoleResult.Credentials.AccessKeyId,
      secretAccessKey: assumeRoleResult.Credentials.SecretAccessKey,
      sessionToken: assumeRoleResult.Credentials.SessionToken,
      expiration: assumeRoleResult.Credentials.Expiration,
    };
  }

  const s3Client = new S3Client({
    region: destination.awsRegion,
    credentials,
  });

  const putObjectParams = {
    Bucket: destination.s3Bucket,
    Key: _.template(destination.s3Key)({ branch: branch.name, nextRelease }),
    Body: fs.readFileSync(pluginConfig.sourceFile),
  };

  const putObjectResult = await s3Client.send(new PutObjectCommand(putObjectParams));

  logger.log(
    `Success upload to s3://${putObjectParams.Bucket}/${putObjectParams.Key}?VersionId=${putObjectResult.VersionId}`,
  );

  const variableReplacements = {};
  variableReplacements[destination.replaceS3BucketVariable] = putObjectParams.Bucket;
  variableReplacements[destination.replaceS3KeyVariable] = putObjectParams.Key;

  if (destination.replaceS3VersionIdVariable) {
    if (!putObjectResult.VersionId) {
      throw new Error(
        `Bucket ${destination.s3Bucket} doesn't have versioning enabled (needed if using replaceS3VersionIdVariable)`,
      );
    }

    variableReplacements[destination.replaceS3VersionIdVariable] = putObjectResult.VersionId;
  }

  return variableReplacements;
}

module.exports = async (pluginConfig, context) => {
  const { logger } = context;

  const destinationPromises = [];

  _.each(pluginConfig.destinations, (destination) => {
    destinationPromises.push(
      handleDestination({
        pluginConfig,
        context,
        destination,
      }),
    );
  });

  const variableReplacements = _.merge(...(await Promise.all(destinationPromises)));

  logger.log('VariableReplacements', variableReplacements);

  const files = fg.sync(pluginConfig.fileGlobs);

  _.each(files, (file) => {
    logger.log(`Patching file ${file}`);

    let content = fs.readFileSync(file, {
      encoding: 'utf8',
    });

    _.each(variableReplacements, (value, variable) => {
      const escapedVariable = escapeStringRegexp(variable);
      content = content.replace(
        new RegExp(`(["']?${escapedVariable}["']?\\s*[=:]\\s*)["'].*?["']`, 'g'),
        `$1"${value}"`,
      );
    });

    fs.writeFileSync(file, content, {
      encoding: 'utf8',
    });
  });

  logger.success('done');
};
