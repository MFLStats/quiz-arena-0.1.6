import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Trash2, Pencil, Loader2, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import type { Question, User } from '@shared/types';
import { useCategories } from '@/hooks/use-categories';
interface QuestionBankProps {
  user: User;
  onEdit: (q: Question) => void;
}
export function QuestionBank({ user, onEdit }: QuestionBankProps) {
  const { categories } = useCategories();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fetchQuestions = useCallback(async (reset = false) => {
    if (!user) return;
    setIsLoading(true);
    try {
      let url = `/api/admin/questions?userId=${user.id}`;
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      } else if (!reset && nextCursor) {
        url += `&cursor=${nextCursor}`;
      }
      if (categoryFilter && categoryFilter !== 'all') {
        url += `&categoryId=${categoryFilter}`;
      }
      const data = await api<{ items: Question[], next: string | null }>(url);
      if (reset || search) {
        setQuestions(data.items);
      } else {
        setQuestions(prev => [...prev, ...data.items]);
      }
      setNextCursor(data.next);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load questions");
    } finally {
      setIsLoading(false);
    }
  }, [user, search, categoryFilter, nextCursor]);
  // Initial fetch and filter changes
  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      fetchQuestions(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [search, categoryFilter, fetchQuestions]);
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
  return (
    <div className="flex flex-col h-full bg-zinc-900/50 border border-white/10 backdrop-blur-sm rounded-xl overflow-hidden">
      {/* Header Controls */}
      <div className="p-4 border-b border-white/10 bg-white/5 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-black/20 border-white/10"
          />
        </div>
        <div className="w-full md:w-64">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="bg-black/20 border-white/10">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <SelectValue placeholder="Filter by Category" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-white/10">
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => fetchQuestions(true)}
          className="border-white/10 hover:bg-white/5"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
      {/* Question List */}
      <div className="flex-1 min-h-0 bg-zinc-950/50">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-3">
            {questions.length === 0 && !isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-dashed border-white/10 rounded-xl">
                <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                <p>No questions found.</p>
              </div>
            ) : (
              questions.map((q) => (
                <div key={q.id} className="p-4 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors group relative">
                  <div className="pr-20">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-white text-sm md:text-base">{q.text}</p>
                      <Badge variant="outline" className="text-[10px] border-white/10 text-muted-foreground shrink-0 ml-2">
                        {categories.find(c => c.id === q.categoryId)?.name || q.categoryId}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                      {q.options.map((opt, idx) => (
                        <div key={idx} className={`flex items-center gap-1.5 ${idx === q.correctIndex ? 'text-emerald-400 font-bold' : ''}`}>
                          {idx === q.correctIndex && <CheckCircle className="w-3 h-3 shrink-0" />}
                          <span className="truncate">{opt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 hover:bg-indigo-500/20 hover:text-indigo-400"
                      onClick={() => onEdit(q)}
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 hover:bg-red-500/20 hover:text-red-400"
                      onClick={() => handleDelete(q.id)}
                      disabled={deletingId === q.id}
                      title="Delete"
                    >
                      {deletingId === q.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              ))
            )}
            {/* Load More / Loading State */}
            <div className="py-4 flex justify-center">
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              ) : (
                nextCursor && !search && (
                  <Button variant="outline" onClick={() => fetchQuestions(false)} className="border-white/10 hover:bg-white/5">
                    Load More
                  </Button>
                )
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}