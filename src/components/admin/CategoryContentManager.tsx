import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Save, Trash2, Pencil, CheckCircle, AlertCircle, Upload, FileText, List } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { toast } from 'sonner';
import type { Category, Question, BulkImportRequest } from '@shared/types';
interface CategoryContentManagerProps {
  category: Category;
  isOpen: boolean;
  onClose: () => void;
}
const questionSchema = z.object({
  text: z.string().min(5, "Question text must be at least 5 characters"),
  option0: z.string().min(1, "Option 1 is required"),
  option1: z.string().min(1, "Option 2 is required"),
  option2: z.string().min(1, "Option 3 is required"),
  option3: z.string().min(1, "Option 4 is required"),
  correctIndex: z.string(),
});
type QuestionFormData = z.infer<typeof questionSchema>;
export function CategoryContentManager({ category, isOpen, onClose }: CategoryContentManagerProps) {
  const user = useAuthStore(s => s.user);
  const [activeTab, setActiveTab] = useState("list");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Bulk Import State
  const [bulkText, setBulkText] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<Partial<Question>[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm<QuestionFormData>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      correctIndex: "0"
    }
  });
  const fetchQuestions = useCallback(async () => {
    if (!user || !isOpen) return;
    setIsLoading(true);
    try {
      const data = await api<Question[]>(`/api/admin/questions?userId=${user.id}&categoryId=${category.id}&limit=1000`);
      setQuestions(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load questions");
    } finally {
      setIsLoading(false);
    }
  }, [user, category.id, isOpen]);
  useEffect(() => {
    if (isOpen) {
      fetchQuestions();
      setActiveTab("list");
      setBulkText('');
      setParsedQuestions([]);
      setEditingId(null);
      reset();
    }
  }, [isOpen, fetchQuestions, reset]);
  const onSubmit = async (data: QuestionFormData) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const payload = {
        text: data.text,
        categoryId: category.id,
        options: [data.option0, data.option1, data.option2, data.option3],
        correctIndex: parseInt(data.correctIndex, 10)
      };
      if (editingId) {
        const updatedQuestion = await api<Question>(`/api/admin/questions/${editingId}?userId=${user.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        toast.success("Question updated successfully!");
        setQuestions(prev => prev.map(q => q.id === editingId ? updatedQuestion : q));
        setEditingId(null);
        setActiveTab("list");
      } else {
        const newQuestion = await api<Question>('/api/admin/questions', {
          method: 'POST',
          body: JSON.stringify({ userId: user.id, question: payload })
        });
        toast.success("Question created successfully!");
        setQuestions(prev => [newQuestion, ...prev]);
        setActiveTab("list");
      }
      reset({
        correctIndex: "0",
        text: '',
        option0: '',
        option1: '',
        option2: '',
        option3: ''
      });
    } catch (err) {
      console.error(err);
      toast.error(editingId ? "Failed to update question" : "Failed to create question");
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleEdit = (q: Question) => {
    setEditingId(q.id);
    setValue('text', q.text);
    setValue('option0', q.options[0] || '');
    setValue('option1', q.options[1] || '');
    setValue('option2', q.options[2] || '');
    setValue('option3', q.options[3] || '');
    setValue('correctIndex', q.correctIndex.toString());
    setActiveTab('add');
  };
  const handleDelete = async (questionId: string) => {
    if (!user || deletingId) return;
    if (!confirm("Are you sure you want to delete this question?")) return;
    setDeletingId(questionId);
    try {
      await api(`/api/admin/questions/${questionId}?userId=${user.id}`, {
        method: 'DELETE'
      });
      setQuestions(prev => prev.filter(q => q.id !== questionId));
      toast.success("Question deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete question");
    } finally {
      setDeletingId(null);
    }
  };
  const parseQuestions = () => {
    if (!bulkText.trim()) return;
    const blocks = bulkText.split(/\n\s*\n/);
    const parsed: Partial<Question>[] = [];
    blocks.forEach(block => {
      const lines = block.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length < 2) return;
      const text = lines[0].replace(/^(?:Q|q)?\d+[.)]\s+/, '').trim();
      const rawOptions = lines.slice(1);
      const options: string[] = [];
      let correctIndex = 0;
      rawOptions.forEach((opt, idx) => {
        let clean = opt;
        let isCorrect = false;
        if (clean.startsWith('*')) {
          isCorrect = true;
          clean = clean.substring(1).trim();
        } else if (clean.startsWith('^')) {
          isCorrect = true;
          clean = clean.substring(1).trim();
        } else if (clean.toLowerCase().endsWith('(correct)')) {
          isCorrect = true;
          clean = clean.replace(/\(correct\)$/i, '').trim();
        }
        clean = clean.replace(/^[a-zA-Z][.)]\s+/, '');
        if (isCorrect) {
          correctIndex = idx;
        }
        options.push(clean);
      });
      const finalOptions = options.slice(0, 4);
      if (finalOptions.length >= 2) {
        parsed.push({
          text,
          options: finalOptions,
          correctIndex: correctIndex >= finalOptions.length ? 0 : correctIndex,
        });
      }
    });
    setParsedQuestions(parsed);
    if (parsed.length === 0) {
      toast.error("No valid questions found. Check format.");
    } else {
      toast.success(`Parsed ${parsed.length} questions.`);
    }
  };
  const handleBulkImport = async () => {
    if (!user || parsedQuestions.length === 0) return;
    setIsImporting(true);
    try {
      const payload: BulkImportRequest = {
        userId: user.id,
        questions: parsedQuestions,
        targetCategory: {
          mode: 'existing',
          id: category.id
        }
      };
      const res = await api<{ count: number; categoryId: string }>('/api/admin/questions/bulk', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      toast.success(`Successfully imported ${res.count} questions!`);
      setBulkText('');
      setParsedQuestions([]);
      fetchQuestions();
      setActiveTab('list');
    } catch (err) {
      console.error(err);
      toast.error("Failed to import questions");
    } finally {
      setIsImporting(false);
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-950 border-white/10 max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 border-b border-white/10 bg-white/5">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="w-5 h-5 text-indigo-400" />
            Manage Quiz: {category.name}
          </DialogTitle>
          <DialogDescription>
            Add, edit, or remove questions for this category.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-4 bg-zinc-950">
            <TabsList className="grid w-full grid-cols-3 bg-white/5">
              <TabsTrigger value="list" className="gap-2"><List className="w-4 h-4" /> Questions ({questions.length})</TabsTrigger>
              <TabsTrigger value="add" className="gap-2"><Plus className="w-4 h-4" /> {editingId ? 'Edit Question' : 'Add Single'}</TabsTrigger>
              <TabsTrigger value="bulk" className="gap-2"><Upload className="w-4 h-4" /> Bulk Import</TabsTrigger>
            </TabsList>
          </div>
          <div className="flex-1 min-h-0 bg-zinc-950 p-6 overflow-hidden">
            <TabsContent value="list" className="h-full mt-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
              ) : (
                <ScrollArea className="h-full pr-4">
                  {questions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border border-dashed border-white/10 rounded-xl">
                      <p>No questions found for this category.</p>
                      <Button variant="link" onClick={() => setActiveTab('add')}>Add your first question</Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {questions.map((q) => (
                        <div key={q.id} className="p-4 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors group relative">
                          <div className="pr-20">
                            <p className="font-medium text-white mb-2">{q.text}</p>
                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                              {q.options.map((opt, idx) => (
                                <div key={idx} className={`flex items-center gap-1.5 ${idx === q.correctIndex ? 'text-emerald-400 font-bold' : ''}`}>
                                  {idx === q.correctIndex && <CheckCircle className="w-3 h-3" />}
                                  {opt}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 hover:bg-indigo-500/20 hover:text-indigo-400"
                              onClick={() => handleEdit(q)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 hover:bg-red-500/20 hover:text-red-400"
                              onClick={() => handleDelete(q.id)}
                              disabled={deletingId === q.id}
                            >
                              {deletingId === q.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              )}
            </TabsContent>
            <TabsContent value="add" className="h-full mt-0 overflow-y-auto pr-2">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
                <div className="space-y-2">
                  <Label>Question Text</Label>
                  <Input
                    placeholder="e.g. What is the capital of France?"
                    className="bg-black/20 border-white/10"
                    {...register('text')}
                  />
                  {errors.text && <p className="text-xs text-red-400">{errors.text.message}</p>}
                </div>
                <div className="space-y-4 border-t border-white/5 pt-4">
                  <Label>Options</Label>
                  <div className="grid grid-cols-1 gap-4">
                    {[0, 1, 2, 3].map((idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground">Option {idx + 1}</Label>
                          {watch('correctIndex') === idx.toString() && (
                            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Correct Answer
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            placeholder={`Option ${idx + 1}`}
                            className={watch('correctIndex') === idx.toString() ? "bg-emerald-500/10 border-emerald-500/30" : "bg-black/20 border-white/10"}
                            {...register(`option${idx}` as any)}
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant={watch('correctIndex') === idx.toString() ? "default" : "outline"}
                            className={watch('correctIndex') === idx.toString() ? "bg-emerald-500 hover:bg-emerald-600" : "border-white/10"}
                            onClick={() => setValue('correctIndex', idx.toString())}
                            title="Mark as Correct"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        </div>
                        {errors[`option${idx}` as keyof QuestionFormData] && (
                          <p className="text-xs text-red-400">{(errors as any)[`option${idx}`]?.message}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-4 flex gap-4">
                  {editingId && (
                    <Button type="button" variant="outline" onClick={() => { setEditingId(null); reset(); setActiveTab('list'); }} className="flex-1 border-white/10 hover:bg-white/5">
                      Cancel
                    </Button>
                  )}
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                      <>
                        <Save className="w-4 h-4 mr-2" /> {editingId ? "Update Question" : "Save Question"}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>
            <TabsContent value="bulk" className="h-full mt-0 flex flex-col gap-4">
              <div className="space-y-2 flex-1 flex flex-col min-h-0">
                <div className="flex justify-between items-center shrink-0">
                  <Label>Raw Text Input</Label>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded">
                    <AlertCircle className="w-3 h-3 text-indigo-400" />
                    <span>Mark correct answers with <strong>*</strong></span>
                  </div>
                </div>
                <Textarea
                  placeholder={`Example:\n\n1. What is the capital of France?\nLondon\nBerlin\n*Paris\nMadrid\n\n2. What is 2+2?\n3\n*4\n5`}
                  className="bg-black/20 border-white/10 font-mono text-sm flex-1 resize-none"
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                />
                <Button onClick={parseQuestions} variant="secondary" className="w-full shrink-0">
                  Parse Text
                </Button>
              </div>
              {parsedQuestions.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-white/5 flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between shrink-0">
                    <h3 className="font-bold text-white">Preview ({parsedQuestions.length})</h3>
                    <Button onClick={handleBulkImport} disabled={isImporting}>
                      {isImporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                      Import All
                    </Button>
                  </div>
                  <ScrollArea className="flex-1 rounded-lg border border-white/10 bg-black/20 p-4">
                    <div className="space-y-4">
                      {parsedQuestions.map((q, i) => (
                        <div key={i} className="p-3 rounded bg-white/5 border border-white/5 text-sm space-y-2">
                          <div className="font-medium text-white">{q.text}</div>
                          <div className="grid grid-cols-2 gap-2">
                            {q.options?.map((opt, idx) => (
                              <div key={idx} className={`px-2 py-1 rounded text-xs flex items-center gap-2 ${idx === q.correctIndex ? 'bg-emerald-500/20 text-emerald-400' : 'bg-black/20 text-muted-foreground'}`}>
                                {idx === q.correctIndex && <CheckCircle className="w-3 h-3" />}
                                {opt}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}