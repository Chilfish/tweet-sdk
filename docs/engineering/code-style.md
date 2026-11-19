# 代码风格

格式化与风格检查全部由 ESLint（antfu 配置）负责，不使用 Prettier。Git hooks 由 lefthook 管理（配置见 `lefthook.yml`）。

## 基本约定

- 单引号、无分号、2 空格缩进。
- 单语句 `if` 不加大括号。
- 导入顺序：外部依赖 → 内部模块 → 相对路径。
- 类型导入必须使用 `import type` / `export type`（`verbatimModuleSyntax`）。
- 禁止 `any`；形状不确定用 `unknown` + 类型守卫，在边界收窄。

## 命名

| 类型 | 规则 | 示例 |
|---|---|---|
| 变量/函数 | camelCase | `parseResponse` |
| 类型/接口 | PascalCase，接口不加 `I` 前缀 | `RequestOptions` |
| 常量 | UPPER_SNAKE 仅用于真正的全局常量 | `DEFAULT_TIMEOUT` |
| 文件 | kebab-case 或领域名 | `build-and-release.md`、`id-codec.ts` |
| 测试 | `*.test.ts`，用例名描述行为 | `returns null for empty input` |

## 模块

- 一个文件一个主要职责；文件顶部用块注释说明「为什么存在、边界在哪」。
- 不写不解释任何信息的注释（如 `// increment i`）。
- 分组用 `/** Section */`，禁用 `// ----` 分隔线。
- 内部辅助函数不导出，除非有独立测试价值。

## 类型

- 用 discriminated union 表达多态，不用一堆可选字段。
- 可选字段用 `?`；显式可空用 `| null`，两者不混用。
- 公开类型集中导出，内部实现细节不外泄。

## 错误处理

- 禁止裸 `throw new Error()`；定义带 `code` 的错误类型或使用统一的错误工厂。
- 错误信息必须能自定位：带上对象 id、名称、路径。
- 边界处（用户输入、外部响应）必须校验；内部调用信任类型系统。
- 批量操作中单条失败要记录并继续，最后汇总报告。
