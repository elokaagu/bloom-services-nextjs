"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
} from "lucide-react";
import Image from "next/image";

interface PDFViewerProps {
  pages: Array<{
    pageNumber: number;
    imageData: string;
  }>;
  title: string;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ pages, title }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(pages.length - 1, prev + 1));
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(3, prev + 0.25));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(0.5, prev - 0.25));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          handlePreviousPage();
          break;
        case "ArrowRight":
          handleNextPage();
          break;
        case "+":
        case "=":
          handleZoomIn();
          break;
        case "-":
          handleZoomOut();
          break;
        case "r":
          handleRotate();
          break;
        default:
          break;
      }
    },
    [currentPage, pages.length]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!pages || pages.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <p className="text-gray-500">No pages available</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-gray-50">
      {/* PDF Viewer Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold truncate max-w-md">{title}</h3>
          <span className="text-sm text-gray-500">
            Page {currentPage + 1} of {pages.length}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Navigation Controls */}
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === pages.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center space-x-1">
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* Rotate Control */}
          <Button variant="outline" size="sm" onClick={handleRotate}>
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex justify-center">
          <div
            className="bg-white shadow-lg rounded-lg overflow-hidden"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: "center top",
            }}
          >
            <Image
              src={pages[currentPage]?.imageData}
              alt={`Page ${currentPage + 1}`}
              width={800}
              height={1000}
              className="max-w-full h-auto"
              style={{
                maxHeight: "80vh",
                width: "auto",
              }}
            />
          </div>
        </div>
      </div>

      {/* Page Thumbnails */}
      <div className="p-4 bg-white border-t">
        <div className="flex space-x-2 overflow-x-auto">
          {pages.map((page, index) => (
            <button
              key={index}
              onClick={() => setCurrentPage(index)}
              className={`flex-shrink-0 w-16 h-20 border-2 rounded overflow-hidden ${
                index === currentPage
                  ? "border-blue-500 ring-2 ring-blue-200"
                  : "border-gray-300 hover:border-gray-400"
              }`}
            >
              <Image
                src={page.imageData}
                alt={`Thumbnail ${index + 1}`}
                width={64}
                height={80}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="px-4 py-2 bg-gray-100 text-xs text-gray-600">
        <span className="font-medium">Keyboard shortcuts:</span>{" "}
        <span>← → (navigate)</span> <span>+ - (zoom)</span>{" "}
        <span>R (rotate)</span>
      </div>
    </div>
  );
};
