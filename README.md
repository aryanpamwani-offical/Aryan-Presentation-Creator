# 🎥 Aryan's Presentation Creator
> **Transform text prompts into stunning, ready-to-present Google Slides decks with automatic code screenshots.**

[![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=for-the-badge&logo=bun&logoColor=white)](https://bun.sh/)
[![Gemini](https://img.shields.io/badge/Gemini-8E75C2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![Google Slides](https://img.shields.io/badge/Google%20Slides-FBBC05?style=for-the-badge&logo=googleslides&logoColor=white)](#)
[![Google Drive](https://img.shields.io/badge/Google%20Drive-4285F4?style=for-the-badge&logo=googledrive&logoColor=white)](#)

Aryan's Presentation Creator is an automated, high-performance CLI pipeline powered by **Bun**, **Gemini AI**, and the **Google Workspace APIs**. It takes a single topic, generates structured presentation modules, captures beautifully formatted syntax-highlighted code blocks, uploads assets to Drive, constructs the presentation, exports to PDF, and performs automatic cleanup.

---

## 📸 Preview

### Code Generation & Interactive Slide Previews
| Code Output (`code.png`) | Generated Google Slides Preview (`output.png`) |
| :---: | :---: |
| ![Code Editor](./code.png) | ![Presentation Output](./output.png) |

---

## ✨ Features

*   **🤖 AI-Powered Content Synthesis** — Uses the official `@google/genai` SDK and `gemini-2.5-flash` to craft educational course outlines and detailed content slides.
*   **🎨 Syntax-Highlighted Screenshots** — Automatically parses markdown code blocks and renders them into high-res syntax-highlighted code editor images via **Satori** and **Resvg**.
*   **⚡ Multi-Threaded Rendering** — Utilizes native **Bun Workers** to compile HTML/CSS snippets into PNGs concurrently, scaling with your CPU cores.
*   **🔑 Fully Automated OAuth2 Flow** — Automatically spins up a temporary background server on port `8080` to intercept and complete the Google login redirect. No manual copy-pasting of authorization codes required.
*   **📄 Automated PDF Export** — Downloads a high-quality PDF version of the presentation directly to your local computer.
*   **🧹 Cloud Storage Cleanup** — Temporarily uploads screenshot assets to Google Drive for slide compilation and automatically purges the files once done, keeping your Drive clean.

---

## ⚙️ Architecture

```mermaid
flowchart TD
    subgraph Input & AI
        A[Topic Prompt] --> B[Gemini AI Generator]
        B --> C[outline.json & presentation.json]
    end

    subgraph High-Performance Rendering
        C --> D[Bun Worker Pool]
        D --> E[HTML/CSS to SVG Satori]
        E --> F[SVG to PNG Resvg]
    end

    subgraph Google Cloud Integration
        F --> G[Upload Snippets to Drive]
        G --> H[Create Slides Deck]
        H --> I[Google Slides API Assembly]
    end

    subgraph Output & Finalization
        I --> J[Export PDF]
        J --> K[Purge Temp Drive Assets]
        K --> L[Completed PDF & Link]
    end

    style Input & AI fill:#f8fafc,stroke:#e2e8f0,stroke-width:2px
    style High-Performance Rendering fill:#fff7ed,stroke:#ffedd5,stroke-width:2px
    style Google Cloud Integration fill:#f0fdf4,stroke:#dcfce7,stroke-width:2px
    style Output & Finalization fill:#f0f9ff,stroke:#e0f2fe,stroke-width:2px
```

---

## 🚀 Getting Started

### Prerequisites
1.  Install the **[Bun Runtime](https://bun.sh/)**.
2.  Enable the **Google Slides** and **Google Drive** APIs in your [Google Cloud Console](https://console.cloud.google.com/).
3.  Configure your OAuth Consent Screen, generate an **OAuth 2.0 Web Client**, download the JSON file, rename it to `credentials.json`, and place it in the project root.

### Installation
Clone the repository and install all dependencies:
```bash
git clone https://github.com/aryanpamwani-offical/Aryan-Presentation-Creator.git
cd Aryan-Presentation-Creator
bun install
```

### Environment Setup
Create a `.env` file in the root folder:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_MODEL=gemini-2.5-flash
```

---

## 💻 Usage

To run the full presentation generation pipeline:

1.  Open [`index.js`](file:///C:/Users/DELL/Desktop/Superprof-Presentation-Creator/index.js) and update the `TOPIC` constant at the top of the file:
    ```javascript
    const TOPIC = "Mastering CSS Flexbox Layouts";
    ```
2.  Start the script:
    ```bash
    bun index.js
    ```
3.  **Authentication**: If it's your first time running, your web browser will automatically open to authenticate with Google. Grant permissions and the script will automatically capture the token and continue.

---

## 🛠️ Built With

*   **Runtime:** [Bun](https://bun.sh/) (Native file I/O, Workers, and Server APIs)
*   **AI Engine:** [@google/genai](https://www.npmjs.com/package/@google/genai) (Official Google Gemini SDK)
*   **APIs:** [googleapis](https://www.npmjs.com/package/googleapis) (Google Drive & Google Slides)
*   **Graphics:** [Satori](https://github.com/vercel/satori) & [Resvg](https://github.com/yisibl/resvg-js) (Fast SVG compilation & PNG rendering)
*   **CSS Engine:** [Tailwind CSS](https://tailwindcss.com/) (For styling code screenshots)

---

## 📁 Directory Structure

```text
Aryan-Presentation-Creator/
├── Presentation/
│   ├── ai-core/             # Gemini API interfaces
│   ├── config/              # Google Auth & styling configurations
│   ├── core/                # Layout components & presentation compilers
│   ├── media/               # Caches & temporary local images
│   ├── templates/           # Styling templates & Tailwind config
│   └── utils/               # PDF exporters & multi-threaded workers
├── scripts/                 # Asset builders & maintenance utilities
├── credentials.json         # Google OAuth Credentials (gitignore)
├── token.json               # Cached user session (gitignore)
├── index.js                 # App Entry point
└── README.md                # Documentation
```

---

## 📜 License
Licensed under the [ISC License](LICENSE).
