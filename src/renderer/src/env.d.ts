/**
 * Vite 与 Vue 单文件组件类型声明。
 * 作用：让 TypeScript 能识别 .vue 模块并提供基础类型推导。
 * 为什么要有：没有这层声明时，TS 无法把 Vue 组件当作可导入模块处理。
 */
/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}
