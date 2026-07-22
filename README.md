# 面杀助手｜三国杀面杀选将器

一个面向线下身份局的三国杀移动版武将筛选与随机抽取工具。支持按势力、系列和品质筛选，按名字搜索，随机抽取武将，并查看势力、体力和现行技能。

![面杀助手预览](public/og.png)

## 在线使用

[打开面杀助手](https://miansha-assistant.netlify.app)

## 功能

- 收录 573 名三国杀移动版身份局武将
- 按势力、系列和移动版品质筛选
- 支持武将姓名搜索
- 每次随机抽取 1—5 名武将
- 可开启本轮不重复抽取
- 点击武将卡片查看体力、势力与技能
- 内置 219 名“推荐将池”，保持在标准、神话再临、一将成名与界限突破附近的强度范围

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

重新抓取移动版身份局名录与现行技能：

```bash
pnpm data:update
```

## 技术栈

- React 19
- Next.js 16 / vinext
- TypeScript
- Vite
- Cloudflare Workers 兼容构建

## 数据与版权说明

身份局武将名录和形象整理自[三国杀移动版官网武将录](https://www.sanguosha.cn/index.php/pc/hero-list.html)，现行技能结合移动版官方改版公告与[三国杀移动版 WIKI](https://wiki.biligame.com/msgs/)核对。武将设定、图片及相关版权归原权利方所有；本项目仅用于非商业的线下面杀选将与学习交流。
