const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const path = require('path');

const config = {
  resolver: {
    unstable_enablePackageExports: false,
    // react-native-screens 4.x points "react-native" to src/ which Metro
    // can't resolve on Windows. Redirect to the compiled commonjs output.
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === 'react-native-screens') {
        return {
          filePath: path.resolve(
            __dirname,
            'node_modules/react-native-screens/lib/commonjs/index.js',
          ),
          type: 'sourceFile',
        };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
