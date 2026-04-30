import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

/**
 * 仓库根目录绝对路径。
 * 作用：作为所有构建别名和输出路径的统一基准。
 * 为什么要有：Electron 主进程、预加载和渲染进程分属不同入口，路径必须统一解析。
 */
const rootDir = dirname(fileURLToPath(import.meta.url))

/**
 * 路径解析辅助函数。
 * 作用：把相对路径稳定转换成基于仓库根目录的绝对路径。
 * 为什么要有：配置里会重复用到 resolve，提成函数后更简洁也更不容易写错。
 */
const r = (path: string) => resolve(rootDir, path)

/**
 * electron-vite 总配置。
 * 作用：同时定义 main、preload、renderer 三套独立但相关的构建规则。
 * 为什么要有：Electron 应用本质上是三个运行域，不能用单一前端构建配置简单覆盖。
 */
export default defineConfig({
  main: {
    // 主进程尽量把依赖外置，减少打包体积并贴近 Node 运行方式。
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        // 主进程直接访问主进程源码和共享协议层。
        '@main': r('electron/main'),
        '@shared': r('src/shared')
      }
    },
    build: {
      lib: {
        // 主进程真正启动入口。
        entry: r('electron/main/index.ts')
      },
      outDir: 'out/main'
    }
  },
  preload: {
    // 预加载同样运行在 Electron/Node 语义下，也适合外置依赖。
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        // 预加载只需要共享协议层，不应直接依赖渲染页面代码。
        '@shared': r('src/shared')
      }
    },
    build: {
      lib: {
        // 预加载桥接入口。
        entry: r('electron/preload/index.ts')
      },
      outDir: 'out/preload'
    }
  },
  renderer: {
    // 渲染进程单独以 src/renderer 作为前端应用根目录。
    root: r('src/renderer'),
    plugins: [vue()],
    server: {
      // 固定本地开发地址，便于主进程稳定拼接 dev server URL。
      host: '127.0.0.1',
      port: 5173
    },
    resolve: {
      alias: {
        // 渲染层既要访问自己的页面代码，也要访问共享协议。
        '@renderer': r('src/renderer/src'),
        '@shared': r('src/shared')
      }
    },
    build: {
      // 渲染产物单独输出，便于主进程按固定路径加载 index.html。
      outDir: r('out/renderer')
    }
  }
})
