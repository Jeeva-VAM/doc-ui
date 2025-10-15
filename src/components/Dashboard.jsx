import React, { useState } from 'react';
import FileViewer from './FileViewer';
import JsonForm from './JsonForm';
import './Dashboard.css';

const Dashboard = ({ 
  selectedFile,
  pdfUrl, 
  highlightedText, 
  highlightedField, 
  pdfTextContent, 
  onTextSelect, 
  onPageWidthChange, 
  containerWidth,
  jsonData,
  setJsonData,
  onFieldClick,
  panelRightWidth,
  panelLeftWidth
}) => {
  const [activeTab, setActiveTab] = useState('extract');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'extract':
        return (
          <div className="extract-content">
            <div className="panel-right" style={panelRightWidth ? { width: `${panelRightWidth}px`, flex: 'none' } : {}}>
              {!selectedFile ? (
                <div className="empty-panel">
                  <p className="empty-message"></p>
                </div>
              ) : selectedFile.type === 'application/pdf' && jsonData ? (
                <FileViewer 
                  pdfUrl={pdfUrl}
                  highlightedText={highlightedText}
                  highlightedField={highlightedField}
                  pdfTextContent={pdfTextContent}
                  onTextSelect={onTextSelect}
                  onPageWidthChange={onPageWidthChange}
                  containerWidth={containerWidth}
                />
              ) : selectedFile.type === 'application/json' && pdfUrl ? (
                <FileViewer 
                  pdfUrl={pdfUrl}
                  highlightedText={highlightedText}
                  highlightedField={highlightedField}
                  pdfTextContent={pdfTextContent}
                  onTextSelect={onTextSelect}
                  onPageWidthChange={onPageWidthChange}
                  containerWidth={containerWidth}
                />
              ) : selectedFile.type === 'application/pdf' ? (
                <div className="empty-panel">
                  <p className="empty-message">Click "Process" to view the result form</p>
                </div>
              ) : (
                <div className="empty-panel">
                  <p className="empty-message"></p>
                </div>
              )}
            </div>
            <div className="panel-left" style={panelLeftWidth ? { width: `${panelLeftWidth}px`, flex: 'none' } : {}}>
              {!selectedFile ? (
                <div className="empty-panel">
                  <p className="empty-message">Select a PDF file to view</p>
                </div>
              ) : selectedFile.type === 'application/pdf' && jsonData ? (
                <JsonForm
                  jsonData={jsonData}
                  setJsonData={setJsonData}
                  onFieldClick={onFieldClick}
                />
              ) : selectedFile.type === 'application/pdf' && pdfUrl ? (
                <FileViewer 
                  pdfUrl={pdfUrl}
                  highlightedText={highlightedText}
                  pdfTextContent={pdfTextContent}
                  onTextSelect={onTextSelect}
                />
              ) : selectedFile.type === 'application/json' && jsonData && typeof jsonData === 'object' ? (
                <JsonForm
                  jsonData={jsonData}
                  setJsonData={setJsonData}
                  onFieldClick={onFieldClick}
                />
              ) : (
                <div className="empty-panel">
                  <p className="empty-message">Select a JSON file or process a PDF to view results</p>
                </div>
              )}
            </div>
          </div>
        );
      case 'ba':
        return (
          <div className="ba-content">
            <h2>Business Analysis</h2>
            <p>This is a placeholder for the BA (Business Analysis) section.</p>
            <p>Future features will be implemented here.</p>
          </div>
        );
      case 'qa':
        return (
          <div className="qa-content">
            <h2>Quality Assurance</h2>
            <p>This is a placeholder for the QA (Quality Assurance) section.</p>
            <p>Future features will be implemented here.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-tabs">
        <button 
          className={`tab-button ${activeTab === 'extract' ? 'active' : ''}`}
          onClick={() => setActiveTab('extract')}
        >
          Extract
        </button>
        <button 
          className={`tab-button ${activeTab === 'ba' ? 'active' : ''}`}
          onClick={() => setActiveTab('ba')}
        >
          BA
        </button>
        <button 
          className={`tab-button ${activeTab === 'qa' ? 'active' : ''}`}
          onClick={() => setActiveTab('qa')}
        >
          QA
        </button>
      </div>
      <div className="dashboard-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default Dashboard;
