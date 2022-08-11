module.exports = {
  extends: ['airbnb', 'prettier'],
  plugins: ['prettier', 'jest'],
  env: {
    'jest/globals': true,
  },
  rules: {
    'prettier/prettier': 'error',
  },
};
