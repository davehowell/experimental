# Experimental Projects

GitHub Pages repository for hosting experimental web apps, animations, and interactive demos.

## 🌐 Live Site

Visit the live site at: [https://davehowell.github.io/experimental/](https://davehowell.github.io/experimental/)

## 📂 Structure

```
docs/
├── index.html          # Main landing page
└── projects/           # Individual project directories
    └── README.md       # Guide for adding new projects
```

## 🚀 Adding New Projects

1. Create a new directory in `docs/projects/` with your project name
2. Add your HTML, CSS, and JavaScript files
3. Update `docs/index.html` to link to your new project
4. Commit and push to the `main` branch
5. GitHub Actions will automatically deploy your changes

## 🎨 Planned Projects

- Tesla Valve Animation - Interactive fluid dynamics visualization
- Data Visualization Demos
- Creative CSS/JS Animations
- Interactive Web Experiments

## 🔧 Local Development

To test locally, simply open `docs/index.html` in a web browser, or use a local server:

```bash
cd docs
python -m http.server 8000
# Then visit http://localhost:8000
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
