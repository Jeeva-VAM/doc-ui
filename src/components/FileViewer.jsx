import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { pdfjs } from 'react-pdf';

// Set worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const FileViewer = ({ pdfUrl, highlightedText, pdfTextContent, onTextSelect }) => {
  const [selectedText, setSelectedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [numPages, setNumPages] = useState(null);
  const [matches, setMatches] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [totalMatches, setTotalMatches] = useState(0);
  const [canvases, setCanvases] = useState([]);
  const [contexts, setContexts] = useState([]);
  const [pages, setPages] = useState([]);
  const [viewports, setViewports] = useState([]);
  const [pdfDoc, setPdfDoc] = useState(null);
  const fileViewerRef = useRef(null);

  // Load PDF and render to canvases
  useEffect(() => {
    if (!pdfUrl) return;

    const loadPdf = async () => {
      try {
        setIsLoading(true);
        const loadingTask = pdfjs.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        const numPages = pdf.numPages;

        const newCanvases = [];
        const newContexts = [];
        const newPages = [];
        const newViewports = [];

        // Clear previous content
        if (fileViewerRef.current) {
          const container = fileViewerRef.current.querySelector('.pdf-container');
          if (container) container.innerHTML = '';
        }

        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.setAttribute('data-page-number', i.toString());

          const container = fileViewerRef.current?.querySelector('.pdf-container');
          if (container) container.appendChild(canvas);

          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport: viewport }).promise;

          newCanvases.push(canvas);
          newContexts.push(ctx);
          newPages.push(page);
          newViewports.push(viewport);
        }

        setCanvases(newCanvases);
        setContexts(newContexts);
        setPages(newPages);
        setViewports(newViewports);
        setNumPages(numPages);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading PDF:', error);
        setIsLoading(false);
        toast.error('Failed to load PDF');
      }
    };

    loadPdf();
  }, [pdfUrl]);

  // Highlight helper function
  const highlightBox = (ctx, rect) => {
    ctx.save();
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.setLineDash([]); // solid line

    const x1 = Math.min(rect[0], rect[2]);
    let y1 = Math.min(rect[1], rect[3]);
    const x2 = Math.max(rect[0], rect[2]);
    const y2 = Math.max(rect[1], rect[3]);

    // Lift the bounding box to top by 75% of its height
    const boxHeight = y2 - y1;
    y1 = y1 - boxHeight * 0.75;

    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    ctx.restore();
  };

  // Smart scroll to make highlighted text fully visible
  const scrollToHighlightedText = (canvas, rect) => {
    const container = fileViewerRef.current?.querySelector('.pdf-container');
    if (!container) return;

    // Get container dimensions and scroll position
    const containerRect = container.getBoundingClientRect();
    const containerScrollTop = container.scrollTop;
    const containerScrollLeft = container.scrollLeft;

    // Get canvas position relative to container
    const canvasRect = canvas.getBoundingClientRect();
    const canvasTop = canvasRect.top - containerRect.top + containerScrollTop;
    const canvasLeft = canvasRect.left - containerRect.left + containerScrollLeft;

    // Calculate highlighted rectangle position relative to container
    const highlightLeft = canvasLeft + rect[0];
    const highlightTop = canvasTop + rect[1];
    const highlightRight = canvasLeft + rect[2];
    const highlightBottom = canvasTop + rect[3];

    // Container viewport dimensions
    const containerHeight = container.clientHeight;
    const containerWidth = container.clientWidth;

    // Calculate required scroll positions to make highlighted text visible
    let newScrollTop = containerScrollTop;
    let newScrollLeft = containerScrollLeft;

    // Vertical scrolling logic - make sure highlight is visible
    if (highlightTop < containerScrollTop) {
      // Highlight is above viewport - scroll up to show it at the top with some padding
      newScrollTop = highlightTop - 20;
    } else if (highlightBottom > containerScrollTop + containerHeight) {
      // Highlight is below viewport - scroll down to show it at the bottom with some padding
      newScrollTop = highlightBottom - containerHeight + 20;
    } else {
      // Highlight is partially visible vertically - center it if it's small
      const highlightHeight = highlightBottom - highlightTop;
      if (highlightHeight < containerHeight * 0.8) {
        const centerY = (highlightTop + highlightBottom) / 2;
        newScrollTop = centerY - containerHeight / 2;
      }
    }

    // Horizontal scrolling logic - make sure highlight is visible
    if (highlightLeft < containerScrollLeft) {
      // Highlight is left of viewport - scroll left to show it
      newScrollLeft = highlightLeft - 20;
    } else if (highlightRight > containerScrollLeft + containerWidth) {
      // Highlight is right of viewport - scroll right to show it
      newScrollLeft = highlightRight - containerWidth + 20;
    } else {
      // Highlight is partially visible horizontally - center it if it's small
      const highlightWidth = highlightRight - highlightLeft;
      if (highlightWidth < containerWidth * 0.8) {
        const centerX = (highlightLeft + highlightRight) / 2;
        newScrollLeft = centerX - containerWidth / 2;
      }
    }

    // Apply smooth scrolling
    container.scrollTo({
      top: Math.max(0, newScrollTop),
      left: Math.max(0, newScrollLeft),
      behavior: 'smooth'
    });
  };

  // Search and highlight text when highlightedText changes
  useEffect(() => {
    if (!highlightedText || !pdfDoc || !contexts.length) {
      setCurrentMatchIndex(-1);
      setTotalMatches(0);
      return;
    }

    const searchAndHighlight = async () => {
      const term = highlightedText.trim().toLowerCase();
      if (!term) return;

      console.log(`Searching for: "${term}"`);

      // Clear canvases and re-render all pages
      for (let i = 0; i < pages.length; i++) {
        await pages[i].render({ canvasContext: contexts[i], viewport: viewports[i] }).promise;
      }

      let totalMatches = 0;
      const allMatches = [];

      for (let i = 0; i < pages.length; i++) {
        const textContent = await pages[i].getTextContent();
        textContent.items.forEach(item => {
          if (item.str.toLowerCase().includes(term)) {
            // Find the exact position of the search term within the text item
            const itemText = item.str.toLowerCase();
            const searchTerm = term;
            const startIndex = itemText.indexOf(searchTerm);

            if (startIndex !== -1) {
              // Calculate character width approximation
              const charWidth = item.width / item.str.length;
              const searchTermWidth = charWidth * searchTerm.length;
              const offsetX = charWidth * startIndex;

              // Get bounding box coordinates for just the search term
              const x = item.transform[4] + offsetX;
              const y = item.transform[5];
              const width = searchTermWidth;
              const height = item.height;

              // Use the exact text dimensions without extra padding
              const adjustedTop = y - height;
              const adjustedBottom = y;

              // Convert to viewport coordinates
              const rect = viewports[i].convertToViewportRectangle([x, adjustedTop, x + width, adjustedBottom]);
              // rect: [x1, y1, x2, y2]
              highlightBox(contexts[i], rect);
              totalMatches++;

              // Store match information for navigation
              allMatches.push({
                canvas: canvases[i],
                rect: rect,
                pageIndex: i
              });
            }
          }
        });
      }

      setMatches(allMatches);
      setTotalMatches(totalMatches);
      setCurrentMatchIndex(totalMatches > 0 ? 0 : -1);

      if (totalMatches === 0) {
        toast.info(`"${highlightedText}" not found in PDF`);
      } else {
        toast.success(`Found ${totalMatches} match(es)`);

        // Auto-scroll to the first match with smart positioning
        if (allMatches.length > 0) {
          setTimeout(() => {
            scrollToHighlightedText(allMatches[0].canvas, allMatches[0].rect);
          }, 100);
        }
      }
    };

    searchAndHighlight();
  }, [highlightedText, pdfDoc, pages, contexts, viewports, canvases]);

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
    const pageElement = document.querySelector(`canvas[data-page-number="${pageNumber}"]`);
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Navigate to next match
  const goToNextMatch = () => {
    if (totalMatches === 0) return;
    const nextIndex = (currentMatchIndex + 1) % totalMatches;
    setCurrentMatchIndex(nextIndex);

    // Scroll to the current match
    if (matches[nextIndex]) {
      scrollToHighlightedText(matches[nextIndex].canvas, matches[nextIndex].rect);
    }

    toast.info(`Match ${nextIndex + 1} of ${totalMatches}`);
  };

  // Navigate to previous match
  const goToPrevMatch = () => {
    if (totalMatches === 0) return;
    const prevIndex = currentMatchIndex === 0 ? totalMatches - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(prevIndex);

    // Scroll to the current match
    if (matches[prevIndex]) {
      scrollToHighlightedText(matches[prevIndex].canvas, matches[prevIndex].rect);
    }

    toast.info(`Match ${prevIndex + 1} of ${totalMatches}`);
  };

  // Clear search and hide search bar
  const clearSearch = () => {
    setTotalMatches(0);
    setCurrentMatchIndex(-1);
    // Clear the highlighted text in the parent component
    if (onTextSelect) {
      onTextSelect('');
    }
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
          <div className="pdf-container">
            {/* Canvases are dynamically added here */}
          </div>
          {totalMatches > 0 && (
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

