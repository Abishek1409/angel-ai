import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  BookOpen, 
  Plus, 
  Trash2, 
  X, 
  Menu, 
  Loader2, 
  Database,
  FileText,
  Sparkles,
  Globe,
  UploadCloud,
  Cpu
} from 'lucide-react';


const SYSTEM_PROMPT = `You are Angel AI. Answer questions directly using the provided context. 
Do not use greetings (like Hello, Hi, or Greetings) in your responses. 
Do not include meta-comments, filler phrases, or introductory sentences (e.g., "Here is the answer", "Based on the context").
Provide the answer immediately and be as helpful as possible using your knowledge.`;

const AngelAI = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "System online. Knowledge Base ready for data injection." }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState([]); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPdfLibReady, setIsPdfLibReady] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // --- Load PDF.js from CDN dynamically ---
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.async = true;
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
        setIsPdfLibReady(true);
      }
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const retrieveContext = (query) => {
    if (documents.length === 0) return "";
    
    const contextString = documents.map((doc, index) => {
      return `SOURCE [${index + 1}] (${doc.title}):\n${doc.content}\n`;
    }).join("\n---\n");

    return contextString;
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const context = retrieveContext(input);

      const systemMessage = {
        role: 'system',
        content: `${SYSTEM_PROMPT}\n\nHere is the available Context/Knowledge Base:\n${context ? context : 'No specific documents provided. Answer using your own knowledge.'}`
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            systemMessage,
            { role: 'user', content: userMessage.content }
          ],
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Server error');
      }

      const botResponse = data.choices?.[0]?.message?.content || 'No response generated.';

      setMessages(prev => [...prev, { role: 'assistant', content: botResponse }]);

    } catch (error) {
      console.error("Error calling Angel AI:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}.` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);

    try {
      let content = "";
      
      if (file.type === "application/pdf") {
        if (!isPdfLibReady || !window.pdfjsLib) {
            throw new Error("PDF Library is still loading. Please try again in a moment.");
        }

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item) => item.str).join(' ');
          content += `\n[Page ${i}]\n${pageText}`;
        }
      } else {
        content = await file.text();
      }

      if (!content.trim()) {
        alert("Could not extract text from this file. It might be an image-only PDF or empty.");
      } else {
        setDocuments(prev => [...prev, { id: Date.now(), title: file.name, content }]);
      }

    } catch (error) {
      console.error("Upload failed:", error);
      alert(`Failed to read file: ${error.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeDocument = (id) => {
    setDocuments(documents.filter(doc => doc.id !== id));
  };

  const renderMessage = (msg, index) => {
    const isBot = msg.role === 'assistant';
    return (
      <div key={index} className={`flex w-full ${isBot ? 'justify-start' : 'justify-end'} mb-6`}>
        <div className={`flex max-w-[85%] md:max-w-[70%] ${isBot ? 'flex-row' : 'flex-row-reverse'} items-start gap-3`}>
          
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${isBot ? 'bg-slate-800 border-slate-700 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
            {isBot ? <Cpu size={18} /> : <User size={18} />}
          </div>

          <div className={`p-4 rounded-xl text-sm leading-relaxed shadow-sm border ${
            isBot 
              ? 'bg-slate-900 border-slate-800 text-slate-300 rounded-tl-none' 
              : 'bg-cyan-900/30 border-cyan-800 text-cyan-50 rounded-tr-none'
          }`}>
             {msg.content.split('\n').map((line, i) => (
                <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
             ))}
          </div>

        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-slate-950 font-sans text-slate-200 overflow-hidden selection:bg-cyan-500/30">
      
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileSelect} 
        accept=".pdf,.txt,.md,.json,.js,.csv"
        className="hidden" 
      />

      {/* --- Sidebar --- */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-80 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 flex flex-col
      `}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xl tracking-wider">
                <Database size={24} />
                <span>DATA CORE</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-500 hover:text-slate-200 p-2 rounded-lg">
                <X size={20} />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="bg-slate-800/50 p-3 rounded border border-slate-700 text-xs text-slate-400 mb-4">
                <p className="font-semibold text-cyan-400 flex items-center gap-1 mb-1"><Cpu size={14}/> RAG PROTOCOL:</p>
                Ingest documents to augment neural responses.
            </div>

            {documents.length === 0 ? (
                <div className="text-center py-10 text-slate-700">
                    <FileText size={48} className="mx-auto mb-2 opacity-20" />
                    <p className="text-sm font-medium">No Data Found</p>
                    <p className="text-xs opacity-50">Upload payload to initialize</p>
                </div>
            ) : (
                documents.map(doc => (
                    <div key={doc.id} className="group bg-slate-800 border border-slate-700 rounded p-3 hover:border-cyan-500/50 transition-all relative">
                        <div className="flex items-start justify-between">
                            <h3 className="font-semibold text-slate-300 text-sm truncate pr-6">{doc.title}</h3>
                            <button 
                                onClick={() => removeDocument(doc.id)}
                                className="text-slate-600 hover:text-red-400 transition-colors"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 line-clamp-2 font-mono">
                            {doc.content.substring(0, 150)}...
                        </p>
                    </div>
                ))
            )}
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900">
            <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 border border-slate-700 text-slate-300 py-3 rounded hover:bg-slate-700 hover:text-cyan-400 hover:border-slate-600 transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
            >
                {isUploading ? (
                    <Loader2 size={16} className="animate-spin text-cyan-400" />
                ) : (
                    <UploadCloud size={16} className="text-cyan-500" />
                )}
                {isUploading ? "INGESTING..." : "UPLOAD PAYLOAD"}
            </button>
        </div>
      </div>

      {/* --- Main Interface --- */}
      <div className="flex-1 flex flex-col h-full relative bg-slate-950">
        
        <div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 md:px-6 shrink-0 z-20">
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-100 rounded-lg"
                >
                    <Menu size={20} />
                </button>
                <div className="w-8 h-8 bg-cyan-900/20 border border-cyan-500/30 rounded flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                    <Bot size={20} />
                </div>
                <div>
                    <h1 className="font-bold text-slate-100 tracking-wide text-lg">ANGEL AI <span className="text-xs font-normal text-slate-500 ml-1">v2.5</span></h1>
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.6)] animate-pulse"></span>
                        <p className="text-[10px] text-cyan-400 font-mono tracking-wider uppercase">Online</p>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-2 text-cyan-400 bg-cyan-950/30 border border-cyan-900/50 px-3 py-1.5 rounded-full">
                <Cpu size={12} />
                <span className="text-[10px] font-mono tracking-wider uppercase">RAG Mode</span>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            <div className="max-w-3xl mx-auto">
                {messages.map(renderMessage)}
                
                {isLoading && (
                    <div className="flex w-full justify-start mb-6">
                         <div className="flex max-w-[85%] flex-row items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center border bg-slate-800 border-slate-700 text-cyan-400">
                                <Cpu size={18} />
                            </div>
                            <div className="bg-slate-900 px-4 py-3 rounded-xl rounded-tl-none border border-slate-800 flex items-center gap-3">
                                <Loader2 size={16} className="animate-spin text-cyan-500" />
                                <span className="text-xs text-slate-400 font-mono animate-pulse">COMPUTING...</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
        </div>

        <div className="p-4 bg-slate-900 border-t border-slate-800 shrink-0">
            <div className="max-w-3xl mx-auto relative group">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Enter command or query..."
                    disabled={isLoading}
                    className="w-full pl-5 pr-14 py-4 bg-slate-800 border border-slate-700 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 rounded text-slate-200 placeholder-slate-600 outline-none transition-all font-mono text-sm"
                />
                <button 
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="absolute right-2 top-2 bottom-2 aspect-square bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded flex items-center justify-center transition-all shadow-[0_0_10px_rgba(8,145,178,0.3)] hover:shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                >
                    <Send size={18} />
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};

export default AngelAI;