/// <reference types="vite/client" />
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

export default function CoachTab() {
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([
    { role: 'model', text: "Hi! I'm your Aura AI Coach. Tell me your goals, and I'll build a custom workout plan using your exercise library. For example: 'I want to train for mountaineering'." }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsLoading(true);

    try {
      const exercises = await db.exercises.toArray();
      
      if (!chatRef.current) {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        
        try {
          console.log('Gemini Init - Config:', { model: "gemini-flash-latest", hasKey: !!apiKey });
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ 
            model: "gemini-flash-latest",
            systemInstruction: `You are an elite personal trainer and AI coach for the Aura Fitness app.
Your goals:
1. Help users build complex training plans (e.g., mountaineering, resistance for running).
2. Recommend exercise substitutions based on equipment (e.g., bodyweight alternatives).
3. BOUND TO LIBRARY: Use the provided JSON exercise library for all recommendations. If an exercise is missing, suggest it but note it's new.
4. STRUCTURED PLANS: When providing a final plan, you MUST include a JSON block.
JSON Format:
\`\`\`json
{
  "templates": [
    {
      "name": "Leg Endurance (Mountaineering)",
      "description": "Building climbing stamina",
      "exercises": [
        { "name": "Squat", "targetSets": 4, "targetReps": 15 }
      ]
    }
  ]
}
\`\`\`
Be professional, motivating, and focus on functional fitness.`
          });

          chatRef.current = model.startChat({ history: [] });
          console.log('Gemini Init - Chat started successfully');
        } catch (initErr) {
          console.error('Gemini Init Failed:', initErr);
          throw initErr;
        }
      }




      // Add fresh library context with every message to ensure it's up to date
      const libraryContext = `[CURRENT EXERCISE LIBRARY: ${JSON.stringify(exercises.map(e => ({name: e.name, muscleGroup: e.muscleGroup, equipment: e.equipment}))).slice(0, 3000)}]`;
      
      const prompt = `${libraryContext}\n\nUser: ${userMsg}`;

      
      // Start streaming
      const result = await chatRef.current.sendMessageStream(prompt);
      
      let fullText = "";
      setMessages(prev => [...prev, { role: 'model', text: "" }]);
      
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].text = fullText;
          return newMessages;
        });
      }

      // After streaming finishes, check for JSON to auto-save
      const jsonMatch = fullText.match(/\`\`\`json\n([\s\S]*?)\n\`\`\`/);
      if (jsonMatch) {
        try {
          setIsSaving(true);
          const parsed = JSON.parse(jsonMatch[1]);
          if (parsed.templates && Array.isArray(parsed.templates)) {
            let savedCount = 0;
            for (const t of parsed.templates) {
              const templateExercises = [];
              for (const ex of t.exercises) {
                const matchedEx = exercises.find(e => 
                  e.name.toLowerCase() === ex.name.toLowerCase() || 
                  e.name.toLowerCase().includes(ex.name.toLowerCase())
                );
                if (matchedEx) {
                  templateExercises.push({
                    exerciseId: matchedEx.id,
                    targetSets: ex.targetSets || 3,
                    targetReps: ex.targetReps || 10
                  });
                }
              }
              
              if (templateExercises.length > 0) {
                await db.templates.add({
                  id: uuidv4(),
                  name: t.name,
                  description: t.description || "",
                  exercises: templateExercises,
                  createdAt: Date.now()
                });
                savedCount++;
              }
            }

            if (savedCount > 0) {
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1].text = fullText.replace(jsonMatch[0], `\n\n✨ **Aura Sync:** Automatically saved ${savedCount} workouts to your library.`);
                return newMessages;
              });
            }
          }
        } catch (e) {
          console.error("Auto-save failed", e);
        } finally {
          setIsSaving(false);
        }
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I had trouble connecting. Please check your API key." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative bg-black">
      <div className="px-6 py-4 border-b border-white/10 bg-black/80 backdrop-blur-xl sticky top-0 z-10 shrink-0 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Aura Coach</h2>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-apple-green animate-pulse" />
            <span className="text-[10px] text-apple-text-muted font-bold tracking-widest uppercase">Online</span>
          </div>
        </div>
        {isSaving && (
          <div className="flex items-center gap-2 bg-apple-accent/10 border border-apple-accent/20 px-3 py-1 rounded-full animate-in zoom-in duration-300">
            <div className="w-2 h-2 rounded-full bg-apple-accent animate-ping" />
            <span className="text-[10px] text-apple-accent font-black uppercase tracking-tight">Syncing Plans</span>
          </div>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-apple-accent text-black' : 'bg-apple-card border border-white/10'}`}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-apple-accent text-black rounded-tr-sm' : 'bg-apple-card border border-white/5 rounded-tl-sm'}`}>
              {msg.text.split('\n').map((line, i) => <p key={i} className="mb-1 last:mb-0">{line}</p>)}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-apple-card border border-white/10 flex items-center justify-center shrink-0">
              <Bot size={16} />
            </div>
            <div className="bg-apple-card border border-white/5 rounded-2xl rounded-tl-sm p-4 flex gap-1 items-center">
              <div className="w-2 h-2 bg-apple-text-muted rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-apple-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-apple-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 px-6 py-4 bg-gradient-to-t from-black via-black to-transparent">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask your coach..."
            className="w-full bg-apple-card border border-white/10 rounded-full py-3.5 pl-5 pr-12 text-white placeholder:text-apple-text-muted focus:outline-none focus:border-apple-accent transition-colors"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 w-10 h-10 bg-apple-accent text-black rounded-full flex items-center justify-center disabled:opacity-50 disabled:bg-white/10 disabled:text-white/50 transition-colors"
          >
            <Send size={18} className="ml-0.5" />
          </button>
        </div>
      </div>

    </div>
  );
}
