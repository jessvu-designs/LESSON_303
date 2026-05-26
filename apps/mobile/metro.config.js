// Metro config for Expo monorepo + web shimming of native-only modules.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// On web, native-only packages should resolve to an empty stub so the bundler
// doesn't try to walk into platform-specific RN internals.
const EMPTY = path.resolve(projectRoot, 'src/empty-shim.js');
const WEB_STUBS = new Set([
  '@stripe/stripe-react-native',
  'react-native-maps',
]);

const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && WEB_STUBS.has(moduleName)) {
    return { type: 'sourceFile', filePath: EMPTY };
  }
  if (upstreamResolveRequest) {
    return upstreamResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
