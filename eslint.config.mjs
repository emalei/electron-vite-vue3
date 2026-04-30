import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import vueParser from 'vue-eslint-parser'
import pluginVue from 'eslint-plugin-vue'
import eslintConfigPrettier from 'eslint-config-prettier'

/**
 * ESLint Flat Config。
 * 作用：统一约束 JS、TS 和 Vue 单文件组件的静态检查规则。
 * 为什么要有：这个项目同时包含 Electron 主进程和 Vue 渲染层，没有一套集中规则会很快风格漂移。
 */
export default [
  {
    // 构建产物和依赖目录不参与源码规范检查，避免无意义噪音。
    ignores: ['out/**', 'node_modules/**']
  },
  // 基础 JavaScript 推荐规则。
  js.configs.recommended,
  // TypeScript 推荐规则，覆盖主进程、预加载和共享层。
  ...tseslint.configs.recommended,
  // Vue SFC 推荐规则，覆盖 template / script / style 的常见问题。
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.ts', '**/*.vue'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
      globals: {
        ...globals.browser,
        ...globals.node
      }
    }
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      // Vue 文件需要先经过 vue-eslint-parser，再把 <script lang="ts"> 交给 TS 解析器。
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    }
  },
  {
    rules: {
      // 这个示例项目的页面名和窗口角色强绑定，关闭该规则可以避免无价值的命名绕路。
      'vue/multi-word-component-names': 'off'
    }
  },
  // 最后接入 Prettier 兼容层，避免格式规则和 ESLint 规则互相冲突。
  eslintConfigPrettier
]
