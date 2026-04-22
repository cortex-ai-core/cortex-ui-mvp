"use client";

import React from "react";
import FileUploader from "./FileUploader";
// ❌ REMOVED: import SearchBar from "./SearchBar";

export default function KnowledgeLibrary({ documents = [], onRefresh }: any) {
  return (
    <div className="w-80 h-full border-r border-gray-300 flex flex-col bg-white">
      
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold tracking-wide">Knowledge Library</h2>
      </div>

      {/* Upload */}
      <div className="p-4 border-b border-gray-200">
        <FileUploader onUpload={onRefresh} />
      </div>

      {/* ❌ REMOVED Search Section */}

      {/* Document List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {documents.length === 0 && (
          <p className="text-gray-500 text-sm">No documents ingested yet.</p>
        )}

        {documents.map((doc: any) => (
          <div
            key={doc.id}
            className="p-3 bg-gray-100 rounded-md shadow-sm hover:bg-gray-200 transition"
          >
            <p className="font-medium">{doc.file_name}</p>
            <p className="text-xs text-gray-600">
              {new Date(doc.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
