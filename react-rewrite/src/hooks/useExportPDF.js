'use client';

import { useCallback } from 'react';
import { marked } from 'marked';

export default function useExportPDF() {
    const exportAsPDF = useCallback(async (markdownContent, fileName = 'document.pdf') => {
        try {
            // Dynamically import html2pdf only in the browser
            const html2pdf = (await import('html2pdf.js')).default;

            // Convert markdown to HTML first
            const htmlContent = marked(markdownContent);

            // Create a temporary div to hold the content
            const tempDiv = document.createElement('div');
            tempDiv.className = 'markdown-export';
            tempDiv.innerHTML = htmlContent;

            // Add some basic styling to make the PDF look nice
            const style = document.createElement('style');
            style.textContent = `
        .markdown-export {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .markdown-export h1 { font-size: 28px; margin-top: 20px; margin-bottom: 10px; }
        .markdown-export h2 { font-size: 24px; margin-top: 20px; margin-bottom: 10px; }
        .markdown-export h3 { font-size: 20px; margin-top: 15px; margin-bottom: 10px; }
        .markdown-export p { margin-bottom: 16px; }
        .markdown-export ul, .markdown-export ol { margin-bottom: 16px; padding-left: 20px; }
        .markdown-export li { margin-bottom: 8px; }
        .markdown-export code {
          font-family: monospace;
          background-color: #f5f5f5;
          padding: 2px 4px;
          border-radius: 3px;
        }
        .markdown-export pre {
          background-color: #f5f5f5;
          padding: 16px;
          border-radius: 4px;
          overflow: auto;
          margin-bottom: 16px;
        }
        .markdown-export table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 16px;
        }
        .markdown-export th, .markdown-export td {
          border: 1px solid #ddd;
          padding: 8px;
        }
        .markdown-export th {
          background-color: #f5f5f5;
          font-weight: bold;
          text-align: left;
        }
      `;

            tempDiv.appendChild(style);
            document.body.appendChild(tempDiv);

            // Configure html2pdf options
            const options = {
                margin: [15, 15],
                filename: fileName,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            // Generate PDF
            html2pdf()
                .set(options)
                .from(tempDiv)
                .save()
                .then(() => {
                    // Clean up
                    document.body.removeChild(tempDiv);
                })
                .catch(error => {
                    console.error('Error generating PDF:', error);
                    document.body.removeChild(tempDiv);
                });
        } catch (error) {
            console.error('Error during PDF export:', error);
            alert('Could not generate PDF. Please try again.');
        }
    }, []);

    return { exportAsPDF };
}