/**
 * Prettier 格式化配置。
 * 作用：统一代码的分号、引号和尾逗号风格。
 * 为什么要有：多层技术栈项目如果没有自动格式标准，PR 和阅读体验都会变差。
 */
export default {
  // 使用无分号风格，和当前仓库代码保持一致。
  semi: false,
  // 统一使用单引号，减少字符串样式混用。
  singleQuote: true,
  // 尾逗号关闭，让配置和短对象在这个项目里更紧凑。
  trailingComma: 'none'
}
