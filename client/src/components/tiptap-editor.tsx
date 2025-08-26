'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

const TiptapEditor = ({ content, onChange }: { content: string, onChange: (content: string) => void }) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return (
    <div>
      <div className="border rounded-md p-2 mb-2">
        <button onClick={() => editor?.chain().focus().toggleBold().run()} className={editor?.isActive('bold') ? 'is-active' : ''}>
          Bold
        </button>
        <button onClick={() => editor?.chain().focus().toggleItalic().run()} className={editor?.isActive('italic') ? 'is-active' : ''}>
          Italic
        </button>
        <button onClick={() => editor?.chain().focus().toggleStrike().run()} className={editor?.isActive('strike') ? 'is-active' : ''}>
          Strike
        </button>
      </div>
      <EditorContent editor={editor} className="border rounded-md p-2" />
    </div>
  );
};

export default TiptapEditor;
