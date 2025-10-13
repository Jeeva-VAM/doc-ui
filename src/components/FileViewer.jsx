import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const FileViewer = ({ pdfUrl, highlightedText, pdfTextContent, onTextSelect }) => {
  const [selectedText, setSelectedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [numPages, setNumPages] = useState(null);
  const [matches, setMatches] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [totalMatches, setTotalMatches] = useState(0);
  const [textItems, setTextItems] = useState({});
  const [highlightBoxes, setHighlightBoxes] = useState([]);
  const [pageRefs, setPageRefs] = useState({});
  const fileViewerRef = useRef(null);
  const pdfDocumentRef = useRef(null);

  // Extract text with positions from PDF
  const extractTextWithPositions = async (pdf) => {
    const allTextItems = {};
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });
      
      allTextItems[pageNum] = {
        items: textContent.items.map(item => ({
          text: item.str,
          x: item.transform[4],
          y: viewport.height - item.transform[5],
          width: item.width,
          height: item.height,
          transform: item.transform
        })),
        viewport
      };
    }
    
    return allTextItems;
  };

  // Load PDF and extract text positions
  useEffect(() => {
    if (!pdfUrl) return;

    const loadPdfText = async () => {
      try {
        const loadingTask = pdfjs.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        pdfDocumentRef.current = pdf;
        const items = await extractTextWithPositions(pdf);
        setTextItems(items);
      } catch (error) {
        console.error('Error loading PDF text:', error);
        toast.error('Failed to load PDF text content');
      }
    };

    loadPdfText();
  }, [pdfUrl]);

  // Find and highlight text when highlightedText changes
  useEffect(() => {
    if (!highlightedText || !Object.keys(textItems).length) {
      setHighlightBoxes([]);
      setCurrentMatchIndex(-1);
      setTotalMatches(0);
      return;
    }

    const searchText = highlightedText.toLowerCase().trim();
    if (!searchText) {
      setHighlightBoxes([]);
      setCurrentMatchIndex(-1);
      setTotalMatches(0);
      return;
    }

    console.log(`FileViewer searching for: "${searchText}"`);
    const boxes = [];

    // Search through all pages
    Object.entries(textItems).forEach(([pageNum, pageData]) => {
      const { items } = pageData;
      
      // Create searchable text variations
      const searchVariations = [
        searchText,
        searchText.replace(/\s+/g, ''), // Remove spaces
        searchText.replace(/\s+/g, '_'), // Replace spaces with underscores
        searchText.replace(/\s+/g, '-'), // Replace spaces with hyphens
        ...searchText.split(' ').filter(word => word.length > 2) // Individual words > 2 chars
      ];
      
      // Try to find exact matches first
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemText = item.text.toLowerCase();
        
        // Check for any search variation match in single item
        for (const variation of searchVariations) {
          if (itemText.includes(variation)) {
            boxes.push({
              pageNumber: parseInt(pageNum),
              x: item.x,
              y: item.y,
              width: item.width,
              height: item.height,
              text: item.text,
              matchType: 'exact'
            });
            break;
          }
        }
        
        // Check for multi-word matches across consecutive items
        if (!boxes.some(box => box.pageNumber === parseInt(pageNum) && 
                            Math.abs(box.x - item.x) < 10 && 
                            Math.abs(box.y - item.y) < 10)) {
          let combinedText = itemText;
          let startIdx = i;
          let endIdx = i;
          let totalWidth = item.width;
          let minY = item.y;
          let maxHeight = item.height;
          let minX = item.x;
          
          // Look ahead to combine text
          for (let j = i + 1; j < Math.min(i + 20, items.length); j++) {
            const nextItem = items[j];
            const nextText = nextItem.text.toLowerCase();
            
            // Only combine if items are relatively close horizontally
            if (Math.abs(nextItem.x - (items[j-1].x + items[j-1].width)) < 20) {
              combinedText += ' ' + nextText;
              
              // Check if any search variation matches the combined text
              for (const variation of searchVariations) {
                if (combinedText.includes(variation)) {
                  endIdx = j;
                  totalWidth = (nextItem.x + nextItem.width) - item.x;
                  maxHeight = Math.max(maxHeight, nextItem.height);
                  minY = Math.min(minY, nextItem.y);
                  minX = Math.min(minX, item.x);
                  
                  boxes.push({
                    pageNumber: parseInt(pageNum),
                    x: minX,
                    y: minY,
                    width: totalWidth,
                    height: maxHeight,
                    text: items.slice(startIdx, endIdx + 1).map(it => it.text).join(' '),
                    matchType: 'combined'
                  });
                  
                  // Skip to end of matched sequence
                  i = endIdx;
                  break;
                }
              }
              if (endIdx > i) break; // Found a match, exit inner loop
            } else {
              break; // Items too far apart, stop combining
            }
          }
        }
      }
    });

    // Remove duplicate boxes (same position)
    const uniqueBoxes = boxes.filter((box, index, self) => 
      index === self.findIndex(b => 
        b.pageNumber === box.pageNumber && 
        Math.abs(b.x - box.x) < 5 && 
        Math.abs(b.y - box.y) < 5
      )
    );

    console.log(`Found ${uniqueBoxes.length} matches for "${searchText}"`);
    setHighlightBoxes(uniqueBoxes);
    setTotalMatches(uniqueBoxes.length);
    setCurrentMatchIndex(uniqueBoxes.length > 0 ? 0 : -1);

    if (uniqueBoxes.length > 0) {
      setTimeout(() => scrollToPage(uniqueBoxes[0].pageNumber), 100);
      toast.success(`Found ${uniqueBoxes.length} match(es)`);
    } else {
      toast.info(`"${highlightedText}" not found in PDF`);
    }
  }, [highlightedText, textItems]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  const onDocumentLoadError = (error) => {
    console.error('Error loading PDF:', error);
    setIsLoading(false);
  };

  const onLoadStart = () => {
    setIsLoading(true);
  };

  // Scroll to a specific page
  const scrollToPage = (pageNumber) => {
    const pageElement = document.querySelector(`[data-page-number="${pageNumber}"]`);
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Navigate to next match
  const goToNextMatch = () => {
    if (highlightBoxes.length === 0) return;
    const nextIndex = (currentMatchIndex + 1) % highlightBoxes.length;
    setCurrentMatchIndex(nextIndex);
    const match = highlightBoxes[nextIndex];
    setTimeout(() => scrollToPage(match.pageNumber), 50);
  };

  // Navigate to previous match
  const goToPrevMatch = () => {
    if (highlightBoxes.length === 0) return;
    const prevIndex = currentMatchIndex === 0 ? highlightBoxes.length - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(prevIndex);
    const match = highlightBoxes[prevIndex];
    setTimeout(() => scrollToPage(match.pageNumber), 50);
  };

  // Clear search and hide search bar
  const clearSearch = () => {
    setHighlightBoxes([]);
    setTotalMatches(0);
    setCurrentMatchIndex(-1);
    // Clear the highlighted text in the parent component
    if (onTextSelect) {
      onTextSelect('');
    }
  };

  // Render highlight boxes for a specific page
  const HighlightLayer = ({ pageNumber, canvas }) => {
    if (!canvas) return null;
    
    const pageBoxes = highlightBoxes.filter(box => box.pageNumber === pageNumber);
    if (pageBoxes.length === 0) return null;

    const pageData = textItems[pageNumber];
    if (!pageData) return null;

    const scale = canvas.width / pageData.viewport.width;

    return (
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 2
      }}>
        {pageBoxes.map((box, idx) => {
          const isActive = highlightBoxes.indexOf(box) === currentMatchIndex;
          return (
            <div
              key={idx}
              style={{
                position: 'absolute',
                left: `${box.x * scale}px`,
                top: `${box.y * scale}px`,
                width: `${box.width * scale}px`,
                height: `${box.height * scale}px`,
                border: isActive ? '3px solid #ff0000' : '2px solid #ffa500',
                backgroundColor: isActive ? 'rgba(255, 0, 0, 0.2)' : 'rgba(255, 255, 0, 0.3)',
                boxShadow: isActive ? '0 0 10px rgba(255, 0, 0, 0.5)' : 'none',
                transition: 'all 0.3s ease',
                pointerEvents: 'none',
                boxSizing: 'border-box'
              }}
              title={box.text}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="file-viewer" ref={fileViewerRef}>
      {pdfUrl ? (
        <>
          {isLoading && (
            <div className="pdf-loading">
              Loading PDF pages...
            </div>
          )}
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            onLoadStart={onLoadStart}
            loading=""
            className="pdf-container"
          >
            {Array.from(new Array(numPages), (el, index) => {
              const pageNumber = index + 1;
              return (
                <div key={`page_wrapper_${pageNumber}`} style={{ position: 'relative' }}>
                  <Page
                    pageNumber={pageNumber}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    className="pdf-page"
                    data-page-number={pageNumber}
                    onRenderSuccess={(page) => {
                      setPageRefs(prev => ({ ...prev, [pageNumber]: page.canvas }));
                    }}
                  />
                  {pageRefs[pageNumber] && <HighlightLayer pageNumber={pageNumber} canvas={pageRefs[pageNumber]} />}
                </div>
              );
            })}
          </Document>
          {highlightBoxes.length > 0 && (
            <div className="search-bar">
              <div className="search-info">
                {currentMatchIndex + 1} of {totalMatches}
              </div>
              <button onClick={goToPrevMatch} className="search-btn">↑</button>
              <button onClick={goToNextMatch} className="search-btn">↓</button>
              <button onClick={clearSearch} className="search-btn cancel-btn">×</button>
            </div>
          )}
        </>
      ) : (
        <div className="no-file">Click "View PDF" to display the PDF</div>
      )}
    </div>
  );
};

export default React.memo(FileViewer);

