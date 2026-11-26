# 计算机网络学习与题库训练 · OpenSkill Galaxy

面向计算机专业学生408考研后端开发和网络工程学习者的网络体系结构TCP/IPHTTPDNS子网划分路由与综合组网训练模块。

[开始学习](https://openskill-galaxy.github.io/module-computer-network/) · [学习路线](https://openskill-galaxy.github.io/module-computer-network/?page=%2Froutes) · [题库练习](https://openskill-galaxy.github.io/module-computer-network/?page=%2Fquestions) · [案例训练](https://openskill-galaxy.github.io/module-computer-network/?page=%2Fcases) · [返回主站](https://openskill-galaxy.github.io/)

本模块当前公开 **4 门课、8 节讲义、26 道练习题、3 套试卷和 1 个案例**。打开课程页可进入本章练习。题库记录最近作答结果，并在到期时给出复习入口。案例可保留草稿、导出作品和收回他人评语。

## 本地开发

使用 Node.js 22。课程、讲义和题库位于 [public/data](public/data/)，编辑后先校验再构建。

```bash
npm ci
npm run dev
node scripts/validate-data.mjs
npm run build
npm run preview
```

`main` 分支更新后由 GitHub Actions 发布到 GitHub Pages。[模块维护说明](https://github.com/openskill-galaxy/openskill-galaxy-tools/blob/main/MODULE_WORKFLOW.md) · [发布核验](https://github.com/openskill-galaxy/openskill-galaxy-tools/blob/main/GITHUB_PAGES_DEPLOY_GUIDE.md)

[MIT 许可](https://opensource.org/license/mit)
