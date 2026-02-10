// Configuration for code snippet generation
const config = {
    // Default settings
    defaultTheme: 'hyper',
    defaultFont: 'jetBrainsMono',
    defaultLanguage: 'javascript',
    viewport: {
        width: 600,
        height: 400,
        deviceScaleFactor: 2
    },

    // Output settings
    output: {
        directory: 'Presentation/media/images/code_snippets',
        format: 'png',
        quality: 100
    },

    // Screenshot settings
    screenshot: {
        omitBackground: true,
        fullPage: false
    },

    // Themes configuration
    themes: {
        hyper: {
            name: "Hyper",
            background: "bg-gradient-to-br from-fuchsia-500 via-red-600 to-orange-400",
            theme: "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/atom-one-dark.min.css",
        },
        oceanic: {
            name: "Oceanic",
            background: "bg-gradient-to-br from-green-300 via-blue-500 to-purple-600",
            theme: "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/base16/material-darker.min.css",
        },
        candy: {
            name: "Candy",
            background: "bg-gradient-to-br from-pink-300 via-purple-300 to-indigo-400",
            theme: "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/base16/chalk.min.css",
        },
        sublime: {
            name: "Sublime",
            background: "bg-gradient-to-br from-rose-400 via-fuchsia-500 to-indigo-500",
            theme: "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github-dark.min.css",
        },
        horizon: {
            name: "Horizon",
            background: "bg-gradient-to-br from-orange-500 to-yellow-300",
            theme: "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/monokai-sublime.min.css",
        },
        coral: {
            name: "Coral",
            background: "bg-gradient-to-br from-blue-400 to-emerald-400",
            theme: "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/tokyo-night-dark.min.css",
        },
        peach: {
            name: "Peach",
            background: "bg-gradient-to-br from-rose-400 to-orange-300",
            theme: "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/base16/zenburn.min.css",
        },
        flamingo: {
            name: "Flamingo",
            background: "bg-gradient-to-br from-pink-400 to-pink-600",
            theme: "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/panda-syntax-dark.min.css",
        },
        gotham: {
            name: "Gotham",
            background: "bg-gradient-to-br from-gray-700 via-gray-900 to-black",
            theme: "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/base16/black-metal-dark-funeral.min.css",
        },
        ice: {
            name: "Ice",
            background: "bg-gradient-to-br from-rose-100 to-teal-100",
            theme: "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/base16/ashes.min.css",
        },
    },

    // Fonts configuration
    fonts: {
        jetBrainsMono: {
            name: "JetBrains Mono",
            src: "https://fonts.googleapis.com/css2?family=JetBrains+Mono&display=swap",
            fontFamily: "'JetBrains Mono', monospace"
        },
        inconsolata: {
            name: "Inconsolata",
            src: "https://fonts.googleapis.com/css2?family=Inconsolata&display=swap",
            fontFamily: "'Inconsolata', monospace"
        },
        firaCode: {
            name: "Fira Code",
            src: "https://fonts.googleapis.com/css2?family=Fira+Code&display=swap",
            fontFamily: "'Fira Code', monospace"
        },
        cascadiaCode: {
            name: "Cascadia Code",
            src: "https://cdn.jsdelivr.net/npm/@fontsource/cascadia-code@4.2.1/index.min.css",
            fontFamily: "'Cascadia Code', monospace"
        },
        victorMono: {
            name: "Victor Mono",
            src: "https://fonts.googleapis.com/css2?family=Victor+Mono&display=swap",
            fontFamily: "'Victor Mono', monospace"
        },
        sourceCodePro: {
            name: "Source Code Pro",
            src: "https://fonts.googleapis.com/css2?family=Source+Code+Pro&display=swap",
            fontFamily: "'Source Code Pro', monospace"
        },
        ibmPlexMono: {
            name: "IBM Plex Mono",
            src: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono&display=swap",
            fontFamily: "'IBM Plex Mono', monospace"
        },
        robotoMono: {
            name: "Roboto Mono",
            src: "https://fonts.googleapis.com/css2?family=Roboto+Mono&display=swap",
            fontFamily: "'Roboto Mono', monospace"
        },
        ubuntuMono: {
            name: "Ubuntu Mono",
            src: "https://fonts.googleapis.com/css2?family=Ubuntu+Mono&display=swap",
            fontFamily: "'Ubuntu Mono', monospace"
        },
        spaceMono: {
            name: "Space Mono",
            src: "https://fonts.googleapis.com/css2?family=Space+Mono&display=swap",
            fontFamily: "'Space Mono', monospace"
        },
        courierPrime: {
            name: "Courier Prime",
            src: "https://fonts.googleapis.com/css2?family=Courier+Prime&display=swap",
            fontFamily: "'Courier Prime', monospace"
        },
        anonymousPro: {
            name: "Anonymous Pro",
            src: "https://fonts.googleapis.com/css2?family=Anonymous+Pro&display=swap",
            fontFamily: "'Anonymous Pro', monospace"
        },
        oxygenMono: {
            name: "Oxygen Mono",
            src: "https://fonts.googleapis.com/css2?family=Oxygen+Mono&display=swap",
            fontFamily: "'Oxygen Mono', monospace"
        },
        redHatMono: {
            name: "Red Hat Mono",
            src: "https://fonts.googleapis.com/css2?family=Red+Hat+Mono&display=swap",
            fontFamily: "'Red Hat Mono', monospace"
        },
    },

    // Language mapping for Prism/Highlight.js
    languagePatterns: {
        'import ': 'javascript',
        'const ': 'javascript',
        'let ': 'javascript',
        'function': 'javascript',
        'console.log': 'javascript',
        'def ': 'python',
        'print(': 'python',
        'import pandas': 'python',
        'public class': 'java',
        'System.out': 'java',
        '#include': 'c',
        'using namespace': 'cpp',
        'package main': 'go',
        'func main': 'go',
        '<?php': 'php',
        '<!DOCTYPE html>': 'html',
        '<html>': 'html',
        '<style>': 'css',
        'body {': 'css',
        'npm install': 'bash',
        'git clone': 'bash'
    }
};

export default config;
