import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Shield, Plus, Save, Loader2, CheckCircle, Trash2, FileText, AlertCircle, Upload, Layers, Flag, XCircle, Star, Settings, Users, HelpCircle, Pencil, Download, Palette, Grid, ShoppingBag, Image as ImageIcon, Database } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import type { Question, CategoryGroup, BulkImportRequest, Report, Category, SystemConfig, User, SystemStats, ShopItem, ItemType, ItemRarity } from '@shared/types';
import { useCategories } from '@/hooks/use-categories';
import { useShop } from '@/hooks/use-shop';
import { CATEGORY_ICONS, ICON_KEYS } from '@/lib/icons';
import { cn } from '@/lib/utils';
const questionSchema = z.object({
  text: z.string().min(5, "Question text must be at least 5 characters"),
  categoryId: z.string().min(1, "Category is required"),
  option0: z.string().min(1, "Option 1 is required"),
  option1: z.string().min(1, "Option 2 is required"),
  option2: z.string().min(1, "Option 3 is required"),
  option3: z.string().min(1, "Option 4 is required"),
  correctIndex: z.string(),
});
type QuestionFormData = z.infer<typeof questionSchema>;
const CATEGORY_COLORS = [
  'from-blue-500 to-cyan-400',
  'from-amber-500 to-orange-400',
  'from-purple-500 to-indigo-400',
  'from-emerald-500 to-green-400',
  'from-pink-500 to-rose-400',
  'from-red-500 to-orange-500',
  'from-indigo-500 to-blue-500',
  'from-cyan-500 to-blue-500',
  'from-fuchsia-500 to-pink-500',
  'from-lime-500 to-green-500',
  'from-slate-500 to-zinc-500',
];
// --- Helper Components ---
function ColorPicker({ value, onChange }: { value: string, onChange: (val: string) => void }) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {CATEGORY_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={cn(
            "w-8 h-8 rounded-full bg-gradient-to-br transition-all hover:scale-110",
            color,
            value === color ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900" : "opacity-70 hover:opacity-100"
          )}
          title={color}
        />
      ))}
    </div>
  );
}
function IconPicker({ value, onChange }: { value: string, onChange: (val: string) => void }) {
  return (
    <ScrollArea className="h-48 rounded-md border border-white/10 bg-black/20 p-2">
      <div className="grid grid-cols-6 gap-2">
        {ICON_KEYS.map((iconKey) => {
          const Icon = CATEGORY_ICONS[iconKey];
          return (
            <button
              key={iconKey}
              type="button"
              onClick={() => onChange(iconKey)}
              className={cn(
                "flex items-center justify-center p-2 rounded-md transition-all hover:bg-white/10",
                value === iconKey ? "bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/50" : "text-muted-foreground"
              )}
              title={iconKey}
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 256; // Max dimension
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // Compress to WebP at 0.8 quality
        const dataUrl = canvas.toDataURL('image/webp', 0.8);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};
export function AdminPage() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const { categories, refresh: refreshCategories } = useCategories();
  const { items: shopItems, refresh: refreshShop } = useShop();
  const [activeTab, setActiveTab] = useState("overview");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentQuestions, setRecentQuestions] = useState<Question[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);
  const [togglingFeaturedId, setTogglingFeaturedId] = useState<string | null>(null);
  // Bulk Import State
  const [bulkText, setBulkText] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<Partial<Question>[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  // Bulk Import Category State
  const [importMode, setImportMode] = useState<'existing' | 'new'>('existing');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryGroup, setNewCategoryGroup] = useState<CategoryGroup>('General');
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0]);
  const [newCategoryIcon, setNewCategoryIcon] = useState('Atom');
  // Category Edit State
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  // Shop Edit State
  const [editingShopItem, setEditingShopItem] = useState<Partial<ShopItem> | null>(null);
  const [isSavingShopItem, setIsSavingShopItem] = useState(false);
  const [deletingShopItemId, setDeletingShopItemId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Reports State
  const [reports, setReports] = useState<Report[]>([]);
  const [processingReportId, setProcessingReportId] = useState<string | null>(null);
  // System Config State
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({ motd: '', maintenance: false });
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  // User Management State
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  // Stats State
  const [stats, setStats] = useState<SystemStats | null>(null);
  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm<QuestionFormData>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      correctIndex: "0"
    }
  });
  const isAuthorized = user && (user.id === 'Crushed' || user.name === 'Crushed' || user.id === 'Greeky' || user.name === 'Greeky');
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!isAuthorized) {
      toast.error("Unauthorized access");
      navigate('/');
    }
  }, [user, navigate, isAuthorized]);
  const fetchRecentQuestions = useCallback(() => {
    if (isAuthorized && user) {
      api<Question[]>(`/api/admin/questions?userId=${user.id}`)
        .then(setRecentQuestions)
        .catch(console.error);
    }
  }, [user, isAuthorized]);
  const fetchReports = useCallback(() => {
    if (isAuthorized && user) {
      api<Report[]>(`/api/admin/reports?userId=${user.id}`)
        .then(setReports)
        .catch(console.error);
    }
  }, [user, isAuthorized]);
  const fetchSystemConfig = useCallback(() => {
    api<SystemConfig>('/api/config')
      .then(setSystemConfig)
      .catch(console.error);
  }, []);
  const fetchUsers = useCallback(() => {
    if (isAuthorized && user) {
      const query = userSearch ? `&search=${encodeURIComponent(userSearch)}` : '';
      api<User[]>(`/api/admin/users?userId=${user.id}${query}`)
        .then(setUsers)
        .catch(console.error);
    }
  }, [user, userSearch, isAuthorized]);
  const fetchStats = useCallback(() => {
    if (isAuthorized && user) {
      api<SystemStats>(`/api/admin/stats?userId=${user.id}`)
        .then(setStats)
        .catch(console.error);
    }
  }, [user, isAuthorized]);
  useEffect(() => {
    fetchRecentQuestions();
    fetchReports();
    fetchSystemConfig();
    fetchUsers();
    fetchStats();
  }, [fetchRecentQuestions, fetchReports, fetchSystemConfig, fetchUsers, fetchStats]);
  const onSubmit = async (data: QuestionFormData) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      if (editingId) {
        const updatePayload = {
            text: data.text,
            categoryId: data.categoryId,
            options: [data.option0, data.option1, data.option2, data.option3],
            correctIndex: parseInt(data.correctIndex, 10)
        };
        const updatedQuestion = await api<Question>(`/api/admin/questions/${editingId}?userId=${user.id}`, {
            method: 'PUT',
            body: JSON.stringify(updatePayload)
        });
        toast.success("Question updated successfully!");
        setRecentQuestions(prev => prev.map(q => q.id === editingId ? updatedQuestion : q));
        setEditingId(null);
      } else {
        const payload = {
            userId: user.id,
            question: {
            text: data.text,
            categoryId: data.categoryId,
            options: [data.option0, data.option1, data.option2, data.option3],
            correctIndex: parseInt(data.correctIndex, 10)
            }
        };
        const newQuestion = await api<Question>('/api/admin/questions', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        toast.success("Question created successfully!");
        setRecentQuestions(prev => [newQuestion, ...prev]);
      }
      reset({
        categoryId: data.categoryId,
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
    setValue('categoryId', q.categoryId);
    setValue('option0', q.options[0] || '');
    setValue('option1', q.options[1] || '');
    setValue('option2', q.options[2] || '');
    setValue('option3', q.options[3] || '');
    setValue('correctIndex', q.correctIndex.toString());
    setActiveTab('single');
  };
  const handleCancelEdit = () => {
    setEditingId(null);
    reset({
        categoryId: '',
        correctIndex: "0",
        text: '',
        option0: '',
        option1: '',
        option2: '',
        option3: ''
    });
  };
  const handleDelete = async (questionId: string) => {
    if (!user || deletingId) return;
    if (!confirm("Are you sure you want to delete this question?")) return;
    setDeletingId(questionId);
    try {
        await api(`/api/admin/questions/${questionId}?userId=${user.id}`, {
            method: 'DELETE'
        });
        setRecentQuestions(prev => prev.filter(q => q.id !== questionId));
        toast.success("Question deleted");
    } catch (err) {
        console.error(err);
        toast.error("Failed to delete question");
    } finally {
        setDeletingId(null);
    }
  };
  const handleDeleteCategory = async (catId: string) => {
    if (!user || deletingCatId) return;
    if (!confirm("Are you sure? This will delete the category but NOT the questions associated with it.")) return;
    setDeletingCatId(catId);
    try {
        await api(`/api/admin/categories/${catId}?userId=${user.id}`, {
            method: 'DELETE'
        });
        await refreshCategories();
        toast.success("Category deleted");
    } catch (err) {
        console.error(err);
        toast.error("Failed to delete category");
    } finally {
        setDeletingCatId(null);
    }
  };
  const handleToggleFeatured = async (cat: Category) => {
    if (!user || togglingFeaturedId) return;
    setTogglingFeaturedId(cat.id);
    try {
      await api(`/api/admin/categories/${cat.id}?userId=${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isFeatured: !cat.isFeatured })
      });
      await refreshCategories();
      toast.success(`Category ${!cat.isFeatured ? 'featured' : 'unfeatured'}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update category");
    } finally {
      setTogglingFeaturedId(null);
    }
  };
  const handleUpdateCategory = async () => {
    if (!user || !editingCategory) return;
    setIsUpdatingCategory(true);
    try {
      await api(`/api/admin/categories/${editingCategory.id}?userId=${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editingCategory.name,
          description: editingCategory.description,
          group: editingCategory.group,
          color: editingCategory.color,
          icon: editingCategory.icon
        })
      });
      await refreshCategories();
      toast.success("Category updated successfully");
      setEditingCategory(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update category");
    } finally {
      setIsUpdatingCategory(false);
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
  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          const mapped = json.map((q: any) => ({
            text: q.text,
            options: q.options,
            correctIndex: q.correctIndex,
            media: q.media
          })).filter(q => q.text && Array.isArray(q.options));
          setParsedQuestions(mapped);
          toast.success(`Loaded ${mapped.length} questions from JSON`);
        } else {
          toast.error("Invalid JSON format. Expected an array of questions.");
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to parse JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };
  const handleBulkImport = async () => {
    if (!user || parsedQuestions.length === 0) return;
    if (importMode === 'existing' && !selectedCategoryId) {
      toast.error("Please select a category.");
      return;
    }
    if (importMode === 'new' && !newCategoryName.trim()) {
      toast.error("Please enter a name for the new category.");
      return;
    }
    setIsImporting(true);
    try {
        const payload: BulkImportRequest = {
            userId: user.id,
            questions: parsedQuestions,
            targetCategory: {
              mode: importMode,
              id: importMode === 'existing' ? selectedCategoryId : undefined,
              create: importMode === 'new' ? {
                name: newCategoryName,
                group: newCategoryGroup,
                color: newCategoryColor,
                icon: newCategoryIcon
              } : undefined
            }
        };
        const res = await api<{ count: number; categoryId: string }>('/api/admin/questions/bulk', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        toast.success(`Successfully imported ${res.count} questions!`);
        setBulkText('');
        setParsedQuestions([]);
        setNewCategoryName('');
        if (importMode === 'new') {
          await refreshCategories();
          setImportMode('existing');
          setSelectedCategoryId(res.categoryId);
        }
        fetchRecentQuestions();
    } catch (err) {
        console.error(err);
        toast.error("Failed to import questions");
    } finally {
        setIsImporting(false);
    }
  };
  const handleExport = async () => {
    if (!user) return;
    try {
      const questions = await api<Question[]>(`/api/admin/questions?userId=${user.id}&limit=1000`);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(questions, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `questions_export_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      toast.success(`Exported ${questions.length} questions`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to export questions");
    }
  };
  const handleDismissReport = async (reportId: string) => {
    if (!user) return;
    setProcessingReportId(reportId);
    try {
      await api(`/api/admin/reports/${reportId}?userId=${user.id}`, {
        method: 'DELETE'
      });
      setReports(prev => prev.filter(r => r.id !== reportId));
      toast.success("Report dismissed");
    } catch (err) {
      console.error(err);
      toast.error("Failed to dismiss report");
    } finally {
      setProcessingReportId(null);
    }
  };
  const handleDeleteReportedQuestion = async (reportId: string, questionId: string) => {
    if (!user) return;
    if (!confirm("Are you sure? This will delete the question permanently.")) return;
    setProcessingReportId(reportId);
    try {
      await api(`/api/admin/questions/${questionId}?userId=${user.id}`, {
        method: 'DELETE'
      });
      await api(`/api/admin/reports/${reportId}?userId=${user.id}`, {
        method: 'DELETE'
      });
      setReports(prev => prev.filter(r => r.id !== reportId));
      setRecentQuestions(prev => prev.filter(q => q.id !== questionId));
      toast.success("Question deleted and report resolved");
    } catch (err) {
      console.error(err);
      toast.error("Failed to process deletion");
    } finally {
      setProcessingReportId(null);
    }
  };
  const handleSaveSystemConfig = async () => {
    if (!user) return;
    setIsSavingConfig(true);
    try {
      await api('/api/admin/config?userId=' + user.id, {
        method: 'PUT',
        body: JSON.stringify(systemConfig)
      });
      toast.success("System configuration updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update config");
    } finally {
      setIsSavingConfig(false);
    }
  };
  const handleDeleteUser = async (targetId: string) => {
    if (!user || deletingUserId) return;
    if (!confirm("Are you sure? This will permanently delete the user.")) return;
    setDeletingUserId(targetId);
    try {
      await api(`/api/users/${targetId}?userId=${user.id}`, { method: 'DELETE' });
      setUsers(prev => prev.filter(u => u.id !== targetId));
      toast.success("User deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete user");
    } finally {
      setDeletingUserId(null);
    }
  };
  // --- Shop Management Handlers ---
  const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Client-side size check (pre-compression)
    if (file.size > 2 * 1024 * 1024) { // 2MB limit for input
      toast.error("File too large. Max 2MB input.");
      return;
    }
    try {
        const compressedDataUrl = await compressImage(file);
        // Check compressed size (approximate string length in bytes)
        if (compressedDataUrl.length > 100 * 1024) {
             toast.error("Compressed image is still too large (>100KB). Please use a simpler image.");
             return;
        }
        setEditingShopItem(prev => prev ? ({ ...prev, assetUrl: compressedDataUrl }) : null);
        toast.success("Asset uploaded!");
    } catch (err) {
        console.error("Image processing failed", err);
        toast.error("Failed to process image");
    }
    e.target.value = '';
  };
  const handleSaveShopItem = async () => {
    if (!user || !editingShopItem) return;
    setIsSavingShopItem(true);
    try {
      if (editingShopItem.id) {
        // Update
        await api(`/api/admin/shop/items/${editingShopItem.id}?userId=${user.id}`, {
          method: 'PUT',
          body: JSON.stringify(editingShopItem)
        });
        toast.success("Item updated");
      } else {
        // Create
        await api(`/api/admin/shop/items?userId=${user.id}`, {
          method: 'POST',
          body: JSON.stringify(editingShopItem)
        });
        toast.success("Item created");
      }
      await refreshShop();
      setEditingShopItem(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save item");
    } finally {
      setIsSavingShopItem(false);
    }
  };
  const handleDeleteShopItem = async (itemId: string) => {
    if (!user || deletingShopItemId) return;
    if (!confirm("Are you sure? This will remove the item from the shop.")) return;
    setDeletingShopItemId(itemId);
    try {
      await api(`/api/admin/shop/items/${itemId}?userId=${user.id}`, {
        method: 'DELETE'
      });
      await refreshShop();
      toast.success("Item deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete item");
    } finally {
      setDeletingShopItemId(null);
    }
  };
  const handleResetShop = async () => {
    if (!user) return;
    if (!confirm("Are you sure? This will DELETE ALL shop items and restore the default seed data. This cannot be undone.")) return;
    try {
      await api('/api/admin/reset-shop?userId=' + user.id, { method: 'POST' });
      toast.success("Shop database reset to defaults");
      await refreshShop();
    } catch (err) {
      console.error(err);
      toast.error("Failed to reset shop");
    }
  };
  if (!isAuthorized) {
    return null;
  }
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <Shield className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-white">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage quiz content and system settings.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-9 bg-white/5 mb-6">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="single">Single</TabsTrigger>
                    <TabsTrigger value="bulk">Bulk</TabsTrigger>
                    <TabsTrigger value="categories">Cats</TabsTrigger>
                    <TabsTrigger value="shop">Shop</TabsTrigger>
                    <TabsTrigger value="reports" className="relative">
                      Reports
                      {reports.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="users">Users</TabsTrigger>
                    <TabsTrigger value="system">System</TabsTrigger>
                    <TabsTrigger value="data">Data</TabsTrigger>
                </TabsList>
                <TabsContent value="overview">
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-white flex items-center gap-2">
                          <Users className="w-5 h-5 text-indigo-400" />
                          {stats?.userCount ?? '-'}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Questions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-white flex items-center gap-2">
                          <HelpCircle className="w-5 h-5 text-emerald-400" />
                          {stats?.questionCount ?? '-'}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Categories</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-white flex items-center gap-2">
                          <Layers className="w-5 h-5 text-yellow-400" />
                          {stats?.categoryCount ?? '-'}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pending Reports</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-white flex items-center gap-2">
                          <Flag className="w-5 h-5 text-red-400" />
                          {stats?.reportCount ?? '-'}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                <TabsContent value="single">
                    <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                        {editingId ? <Pencil className="w-5 h-5 text-yellow-400" /> : <Plus className="w-5 h-5 text-emerald-400" />}
                        {editingId ? "Edit Question" : "Create New Question"}
                        </CardTitle>
                        <CardDescription>{editingId ? "Update existing question details." : "Add a new question to the global pool."}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <Label>Question Text</Label>
                            <Input
                            placeholder="e.g. What is the capital of France?"
                            className="bg-black/20 border-white/10"
                            {...register('text')}
                            />
                            {errors.text && <p className="text-xs text-red-400">{errors.text.message}</p>}
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                            <Label>Category</Label>
                            <Select onValueChange={(val) => setValue('categoryId', val)} defaultValue={watch('categoryId')}>
                                <SelectTrigger className="bg-black/20 border-white/10">
                                <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-white/10">
                                {categories.map(cat => (
                                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            {errors.categoryId && <p className="text-xs text-red-400">{errors.categoryId.message}</p>}
                            </div>
                        </div>
                        <div className="space-y-4 border-t border-white/5 pt-4">
                            <Label>Options</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                <Button type="button" variant="outline" onClick={handleCancelEdit} className="flex-1 border-white/10 hover:bg-white/5">
                                    Cancel Edit
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
                    </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="bulk">
                    <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-indigo-400" /> Bulk Import
                            </CardTitle>
                            <CardDescription>Paste raw text or upload a JSON file to import questions.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/5">
                              <Label className="flex items-center gap-2"><Layers className="w-4 h-4" /> Target Category</Label>
                              <RadioGroup value={importMode} onValueChange={(v: any) => setImportMode(v)} className="flex gap-4">
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="existing" id="existing" />
                                  <Label htmlFor="existing">Existing Category</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="new" id="new" />
                                  <Label htmlFor="new">Create New Category</Label>
                                </div>
                              </RadioGroup>
                              {importMode === 'existing' ? (
                                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                                    <SelectTrigger className="bg-black/20 border-white/10">
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-white/10">
                                        {categories.map(cat => (
                                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                              ) : (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label>New Category Name</Label>
                                      <Input
                                        placeholder="e.g. Ancient Mythology"
                                        className="bg-black/20 border-white/10"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Group</Label>
                                      <Select value={newCategoryGroup} onValueChange={(v: any) => setNewCategoryGroup(v)}>
                                        <SelectTrigger className="bg-black/20 border-white/10">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-white/10">
                                          <SelectItem value="General">General</SelectItem>
                                          <SelectItem value="Education">Education</SelectItem>
                                          <SelectItem value="TV & Movies">TV & Movies</SelectItem>
                                          <SelectItem value="Sports">Sports</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Color Theme</Label>
                                    <ColorPicker value={newCategoryColor} onChange={setNewCategoryColor} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Icon</Label>
                                    <IconPicker value={newCategoryIcon} onChange={setNewCategoryIcon} />
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label>Raw Text Input</Label>
                                        <span className="text-xs text-muted-foreground">Separate questions with empty lines</span>
                                    </div>
                                    <Textarea
                                        placeholder={`Example:\n\n1. What is the capital of France?\nLondon\nBerlin\n*Paris\nMadrid\n\n2. What is 2+2?\n3\n*4\n5`}
                                        className="bg-black/20 border-white/10 font-mono text-sm min-h-[200px]"
                                        value={bulkText}
                                        onChange={(e) => setBulkText(e.target.value)}
                                    />
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white/5 p-2 rounded">
                                        <AlertCircle className="w-4 h-4 text-indigo-400" />
                                        <span>Mark correct answers with <strong>*</strong> at the start or <strong>(correct)</strong> at the end.</span>
                                    </div>
                                    <Button onClick={parseQuestions} variant="secondary" className="w-full">
                                        Parse Text
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    <Label>Or Upload JSON</Label>
                                    <div className="border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors cursor-pointer relative">
                                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                                        <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                                        <p className="text-xs text-muted-foreground/50 mt-1">.json files only</p>
                                        <input
                                            type="file"
                                            accept=".json"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={handleJsonUpload}
                                        />
                                    </div>
                                    <div className="flex justify-end">
                                        <Button
                                            variant="outline"
                                            onClick={() => { setBulkText(''); setParsedQuestions([]); }}
                                            disabled={!bulkText && parsedQuestions.length === 0}
                                        >
                                            Clear All
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            {parsedQuestions.length > 0 && (
                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-white">Preview ({parsedQuestions.length})</h3>
                                        <Button onClick={handleBulkImport} disabled={isImporting}>
                                            {isImporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                                            Import All
                                        </Button>
                                    </div>
                                    <ScrollArea className="h-[300px] max-h-[60vh] rounded-lg border border-white/10 bg-black/20 p-4">
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
                                                    {(!q.options || q.options.length < 2) && (
                                                        <Badge variant="destructive" className="mt-2">Invalid Options</Badge>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                            )}
                            <div className="pt-6 border-t border-white/10">
                                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                                    <div>
                                        <h4 className="font-bold text-white flex items-center gap-2">
                                            <Download className="w-4 h-4 text-indigo-400" /> Backup Content
                                        </h4>
                                        <p className="text-xs text-muted-foreground mt-1">Download all questions as a JSON file.</p>
                                    </div>
                                    <Button variant="outline" onClick={handleExport} className="border-white/10 hover:bg-white/5">
                                        Export JSON
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="categories">
                  <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>Manage Categories</CardTitle>
                      <CardDescription>View, edit, and remove community-created categories.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px] rounded-lg border border-white/10 bg-black/20 p-4">
                        <div className="space-y-3">
                          {categories.map(cat => (
                            <div key={cat.id} className="flex items-center justify-between p-3 rounded bg-white/5 border border-white/5">
                               <div className="flex items-center gap-3">
                                 <div className={`w-8 h-8 rounded flex items-center justify-center bg-gradient-to-br ${cat.color}`}>
                                    {(() => {
                                        const Icon = CATEGORY_ICONS[cat.icon] || Star;
                                        return <Icon className="w-4 h-4 text-white" />;
                                    })()}
                                 </div>
                                 <div>
                                   <div className="font-medium text-white flex items-center gap-2">
                                     {cat.name}
                                     {cat.isFeatured && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />}
                                   </div>
                                   <div className="text-xs text-muted-foreground">{cat.group} • {cat.id.startsWith('cat_') ? 'Dynamic' : 'System'}</div>
                                 </div>
                               </div>
                               <div className="flex items-center gap-2">
                                 <Button
                                   size="sm"
                                   variant="ghost"
                                   onClick={() => handleToggleFeatured(cat)}
                                   disabled={togglingFeaturedId === cat.id}
                                   className={cat.isFeatured ? "text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10" : "text-muted-foreground hover:text-white"}
                                   title={cat.isFeatured ? "Unfeature" : "Feature"}
                                 >
                                   {togglingFeaturedId === cat.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className={`w-4 h-4 ${cat.isFeatured ? "fill-current" : ""}`} />}
                                 </Button>
                                 {cat.id.startsWith('cat_') && (
                                   <>
                                     <Button
                                       size="sm"
                                       variant="ghost"
                                       onClick={() => setEditingCategory(cat)}
                                       className="text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10"
                                     >
                                       <Pencil className="w-4 h-4" />
                                     </Button>
                                     <Button
                                       size="sm"
                                       variant="destructive"
                                       onClick={() => handleDeleteCategory(cat.id)}
                                       disabled={deletingCatId === cat.id}
                                     >
                                       {deletingCatId === cat.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                     </Button>
                                   </>
                                 )}
                               </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="shop">
                  <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <ShoppingBag className="w-5 h-5 text-indigo-400" /> Shop Management
                          </CardTitle>
                          <CardDescription>Manage items available in the shop.</CardDescription>
                        </div>
                        <Button onClick={() => setEditingShopItem({})} className="gap-2">
                          <Plus className="w-4 h-4" /> Add Item
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[500px] rounded-lg border border-white/10 bg-black/20 p-4">
                        <div className="space-y-3">
                          {shopItems.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-3 rounded bg-white/5 border border-white/5">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded bg-black/40 flex items-center justify-center overflow-hidden border border-white/10">
                                  {item.type === 'avatar' ? (
                                    <img src={item.assetUrl} alt={item.name} className="w-full h-full object-cover" />
                                  ) : item.type === 'banner' ? (
                                    <div className="w-full h-full" style={{ background: item.assetUrl }} />
                                  ) : (
                                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium text-white">{item.name}</div>
                                  <div className="text-xs text-muted-foreground flex gap-2">
                                    <span className="capitalize">{item.type}</span>
                                    <span>•</span>
                                    <span className={cn(
                                      "capitalize font-bold",
                                      item.rarity === 'legendary' ? "text-yellow-400" :
                                      item.rarity === 'epic' ? "text-purple-400" :
                                      item.rarity === 'rare' ? "text-blue-400" : "text-white"
                                    )}>{item.rarity}</span>
                                    <span>•</span>
                                    <span className="text-yellow-500">{item.price} Coins</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingShopItem(item)}
                                  className="text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteShopItem(item.id)}
                                  disabled={deletingShopItemId === item.id}
                                >
                                  {deletingShopItemId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="reports">
                  <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Flag className="w-5 h-5 text-red-400" /> Content Reports
                      </CardTitle>
                      <CardDescription>Review flagged questions from players.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[500px] rounded-lg border border-white/10 bg-black/20 p-4">
                        {reports.length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground">
                            No active reports. Good job!
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {reports.map(report => (
                              <div key={report.id} className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                                <div className="flex justify-between items-start">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-red-400 border-red-500/30 bg-red-500/10 uppercase text-[10px]">
                                        {report.reason.replace('_', ' ')}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">
                                        Reported by {report.reporterName} • {new Date(report.timestamp).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <p className="font-medium text-white text-sm">{report.questionText}</p>
                                    <p className="text-xs text-muted-foreground font-mono">ID: {report.questionId}</p>
                                  </div>
                                </div>
                                <div className="flex gap-2 justify-end pt-2 border-t border-white/5">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDismissReport(report.id)}
                                    disabled={processingReportId === report.id}
                                    className="text-muted-foreground hover:text-white"
                                  >
                                    {processingReportId === report.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3 mr-1" />}
                                    Dismiss
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDeleteReportedQuestion(report.id, report.questionId)}
                                    disabled={processingReportId === report.id}
                                    className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
                                  >
                                    {processingReportId === report.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3 mr-1" />}
                                    Delete Question
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="users">
                  <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-400" /> User Management
                      </CardTitle>
                      <CardDescription>View and manage registered users.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-4 mb-4">
                        <Input
                          placeholder="Search users by name, email, or ID..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          className="bg-black/20 border-white/10"
                        />
                        <Button onClick={fetchUsers}>Search</Button>
                      </div>
                      <ScrollArea className="h-[500px] rounded-lg border border-white/10 bg-black/20 p-4">
                        {users.length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground">
                            No users found.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {users.map(u => (
                              <div key={u.id} className="flex justify-between items-center p-3 rounded bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                <div>
                                  <div className="font-bold text-white flex items-center gap-2">
                                    {u.name}
                                    {u.id === 'Crushed' && <Badge variant="secondary" className="text-[10px]">Admin</Badge>}
                                  </div>
                                  <div className="text-xs text-muted-foreground font-mono">{u.email || 'No Email'} • {u.id}</div>
                                </div>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteUser(u.id)}
                                  disabled={deletingUserId === u.id || u.id === 'Crushed' || u.id === user.id}
                                  title="Delete User"
                                >
                                  {deletingUserId === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="system">
                  <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-indigo-400" /> System Configuration
                      </CardTitle>
                      <CardDescription>Manage global application settings.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label>Message of the Day (MOTD)</Label>
                        <Textarea
                          placeholder="Announce maintenance, new features, or welcome messages."
                          className="bg-black/20 border-white/10"
                          value={systemConfig.motd || ''}
                          onChange={(e) => setSystemConfig(prev => ({ ...prev, motd: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Season End Date (ISO Format)</Label>
                        <Input
                          placeholder="YYYY-MM-DD"
                          className="bg-black/20 border-white/10"
                          value={systemConfig.seasonEndDate || ''}
                          onChange={(e) => setSystemConfig(prev => ({ ...prev, seasonEndDate: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground">Leave empty to use automatic calculation.</p>
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                        <div className="space-y-0.5">
                          <Label>Maintenance Mode</Label>
                          <p className="text-xs text-muted-foreground">Disable matchmaking for all users.</p>
                        </div>
                        <Switch
                          checked={systemConfig.maintenance || false}
                          onCheckedChange={(checked) => setSystemConfig(prev => ({ ...prev, maintenance: checked }))}
                        />
                      </div>
                      <Button onClick={handleSaveSystemConfig} disabled={isSavingConfig} className="w-full">
                        {isSavingConfig ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Configuration
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="data">
                  <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-400">
                        <AlertCircle className="w-5 h-5" /> Danger Zone
                      </CardTitle>
                      <CardDescription>Destructive actions for data management.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                        <div>
                          <h4 className="font-bold text-white">Reset Shop Database</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            Deletes all current shop items and restores the initial seed data.
                            Useful if the shop becomes cluttered or corrupted.
                          </p>
                        </div>
                        <Button variant="destructive" onClick={handleResetShop}>
                          <Database className="w-4 h-4 mr-2" />
                          Reset Shop
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
            </Tabs>
          </div>
          <div className="lg:col-span-1">
            <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm h-full">
              <CardHeader>
                <CardTitle>Recent Questions</CardTitle>
                <CardDescription>Latest additions to the database.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentQuestions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No questions created yet.
                    </div>
                  ) : (
                    recentQuestions.slice(0, 10).map((q) => (
                      <div key={q.id} className="p-3 rounded-lg bg-black/20 border border-white/5 text-sm group relative">
                        <div className="font-medium text-white mb-1 line-clamp-2 pr-16">{q.text}</div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="capitalize">{q.categoryId}</span>
                        </div>
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => handleEdit(q)}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                                title="Edit Question"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => handleDelete(q.id)}
                                disabled={deletingId === q.id}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                title="Delete Question"
                            >
                                {deletingId === q.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                )}
                            </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        {/* Edit Category Dialog */}
        <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
          <DialogContent className="bg-zinc-950 border-white/10 max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
              <DialogDescription>Update category details and appearance.</DialogDescription>
            </DialogHeader>
            {editingCategory && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={editingCategory.name}
                      onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                      className="bg-black/20 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Group</Label>
                    <Select
                      value={editingCategory.group}
                      onValueChange={(val: any) => setEditingCategory({ ...editingCategory, group: val })}
                    >
                      <SelectTrigger className="bg-black/20 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10">
                        <SelectItem value="General">General</SelectItem>
                        <SelectItem value="Education">Education</SelectItem>
                        <SelectItem value="TV & Movies">TV & Movies</SelectItem>
                        <SelectItem value="Sports">Sports</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={editingCategory.description}
                    onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                    className="bg-black/20 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color Theme</Label>
                  <ColorPicker
                    value={editingCategory.color}
                    onChange={(val) => setEditingCategory({ ...editingCategory, color: val })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <IconPicker
                    value={editingCategory.icon}
                    onChange={(val) => setEditingCategory({ ...editingCategory, icon: val })}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditingCategory(null)}>Cancel</Button>
              <Button onClick={handleUpdateCategory} disabled={isUpdatingCategory}>
                {isUpdatingCategory ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Edit Shop Item Dialog */}
        <Dialog open={!!editingShopItem} onOpenChange={(open) => !open && setEditingShopItem(null)}>
          <DialogContent className="bg-zinc-950 border-white/10 max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingShopItem?.id ? 'Edit Item' : 'Add New Item'}</DialogTitle>
              <DialogDescription>Configure shop item details.</DialogDescription>
            </DialogHeader>
            {editingShopItem && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={editingShopItem.name || ''}
                      onChange={(e) => setEditingShopItem({ ...editingShopItem, name: e.target.value })}
                      className="bg-black/20 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Price</Label>
                    <Input
                      type="number"
                      value={editingShopItem.price || 0}
                      onChange={(e) => setEditingShopItem({ ...editingShopItem, price: parseInt(e.target.value) })}
                      className="bg-black/20 border-white/10"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={editingShopItem.type}
                      onValueChange={(val: ItemType) => setEditingShopItem({ ...editingShopItem, type: val })}
                    >
                      <SelectTrigger className="bg-black/20 border-white/10">
                        <SelectValue placeholder="Select Type" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10">
                        <SelectItem value="avatar">Avatar</SelectItem>
                        <SelectItem value="frame">Frame</SelectItem>
                        <SelectItem value="banner">Banner</SelectItem>
                        <SelectItem value="title">Title</SelectItem>
                        <SelectItem value="box">Box</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Rarity</Label>
                    <Select
                      value={editingShopItem.rarity}
                      onValueChange={(val: ItemRarity) => setEditingShopItem({ ...editingShopItem, rarity: val })}
                    >
                      <SelectTrigger className="bg-black/20 border-white/10">
                        <SelectValue placeholder="Select Rarity" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10">
                        <SelectItem value="common">Common</SelectItem>
                        <SelectItem value="rare">Rare</SelectItem>
                        <SelectItem value="epic">Epic</SelectItem>
                        <SelectItem value="legendary">Legendary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={editingShopItem.description || ''}
                    onChange={(e) => setEditingShopItem({ ...editingShopItem, description: e.target.value })}
                    className="bg-black/20 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Asset URL / Value</Label>
                  <div className="flex gap-2">
                      <Input
                      value={editingShopItem.assetUrl || ''}
                      onChange={(e) => setEditingShopItem({ ...editingShopItem, assetUrl: e.target.value })}
                      className="bg-black/20 border-white/10 flex-1"
                      placeholder="https://... or css-class"
                      />
                      <Button
                          type="button"
                          variant="outline"
                          className="border-white/10 hover:bg-white/5 px-3"
                          onClick={() => fileInputRef.current?.click()}
                          title="Upload Image"
                      >
                          <Upload className="w-4 h-4" />
                      </Button>
                      <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="image/png,image/jpeg,image/svg+xml,image/gif,image/webp"
                          onChange={handleAssetUpload}
                      />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                      Upload images (PNG, JPG, SVG, GIF). Max 500KB.
                  </p>
                  {editingShopItem.assetUrl && (
                    <div className="mt-2 p-2 bg-black/40 rounded border border-white/10 flex justify-center">
                      {editingShopItem.type === 'avatar' ? (
                        <img src={editingShopItem.assetUrl} className="w-16 h-16 rounded-full object-cover" alt="Preview" />
                      ) : editingShopItem.type === 'banner' ? (
                         <div
                           className="w-full h-12 rounded bg-cover bg-center"
                           style={{
                             background: editingShopItem.assetUrl.startsWith('linear')
                               ? editingShopItem.assetUrl
                               : `url(${editingShopItem.assetUrl})`
                           }}
                         />
                      ) : (
                         <div className="relative w-16 h-16 flex items-center justify-center">
                            {editingShopItem.assetUrl.startsWith('border') ? (
                               <div className={cn("w-full h-full rounded-full", editingShopItem.assetUrl)} />
                            ) : (
                               <img src={editingShopItem.assetUrl} className="max-w-full max-h-full object-contain" alt="Preview" />
                            )}
                         </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditingShopItem(null)}>Cancel</Button>
              <Button onClick={handleSaveShopItem} disabled={isSavingShopItem}>
                {isSavingShopItem ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Item'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}