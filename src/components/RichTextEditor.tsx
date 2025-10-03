"use client";

import React, { useState, useEffect, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Import Quill's styles

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder,
  className,
  readOnly = false,
}) => {
  const [editorValue, setEditorValue] = useState(value);

  useEffect(() => {
    setEditorValue(value);
  }, [value]);

  const handleChange = useCallback((content: string) => {
    setEditorValue(content);
    onChange(content);
  }, [onChange]);

  const modules = {
    toolbar: [
      [{ 'header': '1' }, { 'header': '2' }, { 'font': [] }],
      [{ size: [] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
      ['link', 'image', 'video'],
      ['clean']
    ],
  };

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image', 'video'
  ];

  return (
    <div className={className}>
      <ReactQuill
        theme="snow"
        value={editorValue}
        onChange={handleChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={readOnly}
        className="min-h-[200px]" // Ensure editor has a minimum height
      />
    </div>
  );
};

export default RichTextEditor;