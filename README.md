# DOC-UI

A comprehensive PDF document processing and form management application built with React, featuring advanced AI-powered text extraction, dynamic form generation, and intelligent data processing capabilities.

## 🚀 Features

### Core Functionality
- **PDF Processing**: Upload and process PDF documents with automatic text extraction using PDF.js
- **AI-Powered Analysis**: Send PDFs to backend APIs for advanced processing (MosaicML and LLM integration)
- **Dynamic Form Generation**: Convert extracted JSON data into interactive, editable forms with confidence scoring
- **Smart Text Highlighting**: Click on form fields to highlight corresponding text in PDFs using bounding box coordinates
- **Persistent Storage**: Save processed data using IndexedDB for offline access and project management

### Advanced Features
- **Project Management**: Create and manage multiple projects with organized folder structures
- **File Organization**: Hierarchical folder system for managing PDFs and JSON files
- **Real-time Form Editing**: Edit extracted data in both structured form view and raw JSON editor
- **Confidence Indicators**: Visual confidence scoring for extracted form fields with color-coded indicators
- **Export Capabilities**: Export processed data to JSON or Excel formats
- **Responsive Design**: Clean, modern UI that works across all devices

### API Integration
- **MosaicML Processing**: Send PDFs to `/mosaicml` endpoint for advanced document analysis
- **LLM Processing**: Send PDFs to `/llm` endpoint for AI-powered text processing
- **RESTful API Ready**: Built for easy backend integration with configurable endpoints

## 🛠️ Tech Stack

- **Frontend**: React 19 with modern hooks and concurrent features
- **Build Tool**: Vite with hot module replacement
- **PDF Processing**: PDF.js for client-side PDF parsing and text extraction
- **Storage**: IndexedDB for persistent browser-based storage
- **UI Components**: Custom responsive design with CSS
- **File Handling**: React Dropzone for drag-and-drop uploads
- **Data Export**: XLSX library for Excel file generation
- **Icons**: Lucide React for consistent iconography
- **Notifications**: React Hot Toast for user feedback

## 📁 Project Structure

```
src/
├── components/
│   ├── App.jsx              # Main application orchestrator
│   ├── Sidebar.jsx          # File management and project navigation
│   ├── FileViewer.jsx       # PDF display with text highlighting
│   ├── JsonForm.jsx         # Dynamic form generation and editing
│   ├── LandingPage.jsx      # Project selection and management
│   └── LandingPage.css      # Landing page styles
├── utils/
│   ├── db.js               # IndexedDB utilities for file storage
│   └── projectDB.js        # Project management database
└── assets/                 # Static assets
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd DOC-UI

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Backend Integration

The application is designed to work with backend APIs for PDF processing:

```javascript
// Example API endpoints expected:
POST /mosaicml  // For MosaicML processing
POST /llm       // For LLM processing

// Request format:
{
  file: PDF_Blob,
  filename: "document.pdf"
}
```

## 🎯 Usage

1. **Create Project**: Start by creating a new project from the landing page
2. **Upload PDFs**: Drag and drop PDF files into folders within your project
3. **Process Documents**: Use the process buttons (yellow/orange for MosaicML, green for LLM) to analyze PDFs
4. **Edit Forms**: Modify extracted data in the interactive form interface
5. **Search & Highlight**: Click on form fields to highlight corresponding text in the PDF
6. **Export Data**: Save processed data as JSON or Excel files

## 🔧 Configuration

### Environment Variables
Create a `.env` file for API configuration:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_MOSAICML_ENDPOINT=/mosaicml
VITE_LLM_ENDPOINT=/llm
```

### Build Configuration
The project uses Vite for building. Configuration can be found in `vite.config.ts`.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- PDF.js for excellent PDF processing capabilities
- React ecosystem for robust frontend development
- Vite for lightning-fast development experience
