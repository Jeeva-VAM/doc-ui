# React + JavaScript + Vite

A comprehensive PDF document processing UI built with React and Vite, featuring advanced text extraction, form generation, and persistent storage capabilities.

## Features

- **PDF Processing**: Upload and process PDF documents with automatic text extraction
- **Dynamic Form Generation**: Convert extracted JSON data into interactive, editable forms
- **Advanced Text Search**: Click on form fields to highlight corresponding text in PDFs using bounding boxes
- **Persistent Storage**: Save processed data using IndexedDB for offline access
- **JSON Editing**: Edit extracted data in both form and raw JSON views
- **Export Functionality**: Export processed data to JSON or Excel formats
- **File Management**: Organize PDFs and JSON files in a folder-based structure

## Tech Stack

- **React 19** - Modern React with hooks and concurrent features
- **Vite** - Fast build tool with hot module replacement
- **PDF.js** - Client-side PDF processing and text extraction
- **IndexedDB** - Browser-based persistent storage
- **React PDF** - PDF rendering and display
- **XLSX** - Excel file generation
- **React Dropzone** - Drag-and-drop file uploads

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── App.jsx          # Main application component
│   ├── FileViewer.jsx   # PDF display with text highlighting
│   ├── JsonForm.jsx     # Dynamic form generation and editing
│   └── Sidebar.jsx      # File management interface
├── utils/
│   └── db.js           # IndexedDB utilities
└── assets/             # Static assets
```

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown-vite)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).vaScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      // Other configs...

      // Add recommended React rules
      'plugin:react/recommended',
      'plugin:react-hooks/recommended',

      // Other configs...
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        // Add other globals as needed
      },
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs.recommended,
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
      },
    },
  },
])
```
