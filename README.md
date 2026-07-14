# 武将台｜三国杀面杀选将器

一个面向线下身份局的三国杀武将筛选与随机抽取工具。支持按势力、系列和稀有度筛选，按名字搜索，随机抽取武将，并查看势力、体力和完整技能。

![武将台预览](public/og.png)

## 在线使用

[打开武将台](https://sanguosha-hero-draw.netlify.app)

## 功能

- 收录三国杀 OL 官网公开武将资料
- 按势力、系列和稀有度筛选
- 支持武将姓名搜索
- 每次随机抽取 1—5 名武将
- 可开启本轮不重复抽取
- 点击武将卡片查看体力、势力与技能
- 内置 201 名“推荐将池”，以 2018 年新服上线前的发行批次为分界

## 本地运行

需要 Node.js `>=22.13.0`。

```bash
pnpm install
pnpm dev
```

构建和测试：

```bash
pnpm build
pnpm test
```

## 技术栈

- React 19
- Next.js 16 / vinext
- TypeScript
- Vite
- Cloudflare Workers 兼容构建

## 数据与版权说明

武将名称、技能资料与立绘整理自[三国杀 OL 官网武将录](https://www.sanguosha.com/hero)。武将设定、图片及相关版权归原权利方所有；本项目仅用于非商业的线下面杀选将与学习交流。
