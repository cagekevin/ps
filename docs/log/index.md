# 日志索引

> 由 `npm run log:index` 生成，别手改。
> 只在**决策、踩坑、架构变更**时写日志，不要每次改动都写。

| 日期 | 主题 | 摘要 | 文件 |
|---|---|---|---|
| 2026-10-20 | 门禁降级 | registry 从门禁改成生成器，style-guard 升级成自动修复，只留 deploy 一个强制点 | [2026-10-20-门禁降级.md](2026-10-20-%E9%97%A8%E7%A6%81%E9%99%8D%E7%BA%A7.md) |
| 2026-10-20 | 横切抽象首次接入 | 字体管理页改用 PageShell + useListPage + usePagedView + useInfiniteScroll，抽象从"未验证"变成"可用" | [2026-10-20-横切抽象首次接入.md](2026-10-20-%E6%A8%AA%E5%88%87%E6%8A%BD%E8%B1%A1%E9%A6%96%E6%AC%A1%E6%8E%A5%E5%85%A5.md) |
| 2026-10-20 | 样式体系补全 | token 只是"值"，补上命名、布局原语、状态约定、覆盖出口四条规则才算体系 | [2026-10-20-样式体系补全.md](2026-10-20-%E6%A0%B7%E5%BC%8F%E4%BD%93%E7%B3%BB%E8%A1%A5%E5%85%A8.md) |
| 2026-10-20 | 字体页定位纠错 | 做的「我的字体」其实属于字体管理（font-manage.js），不是字体（anon_56d7_L34996） | [2026-10-20-字体页定位纠错.md](2026-10-20-%E5%AD%97%E4%BD%93%E9%A1%B5%E5%AE%9A%E4%BD%8D%E7%BA%A0%E9%94%99.md) |
| 2026-10-20 | 列表 composable 合并 | 三个 composable（useListPage + usePagedView + useInfiniteScroll）合成一个 usePagedList | [2026-10-20-列表composable合并.md](2026-10-20-%E5%88%97%E8%A1%A8composable%E5%90%88%E5%B9%B6.md) |
