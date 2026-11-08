// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  // The game packs short statements per line on purpose; template whitespace is left as written.
  rules: {
    '@stylistic/max-statements-per-line': 'off',
    '@stylistic/member-delimiter-style': 'off',
    'vue/max-attributes-per-line': 'off',
    'vue/singleline-html-element-content-newline': 'off',
  },
})
