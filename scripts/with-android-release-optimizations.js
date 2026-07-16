const { withGradleProperties } = require('@expo/config-plugins');

const RELEASE_PROPERTIES = {
  // Let R8 remove unused Java/Kotlin bytecode and rename the remaining code.
  'android.enableMinifyInReleaseBuilds': 'true',
  // Remove Android resources that became unreachable after R8 optimization.
  'android.enableShrinkResourcesInReleaseBuilds': 'true',
  // Store the production JavaScript bundle compressed inside the APK.
  'android.enableBundleCompression': 'true',
  // Compress native libraries in a standalone APK. Android extracts them on install.
  'expo.useLegacyPackaging': 'true',
};

function setProperty(properties, key, value) {
  const existing = properties.find(
    (item) => item.type === 'property' && item.key === key,
  );

  if (existing) {
    existing.value = value;
    return;
  }

  properties.push({ type: 'property', key, value });
}

module.exports = function withAndroidReleaseOptimizations(config) {
  return withGradleProperties(config, (gradleConfig) => {
    for (const [key, value] of Object.entries(RELEASE_PROPERTIES)) {
      setProperty(gradleConfig.modResults, key, value);
    }

    return gradleConfig;
  });
};
