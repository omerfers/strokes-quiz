import type { Configuration } from 'webpack';
import { merge } from 'webpack-merge';
import grafanaConfig, { Env } from './.config/webpack/webpack.config';

/**
 * Extends the create-plugin webpack config (see
 * https://grafana.com/developers/plugin-tools/how-to-guides/extend-configurations#extend-the-webpack-config)
 * with a rule for the audio clips bundled in `src/audio/clips`.
 *
 * `asset/resource` emits each clip as a standalone file and gives us back its
 * URL, which is what `src/audio/index.ts` resolves through `require.context`.
 * Files are hashed in production (cache busting) and keep their names in dev.
 */
const config = async (env: Env): Promise<Configuration> => {
  const baseConfig = await grafanaConfig(env);

  return merge(baseConfig, {
    module: {
      rules: [
        {
          test: /\.(mp3|m4a|ogg|wav)$/,
          type: 'asset/resource',
          generator: {
            filename: Boolean(env.production) ? '[hash][ext]' : '[file]',
          },
        },
      ],
    },
  });
};

export default config;
