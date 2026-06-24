"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";           // only for storage uploads
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AdminBlog() {
  const [title, setTitle] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const editor = useEditor({
    extensions: [StarterKit, Image],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none focus:outline-none min-h-[220px] text-white",
      },
    },
  });

  // ----- Fetch posts (just once on mount) -----
  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch(`/api/get-blog-posts?t=${Date.now()}&r=${Math.random()}`, { cache: "no-store" });
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (err) {
      console.error("Failed to fetch blog posts", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // ---------- IMAGE UPLOADS (storage) ----------
  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const uploadThumbnail = async (): Promise<string | null> => {
    if (!thumbnailFile) return null;
    setUploading(true);
    const fileExt = thumbnailFile.name.split(".").pop();
    const fileName = `thumb-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error } = await supabase.storage.from("blog-images").upload(fileName, thumbnailFile);
    if (error) { toast.error("Thumbnail upload failed"); setUploading(false); return null; }
    const { data: urlData } = supabase.storage.from("blog-images").getPublicUrl(fileName);
    setUploading(false);
    return urlData.publicUrl;
  };

  const handleImageUploadInEditor = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error } = await supabase.storage.from("blog-images").upload(fileName, file);
      if (error) { toast.error("Image upload failed"); setUploading(false); return; }
      const { data: urlData } = supabase.storage.from("blog-images").getPublicUrl(fileName);
      editor?.chain().focus().setImage({ src: urlData.publicUrl }).run();
      setUploading(false);
    };
    input.click();
  };

  // ---------- SAVE (optimistic) ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editor) return;
    const content = editor.getHTML();
    let imageUrl: string | null = thumbnailPreview || null;
    if (thumbnailFile) {
      const uploaded = await uploadThumbnail();
      if (!uploaded) return;
      imageUrl = uploaded;
    }

    const tempId = editingId || crypto.randomUUID?.() || Math.random().toString(36).substring(2);
    const newPost = { id: tempId, title, content, image_url: imageUrl, created_at: new Date().toISOString() };
    // Optimistic update
    if (editingId) {
      setPosts(prev => prev.map(p => p.id === editingId ? { ...p, ...newPost } : p));
    } else {
      setPosts(prev => [newPost, ...prev]);
    }
    resetForm();

    try {
      const res = await fetch("/api/admin-blog-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, title, content, image_url: imageUrl }),
      });
      if (res.ok) {
        toast.success(editingId ? "Post updated!" : "Post published!");
        // fetchPosts();   // not needed, UI already updated
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || "Failed to save post");
        fetchPosts();   // revert to server state if failed
      }
    } catch {
      toast.error("Network error");
      fetchPosts();
    }
  };

  const resetForm = () => {
    setTitle("");
    editor?.commands.setContent("");
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setEditingId(null);
  };

  const handleEdit = (post: any) => {
    setEditingId(post.id);
    setTitle(post.title);
    editor?.commands.setContent(post.content || "");
    if (post.image_url) {
      setThumbnailPreview(post.image_url);
      setThumbnailFile(null);
    } else {
      setThumbnailPreview(null);
    }
  };

  // ---------- DELETE (optimistic) ----------
  const handleDelete = async (id: string) => {
    if (!confirm("Delete?")) return;
    // Optimistic: remove immediately
    setPosts(prev => prev.filter(p => p.id !== id));
    toast.success("Deleted");
    try {
      const res = await fetch("/api/admin-blog-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        toast.error("Delete failed");
        fetchPosts();   // revert if failed
      }
    } catch {
      toast.error("Network error");
      fetchPosts();
    }
  };

  // ---------- TOP STORY TOGGLE (optimistic) ----------
  const toggleTopStory = async (post: any) => {
    const isTop = post.top_story_until && new Date(post.top_story_until) > new Date();
    const newValue = isTop ? null : new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString();
    // Optimistic update
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, top_story_until: newValue } : p));
    toast.success(isTop ? "Removed from top stories" : "Set as top story (24h)");
    try {
      const res = await fetch("/api/admin-blog-topstory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: post.id, currentTopStoryUntil: post.top_story_until }),
      });
      if (!res.ok) {
        toast.error("Failed");
        fetchPosts();   // revert
      }
    } catch {
      toast.error("Network error");
      fetchPosts();
    }
  };

  // ---------- RENDER ----------
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <div className="text-gold-400 text-lg">Loading blog manager…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/portalsydr">
            <Button variant="ghost" className="text-gold-400"><ArrowLeft className="h-4 w-4 mr-1" /> Dashboard</Button>
          </Link>
          <h1 className="text-2xl font-bold">Blog Manager</h1>
        </div>

        {/* Editor form – same as before, omitted for brevity */}
        <form onSubmit={handleSubmit} className="space-y-5 mb-12 bg-[#0D0D0D] border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-gold-400">{editingId ? "Edit Post" : "New Post"}</h2>
          <input placeholder="Post title" value={title} onChange={e => setTitle(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-gold-400/50" required />
          <div>
            <label className="block text-sm text-gray-400 mb-2">Thumbnail (optional)</label>
            <input type="file" accept="image/*" onChange={handleThumbnailChange} className="text-sm text-gray-300" />
            {thumbnailPreview && <img src={thumbnailPreview} alt="Preview" className="mt-3 h-32 w-auto rounded-lg object-cover border border-white/10" />}
          </div>
          <div className="sticky top-0 z-10 flex flex-wrap gap-2 bg-[#0D0D0D] py-2 border-b border-white/5 mb-2">
            <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} className="px-3 py-1.5 bg-white/5 rounded-lg text-sm hover:bg-gold-400/20">Bold</button>
            <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} className="px-3 py-1.5 bg-white/5 rounded-lg text-sm hover:bg-gold-400/20">Italic</button>
            <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className="px-3 py-1.5 bg-white/5 rounded-lg text-sm hover:bg-gold-400/20">H2</button>
            <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} className="px-3 py-1.5 bg-white/5 rounded-lg text-sm hover:bg-gold-400/20">H3</button>
            <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()} className="px-3 py-1.5 bg-white/5 rounded-lg text-sm hover:bg-gold-400/20">Bullet List</button>
            <button type="button" onClick={() => editor?.chain().focus().toggleOrderedList().run()} className="px-3 py-1.5 bg-white/5 rounded-lg text-sm hover:bg-gold-400/20">Numbered List</button>
            <button type="button" onClick={handleImageUploadInEditor} disabled={uploading} className="px-3 py-1.5 bg-gold-400/20 text-gold-400 rounded-lg text-sm hover:bg-gold-400/30 disabled:opacity-50">{uploading ? "Uploading…" : "📷 Image"}</button>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 min-h-[240px]"><EditorContent editor={editor} /></div>
          <div className="flex gap-3">
            <Button type="submit" className="bg-gold-400 text-black font-semibold hover:bg-gold-500">{editingId ? "Update Post" : "Publish Post"}</Button>
            {editingId && <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>}
          </div>
        </form>

        {/* Post list */}
        {posts.length === 0 ? (
          <p className="text-gray-400">No posts yet.</p>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => {
              const isTop = post.top_story_until && new Date(post.top_story_until) > new Date();
              return (
                <div key={post.id} className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-5 flex items-center justify-between hover:border-gold-400/20 transition-all">
                  <div className="flex items-center gap-5">
                    {post.image_url && <img src={post.image_url} alt="thumb" className="h-14 w-14 rounded-xl object-cover" />}
                    <div>
                      <p className="font-semibold text-white">{post.title}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(post.created_at).toLocaleDateString()}</p>
                      {isTop && <span className="text-xs text-gold-400 mt-1 block">⭐ Top Story</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleTopStory(post)} className="text-gold-400 text-sm hover:underline">{isTop ? "Remove Top" : "Set as Top"}</button>
                    <button onClick={() => handleEdit(post)} className="text-gold-400 text-sm hover:underline">Edit</button>
                    <button onClick={() => handleDelete(post.id)} className="text-red-400 text-sm hover:underline">Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}