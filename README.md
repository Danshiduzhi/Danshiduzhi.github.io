# 旦史独支 / David 个人主页

这是一个纯静态个人主页，展示个人介绍、3D 打印与建模、火箭实验、AI 工具、文化数字化、服务内容和视觉档案。

## 本地预览

```powershell
python -m http.server 4173
```

然后访问：

```text
http://127.0.0.1:4173/
```

## 部署

项目通过 GitHub Pages 部署。推送到 `main` 后，`.github/workflows/pages.yml` 会自动发布静态站点。

## 技术说明

- 原生 HTML、CSS、JavaScript
- 无构建步骤
- 无前端框架
- 无第三方运行时依赖
- 图片统一使用 WebP
